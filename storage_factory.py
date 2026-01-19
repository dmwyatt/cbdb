import os

from dropbox_api import DropboxAPI
from local_storage_api import LocalStorageAPI


def get_storage_backend() -> str:
    """Get the configured storage backend type."""
    return os.getenv('STORAGE_BACKEND', 'dropbox').lower()


def get_storage_api():
    """
    Get a storage API instance based on STORAGE_BACKEND environment variable.

    Returns:
        tuple: (api_instance, error_message)
               api_instance is None if there's an error.
    """
    backend = get_storage_backend()

    if backend == 'local':
        try:
            return LocalStorageAPI(), None
        except ValueError as e:
            return None, str(e)
    else:
        # Default to Dropbox
        try:
            return DropboxAPI(), None
        except ValueError as e:
            return None, str(e)


def is_local_storage() -> bool:
    """Check if using local storage backend."""
    return get_storage_backend() == 'local'
