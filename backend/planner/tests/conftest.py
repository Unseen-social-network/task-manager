"""
Pytest fixtures for Planner tests.
"""

import pytest
from django.contrib.auth import get_user_model
from planner.models import Contact, Task
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    """Return API client for making requests."""
    return APIClient()


@pytest.fixture
def user(db):
    """Create and return a test user."""
    return User.objects.create_user(
        username="testuser", email="test@example.com", password="testpass123"
    )


@pytest.fixture
def other_user(db):
    """Create and return another test user."""
    return User.objects.create_user(
        username="otheruser",
        email="other@example.com",
        password="otherpass123",
    )


@pytest.fixture
def authenticated_client(api_client, user):
    """Return authenticated API client."""
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def contact(user):
    """Create and return a test contact."""
    return Contact.objects.create(
        owner=user,
        name="John Doe",
        company="ACME Corp",
        phone="+1234567890",
        email="john@example.com",
    )


@pytest.fixture
def other_contact(other_user):
    """Create and return a contact for other user."""
    return Contact.objects.create(
        owner=other_user,
        name="Jane Smith",
        company="Other Corp",
        email="jane@example.com",
    )


@pytest.fixture
def task(user, contact):
    """Create and return a test task."""
    return Task.objects.create(
        owner=user,
        title="Test Task",
        description="Test description",
        urgency=Task.Urgency.MEDIUM,
        status=Task.Status.TODO,
        contact=contact,
    )


@pytest.fixture
def other_task(other_user):
    """Create and return a task for other user."""
    return Task.objects.create(
        owner=other_user,
        title="Other User Task",
        urgency=Task.Urgency.HIGH,
        status=Task.Status.TODO,
    )
