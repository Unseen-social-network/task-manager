from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from planner.views import AttachmentViewSet, ContactViewSet, TaskViewSet

router = DefaultRouter()
router.register("contacts", ContactViewSet, basename="contacts")
router.register("tasks", TaskViewSet, basename="tasks")
router.register("attachments", AttachmentViewSet, basename="attachments")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/auth/jwt/create/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/jwt/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/v1/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
