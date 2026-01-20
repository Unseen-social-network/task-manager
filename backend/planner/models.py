"""
Models for Planner application.
"""

from django.conf import settings
from django.db import models


class Contact(models.Model):
    """
    Contact book entry - stores person's contact information.
    Each user has their own contact book.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='contacts',
        verbose_name='Owner',
    )
    name = models.CharField(max_length=255, verbose_name='Name')
    company = models.CharField(max_length=255, blank=True, verbose_name='Company')
    phone = models.CharField(max_length=50, blank=True, verbose_name='Phone')
    email = models.EmailField(blank=True, verbose_name='Email')
    telegram = models.CharField(max_length=100, blank=True, verbose_name='Telegram')
    other = models.JSONField(
        blank=True,
        null=True,
        verbose_name='Other contacts',
        help_text='Additional contact information (e.g., WhatsApp, VK, position)',
    )
    notes = models.TextField(blank=True, verbose_name='Notes')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created at')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated at')

    class Meta:
        verbose_name = 'Contact'
        verbose_name_plural = 'Contacts'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
        ]

    def __str__(self):
        return f'{self.name} ({self.owner.username})'


class Task(models.Model):
    """
    Task/Todo item with urgency, status, and optional contact reference.
    """

    class Urgency(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class Status(models.TextChoices):
        TODO = 'todo', 'To Do'
        IN_PROGRESS = 'in_progress', 'In Progress'
        DONE = 'done', 'Done'
        CANCELED = 'canceled', 'Canceled'

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='tasks',
        verbose_name='Owner',
    )
    project = models.ForeignKey(
        'Project',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='tasks',
        verbose_name='Project',
    )
    tagged_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='tagged_tasks',
        verbose_name='Tagged user',
    )
    title = models.CharField(max_length=500, verbose_name='Title')
    description = models.TextField(blank=True, verbose_name='Description')
    urgency = models.CharField(
        max_length=20,
        choices=Urgency.choices,
        default=Urgency.MEDIUM,
        verbose_name='Urgency',
    )
    due_date = models.DateTimeField(blank=True, null=True, verbose_name='Due date')
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.TODO,
        verbose_name='Status',
    )
    contact = models.ForeignKey(
        Contact,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='tasks',
        verbose_name='Contact',
        help_text='Reference to contact from your contact book',
    )
    contact_freeform = models.CharField(
        max_length=500,
        blank=True,
        verbose_name='Freeform contact',
        help_text='Manual contact info (if not using contact book)',
    )
    time_spent_seconds = models.PositiveIntegerField(
        default=0,
        verbose_name='Time spent (seconds)',
        help_text='Total tracked time for the task in seconds',
    )
    tracking_completed = models.BooleanField(
        default=False,
        verbose_name='Tracking completed',
        help_text='Whether the time tracking session is завершен',
    )
    pomodoro_sessions = models.PositiveIntegerField(
        default=0,
        verbose_name='Pomodoro sessions',
        help_text='Number of completed pomodoro focus sessions',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created at')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated at')

    class Meta:
        verbose_name = 'Task'
        verbose_name_plural = 'Tasks'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'status', '-created_at']),
            models.Index(fields=['owner', 'urgency']),
            models.Index(fields=['owner', 'due_date']),
        ]

    def __str__(self):
        return f'{self.title} ({self.owner.username})'


class Project(models.Model):
    """
    Project entity with description, contact phone, and links.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='projects',
        verbose_name='Owner',
    )
    name = models.CharField(max_length=255, verbose_name='Name')
    description = models.TextField(blank=True, verbose_name='Description')
    phone = models.CharField(max_length=50, blank=True, verbose_name='Phone')
    links = models.JSONField(
        blank=True,
        null=True,
        verbose_name='Links',
        help_text='List of project links (label + url)',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created at')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Updated at')

    class Meta:
        verbose_name = 'Project'
        verbose_name_plural = 'Projects'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', '-created_at']),
            models.Index(fields=['owner', 'name']),
        ]

    def __str__(self):
        return f'{self.name} ({self.owner.username})'


class Attachment(models.Model):
    """
    File attachment for tasks.
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='Owner',
    )
    task = models.ForeignKey(
        Task,
        on_delete=models.CASCADE,
        related_name='attachments',
        verbose_name='Task',
    )
    file = models.FileField(upload_to='attachments/%Y/%m/%d/', verbose_name='File')
    original_name = models.CharField(
        max_length=255,
        blank=True,
        verbose_name='Original filename',
    )
    size = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name='File size (bytes)',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Created at')

    class Meta:
        verbose_name = 'Attachment'
        verbose_name_plural = 'Attachments'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['owner', 'task']),
        ]

    def __str__(self):
        return f'{self.original_name or self.file.name} ({self.task.title})'

    def save(self, *args, **kwargs):
        """Auto-populate original_name and size on save."""
        if self.file and not self.original_name:
            self.original_name = self.file.name
        if self.file and not self.size:
            self.size = self.file.size
        super().save(*args, **kwargs)
