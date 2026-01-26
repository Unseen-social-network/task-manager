from django.urls import path

from telegram_bot.views import (
    TelegramHelpView,
    TelegramLinkDisconnectView,
    TelegramLinkRefreshView,
    TelegramQuickTaskCreateView,
    TelegramTaskListView,
    TelegramWebhookView,
)

urlpatterns = [
    path('telegram/webhook/', TelegramWebhookView.as_view(), name='telegram-webhook'),
    path('telegram/help/', TelegramHelpView.as_view(), name='tg-help'),
    path('telegram/link/', TelegramLinkRefreshView.as_view(), name='tg-link-refresh'),
    path(
        'telegram/link/disconnect/',
        TelegramLinkDisconnectView.as_view(),
        name='tg-link-disconnect',
    ),
    path(
        'telegram/tasks/quick/',
        TelegramQuickTaskCreateView.as_view(),
        name='tg-task-quick',
    ),
    path('telegram/tasks/', TelegramTaskListView.as_view(), name='tg-task-list'),
]
