import { useState, useEffect } from 'react';
import {
  Modal,
  Button,
  Select,
  Textarea,
  Stack,
  Group,
  LoadingOverlay,
  Alert,
} from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import type { InvenTreePluginContext } from '@inventreedb/ui';
import type {
  ApproverUser,
  ApproverUsersResponse,
  RequestApprovalResponse,
  ApprovalDecisionResponse,
} from './types';

interface RequestModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId: number;
  pluginSlug: string;
  isHighValue: boolean;
  context: InvenTreePluginContext;
}

/**
 * Modal for requesting an approval
 */
export function RequestApprovalModal({
  opened,
  onClose,
  onSuccess,
  orderId,
  pluginSlug,
  isHighValue,
  context,
}: RequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [approvers, setApprovers] = useState<ApproverUser[]>([]);
  const [selectedApprover, setSelectedApprover] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Fetch available approvers when modal opens
  useEffect(() => {
    if (opened) {
      setError(null);
      loadApprovers();
    }
  }, [opened]);

  async function loadApprovers() {
    try {
      const params = isHighValue ? '?is_high_value=true' : '';
      const response = await context.api?.get(
        `plugin/${pluginSlug}/users/${params}`
      );
      const data = response?.data as ApproverUsersResponse;
      setApprovers(data?.results || []);
    } catch (err) {
      console.error('Failed to load approvers:', err);
      setApprovers([]);
    }
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const response = await context.api?.post(
        `plugin/${pluginSlug}/po/${orderId}/request/`,
        {
          approver_id: selectedApprover,
          notes: notes,
        }
      );
      const data = response?.data as RequestApprovalResponse;

      if (data?.success) {
        setNotes('');
        setSelectedApprover(null);
        onSuccess();
        onClose();
      } else {
        setError(data?.error || 'Failed to request approval');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  // Build select options
  // For high-value orders, only show the list of senior approvers (no "any approver" option)
  const approverOptions = [
    ...(!isHighValue ? [{ value: '', label: '-- Any Available Approver --' }] : []),
    ...(!isHighValue ? [{ value: 'teams_channel', label: '📢 Teams Purchasing Channel' }] : []),
    ...approvers.map((user) => ({
      value: String(user.id),
      label: `${user.full_name} (${user.username})`,
    })),
  ];

  return (
    <Modal opened={opened} onClose={onClose} title="Request Approval" size="md">
      <LoadingOverlay visible={loading} />
      
      <Stack gap="md">
        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Select
          label="Select Approver (optional)"
          placeholder="Select an approver"
          data={approverOptions}
          value={selectedApprover}
          onChange={setSelectedApprover}
          clearable
        />

        <Textarea
          label="Notes (optional)"
          placeholder="Add any notes for the approver"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          rows={3}
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Submit Request
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

interface DecisionModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
  orderId: number;
  pluginSlug: string;
  isApprove: boolean;
  context: InvenTreePluginContext;
}

/**
 * Modal for approving or rejecting a request
 */
export function ApprovalDecisionModal({
  opened,
  onClose,
  onSuccess,
  orderId,
  pluginSlug,
  isApprove,
  context,
}: DecisionModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (opened) {
      setError(null);
      setNotes('');
    }
  }, [opened]);

  async function handleSubmit() {
    setLoading(true);
    setError(null);

    try {
      const endpoint = isApprove ? 'approve' : 'reject';
      const response = await context.api?.post(
        `plugin/${pluginSlug}/po/${orderId}/${endpoint}/`,
        { notes }
      );
      const data = response?.data as ApprovalDecisionResponse;

      if (data?.success) {
        setNotes('');
        onSuccess();
        onClose();
      } else {
        setError(data?.error || `Failed to ${isApprove ? 'approve' : 'reject'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const title = isApprove ? 'Approve Request' : 'Reject Request';
  const buttonColor = isApprove ? 'green' : 'red';
  const buttonText = isApprove ? 'Approve' : 'Reject';

  return (
    <Modal opened={opened} onClose={onClose} title={title} size="md">
      <LoadingOverlay visible={loading} />
      
      <Stack gap="md">
        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Textarea
          label="Notes (optional)"
          placeholder={`Add any notes for ${isApprove ? 'approving' : 'rejecting'} this request`}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          rows={3}
        />

        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose}>
            Cancel
          </Button>
          <Button color={buttonColor} onClick={handleSubmit} loading={loading}>
            {buttonText}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
