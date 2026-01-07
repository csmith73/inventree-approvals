/**
 * Purchase Order Approvals Panel for InvenTree.
 *
 * This panel displays approval status and provides approval workflow controls
 * for Purchase Orders.
 */

/**
 * Main render function for the approvals panel
 */
export function renderPanel(target, data) {
    if (!target) {
        console.error("No target provided to approvals panel");
        return;
    }

    const orderId = data.context?.order_id || data.id;
    const pluginSlug = data.context?.plugin_slug || 'approvals';

    // Show loading state
    target.innerHTML = `
        <div style="padding: 16px; text-align: center;">
            <p>Loading approval status...</p>
        </div>
    `;

    // Fetch approval status
    fetchApprovalStatus(orderId, pluginSlug)
        .then(statusData => {
            renderApprovalPanel(target, statusData, orderId, pluginSlug, data);
        })
        .catch(error => {
            target.innerHTML = `
                <div style="padding: 16px; color: #d32f2f;">
                    <p>Error loading approval status: ${error.message}</p>
                </div>
            `;
        });
}

/**
 * Fetch approval status from the API
 */
async function fetchApprovalStatus(orderId, pluginSlug) {
    const response = await fetch(`/plugin/${pluginSlug}/po/${orderId}/status/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Fetch available approvers
 */
async function fetchApprovers(pluginSlug, isHighValue = false) {
    const params = new URLSearchParams();
    if (isHighValue) {
        params.append('is_high_value', 'true');
    }
    
    const queryString = params.toString();
    const url = `/plugin/${pluginSlug}/users/${queryString ? `?${queryString}` : ''}`;
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    return response.json();
}

/**
 * Request approval API call
 */
async function requestApproval(orderId, pluginSlug, approverId, notes) {
    const csrfToken = getCSRFToken();
    
    const response = await fetch(`/plugin/${pluginSlug}/po/${orderId}/request/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            approver_id: approverId || null,
            notes: notes || '',
        }),
    });

    return response.json();
}

/**
 * Approve/Reject API call
 */
async function submitApprovalDecision(orderId, pluginSlug, approved, notes) {
    const csrfToken = getCSRFToken();
    const endpoint = approved ? 'approve' : 'reject';
    
    const response = await fetch(`/plugin/${pluginSlug}/po/${orderId}/${endpoint}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            notes: notes || '',
        }),
    });

    return response.json();
}

/**
 * Get CSRF token from cookies
 */
function getCSRFToken() {
    const name = 'csrftoken';
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === `${name}=`) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Render the main approval panel content
 */
function renderApprovalPanel(target, statusData, orderId, pluginSlug, contextData) {
    const approvedCount = statusData.approved_count || 0;
    const totalRequired = statusData.total_required || 2;
    const isFullyApproved = statusData.is_fully_approved;
    const hasPending = statusData.has_pending;
    const canRequest = statusData.can_request_approval;
    const userCanApprove = statusData.user_can_approve;
    const approvals = statusData.approvals || [];
    const isHighValue = statusData.is_high_value;

    // Status badge
    let statusBadge = '';
    let statusColor = '';
    if (isFullyApproved) {
        statusBadge = '✓ Approved';
        statusColor = '#4caf50';
    } else if (hasPending) {
        statusBadge = `${approvedCount}/${totalRequired} (Pending)`;
        statusColor = '#ff9800';
    } else {
        statusBadge = `${approvedCount}/${totalRequired}`;
        statusColor = '#2196f3';
    }

    const html = `
        <div style="padding: 16px;">
            <!-- Header with status -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <h4 style="margin: 0;">Approval Status</h4>
                <span style="
                    background-color: ${statusColor};
                    color: white;
                    padding: 4px 12px;
                    border-radius: 12px;
                    font-weight: bold;
                    font-size: 14px;
                ">${statusBadge}</span>
            </div>

            ${isHighValue ? `
                <div style="
                    background-color: #fff3e0;
                    border: 1px solid #ff9800;
                    border-radius: 4px;
                    padding: 8px 12px;
                    margin-bottom: 16px;
                ">
                    <strong>⚠️ High Value Order</strong> - Requires senior approver
                </div>
            ` : ''}

            <!-- Approvals table -->
            <div style="margin-bottom: 16px;">
                <h5 style="margin-bottom: 8px;">Approval History</h5>
                ${approvals.length > 0 ? renderApprovalsTable(approvals) : `
                    <p style="color: #666; font-style: italic;">No approvals yet</p>
                `}
            </div>

            <!-- Action buttons -->
            <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                ${canRequest ? `
                    <button 
                        id="btn-request-approval"
                        style="
                            background-color: #1976d2;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        "
                    >
                        📝 Request Approval
                    </button>
                ` : ''}
                
                ${userCanApprove ? `
                    <button 
                        id="btn-approve"
                        style="
                            background-color: #4caf50;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        "
                    >
                        ✓ Approve
                    </button>
                    <button 
                        id="btn-reject"
                        style="
                            background-color: #f44336;
                            color: white;
                            border: none;
                            padding: 8px 16px;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        "
                    >
                        ✗ Reject
                    </button>
                ` : ''}

                ${isFullyApproved ? `
                    <div style="
                        background-color: #e8f5e9;
                        border: 1px solid #4caf50;
                        border-radius: 4px;
                        padding: 8px 16px;
                        color: #2e7d32;
                    ">
                        ✓ Order can now be placed
                    </div>
                ` : ''}
            </div>

            ${!canRequest && !userCanApprove && !isFullyApproved ? `
                <p style="color: #666; font-size: 13px; margin-top: 12px;">
                    ${statusData.can_request_reason || statusData.user_can_approve_reason || 'Waiting for approval action'}
                </p>
            ` : ''}
        </div>

        <!-- Request Modal -->
        <div id="request-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000;">
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 24px;
                border-radius: 8px;
                min-width: 400px;
                max-width: 90%;
            ">
                <h4 style="margin-top: 0;">Request Approval</h4>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Select Approver (optional):</label>
                    <select id="approver-select" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                        <option value="">-- Any Available Approver --</option>
                    </select>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Notes (optional):</label>
                    <textarea id="request-notes" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button id="modal-cancel" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="modal-submit" style="padding: 8px 16px; border: none; background: #1976d2; color: white; border-radius: 4px; cursor: pointer;">Submit Request</button>
                </div>
            </div>
        </div>

        <!-- Approve/Reject Modal -->
        <div id="decision-modal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000;">
            <div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: white;
                padding: 24px;
                border-radius: 8px;
                min-width: 400px;
                max-width: 90%;
            ">
                <h4 id="decision-title" style="margin-top: 0;">Approve Request</h4>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 4px; font-weight: 500;">Notes (optional):</label>
                    <textarea id="decision-notes" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; resize: vertical;"></textarea>
                </div>
                <div style="display: flex; gap: 8px; justify-content: flex-end;">
                    <button id="decision-cancel" style="padding: 8px 16px; border: 1px solid #ccc; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="decision-submit" style="padding: 8px 16px; border: none; background: #4caf50; color: white; border-radius: 4px; cursor: pointer;">Submit</button>
                </div>
            </div>
        </div>
    `;

    target.innerHTML = html;

    // Attach event handlers
    attachEventHandlers(target, orderId, pluginSlug, contextData, isHighValue);
}

/**
 * Render approvals table
 */
function renderApprovalsTable(approvals) {
    const rows = approvals.map(approval => {
        let statusBadge = '';
        let statusColor = '';
        
        switch (approval.status) {
            case 'approved':
                statusBadge = '✓ Approved';
                statusColor = '#4caf50';
                break;
            case 'rejected':
                statusBadge = '✗ Rejected';
                statusColor = '#f44336';
                break;
            case 'pending':
                statusBadge = '⏳ Pending';
                statusColor = '#ff9800';
                break;
            default:
                statusBadge = approval.status;
                statusColor = '#757575';
        }

        const requestedAt = approval.requested_at 
            ? new Date(approval.requested_at).toLocaleString() 
            : '-';
        const decidedAt = approval.decided_at 
            ? new Date(approval.decided_at).toLocaleString() 
            : '-';

        return `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">Level ${approval.level}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
                    <span style="
                        background-color: ${statusColor};
                        color: white;
                        padding: 2px 8px;
                        border-radius: 10px;
                        font-size: 12px;
                    ">${statusBadge}</span>
                </td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${approval.requested_by_name || '-'}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">
                    ${approval.status === 'pending' 
                        ? (approval.requested_approver_name || 'Any') 
                        : (approval.actual_approver_name || '-')}
                </td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; color: #666;">${requestedAt}</td>
                <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; color: #666;">
                    ${approval.status !== 'pending' ? decidedAt : '-'}
                </td>
            </tr>
        `;
    }).join('');

    return `
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
                <tr style="background-color: #f5f5f5;">
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Level</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Requested By</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Approver</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Requested</th>
                    <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e0e0e0;">Decided</th>
                </tr>
            </thead>
            <tbody>
                ${rows}
            </tbody>
        </table>
    `;
}

/**
 * Attach event handlers to buttons
 */
function attachEventHandlers(target, orderId, pluginSlug, contextData, isHighValue = false) {
    let isApproveAction = true;

    // Request Approval button
    const btnRequest = target.querySelector('#btn-request-approval');
    if (btnRequest) {
        btnRequest.addEventListener('click', async () => {
            const modal = target.querySelector('#request-modal');
            const select = target.querySelector('#approver-select');
            
            // Load approvers - filter for senior approvers if high-value order
            try {
                const data = await fetchApprovers(pluginSlug, isHighValue);
                select.innerHTML = '<option value="">-- Any Available Approver --</option>';
                
                // Add Teams Purchasing Channel option for non-high-value orders
                if (!isHighValue) {
                    select.innerHTML += '<option value="teams_channel">📢 Teams Purchasing Channel</option>';
                }
                
                data.results.forEach(user => {
                    select.innerHTML += `<option value="${user.id}">${user.full_name} (${user.username})</option>`;
                });
            } catch (e) {
                console.error('Failed to load approvers:', e);
            }
            
            modal.style.display = 'block';
        });
    }

    // Approve button
    const btnApprove = target.querySelector('#btn-approve');
    if (btnApprove) {
        btnApprove.addEventListener('click', () => {
            isApproveAction = true;
            const modal = target.querySelector('#decision-modal');
            const title = target.querySelector('#decision-title');
            const submitBtn = target.querySelector('#decision-submit');
            
            title.textContent = 'Approve Request';
            submitBtn.style.backgroundColor = '#4caf50';
            submitBtn.textContent = 'Approve';
            target.querySelector('#decision-notes').value = '';
            
            modal.style.display = 'block';
        });
    }

    // Reject button
    const btnReject = target.querySelector('#btn-reject');
    if (btnReject) {
        btnReject.addEventListener('click', () => {
            isApproveAction = false;
            const modal = target.querySelector('#decision-modal');
            const title = target.querySelector('#decision-title');
            const submitBtn = target.querySelector('#decision-submit');
            
            title.textContent = 'Reject Request';
            submitBtn.style.backgroundColor = '#f44336';
            submitBtn.textContent = 'Reject';
            target.querySelector('#decision-notes').value = '';
            
            modal.style.display = 'block';
        });
    }

    // Modal cancel buttons
    const modalCancel = target.querySelector('#modal-cancel');
    if (modalCancel) {
        modalCancel.addEventListener('click', () => {
            target.querySelector('#request-modal').style.display = 'none';
        });
    }

    const decisionCancel = target.querySelector('#decision-cancel');
    if (decisionCancel) {
        decisionCancel.addEventListener('click', () => {
            target.querySelector('#decision-modal').style.display = 'none';
        });
    }

    // Submit request
    const modalSubmit = target.querySelector('#modal-submit');
    if (modalSubmit) {
        modalSubmit.addEventListener('click', async () => {
            const approverId = target.querySelector('#approver-select').value;
            const notes = target.querySelector('#request-notes').value;
            
            modalSubmit.disabled = true;
            modalSubmit.textContent = 'Submitting...';
            
            try {
                const result = await requestApproval(orderId, pluginSlug, approverId, notes);
                if (result.success) {
                    target.querySelector('#request-modal').style.display = 'none';
                    // Refresh the panel
                    renderPanel(target, contextData);
                } else {
                    alert(result.error || 'Failed to request approval');
                }
            } catch (e) {
                alert(`Error: ${e.message}`);
            }
            
            modalSubmit.disabled = false;
            modalSubmit.textContent = 'Submit Request';
        });
    }

    // Submit decision (approve/reject)
    const decisionSubmit = target.querySelector('#decision-submit');
    if (decisionSubmit) {
        decisionSubmit.addEventListener('click', async () => {
            const notes = target.querySelector('#decision-notes').value;
            
            decisionSubmit.disabled = true;
            decisionSubmit.textContent = 'Submitting...';
            
            try {
                const result = await submitApprovalDecision(orderId, pluginSlug, isApproveAction, notes);
                if (result.success) {
                    target.querySelector('#decision-modal').style.display = 'none';
                    // Refresh the panel
                    renderPanel(target, contextData);
                } else {
                    alert(result.error || 'Failed to submit decision');
                }
            } catch (e) {
                alert(`Error: ${e.message}`);
            }
            
            decisionSubmit.disabled = false;
            decisionSubmit.textContent = isApproveAction ? 'Approve' : 'Reject';
        });
    }

    // Close modals when clicking outside
    const requestModal = target.querySelector('#request-modal');
    if (requestModal) {
        requestModal.addEventListener('click', (e) => {
            if (e.target === requestModal) {
                requestModal.style.display = 'none';
            }
        });
    }

    const decisionModal = target.querySelector('#decision-modal');
    if (decisionModal) {
        decisionModal.addEventListener('click', (e) => {
            if (e.target === decisionModal) {
                decisionModal.style.display = 'none';
            }
        });
    }
}

/**
 * Hide panel in certain conditions
 */
export function isPanelHidden(context) {
    // Only show for purchase orders
    return context.model !== 'purchaseorder';
}
