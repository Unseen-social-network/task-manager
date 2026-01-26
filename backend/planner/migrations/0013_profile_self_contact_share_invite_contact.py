from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ('planner', '0012_contactshareaccess'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='self_contact',
            field=models.OneToOneField(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='profile',
                to='planner.contact',
                verbose_name='Self contact',
            ),
        ),
        migrations.AddField(
            model_name='profile',
            name='share_invite_contact',
            field=models.BooleanField(
                default=True, verbose_name='Share contact with inviter'
            ),
        ),
    ]
