"""Helper functions for the PO Approvals plugin."""

from datetime import datetime
from typing import Optional

from django.contrib.auth import get_user_model

User = get_user_model()

# Metadata key used by the plugin
METADATA_KEY = 'po_approvals'


def get_approval_data(order):
    """Get the approval data from a PurchaseOrder's metadata."""
    return order.get_metadata(METADATA_KEY, {})


def set_approval_data(order, data, commit=True):
    """Set the approval data on a PurchaseOrder's metadata."""
    order.set_metadata(METADATA_KEY, data, commit=commit)


def get_approvals_list(order):
    """Get the list of approvals from a PurchaseOrder."""
    data = get_approval_data(order)
    return data.get('approvals', [])


def get_approval_count(order):
    """Get the count of approved approvals."""
    approvals = get_approvals_list(order)
    return sum(1 for a in approvals if a.get('status') == 'approved')


def get_pending_approval(order):
    """Get the current pending approval, if any."""
    approvals = get_approvals_list(order)
    for approval in approvals:
        if approval.get('status') == 'pending':
            return approval
    return None


def get_next_approval_level(order):
    """Determine the next approval level needed."""
    approved_count = get_approval_count(order)
    
    if approved_count >= 1:
        return None  # Fully approved
    
    return 1


def can_request_approval(order):
    """Check if an approval can be requested for this order."""
    from order.status_codes import PurchaseOrderStatus
    
    # Order must be in PENDING status
    if order.status != PurchaseOrderStatus.PENDING.value:
        return False, "Order must be in PENDING status to request approval"
    
    # Check if there's already a pending approval
    if get_pending_approval(order):
        return False, "There is already a pending approval request"
    
    # Check if already fully approved
    if get_approval_count(order) >= 1:
        return False, "Order is already fully approved"
    
    return True, "OK"


def can_user_approve(user, order, plugin):
    """Check if a user can approve the current pending request.
    
    Args:
        user: The user attempting to approve
        order: The PurchaseOrder instance
        plugin: The plugin instance (for settings access)
    
    Returns:
        Tuple of (can_approve: bool, reason: str)
    """
    pending = get_pending_approval(order)
    
    if not pending:
        return False, "No pending approval request"
    
    # Check 1: Cannot approve your own request
    requested_by_id = pending.get('requested_by_id')
    if requested_by_id == user.id:
        return False, "You cannot approve your own request"
    
    # Check 2: If specific approver requested, must be that user
    requested_approver_id = pending.get('requested_approver_id')
    if requested_approver_id and requested_approver_id != user.id:
        return False, "You are not the requested approver for this request"
    
    # Check 3: High-value order requires senior approver
    if plugin.is_high_value_order(order):
        senior_approvers = plugin.get_senior_approvers()
        if senior_approvers and user.id not in senior_approvers:
            return False, "Only senior approvers can approve high-value orders"
    
    return True, "OK"


def request_approval(order, requesting_user, requested_approver_id=None, notes=''):
    """Create a new approval request.
    
    Args:
        order: The PurchaseOrder instance
        requesting_user: The user requesting approval
        requested_approver_id: Optional specific approver's user ID
        notes: Optional notes for the request
    
    Returns:
        The new approval dict
    """
    data = get_approval_data(order)
    approvals = data.get('approvals', [])
    
    # Determine the next level
    approved_count = sum(1 for a in approvals if a.get('status') == 'approved')
    next_level = approved_count + 1
    
    # Get approver name if specified
    requested_approver_name = None
    if requested_approver_id:
        try:
            approver = User.objects.get(pk=requested_approver_id)
            requested_approver_name = approver.get_full_name() or approver.username
        except User.DoesNotExist:
            pass
    
    # Create the approval request
    new_approval = {
        'level': next_level,
        'status': 'pending',
        'requested_by_id': requesting_user.id,
        'requested_by_name': requesting_user.get_full_name() or requesting_user.username,
        'requested_approver_id': requested_approver_id,
        'requested_approver_name': requested_approver_name,
        'actual_approver_id': None,
        'actual_approver_name': None,
        'requested_at': datetime.now().isoformat(),
        'decided_at': None,
        'notes': notes,
    }
    
    approvals.append(new_approval)
    data['approvals'] = approvals
    
    set_approval_data(order, data)
    
    return new_approval


def record_approval(order, approving_user, approved=True, notes=''):
    """Record an approval or rejection.
    
    Args:
        order: The PurchaseOrder instance
        approving_user: The user approving/rejecting
        approved: True if approved, False if rejected
        notes: Optional notes
    
    Returns:
        The updated approval dict, or None if no pending approval
    """
    data = get_approval_data(order)
    approvals = data.get('approvals', [])
    
    # Find the pending approval
    pending_index = None
    for i, approval in enumerate(approvals):
        if approval.get('status') == 'pending':
            pending_index = i
            break
    
    if pending_index is None:
        return None
    
    # Update the approval
    approvals[pending_index]['status'] = 'approved' if approved else 'rejected'
    approvals[pending_index]['actual_approver_id'] = approving_user.id
    approvals[pending_index]['actual_approver_name'] = (
        approving_user.get_full_name() or approving_user.username
    )
    approvals[pending_index]['decided_at'] = datetime.now().isoformat()
    if notes:
        existing_notes = approvals[pending_index].get('notes', '')
        if existing_notes:
            approvals[pending_index]['notes'] = f"{existing_notes}\n{notes}"
        else:
            approvals[pending_index]['notes'] = notes
    
    data['approvals'] = approvals
    set_approval_data(order, data)
    
    return approvals[pending_index]


def remove_pending_approval(order):
    """Remove the pending approval (used when rejection allows re-request).
    
    Args:
        order: The PurchaseOrder instance
    
    Returns:
        True if a pending approval was removed, False otherwise
    """
    data = get_approval_data(order)
    approvals = data.get('approvals', [])
    
    # Find and remove pending approval
    new_approvals = [a for a in approvals if a.get('status') != 'pending']
    
    if len(new_approvals) < len(approvals):
        data['approvals'] = new_approvals
        set_approval_data(order, data)
        return True
    
    return False


def get_approval_summary(order):
    """Get a summary of the approval status.
    
    Args:
        order: The PurchaseOrder instance
    
    Returns:
        Dict with summary information
    """
    approvals = get_approvals_list(order)
    approved_count = sum(1 for a in approvals if a.get('status') == 'approved')
    pending = get_pending_approval(order)
    
    return {
        'total_required': 1,
        'approved_count': approved_count,
        'is_fully_approved': approved_count >= 1,
        'has_pending': pending is not None,
        'pending_level': pending.get('level') if pending else None,
        'pending_approver_id': pending.get('requested_approver_id') if pending else None,
        'pending_approver_name': pending.get('requested_approver_name') if pending else None,
        'can_request_more': approved_count < 1 and pending is None,
        'approvals': approvals,
    }


def get_user_pending_approvals(user, plugin):
    """Get all PurchaseOrders where this user has a pending approval request.
    
    Args:
        user: The user to check
        plugin: The plugin instance
    
    Returns:
        List of PurchaseOrder instances
    """
    from order.models import PurchaseOrder
    from order.status_codes import PurchaseOrderStatusGroups
    
    # Only check open orders for efficiency
    open_orders = PurchaseOrder.objects.filter(
        status__in=PurchaseOrderStatusGroups.OPEN
    )
    
    pending_orders = []
    
    for order in open_orders:
        pending = get_pending_approval(order)
        if pending:
            # Check if this user can approve
            can_approve, _ = can_user_approve(user, order, plugin)
            if can_approve:
                pending_orders.append(order)
    
    return pending_orders


def get_any_approver_pending_orders(plugin):
    """Get all PurchaseOrders with pending approvals that are NOT high-value.
    
    These are orders that any approver can approve (not restricted to senior approvers).
    
    Args:
        plugin: The plugin instance
    
    Returns:
        List of PurchaseOrder instances
    """
    from order.models import PurchaseOrder
    from order.status_codes import PurchaseOrderStatusGroups
    
    # Only check open orders for efficiency
    open_orders = PurchaseOrder.objects.filter(
        status__in=PurchaseOrderStatusGroups.OPEN
    )
    
    pending_orders = []
    
    for order in open_orders:
        pending = get_pending_approval(order)
        if pending:
            # Only include non-high-value orders
            if not plugin.is_high_value_order(order):
                pending_orders.append(order)
    
    return pending_orders
