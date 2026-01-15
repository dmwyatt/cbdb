import os
import requests


class DropboxAPI:
    """Interact with Dropbox API using an access token."""

    BASE_URL = "https://api.dropboxapi.com/2"
    CONTENT_URL = "https://content.dropboxapi.com/2"

    def __init__(self, access_token=None):
        """
        Initialize Dropbox API client.

        Args:
            access_token: Dropbox access token. If not provided, reads from
                         DROPBOX_ACCESS_TOKEN environment variable.
        """
        self.access_token = access_token or os.getenv('DROPBOX_ACCESS_TOKEN')
        if not self.access_token:
            raise ValueError(
                "Dropbox access token not configured. "
                "Set DROPBOX_ACCESS_TOKEN environment variable."
            )

    def _headers(self):
        """Get authorization headers."""
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def _content_headers(self, api_arg):
        """Get headers for content endpoints."""
        import json
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Dropbox-API-Arg": json.dumps(api_arg),
        }

    def get_metadata(self, path):
        """
        Get metadata for a file or folder.

        Args:
            path: Path in Dropbox (e.g., "/Calibre Library/metadata.db")

        Returns:
            dict with metadata or None if not found
        """
        try:
            response = requests.post(
                f"{self.BASE_URL}/files/get_metadata",
                headers=self._headers(),
                json={"path": path},
                timeout=10,
            )

            if response.status_code == 409:
                # Path not found
                error_data = response.json()
                if error_data.get("error", {}).get(".tag") == "path":
                    return None

            response.raise_for_status()
            return response.json()

        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to get metadata: {str(e)}")

    def list_folder(self, path):
        """
        List contents of a folder.

        Args:
            path: Path to folder (e.g., "/Calibre Library")
                 Use "" for root folder.

        Returns:
            list of entries (files and folders)
        """
        try:
            response = requests.post(
                f"{self.BASE_URL}/files/list_folder",
                headers=self._headers(),
                json={"path": path},
                timeout=30,
            )

            if response.status_code == 409:
                error_data = response.json()
                error_tag = error_data.get("error", {}).get(".tag")
                if error_tag == "path":
                    path_error = error_data.get("error", {}).get("path", {}).get(".tag")
                    if path_error == "not_found":
                        raise Exception(f"Folder not found: {path}")
                    elif path_error == "not_folder":
                        raise Exception(f"Path is not a folder: {path}")

            response.raise_for_status()
            return response.json().get("entries", [])

        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to list folder: {str(e)}")

    def download_file(self, path):
        """
        Download a file from Dropbox.

        Args:
            path: Path to file (e.g., "/Calibre Library/metadata.db")

        Returns:
            bytes: File content
        """
        try:
            response = requests.post(
                f"{self.CONTENT_URL}/files/download",
                headers=self._content_headers({"path": path}),
                timeout=120,
            )

            if response.status_code == 409:
                error_data = response.json()
                error_tag = error_data.get("error", {}).get(".tag")
                if error_tag == "path":
                    path_error = error_data.get("error", {}).get("path", {}).get(".tag")
                    if path_error == "not_found":
                        raise Exception(f"File not found: {path}")
                    elif path_error == "not_file":
                        raise Exception(f"Path is not a file: {path}")

            response.raise_for_status()
            return response.content

        except requests.exceptions.RequestException as e:
            raise Exception(f"Failed to download file: {str(e)}")

    def validate_library_path(self, library_path):
        """
        Validate that a path is a valid Calibre library (contains metadata.db).

        Args:
            library_path: Path to check (e.g., "/Calibre Library")

        Returns:
            dict with 'valid' bool and 'error' or 'metadata_size' on success

        Raises:
            Exception with helpful message if path is invalid
        """
        # Normalize path
        if not library_path.startswith("/"):
            library_path = "/" + library_path
        library_path = library_path.rstrip("/")

        metadata_path = f"{library_path}/metadata.db"

        # Check if metadata.db exists
        metadata = self.get_metadata(metadata_path)

        if metadata is None:
            # Try to list parent to give helpful suggestions
            suggestions = []
            try:
                # List root to find possible library folders
                entries = self.list_folder("")
                folders = [e["name"] for e in entries if e[".tag"] == "folder"]
                # Look for folders that might be Calibre libraries
                for folder in folders:
                    try:
                        sub_metadata = self.get_metadata(f"/{folder}/metadata.db")
                        if sub_metadata:
                            suggestions.append(f"/{folder}")
                    except Exception:
                        pass
            except Exception:
                pass

            error_msg = f"metadata.db not found at '{library_path}'"
            if suggestions:
                error_msg += f"\n\nFound Calibre libraries at: {', '.join(suggestions)}"
            else:
                error_msg += "\n\nMake sure the path points to your Calibre Library folder."

            return {"valid": False, "error": error_msg}

        return {
            "valid": True,
            "metadata_size": metadata.get("size", 0),
            "metadata_modified": metadata.get("server_modified"),
        }

    def sync_metadata_db(self, library_path, local_path="metadata.db"):
        """
        Download metadata.db from the library path.

        Args:
            library_path: Path to Calibre library (e.g., "/Calibre Library")
            local_path: Local path to save the file

        Returns:
            dict with sync info
        """
        if not library_path.startswith("/"):
            library_path = "/" + library_path
        library_path = library_path.rstrip("/")

        metadata_path = f"{library_path}/metadata.db"

        content = self.download_file(metadata_path)

        # Validate SQLite header
        if not content.startswith(b"SQLite format 3\x00"):
            raise Exception(
                "Downloaded file is not a valid SQLite database. "
                "Check that the path points to a Calibre library."
            )

        # Save atomically
        temp_path = local_path + ".tmp"
        with open(temp_path, "wb") as f:
            f.write(content)
            f.flush()
            os.fsync(f.fileno())

        os.replace(temp_path, local_path)

        return {
            "size": len(content),
            "path": metadata_path,
        }
