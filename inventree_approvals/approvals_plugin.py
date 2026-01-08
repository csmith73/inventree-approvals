"""Purchase Order Approvals Plugin for InvenTree.

This plugin adds an approval workflow to Purchase Orders.
"""

from typing import TYPE_CHECKING

from django.urls import path
from django.utils.translation import gettext_lazy as _

from plugin import InvenTreePlugin
from plugin.mixins import (
    SettingsMixin,
    UrlsMixin,
    UserInterfaceMixin,
    ValidationMixin,
)

if TYPE_CHECKING:
    from rest_framework.request import Request


class POApprovalsPlugin(
    SettingsMixin,
    UrlsMixin,
    UserInterfaceMixin,
    ValidationMixin,
    InvenTreePlugin,
):
    """Plugin that adds approval workflow to Purchase Orders."""

    # Plugin metadata
    NAME = 'POApprovalsPlugin'
    SLUG = 'approvals'
    TITLE = _('PO Approvals Plugin')
    DESCRIPTION = _('Adds approval workflow to Purchase Orders')
    VERSION = '2.0.2'
    AUTHOR = 'InvenTree Approvals Plugin'
    
    # Minimum InvenTree version required (updated for new UI plugin system)
    MIN_VERSION = '1.0.0'

    # Plugin settings
    SETTINGS = {
        'ENABLE_APPROVALS': {
            'name': _('Enable Approvals'),
            'description': _('Enable the approval workflow for Purchase Orders'),
            'default': True,
            'validator': bool,
        },
        'HIGH_VALUE_THRESHOLD': {
            'name': _('High Value Threshold'),
            'description': _('Orders above this amount require a senior approver'),
            'default': '10000',
            'validator': str,
        },
        'HIGH_VALUE_APPROVERS': {
            'name': _('Senior Approvers'),
            'description': _('Comma-separated list of usernames who can approve high-value orders'),
            'default': '',
            'validator': str,
        },
        'SEND_EMAIL_NOTIFICATIONS': {
            'name': _('Send Email Notifications'),
            'description': _('Send email notifications when approval is requested'),
            'default': True,
            'validator': bool,
        },
        'TEAMS_WEBHOOK_URL': {
            'name': _('Teams Webhook URL'),
            'description': _('Microsoft Teams incoming webhook URL for posting approval requests'),
            'default': '',
            'validator': str,
        },
    }

    # Metadata key for storing approval data on PurchaseOrders
    METADATA_KEY = 'po_approvals'

    def setup_urls(self):
        """Set up URL patterns for the plugin API."""
        from . import api
        
        return [
            path(
                'po/<int:pk>/status/',
                api.ApprovalStatusView.as_view(),
                name='approval-status',
            ),
            path(
                'po/<int:pk>/request/',
                api.RequestApprovalView.as_view(),
                name='approval-request',
            ),
            path(
                'po/<int:pk>/approve/',
                api.ApproveView.as_view(),
                name='approval-approve',
            ),
            path(
                'po/<int:pk>/reject/',
                api.RejectView.as_view(),
                name='approval-reject',
            ),
            path(
                'pending/',
                api.PendingApprovalsView.as_view(),
                name='approval-pending-list',
            ),
            path(
                'users/',
                api.ApproverUsersView.as_view(),
                name='approval-users',
            ),
        ]

    def get_ui_panels(self, request: 'Request', context: dict, **kwargs) -> list:
        """Return custom UI panels for the Purchase Order detail page.

        This method implements the new UIFeature format required by the
        InvenTree UI plugin system.

        Args:
            request: The HTTP request object
            context: Context data from the UI including target_model and target_id
            **kwargs: Additional keyword arguments

        Returns:
            List of UIFeature dicts for panel injection
        """
        panels = []
        target_model = context.get('target_model', None)
        target_id = context.get('target_id', None)

        # Only add panel for Purchase Orders
        if target_model == 'purchaseorder' and target_id:
            # Check if approvals are enabled
            if self.get_setting('ENABLE_APPROVALS'):
                panels.append({
                    'key': 'po-approvals-panel',
                    'title': str(_('Approvals')),
                    'description': str(_('Purchase Order approval workflow')),
                    'icon': 'ti:checkbox:outline',
                    'feature_type': 'panel',
                    'options': {},
                    'source': self.plugin_static_file(
                        'approvals_panel.js:renderPanel'
                    ),
                    'context': {
                        'order_id': target_id,
                        'plugin_slug': self.slug,
                    },
                })

        return panels

    def validate_model_instance(self, instance, deltas=None):
        """Validate Purchase Order instances to enforce approval workflow.
        
        This prevents placing an order without the required approvals.
        """
        from django.core.exceptions import ValidationError
        from order.models import PurchaseOrder
        from order.status_codes import PurchaseOrderStatus

        # Only validate PurchaseOrder instances
        if not isinstance(instance, PurchaseOrder):
            return

        # Check if approvals are enabled
        if not self.get_setting('ENABLE_APPROVALS'):
            return

        # Check if status is being changed to PLACED
        if deltas and 'status' in deltas:
            new_status = deltas['status'].get('new')
            if new_status == PurchaseOrderStatus.PLACED.value:
                # Check if order has required approvals
                if not self._has_required_approvals(instance):
                    raise ValidationError({
                        'status': _('Purchase Order requires approval before it can be placed')
                    })

    def _has_required_approvals(self, order):
        """Check if the order has the required number of approvals."""
        approval_data = order.get_metadata(self.METADATA_KEY, {})
        approvals = approval_data.get('approvals', [])
        
        approved_count = sum(
            1 for a in approvals 
            if a.get('status') == 'approved'
        )
        
        return approved_count >= 1

    def get_high_value_threshold(self):
        """Get the high value threshold as a decimal."""
        from decimal import Decimal
        try:
            return Decimal(self.get_setting('HIGH_VALUE_THRESHOLD'))
        except Exception:
            return Decimal('10000')

    def get_senior_approvers(self):
        """Get list of senior approver user IDs by looking up usernames."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        approvers_str = self.get_setting('HIGH_VALUE_APPROVERS', '')
        if not approvers_str:
            return []
        
        usernames = [x.strip() for x in approvers_str.split(',') if x.strip()]
        if not usernames:
            return []
        
        # Look up user IDs by username
        users = User.objects.filter(username__in=usernames, is_active=True)
        return list(users.values_list('id', flat=True))

    def is_high_value_order(self, order):
        """Check if the order is considered high value."""
        if not order.total_price:
            return False
        
        threshold = self.get_high_value_threshold()
        return order.total_price.amount >= threshold
