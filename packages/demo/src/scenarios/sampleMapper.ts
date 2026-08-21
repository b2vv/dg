import type { FlatDiagramRow } from '@org-hierarchy/sdk';

/** Sample rows for mapper tab — small multi-person staff under one org. */
export const SAMPLE_MAPPER_ROWS: FlatDiagramRow[] = [
  { id: 'org-root', kind: 'organization', label: 'Root Ministry' },
  { id: 'org-it', kind: 'organization', label: 'IT Directorate', parentId: 'org-root' },
  { id: 'dept-it', kind: 'department', label: 'IT', organizationId: 'org-it', parentId: 'org-it' },
  { id: 'dept-hr', kind: 'department', label: 'HR', organizationId: 'org-root', parentId: 'org-root' },
  { id: 'person-1', kind: 'person', label: 'Alice Koval' },
  { id: 'person-2', kind: 'person', label: 'Bohdan Melnyk' },
  { id: 'person-3', kind: 'person', label: 'Oksana Rudenko' },
  {
    id: 'pos-1',
    kind: 'position',
    label: 'Lead Engineer',
    organizationId: 'org-it',
    departmentId: 'dept-it',
    personId: 'person-1',
    status: 'filled',
  },
  {
    id: 'pos-2',
    kind: 'position',
    label: 'Developer',
    organizationId: 'org-it',
    departmentId: 'dept-it',
    personId: 'person-2',
    status: 'filled',
  },
  {
    id: 'pos-3',
    kind: 'position',
    label: 'HR Partner',
    organizationId: 'org-root',
    departmentId: 'dept-hr',
    personId: 'person-3',
    status: 'filled',
  },
];

export const SAMPLE_MAPPER_JSON = JSON.stringify(SAMPLE_MAPPER_ROWS, null, 2);
