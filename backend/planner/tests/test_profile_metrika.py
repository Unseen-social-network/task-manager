"""Tests for profile-based Yandex.Metrika configuration."""

import pytest
from rest_framework import status

from planner.models import Profile


@pytest.mark.django_db
class TestProfileMetrikaSettings:
    """Ensure users can store their own counter ID in the profile."""

    endpoint = '/api/v1/profile/'

    def test_user_can_set_metrika_id(self, authenticated_client, user):
        response = authenticated_client.put(
            self.endpoint,
            {'yandex_metrika_id': 106338825},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        profile = Profile.objects.get(user=user)
        assert profile.yandex_metrika_id == 106338825
        assert response.data['yandex_metrika_id'] == 106338825

    def test_user_can_clear_metrika_id(self, authenticated_client, user):
        profile = Profile.objects.get(user=user)
        profile.yandex_metrika_id = 123
        profile.save(update_fields=['yandex_metrika_id'])

        response = authenticated_client.put(
            self.endpoint,
            {'yandex_metrika_id': None},
            format='json',
        )

        assert response.status_code == status.HTTP_200_OK
        profile.refresh_from_db()
        assert profile.yandex_metrika_id is None
        assert response.data['yandex_metrika_id'] is None
