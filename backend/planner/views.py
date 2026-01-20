"""
Views for Planner application.
"""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .filters import TaskFilter
from .models import Attachment, Contact, Project, Task
from .permissions import IsOwner, TaskAccessPermission
from .serializers import (
    AttachmentCreateSerializer,
    AttachmentSerializer,
    ContactSerializer,
    ProjectSerializer,
    TaskSerializer,
)


class ContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Contact CRUD operations.
    Users can only access their own contacts.
    """

    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['company']
    search_fields = ['name', 'company', 'phone', 'email', 'telegram', 'notes']
    ordering_fields = ['name', 'company', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return only contacts owned by the current user."""
        return Contact.objects.filter(owner=self.request.user)

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        This prevents revealing existence of other users' contacts.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj)
        return obj


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task CRUD operations.
    Users can only access their own tasks.
    """

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, TaskAccessPermission]
    filterset_class = TaskFilter
    search_fields = ['title', 'description', 'contact_freeform']
    ordering_fields = ['due_date', 'created_at', 'urgency', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return tasks owned by or tagged for the current user."""
        user = self.request.user
        base_queryset = Task.objects.filter(owner=user)
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            base_queryset = base_queryset | Task.objects.filter(tagged_user=user)
        return base_queryset.select_related(
            'contact', 'project', 'tagged_user'
        ).distinct()

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        This prevents revealing existence of other users' tasks.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj)
        return obj

    @action(
        detail=True,
        methods=['get', 'post'],
        parser_classes=[MultiPartParser, FormParser],
    )
    def attachments(self, request, pk=None):
        """
        Nested endpoint for task attachments.
        GET: list all attachments for this task
        POST: upload new attachment to this task
        """
        task = get_object_or_404(
            Task.objects.filter(Q(owner=request.user) | Q(tagged_user=request.user)),
            pk=pk,
        )

        if request.method == 'GET':
            serializer = AttachmentSerializer(
                task.attachments.all(),
                many=True,
                context={'request': request},
            )
            return Response(serializer.data)

        task = get_object_or_404(Task, pk=pk, owner=request.user)
        serializer = AttachmentCreateSerializer(
            data=request.data,
            context={'request': request},
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
    http_method_names = ['get', 'delete']  # Only allow GET and DELETE

    def get_queryset(self):
        """Return only attachments owned by the current user."""
        return Attachment.objects.filter(owner=self.request.user).select_related('task')

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj)
        return obj


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project CRUD operations.
    Users can only access their own projects.
    """

    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    search_fields = ['name', 'description', 'phone']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return only projects owned by the current user."""
        return Project.objects.filter(owner=self.request.user)

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj)
        return obj
