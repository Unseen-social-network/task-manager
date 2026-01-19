"""
Admin configuration for Planner models.
"""

from django.contrib import admin

from .models import Attachment, Contact, Task


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


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        'title',
        'owner',
        'status',
        'urgency',
        'due_date',
        'created_at',
    ]
    list_filter = ['status', 'urgency', 'created_at', 'owner']
    search_fields = ['title', 'description', 'contact_freeform']
    readonly_fields = ['created_at', 'updated_at']
    fieldsets = (
        (None, {'fields': ('owner', 'title', 'description')}),
        (
            'Status & Priority',
            {'fields': ('status', 'urgency', 'due_date')},
        ),
        (
            'Contact',
            {'fields': ('contact', 'contact_freeform')},
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
