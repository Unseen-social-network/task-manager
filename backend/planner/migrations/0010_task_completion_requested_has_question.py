from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0009_contactshare_projectshare_projectshareaccess'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='has_question',
            field=models.BooleanField(
                default=False,
                help_text='Whether the assignee flagged a question for the owner',
                verbose_name='Has question',
            ),
        ),
        migrations.AddField(
            model_name='task',
            name='completion_requested',
            field=models.BooleanField(
                default=False,
                help_text='Whether the assignee marked the task as ready for review',
                verbose_name='Completion requested',
            ),
        ),
    ]
