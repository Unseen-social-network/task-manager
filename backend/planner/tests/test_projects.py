"""
Tests for Project API endpoints.
"""

import pytest
from rest_framework import status

from planner.models import Project


@pytest.mark.django_db
class TestProjectAPI:
    """Tests for Project CRUD operations and permissions."""

    def test_list_projects_only_own(self, authenticated_client, project, other_user):
        """Ensure only projects owned by user are listed."""
        Project.objects.create(
            owner=other_user,
            name='Other Project',
            description='Other description',
        )

        url = '/api/v1/projects/'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == project.id

    def test_create_project(self, authenticated_client, user):
        """Test creating a project."""
        url = '/api/v1/projects/'
        data = {
            'name': 'New Project',
            'description': 'Project description',
            'phone': '+1234567890',
            'links': [{'label': 'Docs', 'url': 'https://example.com/docs'}],
        }

        response = authenticated_client.post(url, data, format='json')

        assert response.status_code == status.HTTP_201_CREATED
        assert Project.objects.filter(owner=user, name='New Project').exists()

    def test_update_project(self, authenticated_client, project):
        """Test updating a project."""
        url = f'/api/v1/projects/{project.id}/'
        response = authenticated_client.patch(url, {'name': 'Updated Project'})

        assert response.status_code == status.HTTP_200_OK
        project.refresh_from_db()
        assert project.name == 'Updated Project'

    def test_delete_project(self, authenticated_client, project):
        """Test deleting a project."""
        url = f'/api/v1/projects/{project.id}/'
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Project.objects.filter(id=project.id).exists()
