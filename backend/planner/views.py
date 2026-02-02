"""
Views for Planner application.
"""

from io import BytesIO

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from openpyxl import Workbook
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .filters import TaskFilter, TaskSearchFilter
from .models import (
    Attachment,
    Contact,
    ContactShare,
    ContactShareAccess,
    Invite,
    Profile,
    Project,
    ProjectShare,
    ProjectShareAccess,
    SiteSetting,
    Task,
    TaskStatus,
)
from .permissions import (
    ContactAccessPermission,
    IsOwner,
    ProjectAccessPermission,
    TaskAccessPermission,
    TaskCommentAccessPermission,
)
from .serializers import (
    AttachmentCreateSerializer,
    AttachmentSerializer,
    ContactSerializer,
    ContactShareAccessSerializer,
    ContactShareSerializer,
    InviteAcceptSerializer,
    InviteCreateSerializer,
    InviteSerializer,
    PasswordChangeSerializer,
    ProfileSerializer,
    ProjectSerializer,
    ProjectShareAccessSerializer,
    ProjectShareSerializer,
    SiteSettingSerializer,
    TaskCommentSerializer,
    TaskSerializer,
    TaskStatusSerializer,
)

User = get_user_model()


class ContactViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Contact CRUD operations.
    Users can only access their own contacts.
    """

    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated, ContactAccessPermission]
    filterset_fields = ['company']
    search_fields = ['name', 'company', 'phone', 'email', 'telegram', 'notes']
    ordering_fields = ['name', 'company', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return only contacts owned by the current user."""
        if getattr(self, 'swagger_fake_view', False):
            return Contact.objects.none()
        user = self.request.user
        if not user.is_authenticated:
            return Contact.objects.none()
        base_queryset = Contact.objects.filter(owner=user)
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            base_queryset = base_queryset | Contact.objects.filter(
                share_accesses__user=user
            )
        return base_queryset.distinct()

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        This prevents revealing existence of other users' contacts.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['get', 'post', 'delete'])
    def share(self, request, pk=None):
        """Manage share link for a contact owned by the current user."""
        contact = self.get_object()
        if request.method == 'POST':
            share, created = ContactShare.objects.get_or_create(
                contact=contact,
                defaults={'owner': request.user},
            )
            if share.owner_id != request.user.id:
                return Response(status=status.HTTP_404_NOT_FOUND)
            if not share.is_active:
                share.is_active = True
                share.revoked_at = None
                share.save(update_fields=['is_active', 'revoked_at'])
            serializer = ContactShareSerializer(share)
            return Response(serializer.data)
        if request.method == 'DELETE':
            share = get_object_or_404(ContactShare, contact=contact, owner=request.user)
            if share.is_active:
                share.is_active = False
                share.revoked_at = timezone.now()
                share.save(update_fields=['is_active', 'revoked_at'])
            return Response(status=status.HTTP_204_NO_CONTENT)
        share = get_object_or_404(ContactShare, contact=contact, owner=request.user)
        serializer = ContactShareSerializer(share)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'delete'], url_path='access')
    def access(self, request, pk=None):
        """List or revoke shared access to this contact."""
        contact = get_object_or_404(
            Contact.objects.filter(
                Q(owner=request.user) | Q(share_accesses__user=request.user)
            ).distinct(),
            pk=pk,
        )
        if request.method == 'GET':
            if contact.owner_id != request.user.id:
                return Response(status=status.HTTP_404_NOT_FOUND)
            accesses = ContactShareAccess.objects.filter(
                contact=contact
            ).select_related('user')
            serializer = ContactShareAccessSerializer(accesses, many=True)
            return Response(serializer.data)
        user_id = request.query_params.get('user_id')
        if user_id:
            if contact.owner_id != request.user.id:
                return Response(status=status.HTTP_404_NOT_FOUND)
            ContactShareAccess.objects.filter(contact=contact, user_id=user_id).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        if contact.owner_id == request.user.id:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        ContactShareAccess.objects.filter(contact=contact, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(
        detail=True,
        methods=['post'],
        url_path='copy',
        permission_classes=[IsAuthenticated],
    )
    def copy_contact(self, request, pk=None):
        """Create a copy of a shared contact in the current user's contact book."""
        contact = get_object_or_404(
            Contact.objects.filter(
                Q(owner=request.user) | Q(share_accesses__user=request.user)
            ).distinct(),
            pk=pk,
        )
        if contact.owner_id == request.user.id:
            return Response(
                {'detail': 'Contact already belongs to you.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        copied = Contact.objects.create(
            owner=request.user,
            name=contact.name,
            username=contact.username,
            company=contact.company,
            phone=contact.phone,
            email=contact.email,
            telegram=contact.telegram,
            other=contact.other,
            notes=contact.notes,
        )
        serializer = ContactSerializer(copied, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


def get_task_base_queryset(request):
    """Return task queryset for the current request user."""
    if getattr(request, 'user', None) is None or not request.user.is_authenticated:
        return Task.objects.none()
    base_queryset = Task.objects.filter(owner=request.user)
    if request.method in ('GET', 'HEAD', 'OPTIONS', 'PATCH', 'PUT'):
        base_queryset = base_queryset | Task.objects.filter(
            Q(tagged_user=request.user) | Q(tagged_users=request.user)
        )
    return (
        base_queryset.select_related('contact', 'project', 'tagged_user', 'status')
        .prefetch_related('tagged_users', 'contacts')
        .distinct()
    )


class TaskViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Task CRUD operations.
    Users can only access their own tasks.
    """

    serializer_class = TaskSerializer
    permission_classes = [IsAuthenticated, TaskAccessPermission]
    filterset_class = TaskFilter
    filter_backends = [DjangoFilterBackend, TaskSearchFilter, OrderingFilter]
    search_fields = ['title', 'contact_freeform']
    ordering_fields = ['due_date', 'created_at', 'urgency', 'status__order']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return tasks owned by or tagged for the current user."""
        if getattr(self, 'swagger_fake_view', False):
            return Task.objects.none()
        return get_task_base_queryset(self.request)

    @action(
        detail=True,
        methods=['get', 'post'],
        parser_classes=[MultiPartParser, FormParser],
    )
    def attachments(self, request, pk=None):
        """
        Nested endpoint for task attachments.
        GET: list all attachments for this task
        POST: upload new attachment to this task
        """
        task = get_object_or_404(
            Task.objects.filter(
                Q(owner=request.user)
                | Q(tagged_user=request.user)
                | Q(tagged_users=request.user)
            ).distinct(),
            pk=pk,
        )

        if request.method == 'GET':
            serializer = AttachmentSerializer(
                task.attachments.all(),
                many=True,
                context={'request': request},
            )
            return Response(serializer.data)

        task = get_object_or_404(
            Task.objects.filter(
                Q(owner=request.user)
                | Q(tagged_user=request.user)
                | Q(tagged_users=request.user)
            ).distinct(),
            pk=pk,
        )
        serializer = AttachmentCreateSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(task=task, owner=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['get', 'post'],
        permission_classes=[IsAuthenticated, TaskCommentAccessPermission],
    )
    def comments(self, request, pk=None):
        """
        Nested endpoint for task comments.
        GET: list all comments for this task
        POST: add a new comment or reply
        """
        task = get_object_or_404(
            Task.objects.filter(
                Q(owner=request.user)
                | Q(tagged_user=request.user)
                | Q(tagged_users=request.user)
            ).distinct(),
            pk=pk,
        )

        if request.method == 'GET':
            serializer = TaskCommentSerializer(
                task.comments.select_related('author', 'parent').all(),
                many=True,
                context={'request': request, 'task': task},
            )
            return Response(serializer.data)

        serializer = TaskCommentSerializer(
            data=request.data,
            context={'request': request, 'task': task},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save(task=task, author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, TaskCommentAccessPermission],
    )
    def question(self, request, pk=None):
        """Flag a question for the task owner."""
        task = get_object_or_404(
            Task.objects.filter(
                Q(owner=request.user)
                | Q(tagged_user=request.user)
                | Q(tagged_users=request.user)
            ).distinct(),
            pk=pk,
        )
        if not task.has_question:
            task.has_question = True
            task.save(update_fields=['has_question', 'updated_at'])
        serializer = TaskSerializer(task, context={'request': request})
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, TaskCommentAccessPermission],
        url_path='question/clear',
    )
    def clear_question(self, request, pk=None):
        """Clear a question flag for the task."""
        task = get_object_or_404(
            Task.objects.filter(
                Q(owner=request.user)
                | Q(tagged_user=request.user)
                | Q(tagged_users=request.user)
            ).distinct(),
            pk=pk,
        )
        if task.has_question:
            task.has_question = False
            task.save(update_fields=['has_question', 'updated_at'])
        serializer = TaskSerializer(task, context={'request': request})
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, TaskCommentAccessPermission],
    )
    def ready(self, request, pk=None):
        """Mark task as ready for review by the owner."""
        task = get_object_or_404(
            Task.objects.filter(
                Q(owner=request.user)
                | Q(tagged_user=request.user)
                | Q(tagged_users=request.user)
            ).distinct(),
            pk=pk,
        )
        if not task.completion_requested:
            task.completion_requested = True
            task.save(update_fields=['completion_requested', 'updated_at'])
        serializer = TaskSerializer(task, context={'request': request})
        return Response(serializer.data)

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[IsAuthenticated, TaskCommentAccessPermission],
        url_path='ready/clear',
    )
    def clear_ready(self, request, pk=None):
        """Clear readiness flag for the task."""
        task = get_object_or_404(
            Task.objects.filter(
                Q(owner=request.user)
                | Q(tagged_user=request.user)
                | Q(tagged_users=request.user)
            ).distinct(),
            pk=pk,
        )
        if task.completion_requested:
            task.completion_requested = False
            task.save(update_fields=['completion_requested', 'updated_at'])
        serializer = TaskSerializer(task, context={'request': request})
        return Response(serializer.data)


class TaskStatusViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only viewset for task status definitions."""

    serializer_class = TaskStatusSerializer
    permission_classes = [IsAuthenticated]
    queryset = TaskStatus.objects.all()
    ordering_fields = ['order', 'label', 'key']
    ordering = ['order', 'label']
    pagination_class = None


class TaskStatisticsView(APIView):
    """Return aggregated task statistics for dashboards."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = get_task_base_queryset(request)
        filterset = TaskFilter(request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)
        filtered = filterset.qs
        now = timezone.now()

        total_count = filtered.count()
        completed_count = filtered.filter(status__is_done=True).count()
        overdue_count = filtered.filter(
            due_date__lt=now,
            status__is_archived=False,
        ).count()
        completion_rate = (
            round(completed_count / total_count * 100, 1) if total_count else 0.0
        )

        completed_tasks = list(filtered.filter(status__is_done=True))
        durations = [
            (task.updated_at - task.created_at).total_seconds()
            for task in completed_tasks
            if task.updated_at
        ]
        avg_completion_seconds = (
            round(sum(durations) / len(durations), 2) if durations else 0
        )

        by_status = [
            {
                'status': row['status__key'],
                'label': row['status__label'],
                'order': row['status__order'],
                'count': row['count'],
            }
            for row in filtered.values('status__key', 'status__label', 'status__order')
            .annotate(count=Count('id'))
            .order_by('status__order', 'status__label')
        ]
        by_urgency = [
            {'urgency': urgency_value, 'count': count}
            for urgency_value, count in filtered.values_list('urgency')
            .annotate(count=Count('id'))
            .order_by('urgency')
        ]
        by_assignee_map = {}
        for task in filtered.select_related('tagged_user').prefetch_related(
            'tagged_users'
        ):
            assignees = list(task.tagged_users.all())
            if task.tagged_user and task.tagged_user not in assignees:
                assignees.append(task.tagged_user)
            if not assignees:
                assignees = [None]

            is_done = task.status.is_done
            is_overdue = (
                bool(task.due_date)
                and task.due_date < now
                and not task.status.is_archived
            )

            for assignee in assignees:
                assignee_id = assignee.id if assignee else None
                assignee_name = assignee.username if assignee else 'Unassigned'
                entry = by_assignee_map.setdefault(
                    assignee_id,
                    {
                        'assignee_id': assignee_id,
                        'assignee_name': assignee_name,
                        'total': 0,
                        'done': 0,
                        'overdue': 0,
                    },
                )
                entry['total'] += 1
                if is_done:
                    entry['done'] += 1
                if is_overdue:
                    entry['overdue'] += 1

        by_assignee = sorted(
            by_assignee_map.values(),
            key=lambda item: (
                item['assignee_id'] is None,
                (item['assignee_name'] or '').lower(),
            ),
        )

        open_tasks = filtered.filter(status__is_archived=False, due_date__isnull=False)

        trend = []
        due_date_rows = (
            open_tasks.annotate(due_date_day=TruncDate('due_date'))
            .values('due_date_day')
            .annotate(count=Count('id'))
            .order_by('due_date_day')
        )
        for row in due_date_rows:
            due_date = row['due_date_day']
            trend.append(
                {
                    'date': due_date.isoformat() if due_date else None,
                    'count': row['count'],
                }
            )

        return Response(
            {
                'metrics': {
                    'total': total_count,
                    'completed': completed_count,
                    'completion_rate': completion_rate,
                    'overdue': overdue_count,
                    'avg_completion_seconds': avg_completion_seconds,
                },
                'series': {
                    'by_status': by_status,
                    'by_urgency': by_urgency,
                    'by_assignee': by_assignee,
                    'due_date_trend': trend,
                },
            }
        )


class TaskExportView(APIView):
    """Export task statistics and details to Excel."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = get_task_base_queryset(request)
        filterset = TaskFilter(request.query_params, queryset=queryset)
        if not filterset.is_valid():
            return Response(filterset.errors, status=status.HTTP_400_BAD_REQUEST)
        filtered = list(filterset.qs.annotate(comments_count=Count('comments')))
        now = timezone.now()
        language = request.query_params.get('lang', 'en')
        if language not in {'en', 'ru'}:
            language = 'en'

        labels = {
            'en': {
                'summary_title': 'Summary',
                'tasks_title': 'Tasks',
                'metric': 'Metric',
                'value': 'Value',
                'total_tasks': 'Total tasks',
                'completed_tasks': 'Completed tasks',
                'completion_rate': 'Completion rate, %',
                'overdue_tasks': 'Overdue tasks',
                'avg_completion_time': 'Avg completion time, hours',
                'task_id': 'ID',
                'task_title': 'Title',
                'task_status': 'Status',
                'task_urgency': 'Urgency',
                'task_due_date': 'Due date',
                'task_project': 'Project',
                'task_assignee': 'Assignee',
                'task_created_at': 'Created at',
                'task_updated_at': 'Updated at',
                'task_time_spent': 'Time spent, hours',
                'task_comments': 'Comments',
            },
            'ru': {
                'summary_title': 'Сводка',
                'tasks_title': 'Задачи',
                'metric': 'Метрика',
                'value': 'Значение',
                'total_tasks': 'Всего задач',
                'completed_tasks': 'Завершено задач',
                'completion_rate': 'Процент завершения, %',
                'overdue_tasks': 'Просрочено задач',
                'avg_completion_time': 'Среднее время выполнения, часы',
                'task_id': 'ID',
                'task_title': 'Название',
                'task_status': 'Статус',
                'task_urgency': 'Приоритет',
                'task_due_date': 'Дедлайн',
                'task_project': 'Проект',
                'task_assignee': 'Исполнитель',
                'task_created_at': 'Создано',
                'task_updated_at': 'Обновлено',
                'task_time_spent': 'Затраченное время, часы',
                'task_comments': 'Комментарии',
            },
        }[language]
        urgency_labels = {
            'en': {
                Task.Urgency.LOW: 'Low',
                Task.Urgency.MEDIUM: 'Medium',
                Task.Urgency.HIGH: 'High',
                Task.Urgency.CRITICAL: 'Critical',
            },
            'ru': {
                Task.Urgency.LOW: 'Низкая',
                Task.Urgency.MEDIUM: 'Средняя',
                Task.Urgency.HIGH: 'Высокая',
                Task.Urgency.CRITICAL: 'Критическая',
            },
        }[language]

        total_count = len(filtered)
        completed = [task for task in filtered if task.status.is_done]
        overdue = [
            task
            for task in filtered
            if task.due_date and task.due_date < now and not task.status.is_archived
        ]
        completion_rate = (
            round(len(completed) / total_count * 100, 1) if total_count else 0.0
        )
        durations = [
            (task.updated_at - task.created_at).total_seconds()
            for task in completed
            if task.updated_at
        ]
        avg_completion_seconds = (
            round(sum(durations) / len(durations), 2) if durations else 0
        )

        workbook = Workbook()
        summary_sheet = workbook.active
        summary_sheet.title = labels['summary_title']
        summary_sheet.append([labels['metric'], labels['value']])
        summary_sheet.append([labels['total_tasks'], total_count])
        summary_sheet.append([labels['completed_tasks'], len(completed)])
        summary_sheet.append([labels['completion_rate'], completion_rate])
        summary_sheet.append([labels['overdue_tasks'], len(overdue)])
        summary_sheet.append(
            [
                labels['avg_completion_time'],
                round(avg_completion_seconds / 3600, 2),
            ]
        )

        tasks_sheet = workbook.create_sheet(title=labels['tasks_title'])
        tasks_sheet.append(
            [
                labels['task_id'],
                labels['task_title'],
                labels['task_status'],
                labels['task_urgency'],
                labels['task_due_date'],
                labels['task_project'],
                labels['task_assignee'],
                labels['task_created_at'],
                labels['task_updated_at'],
                labels['task_time_spent'],
                labels['task_comments'],
            ]
        )
        for task in filtered:
            tasks_sheet.append(
                [
                    task.id,
                    task.title,
                    task.status.label,
                    urgency_labels.get(task.urgency, task.urgency),
                    task.due_date.isoformat() if task.due_date else '',
                    task.project.name if task.project else '',
                    task.tagged_user.username if task.tagged_user else '',
                    task.created_at.isoformat(),
                    task.updated_at.isoformat(),
                    round((task.time_spent_seconds or 0) / 3600, 2),
                    task.comments_count,
                ]
            )

        buffer = BytesIO()
        workbook.save(buffer)
        buffer.seek(0)
        filename = f'tasks-report-{now.date().isoformat()}.xlsx'
        response = HttpResponse(
            buffer.getvalue(),
            content_type=(
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            ),
        )
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response


class AttachmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Attachment operations.
    Only DELETE is exposed at the top level.
    Creation happens via /tasks/{id}/attachments/
    """

    serializer_class = AttachmentSerializer
    permission_classes = [IsOwner]
    http_method_names = ['get', 'delete']  # Only allow GET and DELETE

    def get_queryset(self):
        """Return only attachments owned by the current user."""
        return Attachment.objects.filter(owner=self.request.user).select_related('task')

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj)
        return obj


class ProjectViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Project CRUD operations.
    Users can only access their own projects.
    """

    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated, ProjectAccessPermission]
    search_fields = ['name', 'description', 'phone']
    ordering_fields = ['name', 'created_at', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        """Return projects owned by or tagged for the current user."""
        user = self.request.user
        base_queryset = Project.objects.filter(owner=user)
        if self.request.method in ('GET', 'HEAD', 'OPTIONS'):
            base_queryset = base_queryset | Project.objects.filter(
                tasks__tagged_user=user
            )
            base_queryset = base_queryset | Project.objects.filter(
                share_accesses__user=user
            )
        return base_queryset.distinct()

    def get_object(self):
        """
        Get object and return 404 if not found or not owned by user.
        """
        queryset = self.get_queryset()
        obj = get_object_or_404(queryset, pk=self.kwargs.get('pk'))
        self.check_object_permissions(self.request, obj)
        return obj

    @action(detail=True, methods=['get', 'post', 'delete'])
    def share(self, request, pk=None):
        """Manage share link for a project owned by the current user."""
        project = self.get_object()
        if request.method == 'POST':
            share, created = ProjectShare.objects.get_or_create(
                project=project,
                defaults={'owner': request.user},
            )
            if share.owner_id != request.user.id:
                return Response(status=status.HTTP_404_NOT_FOUND)
            if not share.is_active:
                share.is_active = True
                share.revoked_at = None
                share.save(update_fields=['is_active', 'revoked_at'])
            serializer = ProjectShareSerializer(share)
            return Response(serializer.data)
        if request.method == 'DELETE':
            share = get_object_or_404(ProjectShare, project=project, owner=request.user)
            if share.is_active:
                share.is_active = False
                share.revoked_at = timezone.now()
                share.save(update_fields=['is_active', 'revoked_at'])
            return Response(status=status.HTTP_204_NO_CONTENT)
        share = get_object_or_404(ProjectShare, project=project, owner=request.user)
        serializer = ProjectShareSerializer(share)
        return Response(serializer.data)


    @action(detail=True, methods=['get', 'delete'], url_path='access')
    def access(self, request, pk=None):
        """List or revoke shared access to this project."""
        project = get_object_or_404(
            Project.objects.filter(
                Q(owner=request.user) | Q(share_accesses__user=request.user)
            ).distinct(),
            pk=pk,
        )
        if request.method == 'GET':
            if project.owner_id != request.user.id:
                return Response(status=status.HTTP_404_NOT_FOUND)
            accesses = ProjectShareAccess.objects.filter(
                project=project
            ).select_related('user')
            serializer = ProjectShareAccessSerializer(accesses, many=True)
            return Response(serializer.data)
        user_id = request.query_params.get('user_id')
        if user_id:
            if project.owner_id != request.user.id:
                return Response(status=status.HTTP_404_NOT_FOUND)
            ProjectShareAccess.objects.filter(project=project, user_id=user_id).delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        if project.owner_id == request.user.id:
            return Response(status=status.HTTP_400_BAD_REQUEST)
        ProjectShareAccess.objects.filter(project=project, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserLookupView(APIView):
    """Validate that a username exists in the system."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        username = request.query_params.get('username', '').strip()
        if username.startswith('@'):
            username = username[1:]
        if not username:
            return Response(
                {'detail': 'Username is required.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        user = User.objects.filter(username__iexact=username).first()
        if not user:
            return Response(
                {'detail': 'User not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response({'username': user.username})


class ContactShareView(APIView):
    """Public read-only access to shared contacts."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        share = get_object_or_404(
            ContactShare.objects.select_related('contact'),
            token=token,
            is_active=True,
        )
        serializer = ContactSerializer(share.contact, context={'request': request})
        return Response(serializer.data)


class ContactShareCopyView(APIView):
    """Create a personal copy of a shared contact."""

    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        share = get_object_or_404(
            ContactShare.objects.select_related('contact'),
            token=token,
            is_active=True,
        )
        contact = share.contact
        copied = Contact.objects.create(
            owner=request.user,
            name=contact.name,
            username=contact.username,
            company=contact.company,
            phone=contact.phone,
            email=contact.email,
            telegram=contact.telegram,
            other=contact.other,
            notes=contact.notes,
        )
        serializer = ContactSerializer(copied, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ContactShareAcceptView(APIView):
    """Accept a share link and add the contact to the recipient's list."""

    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        share = get_object_or_404(
            ContactShare.objects.select_related('contact'),
            token=token,
            is_active=True,
        )
        contact = share.contact
        if contact.owner_id != request.user.id:
            ContactShareAccess.objects.get_or_create(
                contact=contact,
                user=request.user,
                defaults={'granted_by': share.owner},
            )
        serializer = ContactSerializer(contact, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class ProjectShareView(APIView):
    """Public read-only access to shared projects."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        share = get_object_or_404(
            ProjectShare.objects.select_related('project'),
            token=token,
            is_active=True,
        )
        serializer = ProjectSerializer(share.project, context={'request': request})
        return Response(serializer.data)


class ProjectShareCopyView(APIView):
    """Create a personal copy of a shared project."""

    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        share = get_object_or_404(
            ProjectShare.objects.select_related('project'),
            token=token,
            is_active=True,
        )
        project = share.project
        copied = Project.objects.create(
            owner=request.user,
            name=project.name,
            description=project.description,
            phone=project.phone,
            links=project.links or [],
        )
        serializer = ProjectSerializer(copied, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ProjectShareAcceptView(APIView):
    """Accept a share link and add the project to the recipient's list."""

    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

    def post(self, request, token):
        share = get_object_or_404(
            ProjectShare.objects.select_related('project'),
            token=token,
            is_active=True,
        )
        project = share.project
        if project.owner_id != request.user.id:
            ProjectShareAccess.objects.get_or_create(
                project=project,
                user=request.user,
                defaults={'granted_by': share.owner},
            )
        serializer = ProjectSerializer(project, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class SiteSettingView(APIView):
    """Public endpoint for site-wide settings used by the frontend."""

    serializer_class = SiteSettingSerializer
    permission_classes = [AllowAny]

    def get(self, request):
        settings_obj = SiteSetting.get_solo()
        serializer = SiteSettingSerializer(settings_obj)
        return Response(serializer.data)


class ProfileView(APIView):
    """Retrieve and update the current user's profile."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ProfileShareContactView(APIView):
    """Create or refresh a share link for the user's own contact card."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        contact = profile.ensure_self_contact()
        share, _ = ContactShare.objects.get_or_create(
            contact=contact,
            defaults={'owner': request.user},
        )
        if share.owner_id != request.user.id:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if not share.is_active:
            share.is_active = True
            share.revoked_at = None
            share.save(update_fields=['is_active', 'revoked_at'])
        serializer = ContactShareSerializer(share)
        data = dict(serializer.data)
        data['contact_id'] = contact.id
        return Response(data)


class PasswordChangeView(APIView):
    """Change the current user's password."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save(update_fields=['password'])
        return Response({'detail': 'Password updated successfully.'})


class InviteViewSet(viewsets.ModelViewSet):
    """Manage invites sent by the current user."""

    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        return Invite.objects.filter(invited_by=self.request.user)

    def get_serializer_class(self):
        if self.action == 'create':
            return InviteCreateSerializer
        return InviteSerializer

    def perform_create(self, serializer):
        invite = serializer.save()
        frontend_base_url = getattr(
            settings,
            'FRONTEND_BASE_URL',
            'http://localhost:3000',
        )
        invite_url = f'{frontend_base_url}/invite/{invite.token}'
        profile, _ = Profile.objects.get_or_create(user=invite.invited_by)
        inviter_name = profile.full_name or invite.invited_by.username
        send_mail(
            subject='You have been invited to Planner',
            message=(
                f'{inviter_name} invited you to Planner.\n'
                f'Follow the link to join: {invite_url}'
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[invite.email],
            fail_silently=False,
        )

    def destroy(self, request, *args, **kwargs):
        invite = self.get_object()
        if invite.status != Invite.Status.PENDING:
            return Response(
                {'detail': 'Only pending invites can be revoked.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        invite.status = Invite.Status.REVOKED
        invite.revoked_at = timezone.now()
        invite.save(update_fields=['status', 'revoked_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)


class InviteAcceptView(APIView):
    """Accept invite via token."""

    permission_classes = [AllowAny]

    def get(self, request, token):
        invite = get_object_or_404(Invite, token=token)
        serializer = InviteSerializer(invite)
        return Response(serializer.data)

    def post(self, request, token):
        invite = get_object_or_404(Invite, token=token)
        if invite.status != Invite.Status.PENDING:
            return Response(
                {'detail': 'Invite is no longer active.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = InviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            serializer.save(invite=invite)
        return Response(
            {'detail': 'Invite accepted successfully.'}, status=status.HTTP_201_CREATED
        )
