"""API views for the PO Approvals plugin."""

from django.contrib.auth import get_user_model
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.translation import gettext_lazy as _

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

import structlog

from order.models import PurchaseOrder
from plugin import registry

from . import helpers

logger = structlog.get_logger('inventree')
User = get_user_model()


def get_plugin():
    """Get the POApprovalsPlugin instance."""
    return registry.get_plugin('approvals')


class ApprovalStatusView(APIView):
    """API endpoint to get the approval status of a Purchase Order."""

    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        """Get the approval status for a specific PurchaseOrder."""
        try:
            order = PurchaseOrder.objects.get(pk=pk)
        except PurchaseOrder.DoesNotExist:
            return Response(
                {'error': 'Purchase Order not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check permission to view PO
        if not request.user.has_perm('order.view_purchaseorder'):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN,
            )

        plugin = get_plugin()
        summary = helpers.get_approval_summary(order)

        # Add user-specific info
        can_approve, approve_reason = helpers.can_user_approve(
            request.user, order, plugin
        )
        can_request, request_reason = helpers.can_request_approval(order)

        summary.update({
            'order_id': order.pk,
            'order_reference': order.reference,
            'order_status': order.status,
            'order_total': str(order.total_price) if order.total_price else None,
            'is_high_value': plugin.is_high_value_order(order),
            'user_can_approve': can_approve,
            'user_can_approve_reason': approve_reason if not can_approve else None,
            'can_request_approval': can_request,
            'can_request_reason': request_reason if not can_request else None,
        })

        return Response(summary)


class RequestApprovalView(APIView):
    """API endpoint to request approval for a Purchase Order."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Request an approval for a specific PurchaseOrder."""
        try:
            order = PurchaseOrder.objects.get(pk=pk)
        except PurchaseOrder.DoesNotExist:
            return Response(
                {'error': 'Purchase Order not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check permission to change PO
        if not request.user.has_perm('order.change_purchaseorder'):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Check if approval can be requested
        can_request, reason = helpers.can_request_approval(order)
        if not can_request:
            return Response(
                {'error': reason},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get optional parameters
        requested_approver_id = request.data.get('approver_id')
        notes = request.data.get('notes', '')

        # Check if Teams channel was selected
        teams_channel_selected = requested_approver_id == 'teams_channel'
        
        # Validate requested approver if specified (and not Teams channel)
        requested_approver = None
        if requested_approver_id and not teams_channel_selected:
            try:
                requested_approver_id = int(requested_approver_id)
                requested_approver = User.objects.get(pk=requested_approver_id)
            except (ValueError, User.DoesNotExist):
                return Response(
                    {'error': 'Invalid approver ID'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        
        # If Teams channel selected, clear the approver_id
        if teams_channel_selected:
            requested_approver_id = None

        # Create the approval request
        approval = helpers.request_approval(
            order,
            requesting_user=request.user,
            requested_approver_id=requested_approver_id,
            notes=notes,
        )

        # Send notifications
        plugin = get_plugin()
        email_sent = False
        teams_sent = False
        
        # Send Teams webhook if Teams channel was selected
        if teams_channel_selected:
            teams_sent = send_teams_webhook(order, request, plugin)
        
        # Send email notification if enabled and specific approver selected
        if plugin.get_setting('SEND_EMAIL_NOTIFICATIONS') and requested_approver:
            email_sent = send_approval_request_email(
                order, approval, requested_approver, request
            )

        return Response({
            'success': True,
            'approval_level': approval['level'],
            'requested_approver': approval.get('requested_approver_name') or ('Teams Channel' if teams_channel_selected else None),
            'email_sent': email_sent,
            'teams_sent': teams_sent,
            'message': 'Approval requested successfully',
        })


class ApproveView(APIView):
    """API endpoint to approve a pending approval request."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Approve a pending approval request."""
        try:
            order = PurchaseOrder.objects.get(pk=pk)
        except PurchaseOrder.DoesNotExist:
            return Response(
                {'error': 'Purchase Order not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check permission to change PO
        if not request.user.has_perm('order.change_purchaseorder'):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN,
            )

        plugin = get_plugin()

        # Check if user can approve
        can_approve, reason = helpers.can_user_approve(request.user, order, plugin)
        if not can_approve:
            return Response(
                {'error': reason},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get optional notes
        notes = request.data.get('notes', '')

        # Record the approval
        approval = helpers.record_approval(
            order,
            approving_user=request.user,
            approved=True,
            notes=notes,
        )

        if not approval:
            return Response(
                {'error': 'No pending approval to approve'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get updated counts
        approval_count = helpers.get_approval_count(order)
        fully_approved = approval_count >= 1
        
        # Send notification email to requestor
        if plugin.get_setting('SEND_EMAIL_NOTIFICATIONS'):
            send_decision_notification_email(order, approval, approved=True)

        return Response({
            'success': True,
            'approval_level': approval['level'],
            'approval_count': approval_count,
            'fully_approved': fully_approved,
            'can_place_order': fully_approved,
            'message': 'Approval granted',
        })


class RejectView(APIView):
    """API endpoint to reject a pending approval request."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        """Reject a pending approval request."""
        try:
            order = PurchaseOrder.objects.get(pk=pk)
        except PurchaseOrder.DoesNotExist:
            return Response(
                {'error': 'Purchase Order not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check permission to change PO
        if not request.user.has_perm('order.change_purchaseorder'):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN,
            )

        plugin = get_plugin()

        # Check if user can reject (same rules as approve)
        can_approve, reason = helpers.can_user_approve(request.user, order, plugin)
        if not can_approve:
            return Response(
                {'error': reason},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Get optional notes
        notes = request.data.get('notes', '')

        # Record the rejection
        approval = helpers.record_approval(
            order,
            approving_user=request.user,
            approved=False,
            notes=notes,
        )

        if not approval:
            return Response(
                {'error': 'No pending approval to reject'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Send notification email to requestor
        if plugin.get_setting('SEND_EMAIL_NOTIFICATIONS'):
            send_decision_notification_email(order, approval, approved=False)

        # After rejection, remove the pending approval so it can be re-requested
        # We keep the rejection in history but allow new request
        helpers.remove_pending_approval(order)

        return Response({
            'success': True,
            'rejection_level': approval['level'],
            'can_re_request': True,
            'message': 'Approval rejected. A new approval can be requested.',
        })


class PendingApprovalsView(APIView):
    """API endpoint to list pending approvals for the current user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get list of PurchaseOrders pending user's approval."""
        if not request.user.has_perm('order.view_purchaseorder'):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN,
            )

        plugin = get_plugin()
        pending_orders = helpers.get_user_pending_approvals(request.user, plugin)

        result = []
        for order in pending_orders:
            pending = helpers.get_pending_approval(order)
            result.append({
                'order_id': order.pk,
                'order_reference': order.reference,
                'order_total': str(order.total_price) if order.total_price else None,
                'supplier': order.supplier.name if order.supplier else None,
                'approval_level': pending.get('level') if pending else None,
                'requested_by': pending.get('requested_by_name') if pending else None,
                'requested_at': pending.get('requested_at') if pending else None,
                'is_high_value': plugin.is_high_value_order(order),
                'url': f'/web/purchasing/purchase-order/{order.pk}/po-approvals-panel',
            })

        return Response({
            'count': len(result),
            'results': result,
        })


class AnyApproverPendingView(APIView):
    """API endpoint to list all pending non-high-value approvals (any approver can approve)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get list of all non-high-value PurchaseOrders with pending approvals."""
        if not request.user.has_perm('order.view_purchaseorder'):
            return Response(
                {'error': 'Permission denied'},
                status=status.HTTP_403_FORBIDDEN,
            )

        plugin = get_plugin()
        pending_orders = helpers.get_any_approver_pending_orders(plugin)

        result = []
        for order in pending_orders:
            pending = helpers.get_pending_approval(order)
            result.append({
                'order_id': order.pk,
                'order_reference': order.reference,
                'order_total': str(order.total_price) if order.total_price else None,
                'supplier': order.supplier.name if order.supplier else None,
                'approval_level': pending.get('level') if pending else None,
                'requested_by': pending.get('requested_by_name') if pending else None,
                'requested_at': pending.get('requested_at') if pending else None,
                'is_high_value': False,  # By definition, these are non-high-value
                'url': f'/web/purchasing/purchase-order/{order.pk}/po-approvals-panel',
            })

        return Response({
            'count': len(result),
            'results': result,
        })


class ApproverUsersView(APIView):
    """API endpoint to list users who can be selected as approvers."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get list of users who can be selected as approvers.
        
        Query params:
            is_high_value: If 'true', only return senior approvers for high-value orders
        """
        plugin = get_plugin()
        is_high_value = request.query_params.get('is_high_value', '').lower() == 'true'
        
        # Get senior approver IDs if this is a high-value order
        senior_approver_ids = []
        if is_high_value:
            senior_approver_ids = plugin.get_senior_approvers()
        
        # Get users who have permission to view purchase orders
        # This is a reasonable proxy for "can be an approver"
        users = User.objects.filter(
            is_active=True
        ).exclude(
            pk=request.user.pk  # Exclude current user
        ).order_by('username')
        
        # If high-value order and senior approvers are configured, filter to only them
        if is_high_value and senior_approver_ids:
            users = users.filter(pk__in=senior_approver_ids)

        result = []
        for user in users:
            if user.has_perm('order.view_purchaseorder'):
                result.append({
                    'id': user.pk,
                    'username': user.username,
                    'full_name': user.get_full_name() or user.username,
                    'email': user.email,
                })

        return Response({
            'count': len(result),
            'results': result,
        })


def send_approval_request_email(order, approval, requested_approver, request):
    """Send email notification for approval request.

    Args:
        order: The PurchaseOrder instance
        approval: The approval dict
        requested_approver: The User to notify (or None for all eligible)
        request: The HTTP request (for building URLs)

    Returns:
        True if email was sent, False otherwise
    """
    from django.conf import settings as django_settings
    from InvenTree.helpers_model import construct_absolute_url

    try:
        # Build the order URL
        order_url = construct_absolute_url(f'/web/purchasing/purchase-order/{order.pk}/po-approvals-panel')

        # Determine recipients
        if requested_approver and requested_approver.email:
            recipients = [requested_approver.email]
        else:
            # If no specific approver, we could notify all eligible users
            # For now, skip if no specific approver with email
            return False

        subject = f"[InvenTree] Approval Required: {order.reference}"

        # Build email body
        context = {
            'order': order,
            'approval': approval,
            'order_url': order_url,
            'approver_name': requested_approver.get_full_name() if requested_approver else 'Approver',
            'requester_name': approval.get('requested_by_name', 'Unknown'),
            'approval_level': approval.get('level', 1),
        }

        # Get notes from the approval
        notes = approval.get('notes', '')
        notes_section = f"\nNotes from requester:\n{notes}" if notes else ''

        # Simple text email (no template rendering for simplicity)
        body = f"""Hi {context['approver_name']},

{context['requester_name']} has requested your approval for Purchase Order {order.reference}.

Order Details:
- Reference: {order.reference}
- Supplier: {order.supplier.name if order.supplier else 'N/A'}
- Total Value: {order.total_price if order.total_price else 'N/A'}{notes_section}

View and approve: {order_url}

---
This is an automated message from InvenTree.
"""

        send_mail(
            subject=subject,
            message=body,
            from_email=django_settings.DEFAULT_FROM_EMAIL if hasattr(django_settings, 'DEFAULT_FROM_EMAIL') else None,
            recipient_list=recipients,
            fail_silently=True,
        )

        logger.info(
            'Approval request email sent',
            order=order.pk,
            recipients=recipients,
        )
        return True

    except Exception as e:
        logger.error(
            'Failed to send approval request email',
            order=order.pk,
            error=str(e),
        )
        return False


def send_teams_webhook(order, request, plugin):
    """Send a Teams webhook message for approval request.

    Uses Adaptive Card format for Power Automate workflow webhooks.

    Args:
        order: The PurchaseOrder instance
        request: The HTTP request (for building URLs)
        plugin: The plugin instance

    Returns:
        True if webhook was sent, False otherwise
    """
    import requests
    from InvenTree.helpers_model import construct_absolute_url

    try:
        webhook_url = plugin.get_setting('TEAMS_WEBHOOK_URL', '')
        if not webhook_url:
            logger.warning('Teams webhook URL not configured')
            return False

        # Build the order URL
        order_url = construct_absolute_url(f'/web/purchasing/purchase-order/{order.pk}/po-approvals-panel')
        
        # Get supplier name
        supplier_name = order.supplier.name if order.supplier else 'Unknown Supplier'
        
        # Get order total
        order_total = str(order.total_price) if order.total_price else 'N/A'

        # Power Automate Workflow webhook payload using Adaptive Card format
        payload = {
            "type": "message",
            "attachments": [
                {
                    "contentType": "application/vnd.microsoft.card.adaptive",
                    "contentUrl": None,
                    "content": {
                        "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                        "type": "AdaptiveCard",
                        "version": "1.4",
                        "body": [
                            {
                                "type": "TextBlock",
                                "text": "PO Approval Request",
                                "weight": "Bolder",
                                "size": "Medium"
                            },
                            {
                                "type": "FactSet",
                                "facts": [
                                    {
                                        "title": "Order:",
                                        "value": order.reference
                                    },
                                    {
                                        "title": "Supplier:",
                                        "value": supplier_name
                                    },
                                    {
                                        "title": "Total:",
                                        "value": order_total
                                    }
                                ]
                            }
                        ],
                        "actions": [
                            {
                                "type": "Action.OpenUrl",
                                "title": "View Order",
                                "url": order_url
                            }
                        ]
                    }
                }
            ]
        }

        # Send the webhook
        response = requests.post(
            webhook_url,
            json=payload,
            headers={'Content-Type': 'application/json'},
            timeout=10,
        )

        # Power Automate returns 202 Accepted on success
        if response.status_code in (200, 202):
            logger.info(
                'Teams webhook sent successfully',
                order=order.pk,
            )
            return True
        else:
            logger.error(
                'Teams webhook failed',
                order=order.pk,
                status_code=response.status_code,
                response=response.text,
            )
            return False

    except Exception as e:
        logger.error(
            'Failed to send Teams webhook',
            order=order.pk,
            error=str(e),
        )
        return False


def send_decision_notification_email(order, approval, approved=True):
    """Send email notification to requestor when approval is approved/rejected.

    Args:
        order: The PurchaseOrder instance
        approval: The approval dict
        approved: True if approved, False if rejected

    Returns:
        True if email was sent, False otherwise
    """
    from django.conf import settings as django_settings
    from InvenTree.helpers_model import construct_absolute_url

    try:
        # Get the requestor
        requestor_id = approval.get('requested_by_id')
        if not requestor_id:
            return False
        
        try:
            requestor = User.objects.get(pk=requestor_id)
        except User.DoesNotExist:
            return False
        
        if not requestor.email:
            return False

        # Build the order URL
        order_url = construct_absolute_url(f'/web/purchasing/purchase-order/{order.pk}/po-approvals-panel')

        # Build subject and body based on decision
        decision_word = 'Approved' if approved else 'Rejected'
        subject = f"[InvenTree] PO {order.reference} - {decision_word}"

        approver_name = approval.get('actual_approver_name', 'Unknown')
        requestor_name = requestor.get_full_name() or requestor.username

        # Get notes from the approval (may contain both request notes and decision notes)
        notes = approval.get('notes', '')
        notes_section = f"\nNotes:\n{notes}" if notes else ''

        body = f"""Hi {requestor_name},

Your approval request for Purchase Order {order.reference} has been {decision_word.lower()}.

Order Details:
- Reference: {order.reference}
- Supplier: {order.supplier.name if order.supplier else 'N/A'}
- Total Value: {order.total_price if order.total_price else 'N/A'}
- Decision: {decision_word}
- Decided by: {approver_name}{notes_section}

View order: {order_url}

---
This is an automated message from InvenTree.
"""

        send_mail(
            subject=subject,
            message=body,
            from_email=django_settings.DEFAULT_FROM_EMAIL if hasattr(django_settings, 'DEFAULT_FROM_EMAIL') else None,
            recipient_list=[requestor.email],
            fail_silently=True,
        )

        logger.info(
            'Decision notification email sent',
            order=order.pk,
            recipient=requestor.email,
            approved=approved,
        )
        return True

    except Exception as e:
        logger.error(
            'Failed to send decision notification email',
            order=order.pk,
            error=str(e),
        )
        return False
