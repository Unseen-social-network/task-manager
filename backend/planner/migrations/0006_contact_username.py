from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('planner', '0005_taskcomment'),
    ]

    operations = [
        migrations.AddField(
            model_name='contact',
            name='username',
            field=models.CharField(blank=True, max_length=150, verbose_name='Username'),
        ),
    ]
