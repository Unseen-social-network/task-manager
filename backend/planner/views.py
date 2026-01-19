"""
Views for Planner application.
"""

from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .filters import TaskFilter
from .models import Attachment, Contact, Task
from .permissions import IsOwner, IsTaskOwner
from .serializers import (
    AttachmentCreateSerializer,
    AttachmentSerializer,
    ContactSerializer,
    TaskSerializer,
)


class ContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Contact CRUD operations.
    Users can only access their own contacts.
    """

    serializer_class = ContactSerializer
    permission_classes = [IsOwner]
    filterset_fields = ["company"]
    search_fields = ["name", "company", "phone", "email", "telegram", "notes"]
    ordering_fields = ["name", "company", "created_at", "updated_at"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Return only contacts owned by the current user."""
        return Contact.objects.filter(owner=self.request.user)

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        This prevents revealing existence of other users' contacts.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get("pk"))
        self.check_object_permissions(self.request, obj)
        return obj


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task CRUD operations.
    Users can only access their own tasks.
    """

    serializer_class = TaskSerializer
    permission_classes = [IsOwner]
    filterset_class = TaskFilter
    search_fields = ["title", "description", "contact_freeform"]
    ordering_fields = ["due_date", "created_at", "urgency", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        """Return only tasks owned by the current user."""
        return Task.objects.filter(owner=self.request.user).select_related("contact")

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        This prevents revealing existence of other users' tasks.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get("pk"))
        self.check_object_permissions(self.request, obj)
        return obj

    @action(
        detail=True,
        methods=["get", "post"],
        permission_classes=[IsTaskOwner],
        parser_classes=[MultiPartParser, FormParser],
    )
    def attachments(self, request, pk=None):
        """
        Nested endpoint for task attachments.
        GET: list all attachments for this task
        POST: upload new attachment to this task
        """
        task = self.get_object()

        if request.method == "GET":
            attachments = task.attachments.all()
            serializer = AttachmentSerializer(
                attachments, many=True, context={"request": request}
            )
            return Response(serializer.data)

        elif request.method == "POST":
            # Create attachment for this task
            serializer = AttachmentCreateSerializer(
                data=request.data, context={"request": request}
            )
            serializer.is_valid(raise_exception=True)
            serializer.save(task=task, owner=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)


class AttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Attachment operations.
    Only DELETE is exposed at the top level.
    Creation happens via /tasks/{id}/attachments/
    """

    serializer_class = AttachmentSerializer
    permission_classes = [IsOwner]
    http_method_names = ["get", "delete"]  # Only allow GET and DELETE

    def get_queryset(self):
        """Return only attachments owned by the current user."""
        return Attachment.objects.filter(owner=self.request.user).select_related("task")

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get("pk"))
        self.check_object_permissions(self.request, obj)
        return obj
