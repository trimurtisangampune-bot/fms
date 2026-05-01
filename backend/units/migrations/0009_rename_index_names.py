from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('units', '0008_payment_status_and_comm_logs'),
    ]

    operations = [
        migrations.RenameIndex(
            model_name='invoicecancellationapprovaltask',
            new_name='units_invoi_status_9e8fdf_idx',
            old_name='units_invoi_status_cancel_idx',
        ),
        migrations.RenameIndex(
            model_name='invoicecancellationapprovaltask',
            new_name='units_invoi_created_d12cc9_idx',
            old_name='units_invoi_created_cancel_idx',
        ),
        migrations.RenameIndex(
            model_name='payment',
            new_name='units_payme_status_ca5520_idx',
            old_name='units_payme_status_5f30d8_idx',
        ),
        migrations.RenameIndex(
            model_name='paymentcommunicationlog',
            new_name='units_payme_channel_dc3bfc_idx',
            old_name='units_payme_channel_e1ebf8_idx',
        ),
        migrations.RenameIndex(
            model_name='paymentcommunicationlog',
            new_name='units_payme_sent_at_58aa18_idx',
            old_name='units_payme_sent_at_9fe2eb_idx',
        ),
    ]
