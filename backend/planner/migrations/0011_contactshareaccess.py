from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0010_task_completion_requested_has_question'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='ContactShareAccess',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'created_at',
                    models.DateTimeField(auto_now_add=True, verbose_name='Created at'),
                ),
                (
                    'contact',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='share_accesses',
                        to='planner.contact',
                        verbose_name='Contact',
                    ),
                ),
                (
                    'granted_by',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='contact_share_grants',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='Granted by',
                    ),
                ),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='shared_contacts',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='User',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Contact Share Access',
                'verbose_name_plural': 'Contact Share Accesses',
                'indexes': [
                    models.Index(
                        fields=['contact', 'user'],
                        name='planner_con_contact_9c9b5f_idx',
                    ),
                    models.Index(
                        fields=['user', '-created_at'],
                        name='planner_con_user_id_a7b4c9_idx',
                    ),
                ],
                'constraints': [
                    models.UniqueConstraint(
                        fields=('contact', 'user'),
                        name='uniq_contact_share_access',
                    ),
                ],
            },
        ),
    ]
