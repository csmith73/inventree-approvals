/**
 * InvenTree Approvals Plugin - Frontend Entry Point
 *
 * This file exports the render function that InvenTree's plugin system
 * uses to render the approvals panel.
 */

import { createElement } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ApprovalsPanel } from './ApprovalsPanel';
import type { PluginPanelProps } from './types';

// Store root instances for cleanup
const roots = new WeakMap<HTMLElement, Root>();

/**
 * Render the approvals panel into the target element.
 *
 * This function is called by the InvenTree UI plugin system.
 *
 * @param target - The HTMLElement to render the panel into
 * @param props - Plugin context passed from InvenTree
 */
export function renderPanel(target: HTMLElement, props: PluginPanelProps) {
  // Clean up existing root if any
  const existingRoot = roots.get(target);
  if (existingRoot) {
    existingRoot.unmount();
  }

  // Create new React root and render
  const root = createRoot(target);
  roots.set(target, root);

  root.render(createElement(ApprovalsPanel, props));
}

/**
 * Check if the panel should be hidden for the given context.
 *
 * @param context - The context data from InvenTree
 * @returns true if the panel should be hidden
 */
export function isPanelHidden(context: { model?: string }): boolean {
  // Only show for purchase orders
  return context.model !== 'purchaseorder';
}

// Re-export types for external use
export type { PluginPanelProps, ApprovalStatusResponse } from './types';

// Default export for module
export default { renderPanel, isPanelHidden };
