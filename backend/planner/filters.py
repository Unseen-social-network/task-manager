"""
Filters for Planner application.
"""

from django_filters import rest_framework as filters
from rest_framework.filters import SearchFilter

from .models import Task


class TaskFilter(filters.FilterSet):
    """
    FilterSet for Task model with advanced filtering options.
    """

    status = filters.CharFilter(field_name='status__key')
    urgency = filters.ChoiceFilter(choices=Task.Urgency.choices)
    due_date_from = filters.DateTimeFilter(field_name='due_date', lookup_expr='gte')
    due_date_to = filters.DateTimeFilter(field_name='due_date', lookup_expr='lte')
    created_at_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    contact = filters.NumberFilter(field_name='contact__id')
    project = filters.NumberFilter(field_name='project__id')
    tagged_user = filters.CharFilter(field_name='tagged_user__username')
    tagged_user_id = filters.NumberFilter(field_name='tagged_user__id')
    tagged_users = filters.NumberFilter(field_name='tagged_users__id')

    class Meta:
        model = Task
        fields = [
            'status',
            'urgency',
            'due_date_from',
            'due_date_to',
            'created_at_from',
            'created_at_to',
            'contact',
            'project',
            'tagged_user',
            'tagged_user_id',
            'tagged_users',
        ]


class TaskSearchFilter(SearchFilter):
    """Search filter with optional description inclusion."""

    def get_search_fields(self, view, request):
        include_description = request.query_params.get('search_in_description', '')
        include_description = include_description.lower() in {'1', 'true', 'yes', 'on'}
        fields = ['title', 'contact_freeform']
        if include_description:
            fields.append('description')
        return fields
