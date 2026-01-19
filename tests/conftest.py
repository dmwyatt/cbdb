import os
import socket
import subprocess
import time

import pytest
import requests


def get_free_port():
    """Find an available port to avoid conflicts with running servers."""
    with socket.socket() as s:
        s.bind(("", 0))
        return s.getsockname()[1]


def wait_for_server(url, timeout=30):
    """Wait for server to respond to health check."""
    start = time.time()
    while time.time() - start < timeout:
        try:
            requests.get(url, timeout=1)
            return True
        except requests.exceptions.RequestException:
            time.sleep(0.1)
    raise TimeoutError(f"Server at {url} didn't start within {timeout}s")


@pytest.fixture(scope="session")
def build_frontend():
    """Build frontend once per test session."""
    subprocess.run(
        ["npm", "run", "build"],
        cwd="frontend",
        check=True,
    )


@pytest.fixture(scope="session")
def test_fixtures():
    """Ensure test data fixtures exist."""
    subprocess.run(
        ["uv", "run", "python", "test_data/generate_fixtures.py"],
        check=True,
    )


@pytest.fixture(scope="class")
def app_server(build_frontend, test_fixtures):
    """Start Flask server for each test class."""
    port = get_free_port()
    env = {
        **os.environ,
        "STORAGE_BACKEND": "local",
        "APP_PASSWORD": "test",
        "PORT": str(port),
    }
    proc = subprocess.Popen(
        ["uv", "run", "python", "app.py"],
        env=env,
    )

    base_url = f"http://localhost:{port}"
    wait_for_server(f"{base_url}/health")

    yield base_url

    proc.terminate()
    proc.wait()


@pytest.fixture
def page(app_server, browser):
    """Fresh browser page for each test."""
    context = browser.new_context(base_url=app_server)
    page = context.new_page()
    yield page
    context.close()


@pytest.fixture
def authenticated_page(page):
    """Page with user already logged in."""
    page.goto("/")
    page.get_by_label("Password").fill("test")
    page.get_by_role("button", name="Sign In").click()
    page.wait_for_selector("text=Calibre Library Path")
    return page
