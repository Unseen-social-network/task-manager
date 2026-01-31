"""
Admin configuration for Planner models.
"""

from django import forms
from django.contrib import admin
from django.db import models
from django.http import HttpResponseRedirect
from django.urls import reverse

from .models import (
    Attachment,
    Contact,
    Invite,
    Profile,
    Project,
    SiteSetting,
    Task,
    TaskComment,
    TaskStatus,
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
            {
                'fields': (
                    'contact',
                    'contacts',
                    'contact_freeform',
                    'contact_freeform_list',
                )
            },
        ),
        (
            'Tracking',
            {'fields': ('time_spent_seconds', 'tracking_completed')},
        ),
        ('Timestamps', {'fields': ('created_at', 'updated_at')}),
    )


@admin.register(TaskStatus)
class TaskStatusAdmin(admin.ModelAdmin):
    list_display = ['label', 'key', 'order', 'is_archived', 'is_done', 'is_default']
    list_filter = ['is_archived', 'is_done', 'is_default']
    search_fields = ['label', 'key']
    ordering = ['order', 'label']
    fieldsets = (
        (None, {'fields': ('label', 'key')}),
        ('Behavior', {'fields': ('order', 'is_archived', 'is_done', 'is_default')}),
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
    list_display = ['user', 'full_name', 'telegram_username', 'invite_quota']
    search_fields = ['user__username', 'full_name', 'telegram_username']
    list_filter = ['invite_quota']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {'fields': ('user', 'full_name', 'telegram_username')}),
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


@admin.register(SiteSetting)
class SiteSettingAdmin(admin.ModelAdmin):
    """Admin for managing singleton site settings."""

    formfield_overrides = {
        models.TextField: {'widget': forms.Textarea(attrs={'rows': 20, 'cols': 120})}
    }
    readonly_fields = ['updated_at']
    fieldsets = (
        (
            'Head injection',
            {
                'fields': ('head_html',),
                'description': (
                    'HTML entered here will be injected into the <head> tag '
                    'of the frontend application.'
                ),
            },
        ),
        ('Timestamps', {'fields': ('updated_at',)}),
    )

    def has_add_permission(self, request):
        """Allow adding only when the singleton does not yet exist."""
        if SiteSetting.objects.exists():
            return False
        return super().has_add_permission(request)

    def changelist_view(self, request, extra_context=None):
        """Redirect the changelist to the singleton change form."""
        obj = SiteSetting.get_solo()
        url = reverse('admin:planner_sitesetting_change', args=[obj.pk])
        return HttpResponseRedirect(url)
