"""
Tests for JWT authentication.
"""

import pytest
from django.contrib.auth import get_user_model
from rest_framework import status

User = get_user_model()


@pytest.mark.django_db
class TestJWTAuth:
    """Tests for JWT authentication endpoints."""

    def test_obtain_jwt_token_success(self, api_client, user):
        """Test successful JWT token obtainment."""
        url = "/api/v1/auth/jwt/create/"
        data = {"username": "testuser", "password": "testpass123"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_obtain_jwt_token_invalid_credentials(self, api_client, user):
        """Test JWT token obtainment with invalid credentials."""
        url = "/api/v1/auth/jwt/create/"
        data = {"username": "testuser", "password": "wrongpassword"}

        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_jwt_token(self, api_client, user):
        """Test JWT token refresh."""
        # First obtain tokens
        url_obtain = "/api/v1/auth/jwt/create/"
        data = {"username": "testuser", "password": "testpass123"}
        response = api_client.post(url_obtain, data)
        refresh_token = response.data["refresh"]

        # Now refresh
        url_refresh = "/api/v1/auth/jwt/refresh/"
        response = api_client.post(url_refresh, {"refresh": refresh_token})

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_unauthenticated_access_denied(self, api_client):
        """Test that unauthenticated users cannot access protected endpoints."""
        url = "/api/v1/tasks/"
        response = api_client.get(url)

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
