from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('units', '0006_invoicecancellationapprovaltask'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationSettings',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('smtp_host', models.CharField(blank=True, max_length=255)),
                ('smtp_port', models.PositiveIntegerField(default=587)),
                ('smtp_username', models.CharField(blank=True, max_length=255)),
                ('smtp_password', models.CharField(blank=True, max_length=255)),
                ('smtp_use_tls', models.BooleanField(default=True)),
                ('smtp_use_ssl', models.BooleanField(default=False)),
                ('default_from_email', models.EmailField(blank=True, max_length=254)),
                ('twilio_account_sid', models.CharField(blank=True, max_length=255)),
                ('twilio_auth_token', models.CharField(blank=True, max_length=255)),
                ('twilio_sms_from', models.CharField(blank=True, max_length=30)),
                ('twilio_whatsapp_from', models.CharField(blank=True, max_length=30)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='notification_settings_updates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Notification Settings',
                'verbose_name_plural': 'Notification Settings',
            },
        ),
    ]