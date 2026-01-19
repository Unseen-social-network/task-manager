"""
URL routing for Planner API.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import AttachmentViewSet, ContactViewSet, TaskViewSet

router = DefaultRouter()
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'attachments', AttachmentViewSet, basename='attachment')

urlpatterns = [
    # JWT Authentication
    path('auth/jwt/create/', TokenObtainPairView.as_view(), name='jwt-create'),
    path('auth/jwt/refresh/', TokenRefreshView.as_view(), name='jwt-refresh'),
    # API endpoints
    path('', include(router.urls)),
]
