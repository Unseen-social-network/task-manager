from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('planner', '0010_task_completion_requested_has_question'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='tagged_users',
            field=models.ManyToManyField(
                blank=True,
                related_name='multi_tagged_tasks',
                to=settings.AUTH_USER_MODEL,
                verbose_name='Tagged users',
            ),
        ),
    ]
