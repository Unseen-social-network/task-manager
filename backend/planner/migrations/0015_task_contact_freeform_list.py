from django.db import migrations, models


def seed_freeform_list(apps, schema_editor):
    Task = apps.get_model('planner', 'Task')
    for task in Task.objects.exclude(contact_freeform='').iterator():
        if task.contact_freeform:
            task.contact_freeform_list = [task.contact_freeform]
            task.save(update_fields=['contact_freeform_list'])


def clear_freeform_list(apps, schema_editor):
    Task = apps.get_model('planner', 'Task')
    Task.objects.update(contact_freeform_list=None)


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0014_task_contacts'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='contact_freeform_list',
            field=models.JSONField(
                blank=True,
                null=True,
                verbose_name='Freeform contacts',
                help_text='Manual contact info list (if not using contact book)',
            ),
        ),
        migrations.RunPython(seed_freeform_list, clear_freeform_list),
    ]
