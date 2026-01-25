from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0002_task_tagged_user_task_time_spent_seconds_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='ContactShare',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                (
                    'token',
                    models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
                ),
                ('is_active', models.BooleanField(default=True, verbose_name='Active')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('revoked_at', models.DateTimeField(blank=True, null=True, verbose_name='Revoked at')),
                (
                    'contact',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='share',
                        to='planner.contact',
                        verbose_name='Contact',
                    ),
                ),
                (
                    'owner',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='contact_shares',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='Owner',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Contact Share',
                'verbose_name_plural': 'Contact Shares',
            },
        ),
        migrations.CreateModel(
            name='ProjectShare',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                (
                    'token',
                    models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
                ),
                ('is_active', models.BooleanField(default=True, verbose_name='Active')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                ('revoked_at', models.DateTimeField(blank=True, null=True, verbose_name='Revoked at')),
                (
                    'owner',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='project_shares',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='Owner',
                    ),
                ),
                (
                    'project',
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='share',
                        to='planner.project',
                        verbose_name='Project',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Project Share',
                'verbose_name_plural': 'Project Shares',
            },
        ),
        migrations.AddIndex(
            model_name='contactshare',
            index=models.Index(fields=['token'], name='planner_con_token_7a9b0c_idx'),
        ),
        migrations.AddIndex(
            model_name='contactshare',
            index=models.Index(fields=['owner', '-created_at'], name='planner_con_owner_i_6e6e4b_idx'),
        ),
        migrations.AddIndex(
            model_name='projectshare',
            index=models.Index(fields=['token'], name='planner_pro_token_aa5b8a_idx'),
        ),
        migrations.AddIndex(
            model_name='projectshare',
            index=models.Index(fields=['owner', '-created_at'], name='planner_pro_owner_i_7a8f72_idx'),
        ),
    ]
