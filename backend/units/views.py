from decimal import Decimal
from datetime import datetime
from rest_framework import permissions, viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
import django_filters
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Q
from django.db import transaction

from .models import Unit, Member, Occupant, AuditLog, MaintenanceTemplate, Invoice, Payment, PaymentCommunicationLog, InvoiceDeletionApprovalTask, InvoiceCancellationApprovalTask
from .serializers import (
    UnitSerializer, UnitDetailSerializer, MemberSerializer, MemberListSerializer,
    MemberDetailSerializer, OccupantSerializer, AuditLogSerializer,
    BulkImportResultSerializer, UnitMemberSummarySerializer,
    UserSerializer, UserCreateSerializer, UserUpdateSerializer, NotificationSettingsSerializer,
    FormatSettingsSerializer, MaintenanceTemplateSerializer, MaintenanceLevySerializer,
    InvoiceSerializer, InvoiceDetailSerializer, PaymentSerializer,
    PaymentCommunicationLogSerializer,
    InvoiceDeletionApprovalTaskSerializer, InvoiceCancellationApprovalTaskSerializer,
)
from .services import UnitService, MemberService, AuditService, BillingService, NotificationService
from .models import NotificationSettings, FormatSettings
from .permissions import (
    IsAdmin,
    IsAdminOrReadOnly,
    IsAdminOrTreasurer,
    IsTreasurer,
    IsAuditor,
    IsAdminOrTreasurerOrBoardMember,
)


class MaintenanceTemplateViewSet(viewsets.ModelViewSet):
    """ViewSet for managing maintenance templates and levies."""
    queryset = MaintenanceTemplate.objects.all()
    serializer_class = MaintenanceTemplateSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['unit_type', 'occupancy_status', 'billing_frequency', 'is_active']
    search_fields = ['unit_type', 'occupancy_status']
    ordering_fields = ['unit_type', 'occupancy_status', 'billing_frequency', 'due_day']
    ordering = ['unit_type', 'occupancy_status', 'billing_frequency']

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, updated_by=self.request.user)

    def perform_update(self, serializer):
        serializer.save(updated_by=self.request.user)

    @action(detail=True, methods=['get'], url_path='levies')
    def levies(self, request, pk=None):
        template = self.get_object()
        serializer = MaintenanceLevySerializer(template.levies.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='levies')
    def add_levy(self, request, pk=None):
        template = self.get_object()
        data = request.data.copy()
        data['template'] = template.id
        serializer = MaintenanceLevySerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['put', 'patch'], url_path=r'levies/(?P<levy_pk>[^/.]+)')
    def update_levy(self, request, pk=None, levy_pk=None):
        template = self.get_object()
        levy = template.levies.filter(id=levy_pk).first()
        if not levy:
            return Response({'error': 'Levy not found'}, status=status.HTTP_404_NOT_FOUND)
        serializer = MaintenanceLevySerializer(levy, data=request.data, partial=(request.method == 'PATCH'))
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    @action(detail=True, methods=['delete'], url_path=r'levies/(?P<levy_pk>[^/.]+)')
    def delete_levy(self, request, pk=None, levy_pk=None):
        template = self.get_object()
        levy = template.levies.filter(id=levy_pk).first()
        if not levy:
            return Response({'error': 'Levy not found'}, status=status.HTTP_404_NOT_FOUND)
        levy.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for managing maintenance invoices."""
    queryset = Invoice.objects.select_related('unit', 'member', 'template').all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['unit', 'member', 'status', 'period_start', 'period_end', 'due_date']
    search_fields = ['unit__unit_number', 'member__owner_name']
    ordering_fields = ['due_date', 'period_start', '-created_at']
    ordering = ['-period_start']

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminOrTreasurer()]

    def _is_force_delete(self, request):
        raw_force = request.query_params.get('force', request.data.get('force', False))
        return str(raw_force).lower() in ['1', 'true', 'yes', 'on']

    def _get_reviewer_role_for_paid_delete(self, request_user):
        requester_role = getattr(getattr(request_user, 'profile', None), 'role', None)
        if requester_role == 'Admin':
            return 'Treasurer'
        if requester_role == 'Treasurer':
            return 'Admin'
        return None

    def _snapshot_invoice(self, invoice):
        return {
            'invoice_id': invoice.id,
            'status': invoice.status,
            'unit_number': getattr(invoice.unit, 'unit_number', None),
            'member_name': getattr(invoice.member, 'owner_name', None),
            'period_start': str(invoice.period_start),
            'period_end': str(invoice.period_end),
            'total_amount': str(invoice.total_amount),
            'paid_amount': str(invoice.paid_amount),
        }

    def _create_paid_delete_task(self, invoice, request_user, force_requested=False, note=''):
        reviewer_role = self._get_reviewer_role_for_paid_delete(request_user)
        if not reviewer_role:
            return None

        existing_task = InvoiceDeletionApprovalTask.objects.filter(
            invoice=invoice,
            status='Pending',
            reviewer_role=reviewer_role,
        ).first()
        if existing_task:
            return existing_task

        return InvoiceDeletionApprovalTask.objects.create(
            invoice=invoice,
            invoice_snapshot=self._snapshot_invoice(invoice),
            requested_by=request_user,
            reviewer_role=reviewer_role,
            force_requested=force_requested,
            request_note=note or '',
        )

    def destroy(self, request, *args, **kwargs):
        invoice = self.get_object()
        force_delete = self._is_force_delete(request)

        if invoice.status == 'Paid':
            task = self._create_paid_delete_task(
                invoice=invoice,
                request_user=request.user,
                force_requested=force_delete,
                note=request.data.get('request_note', '')
            )
            return Response(
                {
                    'error': 'Paid invoice deletion requires approval. A review task has been created.',
                    'invoice_id': invoice.id,
                    'status': invoice.status,
                    'requires_approval': True,
                    'task_id': task.id if task else None,
                },
                status=status.HTTP_202_ACCEPTED
            )

        self.perform_destroy(invoice)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='generate')
    def generate(self, request):
        """
        Generate maintenance invoices for units.

        Invoice Generation Rules:
        - If generation_frequency='Monthly': generates invoices ONLY for units with invoice_frequency='Monthly'
        - If generation_frequency='Annual': generates invoices ONLY for units with invoice_frequency='Annual'
        - Units without explicit invoice_frequency set are skipped
        - Template matching: unit_type + occupancy_status + billing_frequency must match
        - Duplicate detection: if invoice exists for (unit, period_start, period_end), it is not regenerated
          unless force_regenerate=True
        
        Request body:
        {
            "billing_period_start": "YYYY-MM-DD",  (required)
            "billing_period_end": "YYYY-MM-DD",    (required)
            "generation_frequency": "Monthly" | "Annual",  (required)
            "unit_ids": [1, 2, 3],  (optional, if None: all units)
            "force_regenerate": true | false  (optional, default: false)
        }
        """
        start_date = request.data.get('billing_period_start')
        end_date = request.data.get('billing_period_end')
        generation_frequency = request.data.get('generation_frequency')
        unit_ids = request.data.get('unit_ids', None)
        unit_numbers = request.data.get('unit_numbers', None)
        force_regenerate = request.data.get('force_regenerate', False)

        if unit_numbers:
            numbers = [n.strip().upper() for n in unit_numbers if n.strip()]
            matched = Unit.objects.filter(unit_number__in=numbers).values_list('id', 'unit_number')
            matched_list = list(matched)
            matched_numbers = {row[1] for row in matched_list}
            not_found = [n for n in numbers if n not in matched_numbers]
            if not_found:
                return Response({'error': f'Unit numbers not found: {", ".join(not_found)}'}, status=status.HTTP_400_BAD_REQUEST)
            unit_ids = [row[0] for row in matched_list]

        if not start_date or not end_date:
            return Response({'error': 'billing_period_start and billing_period_end are required'}, status=status.HTTP_400_BAD_REQUEST)

        if generation_frequency not in ['Monthly', 'Annual']:
            return Response(
                {'error': 'generation_frequency is required and must be Monthly or Annual'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            start = datetime.fromisoformat(start_date).date()
            end = datetime.fromisoformat(end_date).date()
        except ValueError:
            return Response({'error': 'Invalid date format'}, status=status.HTTP_400_BAD_REQUEST)

        result = BillingService.generate_invoices(
            billing_period_start=start,
            billing_period_end=end,
            generation_frequency=generation_frequency,
            unit_ids=unit_ids,
            force_regenerate=force_regenerate,
            user=request.user
        )
        return Response(result)

    @action(detail=True, methods=['post'], url_path='calculate-penalty')
    def calculate_penalty(self, request, pk=None):
        invoice = self.get_object()
        invoice = BillingService.calculate_penalty_for_invoice(invoice, user=request.user)
        serializer = InvoiceSerializer(invoice)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        invoice_ids = request.data.get('invoice_ids', [])
        force_delete = self._is_force_delete(request)

        if not isinstance(invoice_ids, list) or not invoice_ids:
            return Response(
                {'error': 'invoice_ids must be a non-empty list'},
                status=status.HTTP_400_BAD_REQUEST
            )

        normalized_ids = []
        for invoice_id in invoice_ids:
            try:
                normalized_ids.append(int(invoice_id))
            except (TypeError, ValueError):
                return Response(
                    {'error': f'Invalid invoice id: {invoice_id}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        unique_ids = list(set(normalized_ids))
        existing_ids = set(Invoice.objects.filter(id__in=unique_ids).values_list('id', flat=True))
        missing_ids = [invoice_id for invoice_id in unique_ids if invoice_id not in existing_ids]

        queryset = Invoice.objects.filter(id__in=existing_ids)
        paid_invoices = list(queryset.filter(status='Paid'))

        if paid_invoices:
            created_tasks = []
            for paid_invoice in paid_invoices:
                task = self._create_paid_delete_task(
                    invoice=paid_invoice,
                    request_user=request.user,
                    force_requested=force_delete,
                    note=request.data.get('request_note', '')
                )
                if task:
                    created_tasks.append(task.id)

            return Response(
                {
                    'error': 'Some selected invoices are Paid and require approval. Review tasks have been created.',
                    'requires_approval': True,
                    'blocked_paid_invoice_ids': [invoice.id for invoice in paid_invoices],
                    'created_task_ids': created_tasks,
                    'missing_invoice_ids': missing_ids,
                },
                status=status.HTTP_202_ACCEPTED
            )

        deleted_count, _ = queryset.exclude(status='Paid').delete()

        return Response({
            'requested_count': len(unique_ids),
            'deleted_count': deleted_count,
            'missing_invoice_ids': missing_ids,
            'force_used': force_delete,
        })

    @action(detail=False, methods=['post'], url_path='bulk-delete-filtered')
    def bulk_delete_filtered(self, request):
        force_delete = self._is_force_delete(request)
        status_filter = request.data.get('status')
        unit_filter = request.data.get('unit')
        member_filter = request.data.get('member')
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')
        due_date = request.data.get('due_date')
        search = request.data.get('search')

        if not any([status_filter, unit_filter, member_filter, period_start, period_end, due_date, search]):
            return Response(
                {'error': 'At least one filter is required for filtered bulk delete'},
                status=status.HTTP_400_BAD_REQUEST
            )

        queryset = Invoice.objects.all()

        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if unit_filter:
            queryset = queryset.filter(unit_id=unit_filter)
        if member_filter:
            queryset = queryset.filter(member_id=member_filter)
        if period_start:
            queryset = queryset.filter(period_start=period_start)
        if period_end:
            queryset = queryset.filter(period_end=period_end)
        if due_date:
            queryset = queryset.filter(due_date=due_date)
        if search:
            queryset = queryset.filter(
                Q(unit__unit_number__icontains=search) |
                Q(member__owner_name__icontains=search)
            )

        paid_invoices = list(queryset.filter(status='Paid'))
        if paid_invoices:
            created_tasks = []
            for paid_invoice in paid_invoices:
                task = self._create_paid_delete_task(
                    invoice=paid_invoice,
                    request_user=request.user,
                    force_requested=force_delete,
                    note=request.data.get('request_note', '')
                )
                if task:
                    created_tasks.append(task.id)

            return Response(
                {
                    'error': 'Filtered results include Paid invoices and require approval. Review tasks have been created.',
                    'requires_approval': True,
                    'blocked_paid_invoice_ids': [invoice.id for invoice in paid_invoices],
                    'created_task_ids': created_tasks,
                },
                status=status.HTTP_202_ACCEPTED
            )

        target_queryset = queryset.exclude(status='Paid')
        target_count = target_queryset.count()
        deleted_count, _ = target_queryset.delete()

        return Response({
            'matched_count': target_count,
            'deleted_count': deleted_count,
            'force_used': force_delete,
        })

    @action(detail=False, methods=['get'], url_path='deletion-approval-tasks')
    def deletion_approval_tasks(self, request):
        user_role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if user_role not in ['Admin', 'Treasurer']:
            return Response({'error': 'Only Admin and Treasurer can access deletion approval tasks'}, status=status.HTTP_403_FORBIDDEN)

        queryset = InvoiceDeletionApprovalTask.objects.all()
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        reviewer_scope = request.query_params.get('scope', 'mine')
        if reviewer_scope == 'mine':
            queryset = queryset.filter(reviewer_role=user_role)

        serializer = InvoiceDeletionApprovalTaskSerializer(queryset[:200], many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path=r'deletion-approval-tasks/(?P<task_id>[^/.]+)/approve')
    def approve_deletion_task(self, request, task_id=None):
        user_role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if user_role not in ['Admin', 'Treasurer']:
            return Response({'error': 'Only Admin and Treasurer can review tasks'}, status=status.HTTP_403_FORBIDDEN)

        task = InvoiceDeletionApprovalTask.objects.filter(id=task_id).first()
        if not task:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        if task.status != 'Pending':
            return Response({'error': f'Task already {task.status.lower()}'}, status=status.HTTP_400_BAD_REQUEST)
        if task.reviewer_role != user_role:
            return Response({'error': f'This task must be reviewed by role {task.reviewer_role}'}, status=status.HTTP_403_FORBIDDEN)

        task.status = 'Approved'
        task.review_note = request.data.get('review_note', '')
        task.reviewed_by = request.user
        task.reviewed_at = timezone.now()
        task.save(update_fields=['status', 'review_note', 'reviewed_by', 'reviewed_at', 'updated_at'])

        if task.invoice:
            task.invoice.delete()

        serializer = InvoiceDeletionApprovalTaskSerializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path=r'deletion-approval-tasks/(?P<task_id>[^/.]+)/reject')
    def reject_deletion_task(self, request, task_id=None):
        user_role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if user_role not in ['Admin', 'Treasurer']:
            return Response({'error': 'Only Admin and Treasurer can review tasks'}, status=status.HTTP_403_FORBIDDEN)

        task = InvoiceDeletionApprovalTask.objects.filter(id=task_id).first()
        if not task:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        if task.status != 'Pending':
            return Response({'error': f'Task already {task.status.lower()}'}, status=status.HTTP_400_BAD_REQUEST)
        if task.reviewer_role != user_role:
            return Response({'error': f'This task must be reviewed by role {task.reviewer_role}'}, status=status.HTTP_403_FORBIDDEN)

        task.status = 'Rejected'
        task.review_note = request.data.get('review_note', '')
        task.reviewed_by = request.user
        task.reviewed_at = timezone.now()
        task.save(update_fields=['status', 'review_note', 'reviewed_by', 'reviewed_at', 'updated_at'])

        serializer = InvoiceDeletionApprovalTaskSerializer(task)
        return Response(serializer.data)

    # ------------------------------------------------------------------ #
    #  Invoice Cancellation                                                #
    # ------------------------------------------------------------------ #

    def _get_reviewer_role_for_cancel(self, request_user):
        """Admin requests → Treasurer reviews; Treasurer requests → Admin reviews."""
        requester_role = getattr(getattr(request_user, 'profile', None), 'role', None)
        if requester_role == 'Admin':
            return 'Treasurer'
        if requester_role == 'Treasurer':
            return 'Admin'
        return None

    @action(detail=True, methods=['post'], url_path='cancel')
    def cancel_invoice(self, request, pk=None):
        """
        Initiate a cancellation request for an unpaid invoice.

        Rules:
        - Only Admin and Treasurer may submit a cancel request.
        - Paid invoices cannot be cancelled.
        - Already Cancelled invoices cannot be cancelled again.
        - If Admin requests → sent to Treasurer for approval.
        - If Treasurer requests → sent to Admin for approval.
        - Only one Pending cancellation task per invoice is allowed.
        """
        user_role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if user_role not in ['Admin', 'Treasurer']:
            return Response({'error': 'Only Admin and Treasurer can cancel invoices'}, status=status.HTTP_403_FORBIDDEN)

        invoice = self.get_object()

        if invoice.status == 'Paid':
            return Response({'error': 'Paid invoices cannot be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)
        if invoice.status == 'Cancelled':
            return Response({'error': 'Invoice is already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        reviewer_role = self._get_reviewer_role_for_cancel(request.user)

        # Prevent duplicate pending tasks for the same invoice
        existing_task = InvoiceCancellationApprovalTask.objects.filter(
            invoice=invoice,
            status='Pending',
        ).first()
        if existing_task:
            return Response(
                {'error': 'A cancellation request is already pending for this invoice.', 'task_id': existing_task.id},
                status=status.HTTP_400_BAD_REQUEST,
            )

        task = InvoiceCancellationApprovalTask.objects.create(
            invoice=invoice,
            invoice_snapshot={
                'invoice_id': invoice.id,
                'status': invoice.status,
                'unit_number': getattr(invoice.unit, 'unit_number', None),
                'member_name': getattr(invoice.member, 'owner_name', None),
                'period_start': str(invoice.period_start),
                'period_end': str(invoice.period_end),
                'total_amount': str(invoice.total_amount),
            },
            requested_by=request.user,
            reviewer_role=reviewer_role,
            request_note=request.data.get('request_note', ''),
        )

        return Response(
            {
                'message': f'Cancellation request submitted. Awaiting approval from {reviewer_role}.',
                'invoice_id': invoice.id,
                'task_id': task.id,
                'reviewer_role': reviewer_role,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=['get'], url_path='cancellation-approval-tasks')
    def cancellation_approval_tasks(self, request):
        """List pending cancellation approval tasks for the current user's role."""
        user_role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if user_role not in ['Admin', 'Treasurer']:
            return Response({'error': 'Only Admin and Treasurer can access cancellation approval tasks'}, status=status.HTTP_403_FORBIDDEN)

        queryset = InvoiceCancellationApprovalTask.objects.all()
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        reviewer_scope = request.query_params.get('scope', 'mine')
        if reviewer_scope == 'mine':
            queryset = queryset.filter(reviewer_role=user_role)

        serializer = InvoiceCancellationApprovalTaskSerializer(queryset[:200], many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path=r'cancellation-approval-tasks/(?P<task_id>[^/.]+)/approve')
    def approve_cancellation_task(self, request, task_id=None):
        """Approve a cancellation request → sets invoice.status = 'Cancelled'."""
        user_role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if user_role not in ['Admin', 'Treasurer']:
            return Response({'error': 'Only Admin and Treasurer can review tasks'}, status=status.HTTP_403_FORBIDDEN)

        task = InvoiceCancellationApprovalTask.objects.filter(id=task_id).first()
        if not task:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        if task.status != 'Pending':
            return Response({'error': f'Task already {task.status.lower()}'}, status=status.HTTP_400_BAD_REQUEST)
        if task.reviewer_role != user_role:
            return Response({'error': f'This task must be reviewed by role {task.reviewer_role}'}, status=status.HTTP_403_FORBIDDEN)

        task.status = 'Approved'
        task.review_note = request.data.get('review_note', '')
        task.reviewed_by = request.user
        task.reviewed_at = timezone.now()
        task.save(update_fields=['status', 'review_note', 'reviewed_by', 'reviewed_at', 'updated_at'])

        if task.invoice:
            task.invoice.status = 'Cancelled'
            task.invoice.updated_by = request.user
            task.invoice.save(update_fields=['status', 'updated_at', 'updated_by'])

        serializer = InvoiceCancellationApprovalTaskSerializer(task)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path=r'cancellation-approval-tasks/(?P<task_id>[^/.]+)/reject')
    def reject_cancellation_task(self, request, task_id=None):
        """Reject a cancellation request → invoice remains unchanged."""
        user_role = getattr(getattr(request.user, 'profile', None), 'role', None)
        if user_role not in ['Admin', 'Treasurer']:
            return Response({'error': 'Only Admin and Treasurer can review tasks'}, status=status.HTTP_403_FORBIDDEN)

        task = InvoiceCancellationApprovalTask.objects.filter(id=task_id).first()
        if not task:
            return Response({'error': 'Task not found'}, status=status.HTTP_404_NOT_FOUND)
        if task.status != 'Pending':
            return Response({'error': f'Task already {task.status.lower()}'}, status=status.HTTP_400_BAD_REQUEST)
        if task.reviewer_role != user_role:
            return Response({'error': f'This task must be reviewed by role {task.reviewer_role}'}, status=status.HTTP_403_FORBIDDEN)

        task.status = 'Rejected'
        task.review_note = request.data.get('review_note', '')
        task.reviewed_by = request.user
        task.reviewed_at = timezone.now()
        task.save(update_fields=['status', 'review_note', 'reviewed_by', 'reviewed_at', 'updated_at'])

        serializer = InvoiceCancellationApprovalTaskSerializer(task)
        return Response(serializer.data)


class PaymentFilter(django_filters.FilterSet):
    unit = django_filters.NumberFilter(field_name='invoice__unit__id')
    payment_date_after = django_filters.DateFilter(field_name='payment_date', lookup_expr='gte')
    payment_date_before = django_filters.DateFilter(field_name='payment_date', lookup_expr='lte')

    class Meta:
        model = Payment
        fields = ['invoice', 'member', 'payment_date', 'mode', 'unit']


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet for recording payments against invoices."""
    queryset = Payment.objects.select_related('invoice', 'member').all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTreasurer]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PaymentFilter
    search_fields = ['invoice__unit__unit_number', 'member__owner_name', 'reference_number']
    ordering_fields = ['payment_date', '-created_at']
    ordering = ['-payment_date']

    def create(self, request, *args, **kwargs):
        amount = Decimal(str(request.data.get('amount', '0')))
        payment_date = request.data.get('payment_date')
        mode = request.data.get('mode', 'Online')
        reference_number = request.data.get('reference_number', '')
        invoice_id = request.data.get('invoice')

        if not invoice_id or amount <= 0:
            return Response({'error': 'invoice and positive amount are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payment_date_obj = datetime.fromisoformat(payment_date).date() if payment_date else timezone.now().date()
        except ValueError:
            return Response({'error': 'Invalid payment_date'}, status=status.HTTP_400_BAD_REQUEST)

        payment = BillingService.record_payment(
            invoice_id=invoice_id,
            amount=amount,
            payment_date=payment_date_obj,
            mode=mode,
            reference_number=reference_number,
            user=request.user
        )
        serializer = self.get_serializer(payment)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='verify')
    def verify(self, request, pk=None):
        payment = self.get_object()
        try:
            results = BillingService.verify_payment(payment=payment, user=request.user)
        except Exception as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(payment)
        return Response({'payment': serializer.data, 'communication': results}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='share-receipt')
    def share_receipt(self, request, pk=None):
        payment = self.get_object()
        results = NotificationService.share_payment_receipt(payment, sent_by=request.user)
        channel_states = [results[channel]['status'] for channel in ['email', 'whatsapp', 'sms']]

        if any(state == 'sent' for state in channel_states):
            response_status = status.HTTP_200_OK
        elif all(state == 'skipped' for state in channel_states):
            response_status = status.HTTP_400_BAD_REQUEST
        else:
            response_status = status.HTTP_502_BAD_GATEWAY

        return Response(results, status=response_status)


class PaymentCommunicationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Admin-only list of payment receipt communication logs."""

    queryset = PaymentCommunicationLog.objects.select_related(
        'payment', 'payment__invoice', 'payment__invoice__unit', 'payment__member', 'sent_by'
    ).all()
    serializer_class = PaymentCommunicationLogSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['channel', 'delivery_status']
    ordering_fields = ['sent_at']
    ordering = ['-sent_at']


class NotificationSettingsViewSet(viewsets.ViewSet):
    """Admin-only singleton notification settings endpoint."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def list(self, request):
        settings_obj = NotificationSettings.get_solo()
        serializer = NotificationSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def create(self, request):
        settings_obj = NotificationSettings.get_solo()
        serializer = NotificationSettingsSerializer(settings_obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)


class FormatSettingsViewSet(viewsets.ViewSet):
    """Admin-only singleton format settings endpoint."""

    permission_classes = [IsAuthenticated, IsAdmin]

    def list(self, request):
        settings_obj = FormatSettings.get_solo()
        serializer = FormatSettingsSerializer(settings_obj)
        return Response(serializer.data)

    def create(self, request):
        settings_obj = FormatSettings.get_solo()
        serializer = FormatSettingsSerializer(settings_obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(updated_by=request.user)
        return Response(serializer.data)


class UnitViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing units.
    
    List units, create, retrieve, update, delete, bulk import, and view summary.
    """
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'unit_type', 'occupancy_status', 'block', 'floor']
    search_fields = ['unit_number', 'block', 'occupancy_status']
    ordering_fields = ['unit_number', 'block', 'floor', '-created_at']
    ordering = ['block', 'floor', 'unit_number']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return UnitDetailSerializer
        return super().get_serializer_class()
    
    def perform_create(self, serializer):
        """Create unit and log audit."""
        unit = Unit.objects.create(
            **serializer.validated_data,
            created_by=self.request.user,
            updated_by=self.request.user
        )
        UnitService.create_unit({}, self.request.user)  # Log audit
    
    def perform_update(self, serializer):
        """Update unit and log audit."""
        unit = serializer.save(updated_by=self.request.user)
        UnitService.update_unit(unit.id, {}, self.request.user)  # Log audit
    
    def perform_destroy(self, instance):
        """Delete unit and log audit."""
        UnitService.delete_unit(instance.id, self.request.user)
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get units summary statistics.
        
        GET /api/units/summary/
        """
        try:
            summary_data = UnitService.get_unit_summary()
            serializer = UnitMemberSummarySerializer(summary_data)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['post'], parser_classes=(MultiPartParser, FormParser), url_path='bulk-import')
    def bulk_import(self, request):
        """
        Bulk import units from CSV file.
        
        POST /api/units/bulk-import/
        
        Form data:
            - file: CSV file with columns: unit_number, block, floor, area_sqft, unit_type, status
        """
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            csv_file = request.FILES['file']
            results = UnitService.bulk_import_units(csv_file, request.user)
            serializer = BulkImportResultSerializer(results)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsAdminOrTreasurer],
            url_path='invoice-frequency')
    def set_invoice_frequency(self, request, pk=None):
        """
        Update only the invoice_frequency for a specific unit.
        Accessible by Admin and Treasurer.

        PATCH /api/units/{id}/invoice-frequency/
        Body: { "invoice_frequency": "Monthly" | "Annual" | "" }
        """
        unit = self.get_object()
        frequency = request.data.get('invoice_frequency', '')
        valid_choices = ['', 'Monthly', 'Annual']
        if frequency not in valid_choices:
            return Response(
                {'error': f'Invalid value. Must be one of: {valid_choices[1:]}, or empty string for template default.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        unit.invoice_frequency = frequency
        unit.updated_by = request.user
        unit.save(update_fields=['invoice_frequency', 'updated_by', 'updated_at'])
        return Response({'id': unit.id, 'invoice_frequency': unit.invoice_frequency})

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Get audit history for a unit.
        
        GET /api/units/{id}/history/
        """
        try:
            logs = AuditService.get_entity_history('Unit', pk, limit=50)
            serializer = AuditLogSerializer(logs, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class MemberViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing members.
    
    List members, create, retrieve, update, delete, transfer, bulk import, and view ledger.
    """
    queryset = Member.objects.select_related('unit').all()
    serializer_class = MemberListSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['membership_status', 'occupant_type', 'payment_preference', 'unit', 'is_primary_contact']
    search_fields = ['owner_name', 'contact_email', 'contact_phone', 'unit__unit_number']
    ordering_fields = ['owner_name', 'unit__unit_number', '-created_at', 'membership_status']
    ordering = ['unit__block', 'unit__floor', 'unit__unit_number', 'owner_name']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'retrieve':
            return MemberDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return MemberSerializer
        return MemberListSerializer

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdminOrTreasurerOrBoardMember()]
    
    def perform_create(self, serializer):
        """Create member and log audit."""
        member = serializer.save(
            created_by=self.request.user,
            updated_by=self.request.user
        )
        AuditService.log_change(
            entity_type='Member',
            entity_id=member.id,
            entity_name=member.owner_name,
            action='CREATE',
            before_data={},
            after_data=MemberService.get_member_data_dict(member),
            user=self.request.user
        )
    
    @transaction.atomic
    def perform_update(self, serializer):
        """Update member and log audit."""
        instance = serializer.instance
        validated_data = serializer.validated_data

        # If this member is being made the primary contact and wasn't before,
        # unset any existing primary contact on this unit first to avoid
        # the UniqueConstraint violation on (unit, is_primary_contact).
        if validated_data.get('is_primary_contact') and not instance.is_primary_contact:
            Member.objects.filter(
                unit=instance.unit, is_primary_contact=True
            ).update(is_primary_contact=False)

        member = serializer.save(updated_by=self.request.user)
        AuditService.log_change(
            entity_type='Member',
            entity_id=member.id,
            entity_name=member.owner_name,
            action='UPDATE',
            before_data={},
            after_data=MemberService.get_member_data_dict(member),
            user=self.request.user
        )
    
    def perform_destroy(self, instance):
        """Delete member and log audit."""
        MemberService.delete_member(instance.id, self.request.user)
    
    @action(detail=False, methods=['post'], parser_classes=(MultiPartParser, FormParser), url_path='bulk-import')
    def bulk_import(self, request):
        """
        Bulk import members from CSV file.
        
        POST /api/members/bulk-import/
        
        Form data:
            - file: CSV file with columns: unit_number, owner_name, occupant_type, contact_phone,
                    contact_email, membership_status, payment_preference
        """
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            csv_file = request.FILES['file']
            results = MemberService.bulk_import_members(csv_file, request.user)
            serializer = BulkImportResultSerializer(results)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def ledger(self, request, pk=None):
        """
        Get member's financial ledger (invoices and payments).
        
        GET /api/members/{id}/ledger/
        """
        try:
            member = self.get_object()
            ledger = MemberService.get_member_ledger(member.id)
            return Response(ledger)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'])
    def transfer(self, request, pk=None):
        """
        Transfer member to a different unit.
        
        POST /api/members/{id}/transfer/
        
        Request body:
            {
                "new_unit_id": 123
            }
        """
        try:
            member = self.get_object()
            new_unit_id = request.data.get('new_unit_id')
            
            if not new_unit_id:
                return Response(
                    {'error': 'new_unit_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Verify new unit exists
            Unit.objects.get(id=new_unit_id)
            
            member = MemberService.transfer_member(member.id, new_unit_id, request.user)
            serializer = self.get_serializer(member)
            return Response(serializer.data)
        except Unit.DoesNotExist:
            return Response(
                {'error': 'Target unit not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """
        Get audit history for a member.
        
        GET /api/members/{id}/history/
        """
        try:
            logs = AuditService.get_entity_history('Member', pk, limit=50)
            serializer = AuditLogSerializer(logs, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class OccupantViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing occupants (additional residents in a unit).
    """
    queryset = Occupant.objects.all()
    serializer_class = OccupantSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['unit', 'occupant_type']
    search_fields = ['name', 'unit__unit_number']
    
    @action(detail=False, methods=['get'])
    def by_unit(self, request):
        """
        Get all occupants for a specific unit.
        
        GET /api/occupants/by_unit/?unit_id=123
        """
        unit_id = request.query_params.get('unit_id')
        if not unit_id:
            return Response(
                {'error': 'unit_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            unit = Unit.objects.get(id=unit_id)
            occupants = Occupant.objects.filter(unit=unit)
            serializer = self.get_serializer(occupants, many=True)
            return Response(serializer.data)
        except Unit.DoesNotExist:
            return Response(
                {'error': 'Unit not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing audit logs (read-only).
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, IsAuditor | IsAdmin | IsTreasurer]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['entity_type', 'entity_id', 'action']
    ordering_fields = ['-changed_at']
    ordering = ['-changed_at']
    
    @action(detail=False, methods=['get'])
    def by_entity(self, request):
        """
        Get audit logs for a specific entity.
        
        GET /api/audit-logs/by_entity/?entity_type=Unit&entity_id=1
        """
        entity_type = request.query_params.get('entity_type')
        entity_id = request.query_params.get('entity_id')
        
        if not entity_type or not entity_id:
            return Response(
                {'error': 'entity_type and entity_id parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logs = AuditLog.objects.filter(
            entity_type=entity_type,
            entity_id=entity_id
        ).order_by('-changed_at')
        
        serializer = self.get_serializer(logs, many=True)
        return Response(serializer.data)


class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing system users and RBAC profiles.
    """
    queryset = User.objects.select_related('profile').all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['username', 'first_name', 'last_name', 'email', 'profile__role']
    ordering_fields = ['username', 'first_name', 'last_name', 'email']
    ordering = ['username']

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == 'me':
            return [IsAuthenticated()]
        return super().get_permissions()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='me')
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
