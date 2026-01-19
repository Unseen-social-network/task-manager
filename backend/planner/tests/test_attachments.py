"""
Tests for Attachment API endpoints.
"""

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from planner.models import Attachment


@pytest.mark.django_db
class TestAttachmentAPI:
    """Tests for Attachment operations and permissions."""

    def test_upload_attachment_to_own_task(
        self, authenticated_client, user, task
    ):
        """Test uploading attachment to own task."""
        url = f"/api/v1/tasks/{task.id}/attachments/"

        # Create a simple test file
        file_content = b"Test file content"
        file = SimpleUploadedFile(
            "test.txt", file_content, content_type="text/plain"
        )

        data = {"file": file}
        response = authenticated_client.post(url, data, format="multipart")

        assert response.status_code == status.HTTP_201_CREATED
        assert Attachment.objects.filter(task=task, owner=user).exists()

    def test_upload_attachment_to_other_user_task_forbidden(
        self, authenticated_client, other_task
    ):
        """Test that uploading to another user's task is forbidden."""
        url = f"/api/v1/tasks/{other_task.id}/attachments/"

        file = SimpleUploadedFile(
            "malicious.txt", b"Bad content", content_type="text/plain"
        )

        data = {"file": file}
        response = authenticated_client.post(url, data, format="multipart")

        # Should return 404 because task doesn't exist in user's queryset
        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert not Attachment.objects.filter(task=other_task).exists()

    def test_list_attachments_for_task(self, authenticated_client, user, task):
        """Test listing attachments for a task."""
        # Create attachment
        file = SimpleUploadedFile("file1.txt", b"Content 1")
        Attachment.objects.create(owner=user, task=task, file=file)

        url = f"/api/v1/tasks/{task.id}/attachments/"
        response = authenticated_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1

    def test_delete_own_attachment(self, authenticated_client, user, task):
        """Test deleting own attachment."""
        file = SimpleUploadedFile("delete_me.txt", b"Delete this")
        attachment = Attachment.objects.create(
            owner=user, task=task, file=file
        )

        url = f"/api/v1/attachments/{attachment.id}/"
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert not Attachment.objects.filter(id=attachment.id).exists()

    def test_delete_other_user_attachment_forbidden(
        self, authenticated_client, other_user, other_task
    ):
        """Test that deleting another user's attachment returns 404."""
        file = SimpleUploadedFile("protected.txt", b"Protected content")
        attachment = Attachment.objects.create(
            owner=other_user, task=other_task, file=file
        )

        url = f"/api/v1/attachments/{attachment.id}/"
        response = authenticated_client.delete(url)

        assert response.status_code == status.HTTP_404_NOT_FOUND
        assert Attachment.objects.filter(id=attachment.id).exists()

    def test_attachment_metadata(self, authenticated_client, user, task):
        """Test that attachment metadata is correctly stored."""
        url = f"/api/v1/tasks/{task.id}/attachments/"

        file_content = b"Test content for metadata"
        file = SimpleUploadedFile(
            "metadata_test.pdf", file_content, content_type="application/pdf"
        )

        data = {"file": file}
        response = authenticated_client.post(url, data, format="multipart")

        assert response.status_code == status.HTTP_201_CREATED

        attachment = Attachment.objects.get(id=response.data["id"])
        assert attachment.size == len(file_content)
        assert attachment.original_name  # Should be auto-populated
