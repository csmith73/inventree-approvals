import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Group,
  Badge,
  Button,
  Alert,
  Loader,
  Paper,
  Text,
} from '@mantine/core';
import {
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconFileDescription,
} from '@tabler/icons-react';
import type { InvenTreePluginContext } from '@inventreedb/ui';
import { ApprovalHistory } from './ApprovalHistory';
import { RequestApprovalModal, ApprovalDecisionModal } from './ApprovalModals';
import type { ApprovalStatusResponse, ApprovalsPluginCustomContext } from './types';

interface ApprovalsPanelProps {
  context: InvenTreePluginContext;
}

/**
 * Main Approvals Panel component
 */
export function ApprovalsPanel({ context }: ApprovalsPanelProps) {
  // Get custom context data passed from the backend
  const customContext = context.context as ApprovalsPluginCustomContext;
  const orderId = customContext?.order_id || (context.id as number);
  const pluginSlug = customContext?.plugin_slug || 'approvals';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ApprovalStatusResponse | null>(null);

  // Modal states
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);

  /**
   * Fetch approval status from the API using context.api
   */
  const fetchStatus = useCallback(async () => {
    if (!orderId) {
      setError('No order ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Use context.api for authenticated API calls
      const response = await context.api?.get(`plugin/${pluginSlug}/po/${orderId}/status/`);
      setStatus(response?.data as ApprovalStatusResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load approval status');
    } finally {
      setLoading(false);
    }
  }, [orderId, pluginSlug, context.api]);

  // Fetch status on mount and when orderId changes
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  /**
   * Handle successful approval action
   */
  const handleSuccess = useCallback(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Loading state
  if (loading && !status) {
    return (
      <Stack align="center" p="md">
        <Loader size="md" />
        <Text size="sm" c="dimmed">Loading approval status...</Text>
      </Stack>
    );
  }

  // Error state
  if (error && !status) {
    return (
      <Alert color="red" title="Error" icon={<IconAlertTriangle size={16} />}>
        {error}
      </Alert>
    );
  }

  if (!status) {
    return (
      <Alert color="yellow" title="No Data">
        Unable to load approval status
      </Alert>
    );
  }

  // Determine status badge color and text
  let statusColor: string;
  let statusText: string;
  
  if (status.is_fully_approved) {
    statusColor = 'green';
    statusText = '✓ Approved';
  } else if (status.has_pending) {
    statusColor = 'yellow';
    statusText = `${status.approved_count}/${status.total_required} (Pending)`;
  } else {
    statusColor = 'blue';
    statusText = `${status.approved_count}/${status.total_required}`;
  }

  return (
    <Stack gap="md" p="md">
      {/* Header with status badge */}
      <Group justify="space-between" align="center">
        <Text fw={600} size="lg">Approval Status</Text>
        <Badge color={statusColor} variant="filled" size="lg">
          {statusText}
        </Badge>
      </Group>

      {/* High value warning */}
      {status.is_high_value && (
        <Alert 
          color="orange" 
          icon={<IconAlertTriangle size={16} />}
          title="High Value Order"
        >
          This order requires approval from a senior approver
        </Alert>
      )}

      {/* Approval history */}
      <ApprovalHistory approvals={status.approvals} />

      {/* Action buttons */}
      <Group gap="sm">
        {status.can_request_approval && (
          <Button
            leftSection={<IconFileDescription size={16} />}
            onClick={() => setRequestModalOpen(true)}
          >
            Request Approval
          </Button>
        )}

        {status.user_can_approve && (
          <>
            <Button
              color="green"
              leftSection={<IconCheck size={16} />}
              onClick={() => setApproveModalOpen(true)}
            >
              Approve
            </Button>
            <Button
              color="red"
              leftSection={<IconX size={16} />}
              onClick={() => setRejectModalOpen(true)}
            >
              Reject
            </Button>
          </>
        )}

        {status.is_fully_approved && (
          <Paper withBorder p="sm" bg="green.0">
            <Group gap="xs">
              <IconCheck size={16} color="green" />
              <Text size="sm" c="green.8" fw={500}>
                Order can now be placed
              </Text>
            </Group>
          </Paper>
        )}
      </Group>

      {/* Status reason if no actions available */}
      {!status.can_request_approval && !status.user_can_approve && !status.is_fully_approved && (
        <Text size="sm" c="dimmed">
          {status.can_request_reason || status.user_can_approve_reason || 'Waiting for approval action'}
        </Text>
      )}

      {/* Modals */}
      <RequestApprovalModal
        opened={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={handleSuccess}
        orderId={orderId}
        pluginSlug={pluginSlug}
        isHighValue={status.is_high_value}
        context={context}
      />

      <ApprovalDecisionModal
        opened={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        onSuccess={handleSuccess}
        orderId={orderId}
        pluginSlug={pluginSlug}
        isApprove={true}
        context={context}
      />

      <ApprovalDecisionModal
        opened={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        onSuccess={handleSuccess}
        orderId={orderId}
        pluginSlug={pluginSlug}
        isApprove={false}
        context={context}
      />
    </Stack>
  );
}
