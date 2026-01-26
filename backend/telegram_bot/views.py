import uuid

from asgiref.sync import async_to_sync
from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from planner.models import Profile
from planner.serializers import ProfileSerializer
from telegram_bot.bot.context import BotContext
from telegram_bot.bot.router import dispatch
from telegram_bot.serializers import (
    TelegramHelpResponseSerializer,
    TelegramQuickTaskSerializer,
    TelegramTaskListSerializer,
    TelegramWebhookSerializer,
)
from telegram_bot.services.tasks import (
    create_quick_task,
    list_tasks_for_chat,
)
from telegram_bot.utils.urls import is_test_env


class TelegramWebhookView(APIView):
    serializer_class = TelegramWebhookSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        update = request.data or {}

        expected_secret = (settings.TELEGRAM_WEBHOOK_SECRET or '').strip() or None
        provided_secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token')
        if not is_test_env() and expected_secret:
            if not provided_secret or provided_secret != expected_secret:
                return Response(status=status.HTTP_401_UNAUTHORIZED)

        # ==============================
        # 1️⃣ ОБЫЧНОЕ СООБЩЕНИЕ
        # ==============================
        if 'message' in update:
            message = update['message']

            text = (message.get('text') or '').strip()
            chat_id = message.get('chat', {}).get('id')
            username = message.get('from', {}).get('username')

            if not chat_id or not text:
                return Response(status=200)

            ctx = BotContext(
                chat_id=chat_id,
                text=text,
                username=username,
            )

            async_to_sync(dispatch)(ctx)
            return Response(status=200)

        # ==============================
        # 2️⃣ INLINE-КНОПКИ (callback_query) 🔥
        # ==============================
        if 'callback_query' in update:
            callback = update['callback_query']

            data = callback.get('data')
            message = callback.get('message') or {}

            chat_id = message.get('chat', {}).get('id')
            message_id = message.get('message_id')

            if not chat_id or not data or not message_id:
                return Response(status=200)

            ctx = BotContext(
                chat_id=chat_id,
                callback_data=data,
                message_id=message_id,
            )

            async_to_sync(dispatch)(ctx)
            return Response(status=200)

        return Response(status=200)


class TelegramLinkRefreshView(APIView):
    """Generate a fresh Telegram link token for the current user."""

    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.telegram_link_token = uuid.uuid4()
        profile.telegram_chat_id = None
        profile.telegram_username = ''
        profile.telegram_linked_at = None
        profile.save(
            update_fields=[
                'telegram_link_token',
                'telegram_chat_id',
                'telegram_username',
                'telegram_linked_at',
            ]
        )
        serializer = ProfileSerializer(profile, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class TelegramLinkDisconnectView(APIView):
    """Disconnect the Telegram bot from the current user."""

    permission_classes = [IsAuthenticated]
    serializer_class = ProfileSerializer

    def post(self, request):
        profile, _ = Profile.objects.get_or_create(user=request.user)
        profile.telegram_chat_id = None
        profile.telegram_username = ''
        profile.telegram_linked_at = None
        profile.telegram_link_token = uuid.uuid4()
        profile.save(
            update_fields=[
                'telegram_chat_id',
                'telegram_username',
                'telegram_linked_at',
                'telegram_link_token',
            ]
        )
        serializer = ProfileSerializer(profile, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class TelegramHelpView(APIView):
    """
    HTTP endpoint: GET /telegram/help/
    Используется тестами и внешними клиентами
    """

    permission_classes = [AllowAny]
    serializer_class = TelegramHelpResponseSerializer

    def get(self, request):
        base_url = settings.FRONTEND_BASE_URL.rstrip('/')
        task_url_template = f'{base_url}/tasks?task={{id}}'

        help_text = (
            '📌 Команды бота:\n'
            '/help — справка\n'
            '/new Заголовок | Описание — быстрая задача\n'
            '/tasks — список задач\n'
            '/task <id> — задача по ID\n\n'
            f'🔗 Ссылка на задачу: {task_url_template}'
        )
        return Response(
            {
                'help': help_text,
                'task_url_template': task_url_template,
            },
            status=status.HTTP_200_OK,
        )


class TelegramQuickTaskCreateView(APIView):
    """
    HTTP endpoint: POST /telegram/tasks/quick/
    """

    permission_classes = [AllowAny]
    serializer_class = TelegramQuickTaskSerializer

    def post(self, request):
        chat_id = request.data.get('chat_id')
        title = request.data.get('title')
        description = request.data.get('description', '')

        if not chat_id or not title:
            return Response(
                {'detail': 'chat_id and title are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            task = create_quick_task.__wrapped__(
                chat_id=chat_id,
                title=title,
                description=description,
            )
        except ValueError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(
            {
                'id': task.id,
                'title': task.title,
                'description': task.description,
            },
            status=status.HTTP_201_CREATED,
        )


class TelegramTaskListView(APIView):
    """
    HTTP endpoint: GET /telegram/tasks/
    """

    permission_classes = [AllowAny]
    serializer_class = TelegramTaskListSerializer

    def get(self, request):
        chat_id = request.query_params.get('chat_id')
        status_filter = request.query_params.get('status')

        if not chat_id:
            return Response(
                {'detail': 'chat_id is required'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        limit = int(request.query_params.get('limit', 20))
        try:
            tasks = list_tasks_for_chat.__wrapped__(
                chat_id=int(chat_id),
                status=status_filter,
                limit=limit,
            )
        except ValueError as exc:
            return Response(
                {'detail': str(exc)},
                status=status.HTTP_404_NOT_FOUND,
            )
        base_url = settings.FRONTEND_BASE_URL.rstrip('/')
        task_url_template = f'{base_url}/tasks?task={{id}}'
        return Response(
            {
                'results': [
                    {
                        'id': t.id,
                        'title': t.title,
                        'status': t.status,
                    }
                    for t in tasks
                ],
                'count': len(tasks),
                'limit': limit,
                'task_url_template': task_url_template,
            },
            status=status.HTTP_200_OK,
        )
