"""
Filters for Planner application.
"""

from django_filters import rest_framework as filters

from .models import Task


class TaskFilter(filters.FilterSet):
    """
    FilterSet for Task model with advanced filtering options.
    """

    status = filters.ChoiceFilter(choices=Task.Status.choices)
    urgency = filters.ChoiceFilter(choices=Task.Urgency.choices)
    due_date_from = filters.DateTimeFilter(field_name='due_date', lookup_expr='gte')
    due_date_to = filters.DateTimeFilter(field_name='due_date', lookup_expr='lte')
    created_at_from = filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_at_to = filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    contact = filters.NumberFilter(field_name='contact__id')

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
        ]
