from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.utils.translation import gettext_lazy as _
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
import json


class Unit(models.Model):
    """
    Represents a residential unit in the cooperative society.
    """
    UNIT_TYPE_CHOICES = [
        ('Flat', 'Flat'),
        ('Villa', 'Villa'),
        ('Shop', 'Shop'),
        ('Office', 'Office'),
        ('Parking', 'Parking'),
    ]
    
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Disputed', 'Disputed'),
        ('Sold', 'Sold'),
        ('Vacant', 'Vacant'),
    ]
    OCCUPANCY_STATUS_CHOICES = [
        ('Owner Occupied', 'Owner Occupied'),
        ('Rented', 'Rented'),
    ]

    INVOICE_FREQUENCY_CHOICES = [
        ('Monthly', 'Monthly'),
        ('Annual', 'Annual'),
    ]

    unit_number = models.CharField(
        max_length=20,
        unique=True,
        help_text="e.g., A-101",
        validators=[
            RegexValidator(
                regex=r'^[A-Z0-9\-]+$',
                message='Unit number must contain only letters, numbers, and hyphens'
            )
        ]
    )
    block = models.CharField(max_length=50)
    floor = models.IntegerField(validators=[MinValueValidator(0)])
    area_sqft = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text="Carpet area in square feet"
    )
    unit_type = models.CharField(
        max_length=20,
        choices=UNIT_TYPE_CHOICES,
        default='Flat'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='Active'
    )
    occupancy_status = models.CharField(
        max_length=20,
        choices=OCCUPANCY_STATUS_CHOICES,
        default='Owner Occupied',
        help_text='Whether this unit is occupied by owner or rented to tenant'
    )
    invoice_frequency = models.CharField(
        max_length=20,
        choices=INVOICE_FREQUENCY_CHOICES,
        blank=True,
        default='',
        help_text='Override maintenance invoice frequency for this unit. Leave blank to use template default.'
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='units_created'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='units_updated'
    )
    
    class Meta:
        ordering = ['block', 'floor', 'unit_number']
        indexes = [
            models.Index(fields=['unit_number']),
            models.Index(fields=['block', 'floor']),
            models.Index(fields=['status']),
            models.Index(fields=['occupancy_status']),
        ]
        verbose_name_plural = 'Units'
    
    def __str__(self):
        return f"{self.unit_number} - {self.block}"
    
    def get_primary_member(self):
        """Get the primary contact member for this unit."""
        return self.members.filter(is_primary_contact=True).first()


class Member(models.Model):
    """
    Represents a member (owner/occupant) of a unit.
    """
    OCCUPANT_TYPE_CHOICES = [
        ('Owner', 'Owner'),
        ('Tenant', 'Tenant'),
        ('Caretaker', 'Caretaker'),
        ('Co-owner', 'Co-owner'),
    ]
    
    MEMBERSHIP_STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Inactive', 'Inactive'),
        ('Suspended', 'Suspended'),
        ('Left', 'Left'),
    ]
    
    PAYMENT_PREFERENCE_CHOICES = [
        ('Online', 'Online Transfer'),
        ('Check', 'Check'),
        ('Cash', 'Cash'),
        ('Auto-Debit', 'Auto-Debit'),
    ]
    
    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name='members'
    )
    owner_name = models.CharField(max_length=200)
    occupant_type = models.CharField(
        max_length=20,
        choices=OCCUPANT_TYPE_CHOICES,
        default='Owner'
    )
    contact_phone = models.CharField(
        max_length=15,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Enter a valid phone number'
            )
        ]
    )
    contact_email = models.EmailField(blank=True)
    alternate_contact = models.CharField(max_length=15, blank=True)
    
    membership_status = models.CharField(
        max_length=20,
        choices=MEMBERSHIP_STATUS_CHOICES,
        default='Active'
    )
    payment_preference = models.CharField(
        max_length=20,
        choices=PAYMENT_PREFERENCE_CHOICES,
        default='Online'
    )
    
    # Bank account details (stored as encrypted JSON)
    bank_account = models.JSONField(
        default=dict,
        blank=True,
        help_text="Store as JSON: {account_holder, account_no, ifsc, bank_name}"
    )
    
    is_primary_contact = models.BooleanField(
        default=True,
        help_text="Primary contact for the unit"
    )
    
    move_in_date = models.DateField()
    move_out_date = models.DateField(null=True, blank=True)
    
    nominated_person_name = models.CharField(max_length=200, blank=True)
    nominated_person_contact = models.CharField(max_length=15, blank=True)
    
    notes = models.TextField(blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members_created'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='members_updated'
    )
    
    class Meta:
        ordering = ['unit', 'owner_name']
        indexes = [
            models.Index(fields=['unit']),
            models.Index(fields=['owner_name']),
            models.Index(fields=['contact_email']),
            models.Index(fields=['contact_phone']),
            models.Index(fields=['membership_status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['unit', 'is_primary_contact'],
                condition=models.Q(is_primary_contact=True),
                name='unique_primary_contact_per_unit'
            )
        ]
    
    def __str__(self):
        return f"{self.owner_name} - {self.unit.unit_number}"
    
    def has_bank_details(self):
        """Check if member has complete bank details."""
        if not self.bank_account:
            return False
        required_fields = ['account_holder', 'account_no', 'ifsc', 'bank_name']
        return all(self.bank_account.get(field) for field in required_fields)


class Occupant(models.Model):
    """
    Represents additional occupants in a unit (family members, tenants, etc.)
    """
    OCCUPANT_TYPE_CHOICES = [
        ('Family Member', 'Family Member'),
        ('Tenant', 'Tenant'),
        ('Caretaker', 'Caretaker'),
        ('Guest', 'Guest'),
    ]
    
    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name='occupants'
    )
    name = models.CharField(max_length=200)
    relation = models.CharField(max_length=100, blank=True)
    contact_phone = models.CharField(max_length=15, blank=True)
    occupant_type = models.CharField(
        max_length=20,
        choices=OCCUPANT_TYPE_CHOICES,
        default='Family Member'
    )
    is_primary = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['unit', '-is_primary', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.unit.unit_number})"


class UserProfile(models.Model):
    """User profile with role and portal access settings."""

    ROLE_CHOICES = [
        ('Admin', 'Admin / Society Secretary'),
        ('Treasurer', 'Treasurer / Accountant'),
        ('Member', 'Resident / Member'),
        ('Board Member', 'Board Member'),
        ('Auditor', 'Auditor'),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='profile'
    )
    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default='Member'
    )
    member = models.OneToOneField(
        'Member',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='user_profile',
        help_text='Optional member record linked to this user'
    )
    portal_access = models.BooleanField(
        default=True,
        help_text='Allow portal access for this user'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'User Profile'
        verbose_name_plural = 'User Profiles'
        indexes = [
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.user.username} ({self.role})"


class NotificationSettings(models.Model):
    """Singleton settings for SMTP, SMS, and WhatsApp delivery providers."""

    smtp_host = models.CharField(max_length=255, blank=True)
    smtp_port = models.PositiveIntegerField(default=587)
    smtp_username = models.CharField(max_length=255, blank=True)
    smtp_password = models.CharField(max_length=255, blank=True)
    smtp_use_tls = models.BooleanField(default=True)
    smtp_use_ssl = models.BooleanField(default=False)
    default_from_email = models.EmailField(blank=True)

    twilio_account_sid = models.CharField(max_length=255, blank=True)
    twilio_auth_token = models.CharField(max_length=255, blank=True)
    twilio_sms_from = models.CharField(max_length=30, blank=True)
    twilio_whatsapp_from = models.CharField(max_length=30, blank=True)

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notification_settings_updates'
    )

    class Meta:
        verbose_name = 'Notification Settings'
        verbose_name_plural = 'Notification Settings'

    def __str__(self):
        return 'Notification Settings'

    @classmethod
    def get_solo(cls):
        settings_obj, _ = cls.objects.get_or_create(pk=1)
        return settings_obj


class FormatSettings(models.Model):
    """Singleton settings for generated invoice and receipt number formats."""

    invoice_number_format = models.CharField(max_length=255, default='INV-[fiscal_year]-[seq]')
    invoice_seq_digits = models.PositiveIntegerField(default=4)
    invoice_seq_start = models.PositiveIntegerField(default=1)
    invoice_seq_next = models.PositiveIntegerField(default=1)

    receipt_number_format = models.CharField(max_length=255, default='RCPT-[fiscal_year]-[seq]')
    receipt_seq_digits = models.PositiveIntegerField(default=4)
    receipt_seq_start = models.PositiveIntegerField(default=1)
    receipt_seq_next = models.PositiveIntegerField(default=1)

    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='format_settings_updates'
    )

    class Meta:
        verbose_name = 'Format Settings'
        verbose_name_plural = 'Format Settings'

    def __str__(self):
        return 'Format Settings'

    @classmethod
    def get_solo(cls):
        settings_obj, _ = cls.objects.get_or_create(pk=1)
        updated_fields = []
        if not settings_obj.invoice_seq_next:
            settings_obj.invoice_seq_next = settings_obj.invoice_seq_start or 1
            updated_fields.append('invoice_seq_next')
        if not settings_obj.receipt_seq_next:
            settings_obj.receipt_seq_next = settings_obj.receipt_seq_start or 1
            updated_fields.append('receipt_seq_next')
        if updated_fields:
            updated_fields.append('updated_at')
            settings_obj.save(update_fields=updated_fields)
        return settings_obj


@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)
    else:
        UserProfile.objects.get_or_create(user=instance)


class AuditLog(models.Model):
    """
    Audit trail for tracking changes to Units and Members.
    """
    ACTION_CHOICES = [
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
        ('TRANSFER', 'Transfer'),
    ]
    
    entity_type = models.CharField(
        max_length=50,
        choices=[('Unit', 'Unit'), ('Member', 'Member')]
    )
    entity_id = models.IntegerField()
    entity_name = models.CharField(max_length=255)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    changed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    before_data = models.JSONField(default=dict, blank=True)
    after_data = models.JSONField(default=dict, blank=True)
    description = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id', '-changed_at']),
            models.Index(fields=['-changed_at']),
        ]
    
    def __str__(self):
        return f"{self.action} - {self.entity_type} {self.entity_id}"


class MaintenanceTemplate(models.Model):
    """Template for standard maintenance charges by unit type."""

    BILLING_FREQUENCY_CHOICES = [
        ('Monthly', 'Monthly'),
        ('Annual', 'Annual'),
    ]
    PENALTY_TYPE_CHOICES = [
        ('Percentage', 'Percentage'),
        ('Fixed', 'Fixed'),
    ]

    unit_type = models.CharField(
        max_length=20,
        choices=Unit.UNIT_TYPE_CHOICES,
        default='Flat'
    )
    occupancy_status = models.CharField(
        max_length=20,
        choices=Unit.OCCUPANCY_STATUS_CHOICES,
        default='Owner Occupied'
    )
    base_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    billing_frequency = models.CharField(
        max_length=20,
        choices=BILLING_FREQUENCY_CHOICES,
        default='Monthly'
    )
    due_day = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(31)],
        default=10
    )
    penalty_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    penalty_type = models.CharField(
        max_length=20,
        choices=PENALTY_TYPE_CHOICES,
        default='Percentage'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_templates_created'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='maintenance_templates_updated'
    )

    class Meta:
        ordering = ['unit_type', 'occupancy_status', 'billing_frequency']
        verbose_name = 'Maintenance Template'
        verbose_name_plural = 'Maintenance Templates'
        indexes = [
            models.Index(fields=['unit_type', 'occupancy_status']),
            models.Index(fields=['billing_frequency']),
        ]

    def __str__(self):
        return f"{self.unit_type} / {self.occupancy_status} - {self.billing_frequency}"


class MaintenanceLevy(models.Model):
    """Variable levy linked to a maintenance template."""

    LEVY_TYPE_CHOICES = [
        ('Water', 'Water'),
        ('Electricity', 'Electricity'),
        ('Sinking Fund', 'Sinking Fund'),
        ('Repair Fund', 'Repair Fund'),
    ]

    template = models.ForeignKey(
        MaintenanceTemplate,
        on_delete=models.CASCADE,
        related_name='levies'
    )
    levy_type = models.CharField(
        max_length=50,
        choices=LEVY_TYPE_CHOICES
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    description = models.TextField(blank=True)
    is_mandatory = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['template', 'levy_type']
        verbose_name = 'Maintenance Levy'
        verbose_name_plural = 'Maintenance Levies'
        indexes = [
            models.Index(fields=['template', 'levy_type']),
        ]

    def __str__(self):
        return f"{self.template.unit_type} - {self.levy_type}"


class Invoice(models.Model):
    """Maintenance invoice for a unit and member."""

    INVOICE_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Paid', 'Paid'),
        ('Overdue', 'Overdue'),
        ('Cancelled', 'Cancelled'),
    ]

    unit = models.ForeignKey(
        Unit,
        on_delete=models.CASCADE,
        related_name='invoices'
    )
    member = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    template = models.ForeignKey(
        MaintenanceTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices'
    )
    period_start = models.DateField()
    period_end = models.DateField()
    issue_date = models.DateField(auto_now_add=True)
    due_date = models.DateField()
    invoice_number = models.CharField(max_length=255, unique=True, null=True, blank=True)
    base_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_levies = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    penalty_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    paid_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    total_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0.00')
    )
    status = models.CharField(
        max_length=20,
        choices=INVOICE_STATUS_CHOICES,
        default='Pending'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices_created'
    )
    updated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoices_updated'
    )

    class Meta:
        ordering = ['-period_start', 'unit']
        verbose_name = 'Invoice'
        verbose_name_plural = 'Invoices'
        indexes = [
            models.Index(fields=['unit', 'status']),
            models.Index(fields=['due_date']),
        ]

    def __str__(self):
        return f"Invoice {self.invoice_number or self.id} - {self.unit.unit_number} ({self.period_start} to {self.period_end})"

    @property
    def outstanding_amount(self):
        return max(Decimal('0.00'), self.total_amount - self.paid_amount)


class InvoiceItem(models.Model):
    """Breakdown of levies or charges on an invoice."""

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    levy_type = models.CharField(max_length=50)
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['invoice', 'levy_type']
        verbose_name = 'Invoice Item'
        verbose_name_plural = 'Invoice Items'

    def __str__(self):
        return f"{self.levy_type} - {self.amount}"


class InvoicePenalty(models.Model):
    """Record of penalty calculations applied to an invoice."""

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='penalties'
    )
    penalty_date = models.DateField()
    penalty_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    days_overdue = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-penalty_date']
        verbose_name = 'Invoice Penalty'
        verbose_name_plural = 'Invoice Penalties'

    def __str__(self):
        return f"Penalty {self.penalty_amount} on {self.penalty_date}"


class Payment(models.Model):
    """Payment entry against a maintenance invoice."""

    PAYMENT_MODE_CHOICES = [
        ('Cash', 'Cash'),
        ('Cheque', 'Cheque'),
        ('Online', 'Online'),
        ('Transfer', 'Transfer'),
        ('UPI', 'UPI'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('Payment Received', 'Payment Received'),
        ('Payment Verified', 'Payment Verified'),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.CASCADE,
        related_name='payments'
    )
    receipt_number = models.CharField(max_length=255, unique=True, null=True, blank=True)
    member = models.ForeignKey(
        Member,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments'
    )
    amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    payment_date = models.DateField()
    mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        default='Online'
    )
    reference_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(
        max_length=30,
        choices=PAYMENT_STATUS_CHOICES,
        default='Payment Received'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments_verified'
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payments_created'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-payment_date']
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        indexes = [
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Payment {self.receipt_number or self.id} - {self.amount} ({self.payment_date})"


class PaymentCommunicationLog(models.Model):
    """Delivery log for payment receipt communication attempts."""

    CHANNEL_CHOICES = [
        ('email', 'Email'),
        ('whatsapp', 'WhatsApp'),
        ('sms', 'SMS'),
    ]

    DELIVERY_STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('skipped', 'Skipped'),
    ]

    payment = models.ForeignKey(
        Payment,
        on_delete=models.CASCADE,
        related_name='communication_logs'
    )
    channel = models.CharField(max_length=20, choices=CHANNEL_CHOICES)
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES)
    recipient = models.CharField(max_length=255, blank=True)
    detail = models.TextField(blank=True)
    sent_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_communication_logs'
    )
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-sent_at']
        verbose_name = 'Payment Communication Log'
        verbose_name_plural = 'Payment Communication Logs'
        indexes = [
            models.Index(fields=['channel', 'delivery_status']),
            models.Index(fields=['sent_at']),
        ]

    def __str__(self):
        return f"Payment {self.payment_id} / {self.channel} / {self.delivery_status}"


class InvoiceDeletionApprovalTask(models.Model):
    """Approval workflow task for deleting paid invoices."""

    TASK_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]
    REVIEWER_ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Treasurer', 'Treasurer'),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='deletion_approval_tasks'
    )
    invoice_snapshot = models.JSONField(default=dict, blank=True)
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_deletion_requests'
    )
    reviewer_role = models.CharField(
        max_length=20,
        choices=REVIEWER_ROLE_CHOICES
    )
    force_requested = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=TASK_STATUS_CHOICES,
        default='Pending'
    )
    request_note = models.TextField(blank=True)
    review_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_deletion_reviews'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'reviewer_role']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        invoice_id = self.invoice_id or self.invoice_snapshot.get('invoice_id', 'Unknown')
        return f"Delete Invoice {invoice_id} - {self.status}"


class InvoiceCancellationApprovalTask(models.Model):
    """Approval workflow task for cancelling unpaid invoices."""

    TASK_STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
    ]
    REVIEWER_ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Treasurer', 'Treasurer'),
    ]

    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancellation_approval_tasks'
    )
    invoice_snapshot = models.JSONField(default=dict, blank=True)
    requested_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_cancellation_requests'
    )
    reviewer_role = models.CharField(
        max_length=20,
        choices=REVIEWER_ROLE_CHOICES
    )
    status = models.CharField(
        max_length=20,
        choices=TASK_STATUS_CHOICES,
        default='Pending'
    )
    request_note = models.TextField(blank=True)
    review_note = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_cancellation_reviews'
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'reviewer_role']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        invoice_id = self.invoice_id or self.invoice_snapshot.get('invoice_id', 'Unknown')
        return f"Cancel Invoice {invoice_id} - {self.status}"
