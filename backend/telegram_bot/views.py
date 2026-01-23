"""Views for Telegram bot integration."""

import secrets
import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from planner.models import Contact, Profile, Project, Task
from planner.serializers import ProfileSerializer

from .serializers import (
    TelegramFullTaskSerializer,
    TelegramLinkConfirmSerializer,
    TelegramLoginSerializer,
    TelegramNotificationsSerializer,
    TelegramPasswordResetSerializer,
    TelegramQuickTaskSerializer,
)

User = get_user_model()


def _require_bot_token(request):
    bot_token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not bot_token:
        return Response(
            {'detail': 'Telegram bot token is not configured.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )
    provided = request.headers.get('X-Telegram-Bot-Token', '')
    if not provided or not secrets.compare_digest(provided, bot_token):
        return Response({'detail': 'Invalid bot token.'}, status=status.HTTP_401_UNAUTHORIZED)
    return None


def _get_profile_by_chat_id(chat_id):
    return Profile.objects.select_related('user').filter(telegram_chat_id=chat_id).first()


def _serialize_task_for_bot(task):
    return {
        'id': task.id,
        'title': task.title,
        'description': task.description,
        'urgency': task.urgency,
        'status': task.status,
        'due_date': task.due_date,
        'project_id': task.project_id,
        'contact_id': task.contact_id,
        'contact_freeform': task.contact_freeform,
        'tagged_username': task.tagged_user.username if task.tagged_user else None,
        'created_at': task.created_at,
        'updated_at': task.updated_at,
    }


class TelegramLinkRefreshView(APIView):
    """Refresh Telegram link token for current user."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.telegram_link_token = uuid.uuid4()
        profile.save(update_fields=['telegram_link_token'])
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)


class TelegramLinkConfirmView(APIView):
    """Confirm Telegram link from the bot."""

    permission_classes = [AllowAny]

    def post(self, request):
        auth_error = _require_bot_token(request)
        if auth_error:
            return auth_error
        serializer = TelegramLinkConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = get_object_or_404(
            Profile, telegram_link_token=serializer.validated_data['link_token']
        )
        telegram_username = serializer.validated_data.get('telegram_username', '').strip()
        update_fields = ['telegram_chat_id', 'telegram_linked_at']
        profile.telegram_chat_id = serializer.validated_data['chat_id']
        profile.telegram_linked_at = timezone.now()
        if telegram_username and not profile.telegram_username:
            profile.telegram_username = telegram_username
            update_fields.append('telegram_username')
        profile.save(update_fields=update_fields)
        return Response({'detail': 'Telegram account linked.'})


class TelegramQuickTaskCreateView(APIView):
    """Create a quick task (title + description) via Telegram bot."""

    permission_classes = [AllowAny]

    def post(self, request):
        auth_error = _require_bot_token(request)
        if auth_error:
            return auth_error
        serializer = TelegramQuickTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = _get_profile_by_chat_id(serializer.validated_data['chat_id'])
        if not profile:
            return Response(
                {'detail': 'Telegram account is not linked.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        task = Task.objects.create(
            owner=profile.user,
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
        )
        return Response(_serialize_task_for_bot(task), status=status.HTTP_201_CREATED)


class TelegramFullTaskCreateView(APIView):
    """Create a full task via Telegram bot."""

    permission_classes = [AllowAny]

    def post(self, request):
        auth_error = _require_bot_token(request)
        if auth_error:
            return auth_error
        serializer = TelegramFullTaskSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = _get_profile_by_chat_id(serializer.validated_data['chat_id'])
        if not profile:
            return Response(
                {'detail': 'Telegram account is not linked.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        contact = None
        if serializer.validated_data.get('contact_id'):
            contact = get_object_or_404(
                Contact,
                id=serializer.validated_data['contact_id'],
                owner=profile.user,
            )
        project = None
        if serializer.validated_data.get('project_id'):
            project = get_object_or_404(
                Project,
                id=serializer.validated_data['project_id'],
                owner=profile.user,
            )
        tagged_user = None
        tagged_username = serializer.validated_data.get('tagged_username')
        if tagged_username:
            tagged_user = User.objects.filter(username=tagged_username).first()
        task = Task.objects.create(
            owner=profile.user,
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
            urgency=serializer.validated_data.get('urgency', Task.Urgency.MEDIUM),
            due_date=serializer.validated_data.get('due_date'),
            status=serializer.validated_data.get('status', Task.Status.TODO),
            contact=contact,
            contact_freeform=serializer.validated_data.get('contact_freeform', ''),
            project=project,
            tagged_user=tagged_user,
        )
        return Response(_serialize_task_for_bot(task), status=status.HTTP_201_CREATED)


class TelegramTaskDetailView(APIView):
    """Return task details for Telegram bot."""

    permission_classes = [AllowAny]

    def get(self, request, task_id):
        auth_error = _require_bot_token(request)
        if auth_error:
            return auth_error
        chat_id = request.query_params.get('chat_id')
        if not chat_id or not str(chat_id).isdigit():
            return Response(
                {'detail': 'chat_id is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        profile = _get_profile_by_chat_id(int(chat_id))
        if not profile:
            return Response(
                {'detail': 'Telegram account is not linked.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        task = get_object_or_404(
            Task.objects.filter(Q(owner=profile.user) | Q(tagged_user=profile.user)),
            pk=task_id,
        )
        return Response(_serialize_task_for_bot(task))


class TelegramNotificationsView(APIView):
    """Update Telegram notification settings via bot."""

    permission_classes = [AllowAny]

    def post(self, request):
        auth_error = _require_bot_token(request)
        if auth_error:
            return auth_error
        serializer = TelegramNotificationsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = _get_profile_by_chat_id(serializer.validated_data['chat_id'])
        if not profile:
            return Response(
                {'detail': 'Telegram account is not linked.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        notifications_enabled = serializer.validated_data.get('notifications_enabled')
        notify_on_tag = serializer.validated_data.get('notify_on_tag')
        update_fields = []
        if notifications_enabled is not None:
            profile.telegram_notifications_enabled = notifications_enabled
            update_fields.append('telegram_notifications_enabled')
        if notify_on_tag is not None:
            profile.telegram_notify_on_tag = notify_on_tag
            update_fields.append('telegram_notify_on_tag')
        if update_fields:
            profile.save(update_fields=update_fields)
        return Response({'detail': 'Notification settings updated.'})


class TelegramPasswordResetView(APIView):
    """Reset password via Telegram bot."""

    permission_classes = [AllowAny]

    def post(self, request):
        auth_error = _require_bot_token(request)
        if auth_error:
            return auth_error
        serializer = TelegramPasswordResetSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = _get_profile_by_chat_id(serializer.validated_data['chat_id'])
        if not profile:
            return Response(
                {'detail': 'Telegram account is not linked.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        user = profile.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})


class TelegramLoginView(APIView):
    """Return JWT tokens for Telegram bot login."""

    permission_classes = [AllowAny]

    def post(self, request):
        auth_error = _require_bot_token(request)
        if auth_error:
            return auth_error
        serializer = TelegramLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        profile = _get_profile_by_chat_id(serializer.validated_data['chat_id'])
        if not profile:
            return Response(
                {'detail': 'Telegram account is not linked.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        refresh = RefreshToken.for_user(profile.user)
        return Response({'refresh': str(refresh), 'access': str(refresh.access_token)})
