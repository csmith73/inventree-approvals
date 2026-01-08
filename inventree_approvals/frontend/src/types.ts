/**
 * Type definitions for the Approvals Panel plugin.
 */

// Re-export the InvenTree plugin context type
export type { InvenTreePluginContext } from '@inventreedb/ui';

/**
 * Approval status enum
 */
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/**
 * Individual approval record
 */
export interface Approval {
  level: number;
  status: ApprovalStatus;
  requested_by_id: number | null;
  requested_by_name: string | null;
  requested_approver_id: number | null;
  requested_approver_name: string | null;
  actual_approver_id: number | null;
  actual_approver_name: string | null;
  requested_at: string | null;
  decided_at: string | null;
  notes: string | null;
}

/**
 * Approval status response from the API
 */
export interface ApprovalStatusResponse {
  order_id: number;
  order_reference: string;
  order_status: number;
  order_total: string | null;
  approved_count: number;
  total_required: number;
  is_fully_approved: boolean;
  has_pending: boolean;
  is_high_value: boolean;
  user_can_approve: boolean;
  user_can_approve_reason: string | null;
  can_request_approval: boolean;
  can_request_reason: string | null;
  approvals: Approval[];
}

/**
 * User that can approve
 */
export interface ApproverUser {
  id: number;
  username: string;
  full_name: string;
  email: string;
}

/**
 * Approver users response from the API
 */
export interface ApproverUsersResponse {
  count: number;
  results: ApproverUser[];
}

/**
 * Request approval response
 */
export interface RequestApprovalResponse {
  success: boolean;
  approval_level?: number;
  requested_approver?: string | null;
  email_sent?: boolean;
  teams_sent?: boolean;
  message?: string;
  error?: string;
}

/**
 * Approve/Reject response
 */
export interface ApprovalDecisionResponse {
  success: boolean;
  approval_level?: number;
  rejection_level?: number;
  approval_count?: number;
  fully_approved?: boolean;
  can_place_order?: boolean;
  can_re_request?: boolean;
  message?: string;
  error?: string;
}

/**
 * Plugin context passed from the backend (custom context)
 */
export interface ApprovalsPluginCustomContext {
  order_id: number;
  plugin_slug: string;
}
