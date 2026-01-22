"""
Views for Planner application.
"""

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import TaskFilter, TaskSearchFilter
from .models import Attachment, Contact, Invite, Profile, Project, Task
from .permissions import (
    IsOwner,
    ProjectAccessPermission,
    TaskAccessPermission,
    TaskCommentAccessPermission,
)
from .serializers import (
    AttachmentCreateSerializer,
    AttachmentSerializer,
    ContactSerializer,
    InviteAcceptSerializer,
    InviteCreateSerializer,
    InviteSerializer,
    PasswordChangeSerializer,
    ProfileSerializer,
    ProjectSerializer,
    TaskCommentSerializer,
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
    filter_backends = [DjangoFilterBackend, TaskSearchFilter, OrderingFilter]
    search_fields = ['title', 'contact_freeform']
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

        task = get_object_or_404(
            Task.objects.filter(Q(owner=request.user) | Q(tagged_user=request.user)),
            pk=pk,
        )
        serializer = AttachmentCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(task=task, owner=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['get', 'post'],
        permission_classes=[IsAuthenticated, TaskCommentAccessPermission],
    )
    def comments(self, request, pk=None):
        """
        Nested endpoint for task comments.
        GET: list all comments for this task
        POST: add a new comment or reply
        """
        task = get_object_or_404(
            Task.objects.filter(Q(owner=request.user) | Q(tagged_user=request.user)),
            pk=pk,
        )

        if request.method == 'GET':
            serializer = TaskCommentSerializer(
                task.comments.select_related('author', 'parent').all(),
                many=True,
                context={'request': request, 'task': task},
            )
            return Response(serializer.data)

        serializer = TaskCommentSerializer(
            data=request.data,
            context={'request': request, 'task': task},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(task=task, author=request.user)
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
    permission_classes = [IsAuthenticated, ProjectAccessPermission]
    search_fields = ['name', 'description', 'phone']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return projects owned by or tagged for the current user."""
        user = self.request.user
        base_queryset = Project.objects.filter(owner=user)
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            base_queryset = base_queryset | Project.objects.filter(
                tasks__tagged_user=user
            )
        return base_queryset.distinct()

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj)
        return obj


class ProfileView(APIView):
    """Retrieve and update the current user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class PasswordChangeView(APIView):
    """Change the current user's password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})


class InviteViewSet(viewsets.ModelViewSet):
    """Manage invites sent by the current user."""

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        return Invite.objects.filter(invited_by=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return InviteCreateSerializer
        return InviteSerializer

    def perform_create(self, serializer):
        invite = serializer.save()
        frontend_base_url = getattr(
            settings,
            'FRONTEND_BASE_URL',
            'http://localhost:3000',
        )
        invite_url = f'{frontend_base_url}/invite/{invite.token}'
        profile, _ = Profile.objects.get_or_create(user=invite.invited_by)
        inviter_name = profile.full_name or invite.invited_by.username
        send_mail(
            subject='You have been invited to Planner',
            message=(
                f'{inviter_name} invited you to Planner.\n'
                f'Follow the link to join: {invite_url}'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invite.email],
            fail_silently=False,
        )

    def destroy(self, request, *args, **kwargs):
        invite = self.get_object()
        if invite.status != Invite.Status.PENDING:
            return Response(
                {'detail': 'Only pending invites can be revoked.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invite.status = Invite.Status.REVOKED
        invite.revoked_at = timezone.now()
        invite.save(update_fields=['status', 'revoked_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InviteAcceptView(APIView):
    """Accept invite via token."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        invite = get_object_or_404(Invite, token=token)
        serializer = InviteSerializer(invite)
        return Response(serializer.data)

    def post(self, request, token):
        invite = get_object_or_404(Invite, token=token)
        if invite.status != Invite.Status.PENDING:
            return Response(
                {'detail': 'Invite is no longer active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = InviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save(invite=invite)
        return Response(
            {'detail': 'Invite accepted successfully.'}, status=status.HTTP_201_CREATED
        )
