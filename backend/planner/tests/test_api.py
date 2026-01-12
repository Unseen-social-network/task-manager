import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from planner.models import Attachment, Contact, Task


@pytest.fixture()
def api_client():
    return APIClient()


@pytest.fixture()
def user(django_user_model):
    return django_user_model.objects.create_user(username="user", password="pass1234")


@pytest.fixture()
def other_user(django_user_model):
    return django_user_model.objects.create_user(username="other", password="pass1234")


@pytest.fixture()
def auth_client(api_client, user):
    token_url = "/api/v1/auth/jwt/create/"
    response = api_client.post(token_url, {"username": "user", "password": "pass1234"})
    assert response.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return api_client


@pytest.mark.django_db()
def test_jwt_obtain(api_client, user):
    response = api_client.post(
        "/api/v1/auth/jwt/create/", {"username": "user", "password": "pass1234"}
    )
    assert response.status_code == 200
    assert "access" in response.data


@pytest.mark.django_db()
def test_owner_isolation_contacts(auth_client, other_user):
    contact = Contact.objects.create(owner=other_user, name="Hidden")
    response = auth_client.get(f"/api/v1/contacts/{contact.id}/")
    assert response.status_code == 404


@pytest.mark.django_db()
def test_owner_isolation_tasks(auth_client, other_user):
    task = Task.objects.create(owner=other_user, title="Hidden")
    response = auth_client.get(f"/api/v1/tasks/{task.id}/")
    assert response.status_code == 404


@pytest.mark.django_db()
def test_owner_isolation_attachments(auth_client, other_user, tmp_path, settings):
    settings.MEDIA_ROOT = tmp_path
    task = Task.objects.create(owner=other_user, title="Hidden", contact_freeform="Test")
    attachment = Attachment.objects.create(
        owner=other_user,
        task=task,
        file=SimpleUploadedFile("note.txt", b"data"),
        original_name="note.txt",
        size=4,
    )
    response = auth_client.delete(f"/api/v1/attachments/{attachment.id}/")
    assert response.status_code == 404


@pytest.mark.django_db()
def test_attachment_upload_rejects_foreign_task(auth_client, other_user):
    task = Task.objects.create(owner=other_user, title="Hidden", contact_freeform="Test")
    response = auth_client.post(
        f"/api/v1/tasks/{task.id}/attachments/",
        {"file": SimpleUploadedFile("file.txt", b"data")},
        format="multipart",
    )
    assert response.status_code == 404


@pytest.mark.django_db()
def test_contact_validation(auth_client, user):
    contact = Contact.objects.create(owner=user, name="Valid")
    response = auth_client.post(
        "/api/v1/tasks/",
        {"title": "Task", "contact": contact.id},
        format="json",
    )
    assert response.status_code == 201

    response = auth_client.post(
        "/api/v1/tasks/",
        {"title": "Task", "contact_freeform": "Call"},
        format="json",
    )
    assert response.status_code == 201

    response = auth_client.post(
        "/api/v1/tasks/",
        {"title": "Task"},
        format="json",
    )
    assert response.status_code == 400
