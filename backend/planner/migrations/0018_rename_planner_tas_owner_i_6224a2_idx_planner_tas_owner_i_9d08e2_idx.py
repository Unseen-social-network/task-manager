from django.db import migrations

class Migration(migrations.Migration):

    dependencies = [
        ("planner", "0017_task_status_defaults_ru"),
    ]

    operations = [
        migrations.RunSQL(
            sql="""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1
                    FROM pg_indexes
                    WHERE indexname = 'planner_tas_owner_i_6224a2_idx'
                ) THEN
                    ALTER INDEX planner_tas_owner_i_6224a2_idx
                    RENAME TO planner_tas_owner_i_9d08e2_idx;
                END IF;
            END
            $$;
            """,
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
