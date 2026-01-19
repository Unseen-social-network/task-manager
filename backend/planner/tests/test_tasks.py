"""
Tests for Task API endpoints.
"""

import pytest
from rest_framework import status

from planner.models import Task


@pytest.mark.django_db
class TestTaskAPI:
    """Tests for Task CRUD operations and permissions."""

    def test_list_tasks_only_own(self, authenticated_client, task, other_task):
        """Test that users can only see their own tasks."""
        url = '/api/v1/tasks/'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == task.id

    def test_create_task_with_contact(self, authenticated_client, user, contact):
        """Test creating a task with contact reference."""
        url = '/api/v1/tasks/'
        data = {
            'title': 'New Task',
            'description': 'Task description',
            'urgency': 'high',
            'status': 'todo',
            'contact': contact.id,
        }

        response = authenticated_client.post(url, data)

        assert response.status_code == status.HTTP_201_CREATED
        assert Task.objects.filter(owner=user, title='New Task').exists()
        created_task = Task.objects.get(owner=user, title='New Task')
        assert created_task.contact == contact

    def test_create_task_with_freeform_contact(self, authenticated_client, user):
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
        self, authenticated_client, other_contact
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

    def test_update_own_task(self, authenticated_client, task):
        """Test updating own task."""
        url = f'/api/v1/tasks/{task.id}/'
        data = {'title': 'Updated Title', 'status': 'in_progress'}

        response = authenticated_client.patch(url, data)

        assert response.status_code == status.HTTP_200_OK
        task.refresh_from_db()
        assert task.title == 'Updated Title'
        assert task.status == 'in_progress'

    def test_delete_own_task(self, authenticated_client, task):
        """Test deleting own task."""
        url = f'/api/v1/tasks/{task.id}/'
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Task.objects.filter(id=task.id).exists()

    def test_filter_tasks_by_status(self, authenticated_client, user):
        """Test filtering tasks by status."""
        Task.objects.create(owner=user, title='Todo Task', status='todo')
        Task.objects.create(owner=user, title='Done Task', status='done')

        url = '/api/v1/tasks/?status=done'
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['status'] == 'done'

    def test_filter_tasks_by_urgency(self, authenticated_client, user):
        """Test filtering tasks by urgency."""
        Task.objects.create(owner=user, title='Low Task', urgency='low')
        Task.objects.create(owner=user, title='Critical Task', urgency='critical')

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
