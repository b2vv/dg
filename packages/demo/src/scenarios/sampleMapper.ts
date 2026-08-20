import type { FlatDiagramRow } from '@org-hierarchy/sdk';

/** Sample rows for mapper tab demo */
export const SAMPLE_MAPPER_ROWS: FlatDiagramRow[] = [
  { id: 'org-root', kind: 'organization', label: 'Root Ministry' },
  { id: 'dept-it', kind: 'department', label: 'IT', organizationId: 'org-root', parentId: 'org-root' },
  { id: 'person-1', kind: 'person', label: 'Alice Koval' },
  {
    id: 'pos-1',
    kind: 'position',
    label: 'Lead Engineer',
    organizationId: 'org-root',
    departmentId: 'dept-it',
    personId: 'person-1',
    status: 'filled',
  },
];

export const SAMPLE_MAPPER_JSON = JSON.stringify(SAMPLE_MAPPER_ROWS, null, 2);
