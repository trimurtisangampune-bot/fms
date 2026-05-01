from rest_framework import permissions
from .models import UserProfile


def get_user_role(user):
    if not user or not user.is_authenticated:
        return None
    try:
        return user.profile.role
    except UserProfile.DoesNotExist:
        return None


class RolePermission(permissions.BasePermission):
    required_roles = []

    def has_permission(self, request, view):
        return get_user_role(request.user) in self.required_roles


class IsAdmin(RolePermission):
    required_roles = ['Admin']


class IsTreasurer(RolePermission):
    required_roles = ['Treasurer']


class IsAuditor(RolePermission):
    required_roles = ['Auditor']


class IsMember(RolePermission):
    required_roles = ['Member']


class IsBoardMember(RolePermission):
    required_roles = ['Board Member']


class IsAdminOrTreasurer(RolePermission):
    required_roles = ['Admin', 'Treasurer']


class IsAdminOrTreasurerOrBoardMember(RolePermission):
    required_roles = ['Admin', 'Treasurer', 'Board Member']


class IsAdminOrAuditorOrTreasurer(RolePermission):
    required_roles = ['Admin', 'Treasurer', 'Auditor']


class IsAdminOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return get_user_role(request.user) == 'Admin'
