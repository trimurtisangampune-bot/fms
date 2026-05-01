import calendar
import csv
import io
import json
import re
from base64 import b64encode
from decimal import Decimal
from urllib import parse, request, error
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import validate_email as django_validate_email
from django.core import mail
from django.core.mail import EmailMessage
from django.conf import settings
from .models import (
    Unit,
    Member,
    Occupant,
    AuditLog,
    NotificationSettings,
    FormatSettings,
    MaintenanceTemplate,
    MaintenanceLevy,
    Invoice,
    InvoiceItem,
    InvoicePenalty,
    Payment,
    PaymentCommunicationLog,
)
from django.contrib.auth.models import User


class AuditService:
    """Service for logging audit trails."""
    
    @staticmethod
    def log_change(entity_type, entity_id, entity_name, action, before_data, after_data, user, description=''):
        """
        Log a change to the audit trail.
        
        Args:
            entity_type: 'Unit' or 'Member'
            entity_id: ID of the entity
            entity_name: Display name of the entity
            action: 'CREATE', 'UPDATE', 'DELETE', 'TRANSFER'
            before_data: Dictionary of data before change
            after_data: Dictionary of data after change
            user: User instance
            description: Optional description
        """
        AuditLog.objects.create(
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            action=action,
            changed_by=user,
            before_data=before_data or {},
            after_data=after_data or {},
            description=description
        )
    
    @staticmethod
    def get_entity_history(entity_type, entity_id, limit=None):
        """Get audit history for an entity."""
        logs = AuditLog.objects.filter(
            entity_type=entity_type,
            entity_id=entity_id
        ).order_by('-changed_at')
        
        if limit:
            logs = logs[:limit]
        
        return logs


class NotificationService:
    """Service for sending payment receipts over configured delivery channels."""

    @staticmethod
    def _get_config():
        settings_obj = NotificationSettings.get_solo()
        return {
            'email_host': settings_obj.smtp_host or settings.EMAIL_HOST,
            'email_port': settings_obj.smtp_port or settings.EMAIL_PORT,
            'email_host_user': settings_obj.smtp_username or settings.EMAIL_HOST_USER,
            'email_host_password': settings_obj.smtp_password or settings.EMAIL_HOST_PASSWORD,
            'email_use_tls': settings_obj.smtp_use_tls,
            'email_use_ssl': settings_obj.smtp_use_ssl,
            'default_from_email': settings_obj.default_from_email or settings.DEFAULT_FROM_EMAIL,
            'twilio_account_sid': settings_obj.twilio_account_sid or settings.TWILIO_ACCOUNT_SID,
            'twilio_auth_token': settings_obj.twilio_auth_token or settings.TWILIO_AUTH_TOKEN,
            'twilio_sms_from': settings_obj.twilio_sms_from or settings.TWILIO_SMS_FROM,
            'twilio_whatsapp_from': settings_obj.twilio_whatsapp_from or settings.TWILIO_WHATSAPP_FROM,
        }

    @staticmethod
    def _normalize_phone(phone):
        if not phone:
            return ''
        cleaned = re.sub(r'[^\d+]', '', str(phone))
        if cleaned.startswith('00'):
            cleaned = f'+{cleaned[2:]}'
        return cleaned

    @staticmethod
    def build_receipt_text(payment):
        invoice = payment.invoice
        primary_member = invoice.unit.get_primary_member() if invoice.unit_id else None
        owner_name = getattr(primary_member, 'owner_name', None) or getattr(invoice.member, 'owner_name', '-')
        balance_due = Decimal(invoice.total_amount) - Decimal(payment.amount)
        receipt_datetime = timezone.localtime(payment.verified_at).strftime('%Y-%m-%d %H:%M:%S') if payment.verified_at else '-'

        unit_label = {
            'Flat': 'Flat Number',
            'Villa': 'Villa Number',
            'Shop': 'Shop Number',
            'Office': 'Office Number',
            'Parking': 'Parking Number',
        }.get(getattr(invoice.unit, 'unit_type', None), 'Unit Number')

        return '\n'.join([
            'Trimurti Sangam Sah. Hsg. So. Ltd.',
            f'Receipt No: {payment.receipt_number or payment.id}',
            f'Received with thanks, from {owner_name} the amount of: INR {Decimal(payment.amount):.2f}',
            f'{unit_label}: {getattr(invoice.unit, "unit_number", "-")}',
            f'Payment Date: {payment.payment_date}',
            f'Mode: {payment.mode or "-"}',
            f'Reference No: {payment.reference_number or "-"}',
            f'Invoice No: {invoice.invoice_number or payment.invoice_id or "-"}',
            f'Balance Due: INR {balance_due:.2f}',
            f'Receipt Date and Time: {receipt_datetime}',
        ])

    @staticmethod
    def _send_twilio_message(to_number, from_number, body, whatsapp=False):
        config = NotificationService._get_config()
        if not config['twilio_account_sid'] or not config['twilio_auth_token']:
            return {'status': 'skipped', 'detail': 'Twilio credentials are not configured.'}
        if not from_number:
            return {'status': 'skipped', 'detail': 'Twilio sender is not configured.'}
        if not to_number:
            return {'status': 'skipped', 'detail': 'Recipient phone number is not available.'}

        normalized_to = NotificationService._normalize_phone(to_number)
        normalized_from = NotificationService._normalize_phone(from_number)
        if not normalized_to:
            return {'status': 'skipped', 'detail': 'Recipient phone number is invalid.'}
        if not normalized_from:
            return {'status': 'skipped', 'detail': 'Configured sender phone number is invalid.'}

        if whatsapp:
            normalized_to = f'whatsapp:{normalized_to}'
            normalized_from = f'whatsapp:{normalized_from}'

        payload = parse.urlencode({
            'To': normalized_to,
            'From': normalized_from,
            'Body': body,
        }).encode('utf-8')
        endpoint = f"https://api.twilio.com/2010-04-01/Accounts/{config['twilio_account_sid']}/Messages.json"
        req = request.Request(endpoint, data=payload, method='POST')
        auth_token = b64encode(f"{config['twilio_account_sid']}:{config['twilio_auth_token']}".encode('utf-8')).decode('ascii')
        req.add_header('Authorization', f'Basic {auth_token}')
        req.add_header('Content-Type', 'application/x-www-form-urlencoded')

        try:
            with request.urlopen(req, timeout=20) as response:
                response_data = json.loads(response.read().decode('utf-8'))
            return {
                'status': 'sent',
                'detail': response_data.get('sid', 'Message accepted by Twilio.'),
            }
        except error.HTTPError as exc:
            try:
                error_data = json.loads(exc.read().decode('utf-8'))
                message = error_data.get('message', str(exc))
            except Exception:
                message = str(exc)
            return {'status': 'failed', 'detail': message}
        except Exception as exc:
            return {'status': 'failed', 'detail': str(exc)}

    @staticmethod
    def send_receipt_email(payment, recipient_email, body):
        config = NotificationService._get_config()
        if not recipient_email:
            return {'status': 'skipped', 'detail': 'Recipient email is not available.'}
        if not config['email_host']:
            return {'status': 'skipped', 'detail': 'SMTP host is not configured.'}

        subject = f'Payment Receipt #{payment.receipt_number or payment.id} - Trimurti Sangam Sah. Hsg. So. Ltd.'
        message = EmailMessage(
            subject=subject,
            body=body,
            from_email=config['default_from_email'],
            to=[recipient_email],
            connection=None,
        )
        try:
            with mail.get_connection(
                backend=settings.EMAIL_BACKEND,
                host=config['email_host'],
                port=config['email_port'],
                username=config['email_host_user'],
                password=config['email_host_password'],
                use_tls=config['email_use_tls'],
                use_ssl=config['email_use_ssl'],
            ) as connection:
                message.connection = connection
                message.send(fail_silently=False)
            return {'status': 'sent', 'detail': recipient_email}
        except Exception as exc:
            return {'status': 'failed', 'detail': str(exc)}

    @staticmethod
    def share_payment_receipt(payment, sent_by=None):
        config = NotificationService._get_config()
        invoice = payment.invoice
        primary_member = invoice.unit.get_primary_member() if invoice.unit_id else None
        receipt_text = NotificationService.build_receipt_text(payment)
        recipient_phone = getattr(primary_member, 'contact_phone', '') if primary_member else ''
        recipient_email = getattr(primary_member, 'contact_email', '') if primary_member else ''

        results = {
            'email': NotificationService.send_receipt_email(payment, recipient_email, receipt_text),
            'whatsapp': NotificationService._send_twilio_message(
                recipient_phone,
                config['twilio_whatsapp_from'],
                receipt_text,
                whatsapp=True,
            ),
            'sms': NotificationService._send_twilio_message(
                recipient_phone,
                config['twilio_sms_from'],
                receipt_text,
                whatsapp=False,
            ),
        }

        results['recipient'] = {
            'owner_name': getattr(primary_member, 'owner_name', None) or getattr(invoice.member, 'owner_name', None),
            'email': recipient_email or None,
            'phone': recipient_phone or None,
        }

        PaymentCommunicationLog.objects.bulk_create([
            PaymentCommunicationLog(
                payment=payment,
                channel='email',
                delivery_status=results['email'].get('status', 'failed'),
                recipient=recipient_email or '',
                detail=results['email'].get('detail', ''),
                sent_by=sent_by,
            ),
            PaymentCommunicationLog(
                payment=payment,
                channel='whatsapp',
                delivery_status=results['whatsapp'].get('status', 'failed'),
                recipient=recipient_phone or '',
                detail=results['whatsapp'].get('detail', ''),
                sent_by=sent_by,
            ),
            PaymentCommunicationLog(
                payment=payment,
                channel='sms',
                delivery_status=results['sms'].get('status', 'failed'),
                recipient=recipient_phone or '',
                detail=results['sms'].get('detail', ''),
                sent_by=sent_by,
            ),
        ])
        return results


class NumberFormatService:
    """Generate formatted invoice and receipt numbers from admin-defined templates."""

    @staticmethod
    def _runtime_date(runtime_date=None):
        return runtime_date or timezone.localdate()

    @staticmethod
    def _fiscal_year_label(runtime_date):
        start_year = runtime_date.year if runtime_date.month >= 4 else runtime_date.year - 1
        return f"{start_year}-{str(start_year + 1)[-2:]}"

    @staticmethod
    def _render(template, context):
        rendered = template
        for placeholder, value in context.items():
            rendered = rendered.replace(f'[{placeholder}]', str(value))
        return rendered

    @staticmethod
    def _get_locked_settings():
        FormatSettings.get_solo()
        return FormatSettings.objects.select_for_update().get(pk=1)

    @staticmethod
    def _generate(kind, unit=None, runtime_date=None):
        runtime_date = NumberFormatService._runtime_date(runtime_date)
        settings_obj = NumberFormatService._get_locked_settings()

        if kind == 'invoice':
            format_field = 'invoice_number_format'
            digits_field = 'invoice_seq_digits'
            start_field = 'invoice_seq_start'
            next_field = 'invoice_seq_next'
            model = Invoice
            number_field = 'invoice_number'
        else:
            format_field = 'receipt_number_format'
            digits_field = 'receipt_seq_digits'
            start_field = 'receipt_seq_start'
            next_field = 'receipt_seq_next'
            model = Payment
            number_field = 'receipt_number'

        seq = max(getattr(settings_obj, next_field) or 1, getattr(settings_obj, start_field) or 1)
        digits = getattr(settings_obj, digits_field)
        template = getattr(settings_obj, format_field)
        unit_number = getattr(unit, 'unit_number', '') if unit else ''

        while True:
            candidate = NumberFormatService._render(template, {
                'Unit_Number': unit_number,
                'year': f'{runtime_date.year:04d}',
                'month': f'{runtime_date.month:02d}',
                'day': f'{runtime_date.day:02d}',
                'fiscal_year': NumberFormatService._fiscal_year_label(runtime_date),
                'seq': str(seq).zfill(digits),
            })
            if not model.objects.filter(**{number_field: candidate}).exists():
                setattr(settings_obj, next_field, seq + 1)
                settings_obj.save(update_fields=[next_field, 'updated_at'])
                return candidate
            seq += 1

    @staticmethod
    def generate_invoice_number(unit, runtime_date=None):
        return NumberFormatService._generate('invoice', unit=unit, runtime_date=runtime_date)

    @staticmethod
    def generate_receipt_number(unit, runtime_date=None):
        return NumberFormatService._generate('receipt', unit=unit, runtime_date=runtime_date)


class UnitService:
    """Service class for Unit operations."""
    
    @staticmethod
    def get_unit_data_dict(unit):
        """Convert unit object to dictionary for audit logging."""
        return {
            'unit_number': unit.unit_number,
            'block': unit.block,
            'floor': unit.floor,
            'area_sqft': str(unit.area_sqft),
            'unit_type': unit.unit_type,
            'status': unit.status,
            'occupancy_status': unit.occupancy_status,
            'invoice_frequency': unit.invoice_frequency,
        }
    
    @staticmethod
    @transaction.atomic
    def create_unit(data, user):
        """
        Create a new unit.
        
        Args:
            data: Dictionary with unit details
            user: User instance
        
        Returns:
            Unit instance
        """
        data['created_by'] = user
        data['updated_by'] = user
        
        unit = Unit.objects.create(**data)
        
        # Log audit
        AuditService.log_change(
            entity_type='Unit',
            entity_id=unit.id,
            entity_name=unit.unit_number,
            action='CREATE',
            before_data={},
            after_data=UnitService.get_unit_data_dict(unit),
            user=user
        )
        
        return unit
    
    @staticmethod
    @transaction.atomic
    def update_unit(unit_id, data, user):
        """
        Update an existing unit.
        
        Args:
            unit_id: Unit ID
            data: Dictionary with fields to update
            user: User instance
        
        Returns:
            Updated Unit instance
        """
        unit = Unit.objects.get(id=unit_id)
        before_data = UnitService.get_unit_data_dict(unit)
        
        for field, value in data.items():
            if field not in ['created_by', 'created_at']:
                setattr(unit, field, value)
        
        unit.updated_by = user
        unit.save()
        
        after_data = UnitService.get_unit_data_dict(unit)
        
        # Log audit
        AuditService.log_change(
            entity_type='Unit',
            entity_id=unit.id,
            entity_name=unit.unit_number,
            action='UPDATE',
            before_data=before_data,
            after_data=after_data,
            user=user
        )
        
        return unit
    
    @staticmethod
    @transaction.atomic
    def delete_unit(unit_id, user):
        """
        Delete a unit.
        
        Args:
            unit_id: Unit ID
            user: User instance
        """
        unit = Unit.objects.get(id=unit_id)
        unit_data = UnitService.get_unit_data_dict(unit)
        unit_number = unit.unit_number
        
        unit.delete()
        
        # Log audit
        AuditService.log_change(
            entity_type='Unit',
            entity_id=unit_id,
            entity_name=unit_number,
            action='DELETE',
            before_data=unit_data,
            after_data={},
            user=user
        )
    
    @staticmethod
    def get_unit_summary():
        """
        Get summary statistics for units and members.
        
        Returns:
            Dictionary with summary data
        """
        from django.db.models import Count, Q
        
        units = Unit.objects.all()
        members = Member.objects.all()
        
        # Unit statistics
        unit_summary = {
            'total': units.count(),
            'active': units.filter(status='Active').count(),
            'inactive': units.filter(status='Inactive').count(),
            'vacant': units.filter(status='Vacant').count(),
            'by_type': dict(
                units.values('unit_type').annotate(count=Count('id')).values_list('unit_type', 'count')
            ),
            'by_block': dict(
                units.values('block').annotate(count=Count('id')).values_list('block', 'count')
            ),
        }
        
        # Member statistics
        member_summary = {
            'total': members.count(),
            'active': members.filter(membership_status='Active').count(),
            'inactive': members.filter(membership_status='Inactive').count(),
            'by_occupant_type': dict(
                members.values('occupant_type').annotate(count=Count('id')).values_list('occupant_type', 'count')
            ),
            'by_payment_preference': dict(
                members.values('payment_preference').annotate(count=Count('id')).values_list('payment_preference', 'count')
            ),
        }
        
        # Banking details
        members_with_bank = members.exclude(bank_account={}).count()
        missing_bank_details = members.filter(membership_status='Active').count() - members_with_bank
        
        return {
            'units': unit_summary,
            'members': member_summary,
            'missing_bank_details': max(0, missing_bank_details),
            'vacant_units': unit_summary['vacant']
        }
    
    @staticmethod
    @transaction.atomic
    def bulk_import_units(csv_file, user):
        """
        Bulk import units from CSV file.

        CSV format (columns):
            unit_number, block, floor, area_sqft, unit_type, status,
            occupancy_status, invoice_frequency

        Required: unit_number, block, floor, area_sqft, unit_type
        Optional:
            status            – default 'Active'     (Active/Inactive/Vacant/Disputed)
            occupancy_status  – default 'Owner Occupied'  (Owner Occupied/Rented)
            invoice_frequency – default ''           (Monthly/Annual or blank)

        Args:
            csv_file: File object
            user: User instance

        Returns:
            Dictionary with import results
        """
        VALID_STATUSES = {'Active', 'Inactive', 'Vacant', 'Disputed'}
        VALID_OCCUPANCY = {'Owner Occupied', 'Rented'}
        VALID_INVOICE_FREQ = {'Monthly', 'Annual', ''}

        results = {
            'total': 0,
            'success': 0,
            'updated': 0,
            'failed': 0,
            'errors': []
        }

        try:
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)

            for row_num, row in enumerate(reader, start=2):
                results['total'] += 1

                try:
                    # Validate required fields
                    required_fields = ['unit_number', 'block', 'floor', 'area_sqft', 'unit_type']
                    missing = [f for f in required_fields if not row.get(f)]

                    if missing:
                        raise ValidationError(f"Missing fields: {', '.join(missing)}")

                    status = row.get('status', 'Active').strip() or 'Active'
                    occupancy_status = row.get('occupancy_status', 'Owner Occupied').strip() or 'Owner Occupied'
                    invoice_frequency = row.get('invoice_frequency', '').strip()

                    if status not in VALID_STATUSES:
                        raise ValidationError(
                            f"Invalid status '{status}'. Must be one of: {', '.join(sorted(VALID_STATUSES))}"
                        )
                    if occupancy_status not in VALID_OCCUPANCY:
                        raise ValidationError(
                            f"Invalid occupancy_status '{occupancy_status}'. Must be one of: {', '.join(sorted(VALID_OCCUPANCY))}"
                        )
                    if invoice_frequency not in VALID_INVOICE_FREQ:
                        raise ValidationError(
                            f"Invalid invoice_frequency '{invoice_frequency}'. Must be Monthly, Annual, or blank."
                        )

                    # Prepare data
                    unit_data = {
                        'unit_number': row['unit_number'].strip(),
                        'block': row['block'].strip(),
                        'floor': int(row['floor']),
                        'area_sqft': Decimal(row['area_sqft']),
                        'unit_type': row['unit_type'].strip(),
                        'status': status,
                        'occupancy_status': occupancy_status,
                        'invoice_frequency': invoice_frequency,
                    }

                    # Upsert: match on (unit_number, block, floor, unit_type)
                    existing = Unit.objects.filter(
                        unit_number=unit_data['unit_number'],
                        block=unit_data['block'],
                        floor=unit_data['floor'],
                        unit_type=unit_data['unit_type'],
                    ).first()

                    if existing:
                        UnitService.update_unit(existing.id, unit_data, user)
                        results['updated'] += 1
                    else:
                        UnitService.create_unit(unit_data, user)
                        results['success'] += 1

                except (ValidationError, ValueError, KeyError) as e:
                    results['failed'] += 1
                    results['errors'].append({
                        'row': row_num,
                        'error': str(e),
                        'data': row
                    })

        except Exception as e:
            results['errors'].append({
                'row': 0,
                'error': f'File processing error: {str(e)}',
                'data': {}
            })

        return results


class BillingService:
    """Service for maintenance billing and invoice generation."""

    @staticmethod
    def get_template_for_unit(unit, invoice_frequency=None):
        queryset = MaintenanceTemplate.objects.filter(
            unit_type=unit.unit_type,
            occupancy_status=unit.occupancy_status,
            is_active=True
        )

        if invoice_frequency:
            queryset = queryset.filter(billing_frequency=invoice_frequency)

        return queryset.order_by('-id').first()

    @staticmethod
    def get_due_date(period_start, due_day):
        year = period_start.year
        month = period_start.month
        last_day = calendar.monthrange(year, month)[1]
        return period_start.replace(day=min(due_day, last_day))

    @staticmethod
    def calculate_invoice_totals(template):
        base_amount = template.base_amount
        levies = list(template.levies.all())
        total_levies = sum((levy.amount for levy in levies), Decimal('0.00'))
        total_amount = base_amount + total_levies
        return base_amount, total_levies, total_amount, levies

    @staticmethod
    @transaction.atomic
    def create_invoice(unit, template, period_start, period_end, due_date, user, force=False):
        existing = Invoice.objects.filter(
            unit=unit,
            period_start=period_start,
            period_end=period_end
        ).first()

        if existing and not force:
            return existing

        if existing and force:
            existing.delete()

        base_amount, total_levies, total_amount, levies = BillingService.calculate_invoice_totals(template)
        member = unit.get_primary_member()

        invoice = Invoice.objects.create(
            unit=unit,
            member=member,
            template=template,
            period_start=period_start,
            period_end=period_end,
            due_date=due_date,
            invoice_number=NumberFormatService.generate_invoice_number(unit=unit),
            base_amount=base_amount,
            total_levies=total_levies,
            penalty_amount=Decimal('0.00'),
            paid_amount=Decimal('0.00'),
            total_amount=total_amount,
            status='Pending',
            created_by=user,
            updated_by=user
        )

        for levy in levies:
            InvoiceItem.objects.create(
                invoice=invoice,
                levy_type=levy.levy_type,
                amount=levy.amount,
                description=levy.description
            )

        return invoice

    @staticmethod
    def iter_month_periods(start_date, end_date):
        current = start_date.replace(day=1)
        while current <= end_date:
            last_day = calendar.monthrange(current.year, current.month)[1]
            yield current, current.replace(day=last_day)
            if current.month == 12:
                current = current.replace(year=current.year + 1, month=1)
            else:
                current = current.replace(month=current.month + 1)

    @staticmethod
    @transaction.atomic
    def generate_invoices(
        billing_period_start,
        billing_period_end,
        generation_frequency=None,
        unit_ids=None,
        force_regenerate=False,
        user=None
    ):
        """
        Generate maintenance invoices for units.

        Rules:
        - If generation_frequency is "Monthly": generates invoices ONLY for units with invoice_frequency="Monthly"
        - If generation_frequency is "Annual": generates invoices ONLY for units with invoice_frequency="Annual"
        - Template matching: unit_type, occupancy_status, unit.invoice_frequency = template.billing_frequency
        - Duplicate detection: if invoice exists for (unit, period_start, period_end), don't regenerate unless force=True
        - Units without explicit invoice_frequency set are skipped

        Args:
            billing_period_start: Start date for billing period
            billing_period_end: End date for billing period
            generation_frequency: "Monthly" or "Annual" - REQUIRED
            unit_ids: Optional list of unit IDs to process (if None, all active units)
            force_regenerate: If True, recreate even if invoice exists
            user: User performing the generation (for audit)

        Returns:
            dict with 'created', 'skipped', 'errors' counts
        """
        if generation_frequency not in ['Monthly', 'Annual']:
            raise ValidationError('generation_frequency must be Monthly or Annual')

        # Filter to active units with matching invoice_frequency
        units = Unit.objects.filter(
            status='Active',
            invoice_frequency=generation_frequency
        )
        if unit_ids:
            units = units.filter(id__in=unit_ids)

        created = 0
        skipped = 0
        errors = []

        for unit in units:
            # Get template matching unit_type, occupancy_status, and billing_frequency
            template = BillingService.get_template_for_unit(
                unit,
                invoice_frequency=generation_frequency
            )
            if not template:
                skipped += 1
                errors.append({
                    'unit': unit.unit_number,
                    'error': f'No active maintenance template for {generation_frequency} billing'
                })
                continue

            # Generate invoices based on frequency
            if generation_frequency == 'Monthly':
                # For monthly: iterate each month in the period
                for period_start, period_end in BillingService.iter_month_periods(billing_period_start, billing_period_end):
                    month_label = period_start.strftime('%Y-%m')
                    duplicate_exists = Invoice.objects.filter(
                        unit=unit,
                        period_start__year=period_start.year,
                        period_start__month=period_start.month,
                        period_end__year=period_end.year,
                        period_end__month=period_end.month,
                    ).exists()

                    # Duplicate rule for monthly billing: if selected year/month already exists, skip
                    if duplicate_exists and not force_regenerate:
                        skipped += 1
                        errors.append({
                            'unit': unit.unit_number,
                            'error': f'Monthly invoice already exists for {month_label}'
                        })
                        continue

                    due_date = BillingService.get_due_date(period_start, template.due_day)

                    invoice = BillingService.create_invoice(
                        unit, template, period_start, period_end, due_date, user, force=force_regenerate
                    )

                    if invoice:
                        created += 1
            else:
                # For annual: use the entire billing period
                duplicate_exists = Invoice.objects.filter(
                    unit=unit,
                    period_start=billing_period_start,
                    period_end=billing_period_end,
                ).exists()

                # Duplicate rule for annual billing: if selected financial year already exists, skip
                if duplicate_exists and not force_regenerate:
                    skipped += 1
                    errors.append({
                        'unit': unit.unit_number,
                        'error': (
                            f'Annual invoice already exists for financial year '
                            f'{billing_period_start.year}/{str(billing_period_end.year)[-2:]}'
                        )
                    })
                    continue

                due_date = BillingService.get_due_date(billing_period_start, template.due_day)

                invoice = BillingService.create_invoice(
                    unit, template, billing_period_start, billing_period_end, due_date, user, force=force_regenerate
                )

                if invoice:
                    created += 1

        return {
            'created': created,
            'skipped': skipped,
            'errors': errors
        }

    @staticmethod
    @transaction.atomic
    def calculate_penalty_for_invoice(invoice, as_of_date=None, user=None):
        if invoice.status == 'Paid':
            return invoice

        as_of_date = as_of_date or timezone.now().date()
        if invoice.due_date >= as_of_date:
            return invoice

        days_overdue = (as_of_date - invoice.due_date).days
        months_overdue = max(1, (days_overdue + 29) // 30)

        if invoice.template and invoice.template.penalty_type == 'Fixed':
            penalty = invoice.template.penalty_rate * Decimal(months_overdue)
        else:
            outstanding = invoice.outstanding_amount
            penalty = outstanding * (invoice.template.penalty_rate / Decimal('100.00')) * Decimal(months_overdue)

        penalty = max(Decimal('0.00'), penalty.quantize(Decimal('0.01')))
        invoice.penalty_amount = penalty
        invoice.total_amount = invoice.base_amount + invoice.total_levies + penalty
        invoice.status = 'Overdue'
        if user:
            invoice.updated_by = user
        invoice.save()

        InvoicePenalty.objects.create(
            invoice=invoice,
            penalty_date=as_of_date,
            penalty_amount=penalty,
            days_overdue=days_overdue
        )

        return invoice

    @staticmethod
    @transaction.atomic
    def record_payment(invoice_id, amount, payment_date, mode, reference_number, user):
        invoice = Invoice.objects.get(id=invoice_id)

        if invoice.status == 'Cancelled':
            raise ValidationError('Cannot record payment on a cancelled invoice.')

        payment = Payment.objects.create(
            invoice=invoice,
            receipt_number=NumberFormatService.generate_receipt_number(unit=invoice.unit),
            member=invoice.member,
            amount=amount,
            payment_date=payment_date,
            mode=mode,
            reference_number=reference_number,
            status='Payment Received',
            created_by=user
        )

        invoice.paid_amount += amount
        if invoice.paid_amount >= invoice.total_amount:
            invoice.status = 'Paid'
        elif invoice.due_date < payment_date:
            invoice.status = 'Overdue'
        else:
            invoice.status = 'Pending'

        invoice.updated_by = user
        invoice.save()

        if invoice.status != 'Paid':
            BillingService.calculate_penalty_for_invoice(invoice, as_of_date=payment_date, user=user)

        return payment

    @staticmethod
    @transaction.atomic
    def verify_payment(payment, user):
        if payment.status == 'Payment Verified':
            raise ValidationError('Payment is already verified.')

        payment.status = 'Payment Verified'
        payment.verified_at = timezone.now()
        payment.verified_by = user
        payment.save(update_fields=['status', 'verified_at', 'verified_by'])

        return NotificationService.share_payment_receipt(payment, sent_by=user)


class MemberService:
    """Service class for Member operations."""

    @staticmethod
    def _validate_contact_fields(contact_phone, contact_email):
        phone = str(contact_phone or '').strip()
        email = str(contact_email or '').strip()

        if not phone:
            raise ValidationError('Contact Number is required.')
        if not phone.isdigit():
            raise ValidationError('Contact Number must contain numeric characters only.')
        if len(phone) != 10:
            raise ValidationError('Contact Number must be exactly 10 digits.')

        if not email:
            raise ValidationError('Contact EMail is required.')
        try:
            django_validate_email(email)
        except ValidationError:
            raise ValidationError('Contact EMail must be a valid email address.')
    
    @staticmethod
    def get_member_data_dict(member):
        """Convert member object to dictionary for audit logging."""
        return {
            'owner_name': member.owner_name,
            'unit_id': member.unit_id,
            'occupant_type': member.occupant_type,
            'contact_phone': member.contact_phone,
            'contact_email': member.contact_email,
            'membership_status': member.membership_status,
            'payment_preference': member.payment_preference,
            'move_in_date': str(member.move_in_date),
        }
    
    @staticmethod
    @transaction.atomic
    def create_member(data, user):
        """
        Create a new member.
        
        Args:
            data: Dictionary with member details
            user: User instance
        
        Returns:
            Member instance
        """
        data['created_by'] = user
        data['updated_by'] = user
        MemberService._validate_contact_fields(data.get('contact_phone'), data.get('contact_email'))
        
        # If is_primary_contact is True, set other members of this unit to is_primary_contact=False
        if data.get('is_primary_contact', False):
            unit_id = data.get('unit_id')
            if unit_id:
                Member.objects.filter(unit_id=unit_id, is_primary_contact=True).update(is_primary_contact=False)
        
        member = Member.objects.create(**data)
        
        # Log audit
        AuditService.log_change(
            entity_type='Member',
            entity_id=member.id,
            entity_name=member.owner_name,
            action='CREATE',
            before_data={},
            after_data=MemberService.get_member_data_dict(member),
            user=user
        )
        
        return member
    
    @staticmethod
    @transaction.atomic
    def update_member(member_id, data, user):
        """
        Update an existing member.
        
        Args:
            member_id: Member ID
            data: Dictionary with fields to update
            user: User instance
        
        Returns:
            Updated Member instance
        """
        member = Member.objects.get(id=member_id)
        before_data = MemberService.get_member_data_dict(member)
        MemberService._validate_contact_fields(
            data.get('contact_phone', member.contact_phone),
            data.get('contact_email', member.contact_email),
        )
        
        # Handle primary contact logic
        if 'is_primary_contact' in data and data['is_primary_contact'] and not member.is_primary_contact:
            Member.objects.filter(unit=member.unit, is_primary_contact=True).update(is_primary_contact=False)
        
        for field, value in data.items():
            if field not in ['created_by', 'created_at']:
                setattr(member, field, value)
        
        member.updated_by = user
        member.save()
        
        after_data = MemberService.get_member_data_dict(member)
        
        # Log audit
        AuditService.log_change(
            entity_type='Member',
            entity_id=member.id,
            entity_name=member.owner_name,
            action='UPDATE',
            before_data=before_data,
            after_data=after_data,
            user=user
        )
        
        return member
    
    @staticmethod
    @transaction.atomic
    def delete_member(member_id, user):
        """
        Delete a member.
        
        Args:
            member_id: Member ID
            user: User instance
        """
        member = Member.objects.get(id=member_id)
        member_data = MemberService.get_member_data_dict(member)
        member_name = member.owner_name
        
        member.delete()
        
        # Log audit
        AuditService.log_change(
            entity_type='Member',
            entity_id=member_id,
            entity_name=member_name,
            action='DELETE',
            before_data=member_data,
            after_data={},
            user=user
        )
    
    @staticmethod
    @transaction.atomic
    def transfer_member(member_id, new_unit_id, user):
        """
        Transfer a member to a different unit.
        
        Args:
            member_id: Member ID
            new_unit_id: New Unit ID
            user: User instance
        
        Returns:
            Updated Member instance
        """
        member = Member.objects.get(id=member_id)
        old_unit_id = member.unit_id
        
        before_data = {
            'unit_id': old_unit_id,
            'unit_number': member.unit.unit_number,
        }
        
        member.unit_id = new_unit_id
        member.is_primary_contact = True
        member.updated_by = user
        member.save()
        
        # Set other members of new unit to non-primary
        Member.objects.filter(unit_id=new_unit_id).exclude(id=member_id).update(is_primary_contact=False)
        
        after_data = {
            'unit_id': new_unit_id,
            'unit_number': member.unit.unit_number,
        }
        
        # Log audit with transfer action
        AuditService.log_change(
            entity_type='Member',
            entity_id=member_id,
            entity_name=member.owner_name,
            action='TRANSFER',
            before_data=before_data,
            after_data=after_data,
            user=user,
            description=f'Member transferred from unit {old_unit_id} to unit {new_unit_id}'
        )
        
        return member
    
    @staticmethod
    @transaction.atomic
    def bulk_import_members(csv_file, user):
        """
        Bulk import members from CSV file.
        
        CSV format: unit_number, owner_name, occupant_type, contact_phone, contact_email, membership_status, payment_preference
        
        Args:
            csv_file: File object
            user: User instance
        
        Returns:
            Dictionary with import results
        """
        results = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            decoded_file = csv_file.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            for row_num, row in enumerate(reader, start=2):
                results['total'] += 1
                
                try:
                    # Validate required fields
                    required_fields = ['unit_number', 'owner_name', 'contact_phone']
                    missing = [f for f in required_fields if not row.get(f)]
                    
                    if missing:
                        raise ValidationError(f"Missing fields: {', '.join(missing)}")
                    
                    # Get unit
                    unit = Unit.objects.get(unit_number=row['unit_number'].strip())
                    
                    # Check if member already exists for this unit
                    if Member.objects.filter(unit=unit, owner_name=row['owner_name'].strip()).exists():
                        raise ValidationError(f"Member {row['owner_name']} already exists for unit {row['unit_number']}")
                    
                    # Prepare data
                    member_data = {
                        'unit': unit,
                        'owner_name': row['owner_name'].strip(),
                        'occupant_type': row.get('occupant_type', 'Owner').strip(),
                        'contact_phone': row['contact_phone'].strip(),
                        'contact_email': row.get('contact_email', '').strip(),
                        'membership_status': row.get('membership_status', 'Active').strip(),
                        'payment_preference': row.get('payment_preference', 'Online').strip(),
                        'move_in_date': timezone.now().date(),
                        'is_primary_contact': not Member.objects.filter(unit=unit).exists(),
                    }
                    
                    # Create member
                    MemberService.create_member(member_data, user)
                    results['success'] += 1
                    
                except Unit.DoesNotExist:
                    results['failed'] += 1
                    results['errors'].append({
                        'row': row_num,
                        'error': f"Unit {row.get('unit_number')} not found",
                        'data': row
                    })
                except (ValidationError, ValueError, KeyError) as e:
                    results['failed'] += 1
                    results['errors'].append({
                        'row': row_num,
                        'error': str(e),
                        'data': row
                    })
        
        except Exception as e:
            results['errors'].append({
                'row': 0,
                'error': f'File processing error: {str(e)}',
                'data': {}
            })
        
        return results
    
    @staticmethod
    def get_member_ledger(member_id):
        """
        Get member ledger with invoice and payment history.
        
        Args:
            member_id: Member ID
        
        Returns:
            Dictionary with member ledger data
        """
        from django.db.models import Sum
        
        member = Member.objects.get(id=member_id)
        invoices = Invoice.objects.filter(member=member).order_by('-period_end')
        payments = Payment.objects.filter(member=member).order_by('-payment_date')
        
        # Calculate totals
        total_invoiced = invoices.aggregate(Sum('total_amount'))['total_amount__sum'] or Decimal('0')
        total_paid = payments.aggregate(Sum('amount'))['amount__sum'] or Decimal('0')
        outstanding = total_invoiced - total_paid
        
        return {
            'member': {
                'id': member.id,
                'owner_name': member.owner_name,
                'unit': member.unit.unit_number
            },
            'invoices': [
                {
                    'id': inv.id,
                    'period': f"{inv.period_start.strftime('%b %Y')} - {inv.period_end.strftime('%b %Y')}",
                    'issued_date': inv.issue_date,
                    'due_date': inv.due_date,
                    'amount': str(inv.total_amount),
                    'status': inv.status,
                }
                for inv in invoices
            ],
            'payments': [
                {
                    'id': pmt.id,
                    'date': pmt.payment_date,
                    'amount': str(pmt.amount),
                    'mode': pmt.mode,
                    'reference': pmt.reference_number,
                }
                for pmt in payments
            ],
            'total_invoiced': str(total_invoiced),
            'total_paid': str(total_paid),
            'outstanding': str(max(Decimal('0'), outstanding)),
        }
