from django.db import migrations, models


def copy_contact_to_contacts(apps, schema_editor):
    Task = apps.get_model('planner', 'Task')
    for task in Task.objects.exclude(contact__isnull=True).iterator():
        task.contacts.add(task.contact)


def clear_contacts(apps, schema_editor):
    Task = apps.get_model('planner', 'Task')
    for task in Task.objects.all().iterator():
        task.contacts.clear()


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0013_profile_self_contact_profile_share_invite_contact'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='contacts',
            field=models.ManyToManyField(
                blank=True,
                related_name='tasks_multi',
                to='planner.contact',
                verbose_name='Contacts',
            ),
        ),
        migrations.RunPython(copy_contact_to_contacts, clear_contacts),
    ]
