from django.test import TestCase
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from .models import Unit


class UnitModelTests(TestCase):
    def setUp(self):
        self.unit = Unit.objects.create(
            unit_number='A-101',
            block='Block A',
            floor=1,
            area_sqft='1200.00',
            unit_type='Flat'
        )

    def test_unit_creation(self):
        self.assertEqual(self.unit.unit_number, 'A-101')
        self.assertEqual(self.unit.status, 'Active')

    def test_unit_string_representation(self):
        self.assertEqual(str(self.unit), 'A-101 - Block A')


class UnitAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client.force_authenticate(user=self.user)

    def test_list_units(self):
        Unit.objects.create(
            unit_number='A-101',
            block='Block A',
            floor=1,
            area_sqft='1200.00'
        )
        response = self.client.get('/api/units/', secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 1)


class UserRBACAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin_user = User.objects.create_user(username='admin', password='adminpass')
        self.admin_user.profile.role = 'Admin'
        self.admin_user.profile.save()
        self.client.force_authenticate(user=self.admin_user)

    def test_get_current_user(self):
        response = self.client.get('/api/users/me/', secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['username'], 'admin')
        self.assertEqual(response.data['profile']['role'], 'Admin')

    def test_admin_can_list_users(self):
        response = self.client.get('/api/users/', secure=True)
        self.assertEqual(response.status_code, 200)
        self.assertIn('results', response.data)
        self.assertGreaterEqual(len(response.data['results']), 1)
