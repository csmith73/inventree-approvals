/**
 * Purchase Order Approvals Page
 *
 * A custom navigation page that displays all Purchase Orders with their
 * approval status in an additional column.
 */

import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Badge,
  Center,
  Group,
  Text,
  Skeleton,
  Stack,
  Title,
  Paper,
  Anchor,
} from '@mantine/core';
import { DataTable, type DataTableSortStatus } from 'mantine-datatable';
import type { InvenTreePluginContext } from '@inventreedb/ui';

// Type definitions
interface SupplierDetail {
  pk: number;
  name: string;
  image: string | null;
}

interface ResponsibleDetail {
  pk: number;
  name: string;
}

interface ProjectCodeDetail {
  pk: number;
  code: string;
}

interface PurchaseOrderRecord {
  pk: number;
  reference: string;
  description: string;
  status: number;
  status_custom_key: number;
  supplier: number | null;
  supplier_detail: SupplierDetail | null;
  supplier_reference: string | null;
  line_items: number;
  completed_lines: number;
  total_price: string | null;
  order_currency: string | null;
  target_date: string | null;
  creation_date: string | null;
  complete_date: string | null;
  responsible_detail: ResponsibleDetail | null;
  project_code_detail: ProjectCodeDetail | null;
  approval_status: 'pending' | 'approved' | 'rejected' | 'none';
}

// Status badge configuration matching InvenTree's PurchaseOrderStatus
const PO_STATUS_CONFIG: Record<number, { label: string; color: string }> = {
  10: { label: 'Pending', color: 'blue' },
  20: { label: 'Placed', color: 'cyan' },
  25: { label: 'On Hold', color: 'orange' },
  30: { label: 'Complete', color: 'green' },
  40: { label: 'Cancelled', color: 'red' },
  50: { label: 'Lost', color: 'gray' },
  60: { label: 'Returned', color: 'yellow' },
};

// Approval status badge configuration
const APPROVAL_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  approved: { label: 'Approved', color: 'green' },
  pending: { label: 'Pending', color: 'yellow' },
  rejected: { label: 'Rejected', color: 'red' },
  none: { label: 'Not Requested', color: 'gray' },
};

/**
 * Renders a PO status badge matching InvenTree's styling
 */
function POStatusBadge({ status }: { status: number }) {
  const config = PO_STATUS_CONFIG[status] || { label: `Status ${status}`, color: 'gray' };

  return (
    <Badge color={config.color} variant="filled" size="xs">
      {config.label}
    </Badge>
  );
}

/**
 * Renders an approval status badge
 */
function ApprovalStatusBadge({ status }: { status: string }) {
  const config = APPROVAL_STATUS_CONFIG[status] || APPROVAL_STATUS_CONFIG.none;

  return (
    <Badge color={config.color} variant="filled" size="xs">
      {config.label}
    </Badge>
  );
}

/**
 * Formats a date string for display
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

/**
 * Main Purchase Orders with Approval Status page component
 */
export function PurchaseOrderApprovalsPage({
  context,
}: {
  context: InvenTreePluginContext;
}) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<PurchaseOrderRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortStatus, setSortStatus] = useState<DataTableSortStatus<PurchaseOrderRecord>>({
    columnAccessor: 'reference',
    direction: 'asc',
  });

  // Fetch data from API
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await context.api.get('/plugin/approvals/po-list/');
      setRecords(response.data.results || []);
    } catch (err: any) {
      console.error('Failed to fetch PO data:', err);
      setError(err?.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  }, [context.api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sort records
  const sortedRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const accessor = sortStatus.columnAccessor as keyof PurchaseOrderRecord;
      let aVal = a[accessor];
      let bVal = b[accessor];

      // Handle nested accessors
      if (sortStatus.columnAccessor === 'supplier_detail.name') {
        aVal = a.supplier_detail?.name || '';
        bVal = b.supplier_detail?.name || '';
      }

      // Handle nulls
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Compare
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortStatus.direction === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortStatus.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });
    return sorted;
  }, [records, sortStatus]);

  // Define table columns
  const columns = useMemo(
    () => [
      {
        accessor: 'reference',
        title: 'Reference',
        sortable: true,
        render: (record: PurchaseOrderRecord) => (
          <Anchor
            href={`/web/purchasing/purchase-order/${record.pk}/`}
            size="sm"
          >
            {record.reference}
          </Anchor>
        ),
      },
      {
        accessor: 'description',
        title: 'Description',
        sortable: true,
        render: (record: PurchaseOrderRecord) => (
          <Text size="sm" lineClamp={1}>
            {record.description || '-'}
          </Text>
        ),
      },
      {
        accessor: 'supplier_detail.name',
        title: 'Supplier',
        sortable: true,
        render: (record: PurchaseOrderRecord) =>
          record.supplier_detail ? (
            <Group gap="xs" wrap="nowrap">
              <Text size="sm">{record.supplier_detail.name}</Text>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              -
            </Text>
          ),
      },
      {
        accessor: 'supplier_reference',
        title: 'Supplier Ref',
        sortable: true,
        render: (record: PurchaseOrderRecord) => (
          <Text size="sm">{record.supplier_reference || '-'}</Text>
        ),
      },
      {
        accessor: 'line_items',
        title: 'Line Items',
        sortable: true,
        render: (record: PurchaseOrderRecord) => (
          <Text size="sm">
            {record.completed_lines}/{record.line_items}
          </Text>
        ),
      },
      {
        accessor: 'status',
        title: 'Status',
        sortable: true,
        render: (record: PurchaseOrderRecord) => (
          <Center>
            <POStatusBadge status={record.status_custom_key || record.status} />
          </Center>
        ),
      },
      {
        accessor: 'approval_status',
        title: 'Approval Status',
        sortable: true,
        render: (record: PurchaseOrderRecord) => (
          <Center>
            <ApprovalStatusBadge status={record.approval_status} />
          </Center>
        ),
      },
      {
        accessor: 'target_date',
        title: 'Target Date',
        sortable: true,
        render: (record: PurchaseOrderRecord) => (
          <Text size="sm">{formatDate(record.target_date)}</Text>
        ),
      },
      {
        accessor: 'total_price',
        title: 'Total Price',
        sortable: true,
        render: (record: PurchaseOrderRecord) => (
          <Text size="sm">
            {record.total_price
              ? `${record.total_price} ${record.order_currency || ''}`
              : '-'}
          </Text>
        ),
      },
      {
        accessor: 'responsible_detail.name',
        title: 'Responsible',
        sortable: false,
        render: (record: PurchaseOrderRecord) => (
          <Text size="sm">{record.responsible_detail?.name || '-'}</Text>
        ),
      },
    ],
    []
  );

  // Error state
  if (error) {
    return (
      <Paper p="md">
        <Stack>
          <Title order={3}>Purchase Orders with Approval Status</Title>
          <Text c="red">Error: {error}</Text>
        </Stack>
      </Paper>
    );
  }

  // Loading state
  if (loading) {
    return (
      <Paper p="md">
        <Stack>
          <Title order={3}>Purchase Orders with Approval Status</Title>
          <Skeleton height={400} />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper p="md">
      <Stack>
        <Title order={3}>Purchase Orders with Approval Status</Title>
        <DataTable
          records={sortedRecords}
          columns={columns}
          withTableBorder
          borderRadius="sm"
          striped
          highlightOnHover
          minHeight={200}
          idAccessor="pk"
          sortStatus={sortStatus}
          onSortStatusChange={setSortStatus}
          noRecordsText="No purchase orders found"
        />
      </Stack>
    </Paper>
  );
}
