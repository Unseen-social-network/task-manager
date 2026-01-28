"""
Serializers for Planner application.
"""

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from django.utils import timezone
from rest_framework import serializers

from .models import (
    Attachment,
    Contact,
    ContactShare,
    ContactShareAccess,
    Invite,
    Profile,
    Project,
    ProjectShare,
    ProjectShareAccess,
    SiteSetting,
    Task,
    TaskComment,
)

User = get_user_model()


class ContactSerializer(serializers.ModelSerializer):
    """Serializer for Contact model."""

    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())
    is_owner = serializers.SerializerMethodField()

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
            'is_owner',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'is_owner']

    def get_is_owner(self, obj):
        """Return whether the current user owns this contact."""
        request = self.context.get('request')
        if not request:
            return False
        return obj.owner_id == request.user.id


class ContactShareSerializer(serializers.ModelSerializer):
    """Serializer for contact share links."""

    share_url = serializers.SerializerMethodField()
    copy_url = serializers.SerializerMethodField()

    class Meta:
        model = ContactShare
        fields = [
            'token',
            'is_active',
            'created_at',
            'revoked_at',
            'share_url',
            'copy_url',
        ]
        read_only_fields = fields

    def _build_frontend_url(self, suffix):
        base_url = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
        return f'{base_url}{suffix}'

    def get_share_url(self, obj):
        return self._build_frontend_url(f'/contacts?shareToken={obj.token}')

    def get_copy_url(self, obj):
        return self._build_frontend_url(f'/contacts?copyToken={obj.token}')


class ContactShareAccessSerializer(serializers.ModelSerializer):
    """Serializer for contact share viewers."""

    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = ContactShareAccess
        fields = ['user_id', 'username', 'email', 'created_at']
        read_only_fields = fields


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

    def get_file_url(self, obj) -> str | None:
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
    contact_names = serializers.SerializerMethodField()
    project_name = serializers.CharField(source='project.name', read_only=True)
    tagged_user = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all(),
        allow_null=True,
        required=False,
    )
    tagged_users = serializers.SlugRelatedField(
        slug_field='username',
        queryset=User.objects.all(),
        many=True,
        required=False,
    )
    contacts = serializers.PrimaryKeyRelatedField(
        queryset=Contact.objects.all(),
        many=True,
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
            'tagged_users',
            'title',
            'description',
            'urgency',
            'due_date',
            'status',
            'contact',
            'contact_name',
            'contacts',
            'contact_names',
            'contact_freeform',
            'time_spent_seconds',
            'tracking_completed',
            'pomodoro_sessions',
            'has_question',
            'completion_requested',
            'attachments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'contact_name',
            'contact_names',
            'project_name',
        ]

    def validate_contact(self, value):
        """Ensure contact belongs to the current user."""
        request = self.context.get('request')
        if (
            value
            and request
            and value.owner != request.user
            and not ContactShareAccess.objects.filter(
                contact=value, user=request.user
            ).exists()
        ):
            raise serializers.ValidationError("Cannot use another user's contact.")
        return value

    def validate_contacts(self, value):
        """Ensure contacts belong to the current user or are shared."""
        request = self.context.get('request')
        if not value or not request:
            return value
        invalid_contacts = [
            contact
            for contact in value
            if contact.owner != request.user
            and not ContactShareAccess.objects.filter(
                contact=contact, user=request.user
            ).exists()
        ]
        if invalid_contacts:
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
        tagged_users = validated_data.pop('tagged_users', None)
        contacts = validated_data.pop('contacts', None)
        task = Task(**validated_data)
        if actor and actor.is_authenticated:
            task._tagged_by = actor
        task.save()
        if tagged_users is not None:
            task.tagged_users.set(tagged_users)
        if contacts is not None:
            task.contacts.set(contacts)
        elif task.contact:
            task.contacts.set([task.contact])
        return task

    def update(self, instance, validated_data):
        """Attach tagging actor to the instance before saving updates."""
        request = self.context.get('request')
        actor = getattr(request, 'user', None)
        tagged_users = validated_data.pop('tagged_users', None)
        contacts = validated_data.pop('contacts', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if actor and actor.is_authenticated:
            instance._tagged_by = actor
        instance.save()
        if tagged_users is not None:
            instance.tagged_users.set(tagged_users)
        if contacts is not None:
            instance.contacts.set(contacts)
        elif instance.contact and not instance.contacts.exists():
            instance.contacts.set([instance.contact])
        return instance

    def get_contact_names(self, obj):
        return [contact.name for contact in obj.contacts.all()]


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


class ProjectShareSerializer(serializers.ModelSerializer):
    """Serializer for project share links."""

    share_url = serializers.SerializerMethodField()
    copy_url = serializers.SerializerMethodField()

    class Meta:
        model = ProjectShare
        fields = [
            'token',
            'is_active',
            'created_at',
            'revoked_at',
            'share_url',
            'copy_url',
        ]
        read_only_fields = fields

    def _build_frontend_url(self, suffix):
        base_url = getattr(settings, 'FRONTEND_BASE_URL', '').rstrip('/')
        return f'{base_url}{suffix}'

    def get_share_url(self, obj):
        return self._build_frontend_url(f'/projects?shareToken={obj.token}')

    def get_copy_url(self, obj):
        return self._build_frontend_url(f'/projects?copyToken={obj.token}')


class ProjectShareAccessSerializer(serializers.ModelSerializer):
    """Serializer for project share viewers."""

    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)

    class Meta:
        model = ProjectShareAccess
        fields = ['user_id', 'username', 'email', 'created_at']
        read_only_fields = fields


class ProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""

    username = serializers.CharField(source='user.username', read_only=True)
    invites_remaining = serializers.SerializerMethodField()
    inviter_username = serializers.SerializerMethodField()
    self_contact_id = serializers.IntegerField(source='self_contact.id', read_only=True)
    telegram_link_url = serializers.SerializerMethodField()
    telegram_connected = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'username',
            'full_name',
            'self_contact_id',
            'telegram_chat_id',
            'telegram_username',
            'telegram_link_url',
            'telegram_connected',
            'telegram_notifications_enabled',
            'telegram_notify_on_tag',
            'share_invite_contact',
            'invite_quota',
            'invites_remaining',
            'inviter_username',
        ]
        read_only_fields = [
            'username',
            'self_contact_id',
            'telegram_chat_id',
            'telegram_username',
            'telegram_link_url',
            'telegram_connected',
            'invite_quota',
            'invites_remaining',
            'inviter_username',
        ]

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

    def update(self, instance, validated_data):
        previous_share = instance.share_invite_contact
        instance = super().update(instance, validated_data)
        if instance.self_contact:
            instance.ensure_self_contact()

        share_invite_contact = instance.share_invite_contact
        if previous_share != share_invite_contact:
            invite = (
                Invite.objects.filter(
                    invited_user=instance.user,
                    status=Invite.Status.ACCEPTED,
                )
                .select_related('invited_by')
                .order_by('-accepted_at')
                .first()
            )
            inviter = invite.invited_by if invite else None
            if inviter:
                if share_invite_contact:
                    contact = instance.ensure_self_contact()
                    ContactShareAccess.objects.get_or_create(
                        contact=contact,
                        user=inviter,
                        defaults={'granted_by': instance.user},
                    )
                else:
                    ContactShareAccess.objects.filter(
                        contact=instance.self_contact,
                        user=inviter,
                    ).delete()
        return instance

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


class SiteSettingSerializer(serializers.ModelSerializer):
    """Serializer for public site settings."""

    class Meta:
        model = SiteSetting
        fields = ['head_html', 'updated_at']
        read_only_fields = ['head_html', 'updated_at']


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
    invited_user_username = serializers.CharField(
        source='invited_user.username', read_only=True
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
            'invited_user_username',
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
            'invited_user_username',
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

        contact = profile.ensure_self_contact()
        if profile.share_invite_contact and invite.invited_by:
            ContactShareAccess.objects.get_or_create(
                contact=contact,
                user=invite.invited_by,
                defaults={'granted_by': user},
            )

        invite.status = Invite.Status.ACCEPTED
        invite.invited_user = user
        invite.accepted_at = timezone.now()
        invite.save(update_fields=['status', 'invited_user', 'accepted_at'])
        return user
