"""
Tests for Project API endpoints.
"""

import pytest
from rest_framework import status

from planner.models import Project, Task


@pytest.mark.django_db
class TestProjectAPI:
    """Tests for Project CRUD operations and permissions."""

    def test_list_projects_includes_tagged(
        self, authenticated_client, project, other_user, user, task_statuses
    ):
        """Ensure list includes owned projects and ones where user is tagged."""
        default_status = next(
            status for status in task_statuses if status.key == 'todo'
        )
        other_project = Project.objects.create(
            owner=other_user,
            name='Other Project',
            description='Other description',
        )
        Project.objects.create(
            owner=other_user,
            name='Hidden Project',
            description='Hidden description',
        )
        other_project.tasks.create(
            owner=other_user,
            title='Tagged Task',
            status=default_status,
            urgency=Task.Urgency.MEDIUM,
            tagged_user=user,
        )

        url = '/api/v1/projects/'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        project_ids = {item['id'] for item in response.data['results']}
        assert project.id in project_ids
        assert other_project.id in project_ids
        assert len(project_ids) == 2

    def test_retrieve_project_for_tagged_user(
        self, api_client, other_user, user, task_statuses
    ):
        """Ensure tagged users can retrieve projects but not modify them."""
        default_status = next(
            status for status in task_statuses if status.key == 'todo'
        )
        api_client.force_authenticate(user=user)
        project = Project.objects.create(
            owner=other_user,
            name='Shared Project',
            description='Shared description',
        )
        project.tasks.create(
            owner=other_user,
            title='Shared Task',
            status=default_status,
            urgency=Task.Urgency.MEDIUM,
            tagged_user=user,
        )

        url = f'/api/v1/projects/{project.id}/'
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == project.id

        response = api_client.patch(url, {'name': 'Updated'})
        assert response.status_code == status.HTTP_404_NOT_FOUND

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
