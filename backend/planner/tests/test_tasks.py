"""
Tests for Task API endpoints.
"""

import pytest
from rest_framework import status

from planner.models import Task


@pytest.mark.django_db
class TestTaskAPI:
    """Tests for Task CRUD operations and permissions."""

    def test_list_tasks_includes_tagged(
        self, authenticated_client, user, other_user, task_statuses, task
    ):
        """Test that users see own tasks and tasks where they are tagged."""
        default_status = next(status for status in task_statuses if status.key == 'todo')
        Task.objects.create(
            owner=other_user,
            title='Tagged Task',
            status=default_status,
            tagged_user=user,
        )
        url = '/api/v1/tasks/'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 2
        returned_ids = {item['id'] for item in response.data['results']}
        assert task.id in returned_ids

    def test_create_task_with_contact(
        self, authenticated_client, user, contact, project, task_statuses
    ):
        """Test creating a task with contact reference."""
        url = '/api/v1/tasks/'
        data = {
            'title': 'New Task',
            'description': 'Task description',
            'urgency': 'high',
            'status': 'todo',
            'contact': contact.id,
            'project': project.id,
            'tagged_user': user.username,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Task.objects.filter(owner=user, title='New Task').exists()
        created_task = Task.objects.get(owner=user, title='New Task')
        assert created_task.contact == contact
        assert created_task.project == project
        assert created_task.tagged_user == user

    def test_create_task_with_freeform_contact(
        self, authenticated_client, user, task_statuses
    ):
        """Test creating a task with freeform contact."""
        url = '/api/v1/tasks/'
        data = {
            'title': 'Task with Freeform',
            'urgency': 'medium',
            'contact_freeform': 'Call John at +1234567890',
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        created_task = Task.objects.get(owner=user, title='Task with Freeform')
        assert created_task.contact_freeform == 'Call John at +1234567890'

    def test_create_task_with_other_user_contact_forbidden(
        self, authenticated_client, other_contact, task_statuses
    ):
        """Test that using another user's contact is forbidden."""
        url = '/api/v1/tasks/'
        data = {
            'title': 'Malicious Task',
            'urgency': 'high',
            'contact': other_contact.id,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'contact' in response.data

    def test_retrieve_own_task(self, authenticated_client, task):
        """Test retrieving own task."""
        url = f'/api/v1/tasks/{task.id}/'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == task.id

    def test_retrieve_other_user_task_forbidden(self, authenticated_client, other_task):
        """Test that retrieving another user's task returns 404."""
        url = f'/api/v1/tasks/{other_task.id}/'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_retrieve_tagged_task_allowed(
        self, authenticated_client, user, other_user, task_statuses
    ):
        """Test that tagged user can retrieve the task."""
        default_status = next(status for status in task_statuses if status.key == 'todo')
        tagged_task = Task.objects.create(
            owner=other_user,
            title='Tagged Task',
            status=default_status,
            tagged_user=user,
        )
        url = f'/api/v1/tasks/{tagged_task.id}/'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data['id'] == tagged_task.id

    def test_tagged_user_can_update_non_final_status(
        self, authenticated_client, user, other_user, task_statuses
    ):
        """Test that tagged user can update task status among non-final statuses."""
        status_map = {status.key: status for status in task_statuses}
        tagged_task = Task.objects.create(
            owner=other_user,
            title='Tagged Task',
            status=status_map['todo'],
            tagged_user=user,
        )
        url = f'/api/v1/tasks/{tagged_task.id}/'
        response = authenticated_client.patch(url, {'status': 'in_progress'})

        assert response.status_code == status.HTTP_200_OK
        tagged_task.refresh_from_db()
        assert tagged_task.status.key == 'in_progress'

    def test_tagged_user_cannot_update_final_status(
        self, authenticated_client, user, other_user, task_statuses
    ):
        """Test that tagged user cannot update task status to a final status."""
        status_map = {status.key: status for status in task_statuses}
        tagged_task = Task.objects.create(
            owner=other_user,
            title='Tagged Task',
            status=status_map['todo'],
            tagged_user=user,
        )
        url = f'/api/v1/tasks/{tagged_task.id}/'
        response = authenticated_client.patch(url, {'status': 'done'})

        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_tagged_user_cannot_delete_task(
        self, authenticated_client, user, other_user, task_statuses
    ):
        """Test that tagged user cannot delete the task."""
        default_status = next(status for status in task_statuses if status.key == 'todo')
        tagged_task = Task.objects.create(
            owner=other_user,
            title='Tagged Task',
            status=default_status,
            tagged_user=user,
        )
        url = f'/api/v1/tasks/{tagged_task.id}/'
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_own_task(self, authenticated_client, task):
        """Test updating own task."""
        url = f'/api/v1/tasks/{task.id}/'
        data = {'title': 'Updated Title', 'status': 'in_progress'}

        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.title == 'Updated Title'
        assert task.status.key == 'in_progress'

    def test_delete_own_task(self, authenticated_client, task):
        """Test deleting own task."""
        url = f'/api/v1/tasks/{task.id}/'
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Task.objects.filter(id=task.id).exists()

    def test_filter_tasks_by_status(self, authenticated_client, user, task_statuses):
        """Test filtering tasks by status."""
        status_map = {status.key: status for status in task_statuses}
        Task.objects.create(owner=user, title='Todo Task', status=status_map['todo'])
        Task.objects.create(owner=user, title='Done Task', status=status_map['done'])

        url = '/api/v1/tasks/?status=done'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['status'] == 'done'

    def test_filter_tasks_by_urgency(self, authenticated_client, user, task_statuses):
        """Test filtering tasks by urgency."""
        default_status = next(status for status in task_statuses if status.key == 'todo')
        Task.objects.create(owner=user, title='Low Task', urgency='low', status=default_status)
        Task.objects.create(
            owner=user, title='Critical Task', urgency='critical', status=default_status
        )

        url = '/api/v1/tasks/?urgency=critical'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['urgency'] == 'critical'

    def test_search_tasks(self, authenticated_client, task):
        """Test searching tasks by title."""
        url = '/api/v1/tasks/?search=Test'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == task.id

    def test_ordering_tasks(self, authenticated_client, user):
        """Test ordering tasks by created_at."""
        url = '/api/v1/tasks/?ordering=-created_at'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
