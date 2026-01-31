"""
Pytest fixtures for Planner tests.
"""

from django.contrib.auth import get_user_model
import pytest
from rest_framework.test import APIClient

from planner.models import Contact, Project, Task, TaskStatus

User = get_user_model()


@pytest.fixture
def api_client():
    """Return API client for making requests."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create and return a test user."""
    return User.objects.create_user(
        username='testuser', email='test@example.com', password='testpass123'
    )


@pytest.fixture
def other_user(db):
    """Create and return another test user."""
    return User.objects.create_user(
        username='otheruser',
        email='other@example.com',
        password='otherpass123',
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def other_authenticated_client(api_client, other_user):
    """Return authenticated API client for another user."""
    other_client = APIClient()
    other_client.force_authenticate(user=other_user)
    return other_client


@pytest.fixture
def contact(user):
    """Create and return a test contact."""
    return Contact.objects.create(
        owner=user,
        name='John Doe',
        company='ACME Corp',
        phone='+1234567890',
        email='john@example.com',
    )


@pytest.fixture
def other_contact(other_user):
    """Create and return a contact for other user."""
    return Contact.objects.create(
        owner=other_user,
        name='Jane Smith',
        company='Other Corp',
        email='jane@example.com',
    )


@pytest.fixture
def task_statuses(db):
    """Ensure default task statuses exist."""
    defaults = [
        {
            'key': 'todo',
            'label': 'To Do',
            'order': 1,
            'is_archived': False,
            'is_done': False,
            'is_default': True,
        },
        {
            'key': 'in_progress',
            'label': 'In Progress',
            'order': 2,
            'is_archived': False,
            'is_done': False,
            'is_default': False,
        },
        {
            'key': 'done',
            'label': 'Done',
            'order': 3,
            'is_archived': True,
            'is_done': True,
            'is_default': False,
        },
        {
            'key': 'canceled',
            'label': 'Canceled',
            'order': 4,
            'is_archived': True,
            'is_done': False,
            'is_default': False,
        },
    ]
    statuses = []
    for status in defaults:
        obj, _ = TaskStatus.objects.get_or_create(key=status['key'], defaults=status)
        statuses.append(obj)
    return statuses


@pytest.fixture
def task(user, contact, task_statuses):
    """Create and return a test task."""
    default_status = next(status for status in task_statuses if status.key == 'todo')
    return Task.objects.create(
        owner=user,
        title='Test Task',
        description='Test description',
        urgency=Task.Urgency.MEDIUM,
        status=default_status,
        contact=contact,
    )


@pytest.fixture
def project(user):
    """Create and return a test project."""
    return Project.objects.create(
        owner=user,
        name='Test Project',
        description='Project description',
        phone='+1234567890',
        links=[{'label': 'Docs', 'url': 'https://example.com/docs'}],
    )


@pytest.fixture
def other_task(other_user, task_statuses):
    """Create and return a task for other user."""
    default_status = next(status for status in task_statuses if status.key == 'todo')
    return Task.objects.create(
        owner=other_user,
        title='Other User Task',
        urgency=Task.Urgency.HIGH,
        status=default_status,
    )
