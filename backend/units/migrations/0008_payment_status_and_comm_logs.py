from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('units', '0007_notificationsettings'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='payment',
            name='status',
            field=models.CharField(
                choices=[('Payment Received', 'Payment Received'), ('Payment Verified', 'Payment Verified')],
                default='Payment Received',
                max_length=30,
            ),
        ),
        migrations.AddField(
            model_name='payment',
            name='verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='payment',
            name='verified_by',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='payments_verified',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddIndex(
            model_name='payment',
            index=models.Index(fields=['status'], name='units_payme_status_5f30d8_idx'),
        ),
        migrations.CreateModel(
            name='PaymentCommunicationLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('channel', models.CharField(choices=[('email', 'Email'), ('whatsapp', 'WhatsApp'), ('sms', 'SMS')], max_length=20)),
                ('delivery_status', models.CharField(choices=[('sent', 'Sent'), ('failed', 'Failed'), ('skipped', 'Skipped')], max_length=20)),
                ('recipient', models.CharField(blank=True, max_length=255)),
                ('detail', models.TextField(blank=True)),
                ('sent_at', models.DateTimeField(auto_now_add=True)),
                ('payment', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='communication_logs', to='units.payment')),
                ('sent_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='payment_communication_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Payment Communication Log',
                'verbose_name_plural': 'Payment Communication Logs',
                'ordering': ['-sent_at'],
            },
        ),
        migrations.AddIndex(
            model_name='paymentcommunicationlog',
            index=models.Index(fields=['channel', 'delivery_status'], name='units_payme_channel_e1ebf8_idx'),
        ),
        migrations.AddIndex(
            model_name='paymentcommunicationlog',
            index=models.Index(fields=['sent_at'], name='units_payme_sent_at_9fe2eb_idx'),
        ),
    ]
