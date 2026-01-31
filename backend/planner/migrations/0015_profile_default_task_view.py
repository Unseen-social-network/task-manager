from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('planner', '0014_task_contact_freeform_list_task_contacts'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='default_task_view',
            field=models.CharField(
                choices=[('list', 'List'), ('kanban', 'Kanban')],
                default='list',
                max_length=20,
                verbose_name='Default task view',
            ),
        ),
    ]
