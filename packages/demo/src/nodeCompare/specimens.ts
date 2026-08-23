import type {
  DiagramData,
  DiagramOrganization,
  DiagramPerson,
  DiagramPosition,
} from '@org-hierarchy/sdk';
import {
  buildMockupOrgsFigmaData,
  buildMockupOrgsGojsData,
  buildMockupStaffFigmaData,
  MOCKUP_FIGMA_STYLES,
  MOCKUP_GOJS_STYLES,
} from '../scenarios/mockupFigma.js';

type DiagramGroup = DiagramData['groups'][number];
type OrgStyle = typeof MOCKUP_FIGMA_STYLES.organization | typeof MOCKUP_GOJS_STYLES.organization;
type PersonStyle = typeof MOCKUP_FIGMA_STYLES.person | typeof MOCKUP_GOJS_STYLES.person;

export type NodeCompareKind = 'organization' | 'person';

export interface NodeCompareSpecimen {
  id: string;
  label: string;
  /** Mockup tab for diagram crop (`?e2e=1`). */
  diagramTab: string;
  /** `data-testid="node-<testId>"` on diagram anchors. */
  diagramTestId: string;
  kind: NodeCompareKind;
  theme: 'light' | 'dark';
  width: number;
  height: number;
  /** Canvas fill behind the card (matches diagram stage). */
  stageBackground: number;
}

function orgById(data: ReturnType<typeof buildMockupOrgsFigmaData>, id: string): DiagramOrganization {
  const org = data.organizations.find((o) => o.id === id);
  if (!org) throw new Error(`org ${id}`);
  return org;
}

function posById(data: ReturnType<typeof buildMockupStaffFigmaData>, id: string): DiagramPosition {
  const pos = data.positions.find((p) => p.id === id);
  if (!pos) throw new Error(`position ${id}`);
  return pos;
}

function personFor(data: ReturnType<typeof buildMockupStaffFigmaData>, pos: DiagramPosition): DiagramPerson | undefined {
  if (!pos.personId) return undefined;
  return data.persons.find((p) => p.id === pos.personId);
}

/** Catalog for diagram crop ↔ isolated render parity checks. */
export const NODE_COMPARE_SPECIMENS: NodeCompareSpecimen[] = [
  {
    id: 'org-figma-root',
    label: 'Org · Figma — Cedar Lake root (200×120)',
    diagramTab: 'mockup-orgs-figma',
    diagramTestId: 'mockup-root',
    kind: 'organization',
    theme: 'dark',
    width: MOCKUP_FIGMA_STYLES.organization.width,
    height: MOCKUP_FIGMA_STYLES.organization.height,
    stageBackground: 0x0f172a,
  },
  {
    id: 'org-gojs-hq',
    label: 'Org · GoJS — Brightside HQ (220×121, vertical)',
    diagramTab: 'mockup-orgs-gojs',
    diagramTestId: 'mockup-hq',
    kind: 'organization',
    theme: 'dark',
    width: MOCKUP_GOJS_STYLES.organization.width,
    height: MOCKUP_GOJS_STYLES.organization.height,
    stageBackground: 0x222222,
  },
  {
    id: 'person-figma-head',
    label: 'Staff · Figma row — Regional director (filled)',
    diagramTab: 'mockup-staff-figma',
    diagramTestId: 'staff-head',
    kind: 'person',
    theme: 'dark',
    width: MOCKUP_FIGMA_STYLES.person.width,
    height: MOCKUP_FIGMA_STYLES.person.height,
    stageBackground: 0x0f172a,
  },
  {
    id: 'person-figma-temp',
    label: 'Staff · Figma row — First deputy (temp + period)',
    diagramTab: 'mockup-staff-figma',
    diagramTestId: 'staff-temp',
    kind: 'person',
    theme: 'dark',
    width: MOCKUP_FIGMA_STYLES.person.width,
    height: MOCKUP_FIGMA_STYLES.person.height,
    stageBackground: 0x0f172a,
  },
  {
    id: 'person-figma-vacant',
    label: 'Staff · Figma row — Operations analyst (vacant)',
    diagramTab: 'mockup-staff-figma',
    diagramTestId: 'staff-vacant',
    kind: 'person',
    theme: 'dark',
    width: MOCKUP_FIGMA_STYLES.person.width,
    height: MOCKUP_FIGMA_STYLES.person.height,
    stageBackground: 0x0f172a,
  },
  {
    id: 'person-gojs-head',
    label: 'Staff · GoJS row — Regional director (filled)',
    diagramTab: 'mockup-staff-gojs',
    diagramTestId: 'staff-head',
    kind: 'person',
    theme: 'dark',
    width: MOCKUP_GOJS_STYLES.person.width,
    height: MOCKUP_GOJS_STYLES.person.height,
    stageBackground: 0x222222,
  },
  {
    id: 'person-gojs-temp',
    label: 'Staff · GoJS row — First deputy (temp + period)',
    diagramTab: 'mockup-staff-gojs',
    diagramTestId: 'staff-temp',
    kind: 'person',
    theme: 'dark',
    width: MOCKUP_GOJS_STYLES.person.width,
    height: MOCKUP_GOJS_STYLES.person.height,
    stageBackground: 0x222222,
  },
];

export type IsolatedNodePayload =
  | {
      kind: 'organization';
      theme: 'light' | 'dark';
      org: DiagramOrganization;
      group?: DiagramGroup;
      style: OrgStyle;
    }
  | {
      kind: 'person';
      theme: 'light' | 'dark';
      person?: DiagramPerson;
      position: DiagramPosition;
      style: PersonStyle;
    };

const orgFigma = buildMockupOrgsFigmaData();
const orgGojs = buildMockupOrgsGojsData();
const staffFigma = buildMockupStaffFigmaData();

export function isolatedPayloadFor(specimenId: string): IsolatedNodePayload {
  switch (specimenId) {
    case 'org-figma-root':
      return {
        kind: 'organization',
        theme: 'dark',
        org: orgById(orgFigma, 'org-root'),
        style: MOCKUP_FIGMA_STYLES.organization,
      };
    case 'org-gojs-hq':
      return {
        kind: 'organization',
        theme: 'dark',
        org: orgById(orgGojs, 'org-hq'),
        style: MOCKUP_GOJS_STYLES.organization,
      };
    case 'person-figma-head': {
      const position = posById(staffFigma, 'pos-head');
      return {
        kind: 'person',
        theme: 'dark',
        person: personFor(staffFigma, position),
        position,
        style: MOCKUP_FIGMA_STYLES.person,
      };
    }
    case 'person-figma-temp': {
      const position = posById(staffFigma, 'pos-1z');
      return {
        kind: 'person',
        theme: 'dark',
        person: personFor(staffFigma, position),
        position,
        style: MOCKUP_FIGMA_STYLES.person,
      };
    }
    case 'person-figma-vacant': {
      const position = posById(staffFigma, 'pos-vac');
      return {
        kind: 'person',
        theme: 'dark',
        position,
        style: MOCKUP_FIGMA_STYLES.person,
      };
    }
    case 'person-gojs-head': {
      const position = posById(staffFigma, 'pos-head');
      return {
        kind: 'person',
        theme: 'dark',
        person: personFor(staffFigma, position),
        position,
        style: MOCKUP_GOJS_STYLES.person,
      };
    }
    case 'person-gojs-temp': {
      const position = posById(staffFigma, 'pos-1z');
      return {
        kind: 'person',
        theme: 'dark',
        person: personFor(staffFigma, position),
        position,
        style: MOCKUP_GOJS_STYLES.person,
      };
    }
    default:
      throw new Error(`Unknown specimen: ${specimenId}`);
  }
}
