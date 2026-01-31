from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0018_rename_planner_tas_owner_i_6224a2_idx_planner_tas_owner_i_9d08e2_idx'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 🔥 УДАЛЯЕМ СТАРЫЕ АВТО-ИНДЕКСЫ (если они есть)
        migrations.RunSQL(
            sql="""
            DROP INDEX IF EXISTS planner_tas_owner_i_6224a2_idx;
            DROP INDEX IF EXISTS planner_tas_owner_i_1115a4_idx;
            DROP INDEX IF EXISTS planner_tas_owner_i_53b5e1_idx;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),

        # ✅ СОЗДАЁМ НОВЫЕ СТАБИЛЬНЫЕ ИНДЕКСЫ
        migrations.AddIndex(
            model_name='task',
            index=models.Index(
                fields=['owner', 'status', '-created_at'],
                name='task_owner_status_created_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(
                fields=['owner', 'urgency'],
                name='task_owner_urgency_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='task',
            index=models.Index(
                fields=['owner', 'due_date'],
                name='task_owner_due_date_idx',
            ),
        ),

        # 🧹 Остальные изменения — ОК
        migrations.AlterField(
            model_name='task',
            name='completion_requested',
            field=models.BooleanField(default=False, verbose_name='Completion requested'),
        ),
        migrations.AlterField(
            model_name='task',
            name='has_question',
            field=models.BooleanField(default=False, verbose_name='Has question'),
        ),
        migrations.AlterField(
            model_name='task',
            name='owner',
            field=models.ForeignKey(
                db_index=False,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='tasks',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Owner',
            ),
        ),
        migrations.AlterField(
            model_name='task',
            name='pomodoro_sessions',
            field=models.PositiveIntegerField(default=0, verbose_name='Pomodoro sessions'),
        ),
        migrations.AlterField(
            model_name='task',
            name='tracking_completed',
            field=models.BooleanField(default=False, verbose_name='Tracking completed'),
        ),
    ]
