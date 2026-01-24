import pytest


@pytest.fixture(autouse=True)
def mock_aiohttp_post(monkeypatch):
    """
    Полностью отключает любые HTTP-запросы через aiohttp
    (включая Telegram API)
    """

    class MockResponse:
        status = 200

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def json(self):
            return {}

        def raise_for_status(self):
            return None

    class MockSession:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        def post(self, *args, **kwargs):
            return MockResponse()

    monkeypatch.setattr(
        'aiohttp.ClientSession',
        MockSession,
    )
