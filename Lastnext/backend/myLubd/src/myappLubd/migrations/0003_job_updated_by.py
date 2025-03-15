# Generated by Django 4.2.16 on 2025-03-07 15:28

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('myappLubd', '0002_userprofile_access_token_userprofile_email_verified_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='job',
            name='updated_by',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='updated_jobs', to=settings.AUTH_USER_MODEL),
        ),
    ]
