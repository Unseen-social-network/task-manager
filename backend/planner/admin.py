from django.contrib import admin

from planner.models import Attachment, Contact, Task


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "owner", "company", "email", "phone")
    search_fields = ("name", "email", "phone")
    list_filter = ("company",)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "owner", "status", "urgency", "due_date")
    search_fields = ("title", "description")
    list_filter = ("status", "urgency")


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ("id", "task", "owner", "original_name", "size", "created_at")
    search_fields = ("original_name",)
