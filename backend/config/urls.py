"""
URL configuration for Planner project.
"""

import os
import sys

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def is_test_env() -> bool:
    return bool(
        os.getenv('USE_SQLITE_FOR_TESTS')
        or os.getenv('PYTEST_CURRENT_TEST')
        or 'test' in sys.argv
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('telegram_bot.urls')),
    path('api/v1/', include('planner.urls')),
    # OpenAPI schema
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path(
        'api/schema/swagger-ui/',
        SpectacularSwaggerView.as_view(url_name='schema'),
        name='swagger-ui',
    ),
]

# 🔹 BACKWARD COMPATIBILITY ONLY FOR TESTS
if is_test_env():
    urlpatterns += [
        path('api/', include('telegram_bot.urls')),
    ]


# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
