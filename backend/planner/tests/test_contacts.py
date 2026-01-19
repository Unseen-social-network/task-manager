"""
Tests for Contact API endpoints.
"""

import pytest
from rest_framework import status

from planner.models import Contact


@pytest.mark.django_db
class TestContactAPI:
    """Tests for Contact CRUD operations and permissions."""

    def test_list_contacts_only_own(
        self, authenticated_client, contact, other_contact
    ):
        """Test that users can only see their own contacts."""
        url = "/api/v1/contacts/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == contact.id

    def test_create_contact(self, authenticated_client, user):
        """Test creating a new contact."""
        url = "/api/v1/contacts/"
        data = {
            "name": "New Contact",
            "company": "New Company",
            "phone": "+9876543210",
            "email": "new@example.com",
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Contact.objects.filter(owner=user, name="New Contact").exists()

    def test_retrieve_own_contact(self, authenticated_client, contact):
        """Test retrieving own contact."""
        url = f"/api/v1/contacts/{contact.id}/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["id"] == contact.id

    def test_retrieve_other_user_contact_forbidden(
        self, authenticated_client, other_contact
    ):
        """Test that retrieving another user's contact returns 404."""
        url = f"/api/v1/contacts/{other_contact.id}/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_own_contact(self, authenticated_client, contact):
        """Test updating own contact."""
        url = f"/api/v1/contacts/{contact.id}/"
        data = {"name": "Updated Name"}

        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        contact.refresh_from_db()
        assert contact.name == "Updated Name"

    def test_update_other_user_contact_forbidden(
        self, authenticated_client, other_contact
    ):
        """Test that updating another user's contact returns 404."""
        url = f"/api/v1/contacts/{other_contact.id}/"
        data = {"name": "Hacked Name"}

        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        other_contact.refresh_from_db()
        assert other_contact.name != "Hacked Name"

    def test_delete_own_contact(self, authenticated_client, contact):
        """Test deleting own contact."""
        url = f"/api/v1/contacts/{contact.id}/"
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Contact.objects.filter(id=contact.id).exists()

    def test_delete_other_user_contact_forbidden(
        self, authenticated_client, other_contact
    ):
        """Test that deleting another user's contact returns 404."""
        url = f"/api/v1/contacts/{other_contact.id}/"
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Contact.objects.filter(id=other_contact.id).exists()

    def test_search_contacts(self, authenticated_client, contact):
        """Test searching contacts."""
        url = "/api/v1/contacts/?search=John"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data["results"]) == 1
        assert response.data["results"][0]["id"] == contact.id
