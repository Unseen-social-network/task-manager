from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('planner', '0020_remove_task_planner_tas_owner_i_6224a2_idx_and_more'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                migrations.RemoveIndex(
                    model_name='task',
                    name='planner_tas_owner_i_6224a2_idx',
                ),
                migrations.RemoveIndex(
                    model_name='task',
                    name='planner_tas_owner_i_1115a4_idx',
                ),
                migrations.RemoveIndex(
                    model_name='task',
                    name='planner_tas_owner_i_53b5e1_idx',
                ),
            ],
        ),
    ]
