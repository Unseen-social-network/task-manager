from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0003_contactshare_projectshare'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProjectShareAccess',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name='ID'
                    ),
                ),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created at')),
                (
                    'granted_by',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='project_share_grants',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='Granted by',
                    ),
                ),
                (
                    'project',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='share_accesses',
                        to='planner.project',
                        verbose_name='Project',
                    ),
                ),
                (
                    'user',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='shared_projects',
                        to=settings.AUTH_USER_MODEL,
                        verbose_name='User',
                    ),
                ),
            ],
            options={
                'verbose_name': 'Project Share Access',
                'verbose_name_plural': 'Project Share Accesses',
            },
        ),
        migrations.AddConstraint(
            model_name='projectshareaccess',
            constraint=models.UniqueConstraint(
                fields=('project', 'user'), name='uniq_project_share_access'
            ),
        ),
        migrations.AddIndex(
            model_name='projectshareaccess',
            index=models.Index(fields=['project', 'user'], name='planner_pro_project_user_idx'),
        ),
        migrations.AddIndex(
            model_name='projectshareaccess',
            index=models.Index(fields=['user', '-created_at'], name='planner_pro_user_created_idx'),
        ),
    ]
