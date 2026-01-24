"""Tests for site analytics settings."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from planner.models import SiteAnalyticsSettings

User = get_user_model()


@pytest.mark.django_db
class TestSiteAnalyticsSettings:
    """Validate public reads and admin-only updates for analytics settings."""

    endpoint = '/api/v1/public/analytics-settings/'

    def test_public_get_returns_singleton_defaults(self):
        client = APIClient()

        response = client.get(self.endpoint)

        assert response.status_code == 200
        assert response.data['enabled'] is True
        assert response.data['yandex_metrika_id'] is None
        assert SiteAnalyticsSettings.objects.count() == 1

    def test_admin_can_update_settings(self):
        admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='adminpass123',
            is_staff=True,
            is_superuser=True,
        )
        client = APIClient()
        client.force_authenticate(user=admin_user)

        response = client.put(
            self.endpoint,
            {'yandex_metrika_id': 106338825, 'enabled': True},
            format='json',
        )

        assert response.status_code == 200
        settings_obj = SiteAnalyticsSettings.get_solo()
        assert settings_obj.yandex_metrika_id == 106338825
        assert settings_obj.enabled is True

    def test_non_admin_cannot_update_settings(self, user):
        client = APIClient()
        client.force_authenticate(user=user)

        response = client.put(
            self.endpoint,
            {'yandex_metrika_id': 1},
            format='json',
        )

        assert response.status_code == 403
