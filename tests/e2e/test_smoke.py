import pytest
from playwright.sync_api import expect


class TestSmokeTests:
    """Basic smoke tests for app functionality."""

    def test_app_loads(self, page):
        """App loads and shows login form."""
        page.goto("/")
        expect(page.get_by_label("Password")).to_be_visible()
        expect(page.get_by_role("button", name="Sign In")).to_be_visible()

    def test_user_can_login(self, page):
        """User can enter password and reach setup form."""
        page.goto("/")
        page.get_by_label("Password").fill("test")
        page.get_by_role("button", name="Sign In").click()
        expect(page.get_by_label("Calibre Library Path")).to_be_visible()

    def test_user_can_see_books(self, authenticated_page):
        """User can configure library and see book list."""
        page = authenticated_page
        page.get_by_label("Calibre Library Path").fill("/Calibre Library")
        page.get_by_role("button", name="Load Library").click()
        # Check for known test book from fixtures (sorts first alphabetically)
        expect(page.get_by_text("Alpha Test Book")).to_be_visible(timeout=30000)
