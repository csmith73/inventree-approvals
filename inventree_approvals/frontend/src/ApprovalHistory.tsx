import { Badge, Table, Text, Stack } from '@mantine/core';
import type { Approval, ApprovalStatus } from './types';

interface ApprovalHistoryProps {
  approvals: Approval[];
}

/**
 * Get badge color and text for approval status
 */
function getStatusBadge(status: ApprovalStatus): { color: string; label: string } {
  switch (status) {
    case 'approved':
      return { color: 'green', label: '✓ Approved' };
    case 'rejected':
      return { color: 'red', label: '✗ Rejected' };
    case 'pending':
      return { color: 'yellow', label: '⏳ Pending' };
    default:
      return { color: 'gray', label: status };
  }
}

/**
 * Format date string for display
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

/**
 * Component to display approval history in a table
 */
export function ApprovalHistory({ approvals }: ApprovalHistoryProps) {
  if (approvals.length === 0) {
    return (
      <Text c="dimmed" fs="italic" size="sm">
        No approvals yet
      </Text>
    );
  }

  const rows = approvals.map((approval, index) => {
    const { color, label } = getStatusBadge(approval.status);
    
    return (
      <Table.Tr key={index}>
        <Table.Td>Level {approval.level}</Table.Td>
        <Table.Td>
          <Badge color={color} variant="filled" size="sm">
            {label}
          </Badge>
        </Table.Td>
        <Table.Td>{approval.requested_by_name || '-'}</Table.Td>
        <Table.Td>
          {approval.status === 'pending'
            ? approval.requested_approver_name || 'Any'
            : approval.actual_approver_name || '-'}
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {formatDate(approval.requested_at)}
          </Text>
        </Table.Td>
        <Table.Td>
          <Text size="xs" c="dimmed">
            {approval.status !== 'pending' ? formatDate(approval.decided_at) : '-'}
          </Text>
        </Table.Td>
      </Table.Tr>
    );
  });

  return (
    <Stack gap="xs">
      <Text fw={500} size="sm">Approval History</Text>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Level</Table.Th>
            <Table.Th>Status</Table.Th>
            <Table.Th>Requested By</Table.Th>
            <Table.Th>Approver</Table.Th>
            <Table.Th>Requested</Table.Th>
            <Table.Th>Decided</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Stack>
  );
}
