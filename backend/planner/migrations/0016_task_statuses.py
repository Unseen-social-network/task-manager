from django.db import migrations, models
import django.db.models.deletion


def create_task_statuses(apps, schema_editor):
    TaskStatus = apps.get_model('planner', 'TaskStatus')
    defaults = [
        {
            'key': 'todo',
            'label': 'To Do',
            'order': 1,
            'is_archived': False,
            'is_done': False,
            'is_default': True,
        },
        {
            'key': 'in_progress',
            'label': 'In Progress',
            'order': 2,
            'is_archived': False,
            'is_done': False,
            'is_default': False,
        },
        {
            'key': 'done',
            'label': 'Done',
            'order': 3,
            'is_archived': True,
            'is_done': True,
            'is_default': False,
        },
        {
            'key': 'canceled',
            'label': 'Canceled',
            'order': 4,
            'is_archived': True,
            'is_done': False,
            'is_default': False,
        },
    ]
    for status in defaults:
        TaskStatus.objects.update_or_create(key=status['key'], defaults=status)


def migrate_task_statuses(apps, schema_editor):
    TaskStatus = apps.get_model('planner', 'TaskStatus')
    Task = apps.get_model('planner', 'Task')
    status_map = {
        status.key: status.id for status in TaskStatus.objects.all().order_by('order')
    }
    if not status_map:
        return
    default_status_id = status_map.get('todo') or next(iter(status_map.values()))
    table = Task._meta.db_table
    connection = schema_editor.connection
    with connection.cursor() as cursor:
        columns = [
            column.name
            for column in connection.introspection.get_table_description(cursor, table)
        ]
        if 'status_key' in columns:
            for key, status_id in status_map.items():
                cursor.execute(
                    f'UPDATE {table} SET status_id = %s WHERE status_key = %s',
                    [status_id, key],
                )
        else:
            for key, status_id in status_map.items():
                cursor.execute(
                    f'UPDATE {table} SET status_id = %s WHERE status_id = %s',
                    [status_id, key],
                )
        status_ids = list(status_map.values())
        if status_ids:
            placeholders = ', '.join(['%s'] * len(status_ids))
            cursor.execute(
                f'UPDATE {table} SET status_id = %s WHERE status_id NOT IN ({placeholders})',
                [default_status_id, *status_ids],
            )
        cursor.execute(
            f'UPDATE {table} SET status_id = %s WHERE status_id IS NULL',
            [default_status_id],
        )


class Migration(migrations.Migration):
    dependencies = [
        ('planner', '0015_profile_default_task_view'),
    ]

    operations = [
        migrations.CreateModel(
            name='TaskStatus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('key', models.CharField(max_length=64, unique=True, verbose_name='Key')),
                ('label', models.CharField(max_length=255, verbose_name='Label')),
                ('order', models.PositiveIntegerField(default=0, verbose_name='Order')),
                ('is_archived', models.BooleanField(default=False, verbose_name='Is archived')),
                ('is_done', models.BooleanField(default=False, verbose_name='Is done')),
                ('is_default', models.BooleanField(default=False, verbose_name='Is default')),
            ],
            options={
                'verbose_name': 'Task status',
                'verbose_name_plural': 'Task statuses',
                'ordering': ['order', 'label'],
            },
        ),
        migrations.RenameField(
            model_name='task',
            old_name='status',
            new_name='status_key',
        ),
        migrations.AddField(
            model_name='task',
            name='status',
            field=models.ForeignKey(
                null=True,
                on_delete=django.db.models.deletion.PROTECT,
                related_name='tasks',
                to='planner.taskstatus',
                verbose_name='Status',
            ),
        ),
        migrations.RunPython(create_task_statuses, migrations.RunPython.noop),
        migrations.RunPython(migrate_task_statuses, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name='task',
            name='status_key',
        ),
        migrations.AlterField(
            model_name='task',
            name='status',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name='tasks',
                to='planner.taskstatus',
                verbose_name='Status',
            ),
        ),
    ]
