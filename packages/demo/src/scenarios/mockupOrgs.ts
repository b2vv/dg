import type { DiagramData } from '@org-hierarchy/sdk';
import { brandMarkSymbol, fullBleedOrgSymbol } from './mockupSymbols.js';

export function buildMockupOrgsFigmaData(): DiagramData {
  const root = brandMarkSymbol('CL', '#7dd3fc');
  const mid = brandMarkSymbol('NW', '#5b9bd5');
  const peer = brandMarkSymbol('DV', '#93c5fd');
  return {
    organizations: [
      {
        id: 'org-root',
        name: 'Cedar Lake Group',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-root',
        filledCount: 1,
        vacantCount: 6,
        symbolUrl: root,
        symbolUrlLight: root,
        symbolUrlDark: root,
        showShortName: true,
      },
      {
        id: 'org-mid',
        name: 'Northwind Region',
        parentOrgId: 'org-root',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-mid',
        filledCount: 5,
        vacantCount: 5,
        symbolUrl: mid,
        symbolUrlLight: mid,
        symbolUrlDark: mid,
      },
      ...[
        ['org-harbor', 'Harbor Division', 4, 12],
        ['org-maple', 'Maple Division', 3, 8],
        ['org-summit', 'Summit Division', 2, 6],
        ['org-river', 'River Division', 5, 10],
        ['org-atlas', 'Atlas Division', 3, 9],
      ].map(([id, name, filled, vacant], i) => ({
        id: id as string,
        name: name as string,
        parentOrgId: 'org-mid',
        groupIds: [],
        collapsed: false,
        matrixOrder: i,
        filledCount: filled as number,
        vacantCount: vacant as number,
        symbolUrl: peer,
        symbolUrlLight: peer,
        symbolUrlDark: peer,
      })),
    ],
    // Frame 1264:8121 shows the peers inside a bare dashed frame — no group caption.
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [],
  };
}

/**
 * GoJS-style org tree — production vertical cards, tree counts, no period on card.
 */
export function buildMockupOrgsGojsData(): DiagramData {
  const logo = (mark: string) => brandMarkSymbol(mark, '#94a3b8');
  const banner = fullBleedOrgSymbol('EMEA');
  return {
    organizations: [
      {
        id: 'org-hq',
        name: 'Brightside Holdings',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-hq',
        childrenCount: 1,
        allDescendantCount: 6,
        symbolUrl: logo('BH'),
        symbolUrlLight: logo('BH'),
        symbolUrlDark: logo('BH'),
        showShortName: true,
      },
      {
        id: 'org-emea',
        name: 'EMEA Operations',
        parentOrgId: 'org-hq',
        groupIds: [],
        collapsed: false,
        childrenCount: 5,
        allDescendantCount: 5,
        symbolUrl: banner,
        symbolUrlLight: banner,
        symbolUrlDark: banner,
        unitCode: 'EU-12',
      },
      {
        id: 'org-no-symbol',
        name: 'Nordic Desk',
        fullName: 'Nordic Regional Operations Desk',
        parentOrgId: 'org-hq',
        groupIds: [],
        collapsed: false,
        testId: 'mockup-no-symbol',
        unitCode: 'NO-01',
      },
      ...[
        ['org-berlin', 'Berlin Hub', 0, 0, false, true],
        ['org-lisbon', 'Lisbon Hub', 0, 0, true, true],
        ['org-prague', 'Prague Hub', 0, 0, false, false],
        ['org-oslo', 'Oslo Hub', 0, 0, false, true],
        ['org-dublin', 'Dublin Hub', 0, 0, false, true],
      ].map(([id, name, _c, _d, temp, caption], i) => ({
        id: id as string,
        name: name as string,
        parentOrgId: 'org-emea',
        groupIds: [],
        collapsed: false,
        matrixOrder: i,
        ...(caption ? {} : { showShortName: false as const }),
        isTemporary: temp as boolean,
        symbolUrl: logo(String(name).slice(0, 1)),
        symbolUrlLight: logo(String(name).slice(0, 1)),
        symbolUrlDark: logo(String(name).slice(0, 1)),
      })),
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
    orgLinks: [],
  };
}
