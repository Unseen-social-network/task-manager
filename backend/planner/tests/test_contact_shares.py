"""
Tests for contact share endpoints.
"""

import pytest
from rest_framework import status

from planner.models import Contact, ContactShare, ContactShareAccess


@pytest.mark.django_db
class TestContactShareAPI:
    def test_create_share(self, authenticated_client, contact):
        url = f'/api/v1/contacts/{contact.id}/share/'
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['token']
        assert response.data['share_url']
        assert ContactShare.objects.filter(contact=contact, is_active=True).exists()

    def test_get_share_info(self, authenticated_client, contact):
        url = f'/api/v1/contacts/{contact.id}/share/'
        authenticated_client.post(url)

        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['token']

    def test_public_share_read(self, api_client, authenticated_client, contact):
        share_resp = authenticated_client.post(f'/api/v1/contacts/{contact.id}/share/')
        token = share_resp.data['token']

        response = api_client.get(f'/api/v1/share/contacts/{token}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == contact.id

    def test_share_copy_creates_contact(
        self, other_authenticated_client, other_user, authenticated_client, contact
    ):
        share_resp = authenticated_client.post(f'/api/v1/contacts/{contact.id}/share/')
        token = share_resp.data['token']

        response = other_authenticated_client.post(
            f'/api/v1/share/contacts/{token}/copy/'
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert Contact.objects.filter(owner=other_user).exists()

    def test_revoke_share(self, authenticated_client, contact, api_client):
        share_resp = authenticated_client.post(f'/api/v1/contacts/{contact.id}/share/')
        token = share_resp.data['token']

        response = authenticated_client.delete(f'/api/v1/contacts/{contact.id}/share/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert ContactShare.objects.filter(contact=contact, is_active=False).exists()

        shared_response = api_client.get(f'/api/v1/share/contacts/{token}/')
        assert shared_response.status_code == status.HTTP_404_NOT_FOUND

    def test_accept_share_adds_access(
        self, authenticated_client, other_authenticated_client, contact
    ):
        share_resp = authenticated_client.post(f'/api/v1/contacts/{contact.id}/share/')
        token = share_resp.data['token']

        response = other_authenticated_client.post(
            f'/api/v1/share/contacts/{token}/accept/'
        )

        assert response.status_code == status.HTTP_200_OK
        assert ContactShareAccess.objects.filter(contact=contact).exists()
        list_response = other_authenticated_client.get('/api/v1/contacts/')
        assert list_response.status_code == status.HTTP_200_OK
        assert list_response.data['count'] >= 1
