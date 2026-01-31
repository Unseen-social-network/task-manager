from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        (
            'planner',
            '0019_rename_planner_tas_owner_i_6224a2_idx_task_owner_status_created_idx_and_more',
        ),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DROP INDEX IF EXISTS planner_tas_owner_i_6224a2_idx;
            DROP INDEX IF EXISTS planner_tas_owner_i_1115a4_idx;
            DROP INDEX IF EXISTS planner_tas_owner_i_53b5e1_idx;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
