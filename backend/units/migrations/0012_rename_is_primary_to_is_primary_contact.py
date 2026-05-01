from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('units', '0011_remove_member_share_amount'),
    ]

    operations = [
        # Drop the old constraint before renaming the field it references
        migrations.RemoveConstraint(
            model_name='member',
            name='unique_primary_member_per_unit',
        ),
        # Rename the column on the Member table
        migrations.RenameField(
            model_name='member',
            old_name='is_primary',
            new_name='is_primary_contact',
        ),
        # Re-add the constraint using the new field name
        migrations.AddConstraint(
            model_name='member',
            constraint=models.UniqueConstraint(
                condition=models.Q(is_primary_contact=True),
                fields=['unit', 'is_primary_contact'],
                name='unique_primary_contact_per_unit',
            ),
        ),
    ]
