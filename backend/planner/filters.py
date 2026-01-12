import django_filters

from planner.models import Task


class TaskFilter(django_filters.FilterSet):
    due_date = django_filters.DateFromToRangeFilter()
    created_at = django_filters.DateFromToRangeFilter()

    class Meta:
        model = Task
        fields = ["status", "urgency", "contact", "due_date", "created_at"]
