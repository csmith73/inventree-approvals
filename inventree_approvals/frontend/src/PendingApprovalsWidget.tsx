import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Group,
  Badge,
  Loader,
  Text,
  Anchor,
  Table,
  Center,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconCheckbox,
} from '@tabler/icons-react';
import type { InvenTreePluginContext } from '@inventreedb/ui';
import type { PendingApproval, PendingApprovalsResponse } from './types';

interface PendingApprovalsWidgetProps {
  context: InvenTreePluginContext;
}

/**
 * Dashboard widget that shows POs pending the current user's approval
 */
export function PendingApprovalsWidget({ context }: PendingApprovalsWidgetProps) {
  const pluginSlug = (context.context as { plugin_slug?: string })?.plugin_slug || 'approvals';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);

  /**
   * Fetch pending approvals from the API
   */
  const fetchPendingApprovals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await context.api?.get(`plugin/${pluginSlug}/pending/`);
      const data = response?.data as PendingApprovalsResponse;
      setPendingApprovals(data?.results || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, [pluginSlug, context.api]);

  useEffect(() => {
    fetchPendingApprovals();
  }, [fetchPendingApprovals]);

  // Loading state
  if (loading) {
    return (
      <Center p="md" h="100%">
        <Loader size="sm" />
      </Center>
    );
  }

  // Error state
  if (error) {
    return (
      <Center p="md" h="100%">
        <Stack align="center" gap="xs">
          <IconAlertTriangle size={24} color="red" />
          <Text size="sm" c="red">{error}</Text>
        </Stack>
      </Center>
    );
  }

  // Empty state
  if (pendingApprovals.length === 0) {
    return (
      <Center p="md" h="100%">
        <Stack align="center" gap="xs">
          <IconCheckbox size={32} color="gray" />
          <Text size="sm" c="dimmed">No pending approvals</Text>
        </Stack>
      </Center>
    );
  }

  // Format date for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  return (
    <Stack gap="xs" p="xs" h="100%" style={{ overflow: 'auto' }}>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Reference</Table.Th>
            <Table.Th>Supplier</Table.Th>
            <Table.Th>Total</Table.Th>
            <Table.Th>Requested By</Table.Th>
            <Table.Th>Date</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {pendingApprovals.map((approval) => (
            <Table.Tr key={approval.order_id}>
              <Table.Td>
                <Group gap="xs">
                  <Anchor
                    href={approval.url}
                    size="sm"
                    fw={500}
                  >
                    {approval.order_reference}
                  </Anchor>
                  {approval.is_high_value && (
                    <Badge size="xs" color="orange" variant="light">
                      High Value
                    </Badge>
                  )}
                </Group>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{approval.supplier || '-'}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{approval.order_total || '-'}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm">{approval.requested_by || '-'}</Text>
              </Table.Td>
              <Table.Td>
                <Text size="sm" c="dimmed">
                  {formatDate(approval.requested_at)}
                </Text>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Stack>
  );
}
