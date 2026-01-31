from django.db import migrations


def ensure_default_statuses(apps, schema_editor):
    TaskStatus = apps.get_model('planner', 'TaskStatus')
    defaults = [
        {
            'key': 'todo',
            'label': 'К выполнению',
            'order': 1,
            'is_archived': False,
            'is_done': False,
            'is_default': True,
        },
        {
            'key': 'in_progress',
            'label': 'В работе',
            'order': 2,
            'is_archived': False,
            'is_done': False,
            'is_default': False,
        },
        {
            'key': 'done',
            'label': 'Выполнена',
            'order': 3,
            'is_archived': True,
            'is_done': True,
            'is_default': False,
        },
        {
            'key': 'canceled',
            'label': 'Отменена',
            'order': 4,
            'is_archived': True,
            'is_done': False,
            'is_default': False,
        },
    ]
    english_labels = {
        'todo': {'To Do', 'Todo'},
        'in_progress': {'In Progress'},
        'done': {'Done'},
        'canceled': {'Canceled', 'Cancelled'},
    }

    for status in defaults:
        obj, created = TaskStatus.objects.get_or_create(
            key=status['key'],
            defaults=status,
        )
        if created:
            continue
        updates = {}
        if obj.label in english_labels.get(status['key'], set()):
            updates['label'] = status['label']
        if obj.order != status['order']:
            updates['order'] = status['order']
        if obj.is_archived != status['is_archived']:
            updates['is_archived'] = status['is_archived']
        if obj.is_done != status['is_done']:
            updates['is_done'] = status['is_done']
        if status['is_default'] and not obj.is_default:
            TaskStatus.objects.filter(is_default=True).update(is_default=False)
            updates['is_default'] = True
        if updates:
            for field, value in updates.items():
                setattr(obj, field, value)
            obj.save(update_fields=list(updates.keys()))


class Migration(migrations.Migration):
    dependencies = [
        ('planner', '0016_task_statuses'),
    ]

    operations = [
        migrations.RunPython(ensure_default_statuses, migrations.RunPython.noop),
    ]
