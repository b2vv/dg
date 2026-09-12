import type { DiagramData, DiagramOrganization } from '../data/types.js';
import { isOrgCollapsed, orgHasChildren } from '../layout/orgMode.js';
import type { RenderOptions } from './DiagramRenderer.js';
import type { OrganizationNodeOptions } from './OrganizationNode.js';
import { defaultRenderConfig, type RenderConfig } from './types.js';

function organizationContextMenu(
  org: DiagramOrganization,
  options: RenderOptions,
): OrganizationNodeOptions['onContextMenu'] {
  if (!options.onOrgContextMenu) return undefined;
  return (pointer) => {
    options.onOrgContextMenu?.(org.id, {
      clientX: pointer.clientX,
      clientY: pointer.clientY,
      canvasX: 0,
      canvasY: 0,
    });
  };
}

export function orgTreeOptions(
  org: DiagramOrganization,
  data: DiagramData,
  options: RenderOptions,
  config: RenderConfig = defaultRenderConfig,
): OrganizationNodeOptions {
  const base: OrganizationNodeOptions = {
    loadTexture: options.loadTexture,
    prefetchInactiveSymbol: config.prefetchInactiveOrgSymbol === true,
  };
  if (
    !options.onOrgContextMenu &&
    !options.onOrgExpand &&
    !options.onOrgCollapse
  ) {
    return base;
  }
  const hasChildren = orgHasChildren(data.organizations, org.id);
  return {
    ...base,
    onContextMenu: organizationContextMenu(org, options),
    chrome:
      hasChildren && (options.onOrgExpand || options.onOrgCollapse)
        ? {
            kind: 'tree',
            collapsed: isOrgCollapsed(org),
            hasChildren,
            onExpand: () => options.onOrgExpand?.(org.id),
            onCollapse: () => options.onOrgCollapse?.(org.id),
          }
        : undefined,
  };
}

export function orgStaffCardOptions(
  org: DiagramOrganization,
  card: { expanded?: boolean; positionCount?: number },
  options: RenderOptions,
  config: RenderConfig = defaultRenderConfig,
): OrganizationNodeOptions {
  return {
    loadTexture: options.loadTexture,
    onContextMenu: organizationContextMenu(org, options),
    prefetchInactiveSymbol: config.prefetchInactiveOrgSymbol === true,
    chrome:
      options.onStaffOrgExpandToggle
        ? {
            kind: 'staff-expand',
            expanded: card.expanded ?? false,
            // Розкладка вже порахувала це тим самим фільтром, яким будує
            // розгорнутий блок (`canvasLayout.ts:137` → `layoutStaffOrgBlock`
            // по `organizationId`), тож іншого джерела правди тут не треба.
            hasStaff: (card.positionCount ?? 0) > 0,
            onToggle: () => options.onStaffOrgExpandToggle!(org.id),
          }
        : undefined,
  };
}
