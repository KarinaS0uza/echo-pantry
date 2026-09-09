from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="DemoState",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("items", models.JSONField(default=list)),
                ("completions", models.JSONField(default=dict)),
                ("points", models.PositiveIntegerField(default=0)),
                ("meals_cooked", models.PositiveIntegerField(default=0)),
            ],
        )
    ]
