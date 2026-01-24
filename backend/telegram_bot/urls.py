"""URL routing for Telegram bot integration."""

from django.urls import path

from .views import (
    TelegramFullTaskCreateView,
    TelegramHelpView,
    TelegramLinkConfirmView,
    TelegramLinkDisconnectView,
    TelegramLinkRefreshView,
    TelegramLoginView,
    TelegramNotificationsView,
    TelegramPasswordResetView,
    TelegramQuickTaskCreateView,
    TelegramTaskDetailView,
    TelegramTaskListView,
    TelegramWebhookView,
)

urlpatterns = [
    path('telegram/link/', TelegramLinkRefreshView.as_view(), name='telegram-link'),
    path(
        'telegram/link/disconnect/',
        TelegramLinkDisconnectView.as_view(),
        name='telegram-link-disconnect',
    ),
    path(
        'telegram/link/confirm/',
        TelegramLinkConfirmView.as_view(),
        name='telegram-link-confirm',
    ),
    path(
        'telegram/webhook/',
        TelegramWebhookView.as_view(),
        name='telegram-webhook',
    ),
    path(
        'telegram/tasks/quick/',
        TelegramQuickTaskCreateView.as_view(),
        name='tg-task-quick',
    ),
    path(
        'telegram/tasks/full/',
        TelegramFullTaskCreateView.as_view(),
        name='tg-task-full',
    ),
    path(
        'telegram/tasks/',
        TelegramTaskListView.as_view(),
        name='tg-task-list',
    ),
    path(
        'telegram/tasks/<int:task_id>/',
        TelegramTaskDetailView.as_view(),
        name='tg-task-detail',
    ),
    path(
        'telegram/notifications/',
        TelegramNotificationsView.as_view(),
        name='tg-notifications',
    ),
    path(
        'telegram/password-reset/',
        TelegramPasswordResetView.as_view(),
        name='tg-password-reset',
    ),
    path('telegram/login/', TelegramLoginView.as_view(), name='tg-login'),
    path('telegram/help/', TelegramHelpView.as_view(), name='tg-help'),
]
