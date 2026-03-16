import pytest
import django
from django.conf import settings


def pytest_configure(config):
    """Configure Django settings for the test suite."""
    settings.configure(
        DATABASES={
            'default': {
                'ENGINE': 'django.contrib.gis.db.backends.postgis',
                'NAME': 'adventurelog_test',
                'USER': 'adventure',
                'PASSWORD': 'changeme123',
                'HOST': 'localhost',
                'PORT': '5432',
            }
        },
        INSTALLED_APPS=[
            'django.contrib.contenttypes',
            'django.contrib.auth',
        ],
        SECRET_KEY='test-secret-key-for-ci-only',
        DEFAULT_AUTO_FIELD='django.db.models.BigAutoField',
    )