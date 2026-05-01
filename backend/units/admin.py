from django.contrib import admin
from .models import Unit, Member, Occupant, AuditLog, UserProfile, Payment, PaymentCommunicationLog, InvoiceDeletionApprovalTask, InvoiceCancellationApprovalTask

@admin.register(Unit)
class UnitAdmin(admin.ModelAdmin):
    list_display = ('unit_number', 'block', 'floor', 'unit_type', 'status', 'created_at')
    list_filter = ('status', 'unit_type', 'block')
    search_fields = ('unit_number', 'block')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ('owner_name', 'unit', 'occupant_type', 'membership_status', 'is_primary_contact')
    list_filter = ('membership_status', 'occupant_type', 'payment_preference')
    search_fields = ('owner_name', 'contact_email', 'contact_phone')
    readonly_fields = ('created_at', 'updated_at', 'created_by', 'updated_by')

@admin.register(Occupant)
class OccupantAdmin(admin.ModelAdmin):
    list_display = ('name', 'unit', 'occupant_type', 'is_primary')
    list_filter = ('occupant_type', 'is_primary')
    search_fields = ('name', 'unit__unit_number')

@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'portal_access', 'member')
    list_filter = ('role', 'portal_access')
    search_fields = ('user__username', 'user__email', 'member__owner_name')

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('entity_type', 'entity_id', 'action', 'changed_by', 'changed_at')
    list_filter = ('entity_type', 'action', 'changed_at')
    search_fields = ('entity_name',)
    readonly_fields = ('changed_at',)


@admin.register(InvoiceDeletionApprovalTask)
class InvoiceDeletionApprovalTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice', 'status', 'reviewer_role', 'requested_by', 'reviewed_by', 'created_at')
    list_filter = ('status', 'reviewer_role', 'force_requested', 'created_at')
    search_fields = ('invoice__id', 'requested_by__username', 'reviewed_by__username')
    readonly_fields = ('created_at', 'updated_at', 'reviewed_at')


@admin.register(InvoiceCancellationApprovalTask)
class InvoiceCancellationApprovalTaskAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice', 'status', 'reviewer_role', 'requested_by', 'reviewed_by', 'created_at')
    list_filter = ('status', 'reviewer_role', 'created_at')
    search_fields = ('invoice__id', 'requested_by__username', 'reviewed_by__username')
    readonly_fields = ('created_at', 'updated_at', 'reviewed_at')


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'invoice', 'amount', 'payment_date', 'status', 'verified_by', 'verified_at')
    list_filter = ('status', 'mode', 'payment_date')
    search_fields = ('invoice__id', 'invoice__unit__unit_number', 'reference_number')
    readonly_fields = ('created_at', 'verified_at')


@admin.register(PaymentCommunicationLog)
class PaymentCommunicationLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'payment', 'channel', 'delivery_status', 'recipient', 'sent_by', 'sent_at')
    list_filter = ('channel', 'delivery_status', 'sent_at')
    search_fields = ('payment__id', 'payment__invoice__unit__unit_number', 'recipient', 'detail')
    readonly_fields = ('sent_at',)
