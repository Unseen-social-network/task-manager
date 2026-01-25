"""
Tests for project share endpoints.
"""

import pytest
from rest_framework import status

from planner.models import Project, ProjectShare


@pytest.mark.django_db
class TestProjectShareAPI:
    def test_create_share(self, authenticated_client, project):
        url = f'/api/v1/projects/{project.id}/share/'
        response = authenticated_client.post(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['token']
        assert response.data['share_url']
        assert ProjectShare.objects.filter(project=project, is_active=True).exists()

    def test_get_share_info(self, authenticated_client, project):
        url = f'/api/v1/projects/{project.id}/share/'
        authenticated_client.post(url)

        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['token']

    def test_public_share_read(self, api_client, authenticated_client, project):
        share_resp = authenticated_client.post(f'/api/v1/projects/{project.id}/share/')
        token = share_resp.data['token']

        response = api_client.get(f'/api/v1/share/projects/{token}/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == project.id

    def test_accept_share_adds_access(
        self, other_authenticated_client, authenticated_client, project
    ):
        share_resp = authenticated_client.post(f'/api/v1/projects/{project.id}/share/')
        token = share_resp.data['token']

        response = other_authenticated_client.post(f'/api/v1/share/projects/{token}/accept/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == project.id

        list_response = other_authenticated_client.get('/api/v1/projects/')
        assert any(item['id'] == project.id for item in list_response.data['results'])

    def test_owner_can_remove_access(
        self, other_authenticated_client, other_user, authenticated_client, project
    ):
        share_resp = authenticated_client.post(f'/api/v1/projects/{project.id}/share/')
        token = share_resp.data['token']
        other_authenticated_client.post(f'/api/v1/share/projects/{token}/accept/')

        response = authenticated_client.delete(
            f'/api/v1/projects/{project.id}/access/?user_id={other_user.id}'
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_recipient_can_remove_access(
        self, other_authenticated_client, authenticated_client, project
    ):
        share_resp = authenticated_client.post(f'/api/v1/projects/{project.id}/share/')
        token = share_resp.data['token']
        other_authenticated_client.post(f'/api/v1/share/projects/{token}/accept/')

        response = other_authenticated_client.delete(f'/api/v1/projects/{project.id}/access/')

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_share_copy_creates_project(
        self, other_authenticated_client, other_user, authenticated_client, project
    ):
        share_resp = authenticated_client.post(f'/api/v1/projects/{project.id}/share/')
        token = share_resp.data['token']

        response = other_authenticated_client.post(f'/api/v1/share/projects/{token}/copy/')

        assert response.status_code == status.HTTP_201_CREATED
        assert Project.objects.filter(owner=other_user).exists()

    def test_revoke_share(self, authenticated_client, project, api_client):
        share_resp = authenticated_client.post(f'/api/v1/projects/{project.id}/share/')
        token = share_resp.data['token']

        response = authenticated_client.delete(f'/api/v1/projects/{project.id}/share/')

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert ProjectShare.objects.filter(project=project, is_active=False).exists()

        shared_response = api_client.get(f'/api/v1/share/projects/{token}/')
        assert shared_response.status_code == status.HTTP_404_NOT_FOUND
