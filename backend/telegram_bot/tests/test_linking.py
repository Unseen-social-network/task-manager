import uuid

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from telegram_bot.services.tasks import link_profile_by_token

User = get_user_model()


@pytest.mark.django_db
def test_link_profile_by_token_sets_fields():
    user = User.objects.create_user(username='owner', password='pass123456')
    profile = user.profile
    profile.telegram_link_token = uuid.uuid4()
    profile.save(update_fields=['telegram_link_token'])

    chat_id = 4242
    token_before = profile.telegram_link_token
    linked_profile, error = link_profile_by_token.__wrapped__(
        link_token=token_before,
        chat_id=chat_id,
        telegram_username='tester',
    )

    assert error is None
    assert linked_profile.telegram_chat_id == chat_id
    assert linked_profile.telegram_username == '@tester'
    assert linked_profile.telegram_linked_at <= timezone.now()
    assert linked_profile.telegram_link_token != token_before


@pytest.mark.django_db
def test_link_profile_by_token_rejects_chat_in_use():
    user = User.objects.create_user(username='owner', password='pass123456')
    other = User.objects.create_user(username='other', password='pass123456')

    profile = user.profile
    profile.telegram_link_token = uuid.uuid4()
    profile.save(update_fields=['telegram_link_token'])

    other_profile = other.profile
    other_profile.telegram_chat_id = 111
    other_profile.save(update_fields=['telegram_chat_id'])

    linked_profile, error = link_profile_by_token.__wrapped__(
        link_token=profile.telegram_link_token,
        chat_id=111,
        telegram_username='tester',
    )

    assert linked_profile is None
    assert error == 'chat_in_use'
