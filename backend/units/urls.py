from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UnitViewSet,
    MemberViewSet,
    OccupantViewSet,
    AuditLogViewSet,
    UserViewSet,
    MaintenanceTemplateViewSet,
    InvoiceViewSet,
    PaymentViewSet,
    PaymentCommunicationLogViewSet,
    NotificationSettingsViewSet,
    FormatSettingsViewSet,
)

# Create a router and register viewsets
router = DefaultRouter()
router.register(r'maintenance-templates', MaintenanceTemplateViewSet, basename='maintenance-template')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'payment-communication-logs', PaymentCommunicationLogViewSet, basename='payment-communication-log')
router.register(r'notification-settings', NotificationSettingsViewSet, basename='notification-settings')
router.register(r'format-settings', FormatSettingsViewSet, basename='format-settings')
router.register(r'units', UnitViewSet, basename='unit')
router.register(r'members', MemberViewSet, basename='member')
router.register(r'occupants', OccupantViewSet, basename='occupant')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'users', UserViewSet, basename='user')

app_name = 'units'

urlpatterns = [
    path('', include(router.urls)),
]
