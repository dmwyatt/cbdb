import os
import dropbox
from dropbox.exceptions import ApiError


class DropboxSync:
    """Handle synchronization of Calibre database from Dropbox."""

    def __init__(self, access_token, metadata_path):
        """
        Initialize Dropbox sync.

        Args:
            access_token: Dropbox API access token
            metadata_path: Path to metadata.db in Dropbox (e.g., /Calibre Library/metadata.db)
        """
        if not access_token:
            raise ValueError("DROPBOX_ACCESS_TOKEN is required")
        if not metadata_path:
            raise ValueError("DROPBOX_METADATA_PATH is required")

        self.dbx = dropbox.Dropbox(access_token)
        self.metadata_path = metadata_path
        self.local_path = 'metadata.db'

    def sync(self):
        """Download the metadata.db file from Dropbox."""
        try:
            print(f"Syncing database from Dropbox: {self.metadata_path}")

            # Download file
            metadata, response = self.dbx.files_download(self.metadata_path)

            # Save to local file
            with open(self.local_path, 'wb') as f:
                f.write(response.content)

            print(f"Database synced successfully. Size: {metadata.size} bytes")
            return True

        except ApiError as e:
            if e.error.is_path() and e.error.get_path().is_not_found():
                raise Exception(f"File not found in Dropbox: {self.metadata_path}")
            else:
                raise Exception(f"Dropbox API error: {str(e)}")
        except Exception as e:
            raise Exception(f"Failed to sync database: {str(e)}")

    def get_file_info(self):
        """Get information about the metadata.db file in Dropbox."""
        try:
            metadata = self.dbx.files_get_metadata(self.metadata_path)
            return {
                'name': metadata.name,
                'size': metadata.size,
                'modified': metadata.server_modified.isoformat() if hasattr(metadata, 'server_modified') else None
            }
        except ApiError as e:
            raise Exception(f"Failed to get file info: {str(e)}")
