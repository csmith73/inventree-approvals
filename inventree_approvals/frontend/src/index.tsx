/**
 * InvenTree Approvals Plugin - Frontend Entry Point
 *
 * This file exports the render functions that InvenTree's plugin system
 * uses to render the approvals panel and dashboard widget.
 *
 * Following the modern InvenTree plugin pattern:
 * - Single argument function that returns a React component
 * - InvenTree wraps the component in MantineProvider and other contexts
 */

import { checkPluginVersion, type InvenTreePluginContext } from '@inventreedb/ui';
import { ApprovalsPanel } from './ApprovalsPanel';
import { PendingApprovalsWidget } from './PendingApprovalsWidget';

/**
 * Render the approvals panel.
 *
 * This function is called by the InvenTree UI plugin system.
 * It returns a React component that InvenTree will render with proper context.
 *
 * @param context - Plugin context from InvenTree (includes api, user, theme, etc.)
 */
export function renderPanel(context: InvenTreePluginContext) {
  checkPluginVersion(context);
  return <ApprovalsPanel context={context} />;
}

/**
 * Render the pending approvals dashboard widget.
 *
 * This function is called by the InvenTree UI plugin system for dashboard items.
 * It returns a React component showing POs awaiting the user's approval.
 *
 * @param context - Plugin context from InvenTree (includes api, user, theme, etc.)
 */
export function renderDashboardWidget(context: InvenTreePluginContext) {
  checkPluginVersion(context);
  return <PendingApprovalsWidget context={context} />;
}

/**
 * Check if the panel should be hidden for the given context.
 *
 * @param context - The context data from InvenTree
 * @returns true if the panel should be hidden
 */
export function isPanelHidden(context: InvenTreePluginContext): boolean {
  // Only show for purchase orders
  return context.model !== 'purchaseorder';
}
