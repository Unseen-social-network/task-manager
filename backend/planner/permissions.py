"""
Custom permissions for Planner application.
"""

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Permission to only allow owners of an object to view/edit it.
    Returns 404 instead of 403 to avoid revealing object existence.
    """

    def has_object_permission(self, request, view, obj):
        """Check if the requesting user is the owner of the object."""
        return obj.owner == request.user


class IsTaskOwner(permissions.BasePermission):
    """
    Permission for attachment creation: verify task belongs to user.
    Used when creating attachments - validates task ownership.
    """

    message = 'Task not found or access denied.'

    def has_permission(self, request, view):
        """Check task ownership for attachment upload."""
        if request.method == 'POST':
            task_id = view.kwargs.get('task_pk')
            if not task_id:
                return False

            from .models import Task

            # Check if task exists and belongs to user
            return Task.objects.filter(id=task_id, owner=request.user).exists()
        return True
