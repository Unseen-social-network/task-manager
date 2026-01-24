"""
Admin configuration for Planner models.
"""

from django.contrib import admin

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


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'company', 'phone', 'email', 'created_at']
    list_filter = ['created_at', 'owner']
    search_fields = ['name', 'company', 'phone', 'email', 'telegram']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {'fields': ('owner', 'name', 'company')}),
        (
            'Contact Information',
            {'fields': ('phone', 'email', 'telegram', 'other')},
        ),
        ('Additional', {'fields': ('notes',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'owner', 'phone', 'created_at', 'updated_at']
    list_filter = ['owner', 'created_at']
    search_fields = ['name', 'description', 'phone']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {'fields': ('owner', 'name')}),
        ('Details', {'fields': ('description', 'phone', 'links')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'owner',
        'project',
        'tagged_user',
        'status',
        'urgency',
        'due_date',
        'created_at',
    ]
    list_filter = ['status', 'urgency', 'created_at', 'owner', 'project']
    search_fields = ['title', 'description', 'contact_freeform']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {'fields': ('owner', 'title', 'description')}),
        (
            'Status & Priority',
            {'fields': ('status', 'urgency', 'due_date')},
        ),
        (
            'Project & Tagging',
            {'fields': ('project', 'tagged_user')},
        ),
        (
            'Contact',
            {'fields': ('contact', 'contact_freeform')},
        ),
        (
            'Tracking',
            {'fields': ('time_spent_seconds', 'tracking_completed')},
        ),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['original_name', 'task', 'owner', 'size', 'created_at']
    list_filter = ['created_at', 'owner']
    search_fields = ['original_name', 'task__title']
    readonly_fields = ['created_at', 'size']
    fieldsets = (
        (None, {'fields': ('owner', 'task', 'file')}),
        ('Metadata', {'fields': ('original_name', 'size', 'created_at')}),
    )


@admin.register(TaskComment)
class TaskCommentAdmin(admin.ModelAdmin):
    list_display = ['task', 'author', 'parent', 'created_at', 'updated_at']
    list_filter = ['created_at', 'author']
    search_fields = ['task__title', 'author__username', 'body']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {'fields': ('task', 'author', 'parent', 'body')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = [
        'user',
        'full_name',
        'telegram_username',
        'yandex_metrika_id',
        'invite_quota',
    ]
    search_fields = [
        'user__username',
        'full_name',
        'telegram_username',
        'yandex_metrika_id',
    ]
    list_filter = ['invite_quota']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (
            None,
            {'fields': ('user', 'full_name', 'telegram_username', 'yandex_metrika_id')},
        ),
        ('Invites', {'fields': ('invite_quota',)}),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ['email', 'invited_by', 'status', 'invited_at', 'accepted_at']
    list_filter = ['status', 'invited_at']
    search_fields = ['email', 'invited_by__username']
    readonly_fields = ['token', 'invited_at', 'accepted_at', 'revoked_at']
    fieldsets = (
        (None, {'fields': ('email', 'invited_by', 'invited_user', 'status')}),
        ('Tracking', {'fields': ('token', 'invited_at', 'accepted_at', 'revoked_at')}),
    )


@admin.register(SiteAnalyticsSettings)
class SiteAnalyticsSettingsAdmin(admin.ModelAdmin):
    list_display = ['yandex_metrika_id', 'enabled', 'updated_at']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (
            None,
            {
                'fields': ('yandex_metrika_id', 'enabled'),
                'description': 'Configure the global analytics counter ID.',
            },
        ),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )

    def has_add_permission(self, request):
        """Prevent creating multiple singleton rows via the admin UI."""
        if SiteAnalyticsSettings.objects.exists():
            return False
        return super().has_add_permission(request)
