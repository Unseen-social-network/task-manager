"""
Serializers for Planner application.
"""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Attachment,
    Contact,
    Invite,
    Profile,
    Project,
    SiteAnalyticsSettings,
    Task,
    TaskComment,
)

User = get_user_model()


class ContactSerializer(serializers.ModelSerializer):
    """Serializer for Contact model."""

    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Contact
        fields = [
            'id',
            'owner',
            'name',
            'username',
            'company',
            'phone',
            'email',
            'telegram',
            'other',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AttachmentSerializer(serializers.ModelSerializer):
    """Serializer for Attachment model."""

    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Attachment
        fields = [
            'id',
            'owner',
            'task',
            'file',
            'file_url',
            'original_name',
            'size',
            'created_at',
        ]
        read_only_fields = ['id', 'file_url', 'size', 'created_at']

    def get_file_url(self, obj):
        """Return full URL for file access."""
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None

    def validate_task(self, value):
        """Ensure task belongs to the current user."""
        request = self.context.get('request')
        if request and value.owner != request.user:
            raise serializers.ValidationError(
                "Cannot attach file to another user's task."
            )
        return value


class AttachmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating attachments (nested under task)."""

    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Attachment
        fields = ['id', 'owner', 'file', 'original_name', 'size', 'created_at']
        read_only_fields = ['id', 'size', 'created_at']


class TaskSerializer(serializers.ModelSerializer):
    """Serializer for Task model."""

    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    attachments = AttachmentSerializer(many=True, read_only=True)
    contact_name = serializers.CharField(source='contact.name', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    tagged_user = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Task
        fields = [
            'id',
            'owner',
            'project',
            'project_name',
            'tagged_user',
            'title',
            'description',
            'urgency',
            'due_date',
            'status',
            'contact',
            'contact_name',
            'contact_freeform',
            'time_spent_seconds',
            'tracking_completed',
            'pomodoro_sessions',
            'attachments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'contact_name',
            'project_name',
        ]

    def validate_contact(self, value):
        """Ensure contact belongs to the current user."""
        request = self.context.get('request')
        if value and request and value.owner != request.user:
            raise serializers.ValidationError("Cannot use another user's contact.")
        return value

    def validate_project(self, value):
        """Ensure project belongs to the current user."""
        request = self.context.get('request')
        if value and request and value.owner != request.user:
            raise serializers.ValidationError("Cannot use another user's project.")
        return value

    def validate(self, attrs):
        """
        Validate contact fields.
        Both contact and contact_freeform can be set, or neither, or just one.
        """
        contact = attrs.get('contact')
        contact_freeform = attrs.get('contact_freeform', '')

        # Optional: warn if both are set (but allow it)
        # In real UI, typically one would be used
        if contact and contact_freeform:
            # This is allowed, but you could add a warning in logs
            pass

        return attrs

    def create(self, validated_data):
        """Attach tagging actor to the instance before saving."""
        request = self.context.get('request')
        actor = getattr(request, 'user', None)
        task = Task(**validated_data)
        if actor and actor.is_authenticated:
            task._tagged_by = actor
        task.save()
        return task

    def update(self, instance, validated_data):
        """Attach tagging actor to the instance before saving updates."""
        request = self.context.get('request')
        actor = getattr(request, 'user', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if actor and actor.is_authenticated:
            instance._tagged_by = actor
        instance.save()
        return instance


class TaskCommentSerializer(serializers.ModelSerializer):
    """Serializer for Task comments with optional replies."""

    task = serializers.PrimaryKeyRelatedField(read_only=True)
    author = serializers.HiddenField(default=serializers.CurrentUserDefault())
    author_username = serializers.CharField(source='author.username', read_only=True)
    parent = serializers.PrimaryKeyRelatedField(
        queryset=TaskComment.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = TaskComment
        fields = [
            'id',
            'task',
            'parent',
            'author',
            'author_username',
            'body',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'author_username', 'created_at', 'updated_at']

    def validate(self, attrs):
        parent = attrs.get('parent')
        task = (
            attrs.get('task')
            or getattr(self.instance, 'task', None)
            or self.context.get('task')
        )
        request = self.context.get('request')
        if (
            request
            and task
            and not Task.objects.filter(id=task.id)
            .filter(Q(owner=request.user) | Q(tagged_user=request.user))
            .exists()
        ):
            raise serializers.ValidationError('Task not found or access denied.')
        if parent and task and parent.task_id != task.id:
            raise serializers.ValidationError(
                {'parent': 'Parent comment must belong to the same task.'}
            )
        return attrs


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model."""

    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    is_owner = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id',
            'owner',
            'name',
            'description',
            'phone',
            'links',
            'is_owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_is_owner(self, obj):
        """Return whether the current user owns this project."""
        request = self.context.get('request')
        if not request:
            return False
        return obj.owner_id == request.user.id


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""

    username = serializers.CharField(source='user.username', read_only=True)
    invites_remaining = serializers.SerializerMethodField()
    inviter_username = serializers.SerializerMethodField()
    telegram_link_url = serializers.SerializerMethodField()
    telegram_connected = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'username',
            'full_name',
            'telegram_chat_id',
            'telegram_username',
            'telegram_link_url',
            'telegram_connected',
            'telegram_notifications_enabled',
            'telegram_notify_on_tag',
            'yandex_metrika_id',
            'invite_quota',
            'invites_remaining',
            'inviter_username',
        ]
        read_only_fields = [
            'username',
            'telegram_chat_id',
            'telegram_username',
            'telegram_link_url',
            'telegram_connected',
            'invite_quota',
            'invites_remaining',
            'inviter_username',
        ]

    def validate_yandex_metrika_id(self, value):
        """Allow clearing the counter ID with empty input."""
        if value in ('', None):
            return None
        return value

    def validate_telegram_username(self, value):
        if not value:
            return ''
        normalized = value.strip()
        if normalized.startswith('@'):
            normalized = normalized[1:]
        if not normalized.replace('_', '').isalnum() or not (
            5 <= len(normalized) <= 32
        ):
            raise serializers.ValidationError(
                'Telegram username must be 5-32 characters and contain only letters, numbers, or underscores.'
            )
        return f'@{normalized}'

    def get_invites_remaining(self, obj):
        used_invites = Invite.objects.filter(
            invited_by=obj.user,
            status__in=[Invite.Status.PENDING, Invite.Status.ACCEPTED],
        ).count()
        return max(obj.invite_quota - used_invites, 0)

    def get_inviter_username(self, obj):
        invite = (
            Invite.objects.filter(
                invited_user=obj.user,
                status=Invite.Status.ACCEPTED,
            )
            .select_related('invited_by')
            .order_by('-accepted_at')
            .first()
        )
        if invite and invite.invited_by:
            return invite.invited_by.username
        return None

    def get_telegram_link_url(self, obj):
        bot_username = getattr(
            self.context.get('request'), 'telegram_bot_username', None
        )
        if not bot_username:
            from django.conf import settings

            bot_username = getattr(settings, 'TELEGRAM_BOT_USERNAME', '')
        bot_username = bot_username.lstrip('@')
        if not bot_username:
            return None
        return f'https://t.me/{bot_username}?start={obj.telegram_link_token}'

    def get_telegram_connected(self, obj):
        return obj.telegram_chat_id is not None


class SiteAnalyticsSettingsSerializer(serializers.ModelSerializer):
    """Serializer for site-wide analytics settings."""

    class Meta:
        model = SiteAnalyticsSettings
        fields = ['yandex_metrika_id', 'enabled', 'updated_at']
        read_only_fields = ['updated_at']

    def validate_yandex_metrika_id(self, value):
        """Normalize empty values to null for easier disabling."""
        if value in ('', None):
            return None
        return value


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer for password change."""

    old_password = serializers.CharField()
    new_password = serializers.CharField()

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value


class InviteSerializer(serializers.ModelSerializer):
    """Serializer for listing invites."""

    invited_by_username = serializers.CharField(
        source='invited_by.username', read_only=True
    )
    invited_by_full_name = serializers.CharField(
        source='invited_by.profile.full_name', read_only=True
    )

    class Meta:
        model = Invite
        fields = [
            'id',
            'email',
            'status',
            'token',
            'invited_at',
            'accepted_at',
            'revoked_at',
            'invited_by_username',
            'invited_by_full_name',
        ]
        read_only_fields = [
            'id',
            'status',
            'token',
            'invited_at',
            'accepted_at',
            'revoked_at',
            'invited_by_username',
            'invited_by_full_name',
        ]


class InviteCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating invites."""

    class Meta:
        model = Invite
        fields = ['email']

    def validate(self, attrs):
        request = self.context['request']
        profile, _ = Profile.objects.get_or_create(user=request.user)
        email = attrs.get('email')
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError('User with this email already exists.')
        if (
            email
            and Invite.objects.filter(
                email__iexact=email,
                status=Invite.Status.PENDING,
            ).exists()
        ):
            raise serializers.ValidationError('Invite has already been sent.')
        used_invites = Invite.objects.filter(
            invited_by=request.user,
            status__in=[Invite.Status.PENDING, Invite.Status.ACCEPTED],
        ).count()
        if used_invites >= profile.invite_quota:
            raise serializers.ValidationError('No invites remaining.')
        return attrs

    def create(self, validated_data):
        request = self.context['request']
        return Invite.objects.create(
            invited_by=request.user,
            email=validated_data['email'],
        )


class InviteAcceptSerializer(serializers.Serializer):
    """Serializer for accepting invites."""

    username = serializers.CharField()
    full_name = serializers.CharField()
    password = serializers.CharField()

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username is already taken.')
        return value

    def validate_password(self, value):
        try:
            validate_password(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(list(error.messages))
        return value

    def save(self, invite):
        user = User.objects.create_user(
            username=self.validated_data['username'],
            email=invite.email,
            password=self.validated_data['password'],
        )
        profile = user.profile
        profile.full_name = self.validated_data['full_name']
        profile.save()

        invite.status = Invite.Status.ACCEPTED
        invite.invited_user = user
        invite.accepted_at = timezone.now()
        invite.save(update_fields=['status', 'invited_user', 'accepted_at'])
        return user
