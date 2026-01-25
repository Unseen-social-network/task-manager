"""
URL routing for Planner API.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from .views import (
    AttachmentViewSet,
    ContactViewSet,
    ContactShareCopyView,
    ContactShareView,
    InviteAcceptView,
    InviteViewSet,
    PasswordChangeView,
    ProfileView,
    ProjectViewSet,
    ProjectShareCopyView,
    ProjectShareView,
    SiteSettingView,
    TaskViewSet,
)

router = DefaultRouter()
router.register(r'contacts', ContactViewSet, basename='contact')
router.register(r'projects', ProjectViewSet, basename='project')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'attachments', AttachmentViewSet, basename='attachment')
router.register(r'invites', InviteViewSet, basename='invite')

urlpatterns = [
    # JWT Authentication
    path('auth/jwt/create/', TokenObtainPairView.as_view(), name='jwt-create'),
    path('auth/jwt/refresh/', TokenRefreshView.as_view(), name='jwt-refresh'),
    path('site-settings/', SiteSettingView.as_view(), name='site-settings'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('profile/password/', PasswordChangeView.as_view(), name='password-change'),
    path('share/contacts/<uuid:token>/', ContactShareView.as_view(), name='contact-share'),
    path(
        'share/contacts/<uuid:token>/copy/',
        ContactShareCopyView.as_view(),
        name='contact-share-copy',
    ),
    path('share/projects/<uuid:token>/', ProjectShareView.as_view(), name='project-share'),
    path(
        'share/projects/<uuid:token>/copy/',
        ProjectShareCopyView.as_view(),
        name='project-share-copy',
    ),
    path(
        'invites/accept/<uuid:token>/', InviteAcceptView.as_view(), name='invite-accept'
    ),
    # API endpoints
    path('', include(router.urls)),
]
