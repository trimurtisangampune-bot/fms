import re
from rest_framework import serializers
from django.core.validators import validate_email as django_validate_email
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import (
    Unit,
    Member,
    Occupant,
    AuditLog,
    UserProfile,
    NotificationSettings,
    FormatSettings,
    MaintenanceTemplate,
    MaintenanceLevy,
    Invoice,
    InvoiceItem,
    InvoicePenalty,
    Payment,
    PaymentCommunicationLog,
    InvoiceDeletionApprovalTask,
    InvoiceCancellationApprovalTask,
)
from django.contrib.auth.models import User


def _member_contact_validation_errors(contact_phone, contact_email):
    errors = []

    phone = str(contact_phone or '').strip()
    email = str(contact_email or '').strip()

    if not phone:
        errors.append('Contact Number is required.')
    elif not phone.isdigit():
        errors.append('Contact Number must contain numeric characters only.')
    elif len(phone) != 10:
        errors.append('Contact Number must be exactly 10 digits.')

    if not email:
        errors.append('Contact EMail is required.')
    else:
        try:
            django_validate_email(email)
        except DjangoValidationError:
            errors.append('Contact EMail must be a valid email address.')

    return errors


class UserProfileSerializer(serializers.ModelSerializer):
    member = serializers.PrimaryKeyRelatedField(
        queryset=Member.objects.all(),
        allow_null=True,
        required=False
    )

    class Meta:
        model = UserProfile
        fields = ['role', 'portal_access', 'member']


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model."""
    profile = UserProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'is_superuser', 'profile']
        read_only_fields = ['id']


class NotificationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationSettings
        fields = [
            'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password',
            'smtp_use_tls', 'smtp_use_ssl', 'default_from_email',
            'twilio_account_sid', 'twilio_auth_token', 'twilio_sms_from',
            'twilio_whatsapp_from', 'updated_at'
        ]
        read_only_fields = ['updated_at']


class FormatSettingsSerializer(serializers.ModelSerializer):
    allowed_placeholders = {'Unit_Number', 'year', 'month', 'day', 'fiscal_year', 'seq'}

    class Meta:
        model = FormatSettings
        fields = [
            'invoice_number_format', 'invoice_seq_digits', 'invoice_seq_start', 'invoice_seq_next',
            'receipt_number_format', 'receipt_seq_digits', 'receipt_seq_start', 'receipt_seq_next',
            'updated_at'
        ]
        read_only_fields = ['invoice_seq_next', 'receipt_seq_next', 'updated_at']

    def _validate_format(self, value, field_name):
        tokens = set(re.findall(r'\[([^\]]+)\]', value))
        invalid_tokens = sorted(token for token in tokens if token not in self.allowed_placeholders)
        if invalid_tokens:
            raise serializers.ValidationError(
                f"Unsupported placeholders in {field_name}: {', '.join(invalid_tokens)}"
            )
        if '[seq]' not in value:
            raise serializers.ValidationError(f'{field_name} must include [seq] to keep generated numbers unique.')
        return value

    def validate_invoice_number_format(self, value):
        return self._validate_format(value, 'invoice_number_format')

    def validate_receipt_number_format(self, value):
        return self._validate_format(value, 'receipt_number_format')

    def validate_invoice_seq_digits(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError('invoice_seq_digits must be between 1 and 12.')
        return value

    def validate_receipt_seq_digits(self, value):
        if value < 1 or value > 12:
            raise serializers.ValidationError('receipt_seq_digits must be between 1 and 12.')
        return value

    def validate_invoice_seq_start(self, value):
        if value < 1:
            raise serializers.ValidationError('invoice_seq_start must be at least 1.')
        return value

    def validate_receipt_seq_start(self, value):
        if value < 1:
            raise serializers.ValidationError('receipt_seq_start must be at least 1.')
        return value

    def update(self, instance, validated_data):
        previous_invoice_start = instance.invoice_seq_start
        previous_receipt_start = instance.receipt_seq_start

        invoice_seq_start = validated_data.get('invoice_seq_start', instance.invoice_seq_start)
        receipt_seq_start = validated_data.get('receipt_seq_start', instance.receipt_seq_start)

        instance = super().update(instance, validated_data)

        if invoice_seq_start > instance.invoice_seq_next or instance.invoice_seq_next == previous_invoice_start:
            instance.invoice_seq_next = invoice_seq_start
        if receipt_seq_start > instance.receipt_seq_next or instance.receipt_seq_next == previous_receipt_start:
            instance.receipt_seq_next = receipt_seq_start

        instance.save(update_fields=[
            'invoice_number_format', 'invoice_seq_digits', 'invoice_seq_start', 'invoice_seq_next',
            'receipt_number_format', 'receipt_seq_digits', 'receipt_seq_start', 'receipt_seq_next',
            'updated_by', 'updated_at'
        ])
        return instance


class UserCreateSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    password = serializers.CharField(write_only=True, required=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password', 'profile']
        read_only_fields = ['id']

    def create(self, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        UserProfile.objects.update_or_create(user=user, defaults=profile_data)
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    profile = UserProfileSerializer(required=False)
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ['id', 'username', 'first_name', 'last_name', 'email', 'password', 'profile']
        read_only_fields = ['id', 'username']

    def update(self, instance, validated_data):
        profile_data = validated_data.pop('profile', {})
        password = validated_data.pop('password', None)

        instance = super().update(instance, validated_data)

        if password:
            instance.set_password(password)
            instance.save()

        if profile_data:
            UserProfile.objects.update_or_create(user=instance, defaults=profile_data)

        return instance


class UnitSerializer(serializers.ModelSerializer):
    """Serializer for Unit model."""
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    member_count = serializers.SerializerMethodField(read_only=True)
    primary_member = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Unit
        fields = [
            'id', 'unit_number', 'block', 'floor', 'area_sqft', 'unit_type',
            'status', 'occupancy_status', 'invoice_frequency',
            'created_at', 'updated_at', 'created_by', 'updated_by',
            'member_count', 'primary_member'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_member_count(self, obj):
        return obj.members.count()
    
    def get_primary_member(self, obj):
        primary = obj.get_primary_member()
        if primary:
            return {
                'id': primary.id,
                'owner_name': primary.owner_name,
                'contact_phone': primary.contact_phone,
                'contact_email': primary.contact_email,
            }
        return None


class UnitDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Unit with members and occupants."""
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    members = serializers.SerializerMethodField(read_only=True)
    occupants = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Unit
        fields = [
            'id', 'unit_number', 'block', 'floor', 'area_sqft', 'unit_type',
            'status', 'occupancy_status', 'invoice_frequency',
            'created_at', 'updated_at', 'created_by', 'updated_by',
            'members', 'occupants'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_members(self, obj):
        members = obj.members.all()
        return MemberListSerializer(members, many=True).data
    
    def get_occupants(self, obj):
        occupants = obj.occupants.all()
        return OccupantSerializer(occupants, many=True).data


class BankAccountField(serializers.Field):
    """Custom field for handling bank account data."""
    
    def to_representation(self, value):
        """Show masked account number in response."""
        if not value:
            return {}
        
        account_no = value.get('account_no', '')
        masked_account = None
        if account_no and len(account_no) > 4:
            masked_account = 'XXXX' + account_no[-4:]
        
        return {
            'account_holder': value.get('account_holder', ''),
            'account_no': masked_account,
            'ifsc': value.get('ifsc', ''),
            'bank_name': value.get('bank_name', ''),
        }
    
    def to_internal_value(self, data):
        """Store full account number internally."""
        if not data:
            return {}
        
        return {
            'account_holder': data.get('account_holder', '').strip(),
            'account_no': data.get('account_no', '').strip(),
            'ifsc': data.get('ifsc', '').strip(),
            'bank_name': data.get('bank_name', '').strip(),
        }

    def get_value(self, dictionary):
        """Return empty dict when field is absent from request data."""
        value = super().get_value(dictionary)
        if value is None:
            return {}
        return value


class MemberSerializer(serializers.ModelSerializer):
    """Serializer for Member model."""
    unit_details = serializers.SerializerMethodField(read_only=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    has_bank_details = serializers.SerializerMethodField(read_only=True)
    bank_account = BankAccountField(required=False)
    
    class Meta:
        model = Member
        fields = [
            'id', 'unit', 'unit_details', 'owner_name', 'occupant_type',
            'contact_phone', 'contact_email', 'alternate_contact',
            'membership_status', 'payment_preference', 'bank_account',
            'is_primary_contact', 'move_in_date', 'move_out_date',
            'nominated_person_name', 'nominated_person_contact', 'notes',
            'created_at', 'updated_at', 'created_by', 'updated_by',
            'has_bank_details'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_unit_details(self, obj):
        return {
            'id': obj.unit.id,
            'unit_number': obj.unit.unit_number,
            'block': obj.unit.block,
            'area_sqft': str(obj.unit.area_sqft),
        }
    
    def get_has_bank_details(self, obj):
        return obj.has_bank_details()

    def validate(self, attrs):
        contact_phone = attrs.get('contact_phone')
        contact_email = attrs.get('contact_email')

        if self.instance is not None:
            if contact_phone is None:
                contact_phone = self.instance.contact_phone
            if contact_email is None:
                contact_email = self.instance.contact_email

        errors = _member_contact_validation_errors(contact_phone, contact_email)
        if errors:
            raise serializers.ValidationError({
                'contact_validation': errors
            })
        # Prevent directly removing the primary contact designation via API.
        # To transfer it, make another member primary (which untags this one automatically).
        if (
            self.instance is not None
            and self.instance.is_primary_contact
            and 'is_primary_contact' in attrs
            and not attrs['is_primary_contact']
        ):
            raise serializers.ValidationError({
                'is_primary_contact': (
                    'A primary contact cannot be untagged directly. '
                    'To change, make another member of this unit the Primary Contact.'
                )
            })


        return attrs


class MemberListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Member list views."""
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    unit_id = serializers.IntegerField(source='unit.id', read_only=True)
    contact_validation_errors = serializers.SerializerMethodField(read_only=True)
    has_contact_validation_errors = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Member
        fields = [
            'id', 'unit_id', 'unit_number', 'owner_name', 'occupant_type',
            'contact_phone', 'contact_email', 'membership_status',
            'payment_preference', 'is_primary_contact',
            'has_contact_validation_errors', 'contact_validation_errors'
        ]
        read_only_fields = fields

    def get_contact_validation_errors(self, obj):
        return _member_contact_validation_errors(obj.contact_phone, obj.contact_email)

    def get_has_contact_validation_errors(self, obj):
        return len(_member_contact_validation_errors(obj.contact_phone, obj.contact_email)) > 0


class MemberDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Member."""
    unit = UnitSerializer(read_only=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)
    has_bank_details = serializers.SerializerMethodField()
    bank_account = BankAccountField(required=False)
    
    class Meta:
        model = Member
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    def get_has_bank_details(self, obj):
        return obj.has_bank_details()


class OccupantSerializer(serializers.ModelSerializer):
    """Serializer for Occupant model."""
    class Meta:
        model = Occupant
        fields = [
            'id', 'unit', 'name', 'relation', 'contact_phone',
            'occupant_type', 'is_primary', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AuditLogSerializer(serializers.ModelSerializer):
    """Serializer for AuditLog model."""
    changed_by = UserSerializer(read_only=True)
    
    class Meta:
        model = AuditLog
        fields = [
            'id', 'entity_type', 'entity_id', 'entity_name', 'action',
            'changed_by', 'changed_at', 'before_data', 'after_data',
            'description'
        ]
        read_only_fields = fields


class MaintenanceLevySerializer(serializers.ModelSerializer):
    class Meta:
        model = MaintenanceLevy
        fields = ['id', 'template', 'levy_type', 'amount', 'description', 'is_mandatory']
        read_only_fields = ['id']


class MaintenanceTemplateSerializer(serializers.ModelSerializer):
    levies = MaintenanceLevySerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)

    class Meta:
        model = MaintenanceTemplate
        fields = [
            'id', 'unit_type', 'occupancy_status', 'base_amount', 'billing_frequency',
            'due_day', 'penalty_rate', 'penalty_type', 'is_active',
            'created_at', 'updated_at', 'created_by', 'updated_by', 'levies'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']


class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'levy_type', 'amount', 'description']
        read_only_fields = fields


class InvoicePenaltySerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoicePenalty
        fields = ['id', 'penalty_date', 'penalty_amount', 'days_overdue', 'created_at']
        read_only_fields = fields


class PaymentInvoiceSummarySerializer(serializers.ModelSerializer):
    unit_number = serializers.CharField(source='unit.unit_number', read_only=True)
    unit_type = serializers.CharField(source='unit.unit_type', read_only=True)
    owner_name = serializers.CharField(source='member.owner_name', read_only=True)
    primary_owner_phone = serializers.SerializerMethodField(read_only=True)
    primary_owner_email = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_number', 'unit_number', 'unit_type', 'owner_name', 'primary_owner_phone', 'primary_owner_email', 'period_start', 'period_end', 'total_amount', 'status']

    def get_primary_owner_phone(self, obj):
        primary_member = obj.unit.get_primary_member() if obj.unit_id else None
        return primary_member.contact_phone if primary_member and primary_member.contact_phone else None

    def get_primary_owner_email(self, obj):
        primary_member = obj.unit.get_primary_member() if obj.unit_id else None
        return primary_member.contact_email if primary_member and primary_member.contact_email else None


class PaymentSerializer(serializers.ModelSerializer):
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    invoice_detail = PaymentInvoiceSummarySerializer(source='invoice', read_only=True)
    verified_by_name = serializers.CharField(source='verified_by.username', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'receipt_number', 'invoice', 'invoice_number', 'invoice_detail', 'member', 'amount', 'payment_date',
            'mode', 'reference_number', 'status', 'verified_at', 'verified_by', 'verified_by_name', 'created_by', 'created_at'
        ]
        read_only_fields = ['id', 'receipt_number', 'invoice_number', 'invoice_detail', 'created_by', 'created_at']


class PaymentCommunicationLogSerializer(serializers.ModelSerializer):
    payment_id = serializers.IntegerField(source='payment.id', read_only=True)
    receipt_number = serializers.CharField(source='payment.receipt_number', read_only=True)
    invoice_id = serializers.IntegerField(source='payment.invoice.id', read_only=True)
    invoice_number = serializers.CharField(source='payment.invoice.invoice_number', read_only=True)
    unit_number = serializers.CharField(source='payment.invoice.unit.unit_number', read_only=True)
    owner_name = serializers.CharField(source='payment.member.owner_name', read_only=True)
    sent_by_name = serializers.CharField(source='sent_by.username', read_only=True)

    class Meta:
        model = PaymentCommunicationLog
        fields = [
            'id', 'payment_id', 'receipt_number', 'invoice_id', 'invoice_number', 'unit_number', 'owner_name',
            'channel', 'delivery_status', 'recipient', 'detail', 'sent_by_name', 'sent_at'
        ]
        read_only_fields = fields


class InvoiceSerializer(serializers.ModelSerializer):
    unit = UnitSerializer(read_only=True)
    member = MemberListSerializer(read_only=True)
    template = MaintenanceTemplateSerializer(read_only=True)
    items = InvoiceItemSerializer(many=True, read_only=True)
    penalties = InvoicePenaltySerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    updated_by = UserSerializer(read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'unit', 'member', 'template', 'period_start', 'period_end',
            'issue_date', 'due_date', 'base_amount', 'total_levies', 'penalty_amount',
            'paid_amount', 'total_amount', 'status', 'items', 'penalties',
            'payments', 'created_at', 'updated_at', 'created_by', 'updated_by'
        ]
        read_only_fields = fields


class InvoiceDetailSerializer(InvoiceSerializer):
    pass


class InvoiceDeletionApprovalTaskSerializer(serializers.ModelSerializer):
    requested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)

    class Meta:
        model = InvoiceDeletionApprovalTask
        fields = [
            'id', 'invoice', 'invoice_snapshot', 'requested_by', 'reviewer_role',
            'force_requested', 'status', 'request_note', 'review_note',
            'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = fields


class InvoiceCancellationApprovalTaskSerializer(serializers.ModelSerializer):
    requested_by = UserSerializer(read_only=True)
    reviewed_by = UserSerializer(read_only=True)

    class Meta:
        model = InvoiceCancellationApprovalTask
        fields = [
            'id', 'invoice', 'invoice_snapshot', 'requested_by', 'reviewer_role',
            'status', 'request_note', 'review_note',
            'reviewed_by', 'reviewed_at', 'created_at', 'updated_at'
        ]
        read_only_fields = fields


class BulkImportResultSerializer(serializers.Serializer):
    """Serializer for bulk import results."""
    total = serializers.IntegerField()
    success = serializers.IntegerField()
    updated = serializers.IntegerField(default=0)
    failed = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.DictField())


class UnitMemberSummarySerializer(serializers.Serializer):
    """Serializer for units and members summary."""
    units = serializers.DictField()
    members = serializers.DictField()
    missing_bank_details = serializers.IntegerField()
    vacant_units = serializers.IntegerField()
