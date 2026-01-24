"""Tests for public site settings endpoint."""

import pytest

from planner.models import SiteSetting


@pytest.mark.django_db
def test_site_settings_endpoint_returns_default(api_client):
    response = api_client.get('/api/v1/site-settings/')

    assert response.status_code == 200
    assert response.data['head_html'] == ''
    assert 'updated_at' in response.data


@pytest.mark.django_db
def test_site_settings_endpoint_returns_saved_html(api_client):
    settings_obj = SiteSetting.get_solo()
    settings_obj.head_html = '<script src="https://example.com/tag.js"></script>'
    settings_obj.save()

    response = api_client.get('/api/v1/site-settings/')

    assert response.status_code == 200
    assert response.data['head_html'] == settings_obj.head_html
