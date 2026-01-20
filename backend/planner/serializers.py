"""
Serializers for Planner application.
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Attachment, Contact, Project, Task

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


class ProjectSerializer(serializers.ModelSerializer):
    """Serializer for Project model."""

    owner = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Project
        fields = [
            'id',
            'owner',
            'name',
            'description',
            'phone',
            'links',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
