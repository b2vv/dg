import { handleComputeOrgRowTreeLayout } from '../layout/rowTreeLayout.js';
import type { DiagramOrganization } from '../data/types.js';
import type { OrgLayoutOptions } from '../layout/types.js';

export interface ComputeOrgRowTreeLayoutPayload {
  organizations: DiagramOrganization[];
  expandedRootId: string;
  options?: OrgLayoutOptions;
}

/** Registry keys for transform.worker.ts */
export const computeHandlerKeys = {
  computeOrgRowTreeLayout: 'computeOrgRowTreeLayout',
} as const;

export async function dispatchComputeHandler(
  mapperKey: string,
  payload: unknown,
): Promise<unknown> {
  switch (mapperKey) {
    case computeHandlerKeys.computeOrgRowTreeLayout:
      return handleComputeOrgRowTreeLayout(payload as ComputeOrgRowTreeLayoutPayload);
    default:
      throw new Error(`Unknown compute handler: ${mapperKey}`);
  }
}
