import type { DiagramData } from '@org-hierarchy/sdk';

/**
 * A brigade staff — the shape the product is actually for.
 *
 * The `Staff · 1M` tab is a stress fixture: one wall, one head, a million
 * addresses. It proves the window follows the camera and it is deliberately
 * unlike anything real. This one is the opposite trade: small enough to read,
 * shaped like the thing on the box.
 *
 * Three properties it exists to carry, none of which `scaleStaff` has:
 *
 * 1. **A tree, not a star.** No position carries coordinates, so the layout is
 *    the pure tree branch of `SPEC.md` §2.2.1, built from `reportLines`. Every
 *    edge is local — a chief to their own officers — which is the case the edge
 *    router is fast at and the star is not (2.9 ms against 111 at 4 000 cards).
 * 2. **Tiers that mean something.** Tier 1 is a higher command with a handful of
 *    principals, tier 2 is this brigade's full staff, tier 3 is subordinate
 *    units as cards. That is `SPEC.md`'s own answer to «полотно вибухає»: heavy
 *    staff belongs to the focused organisation, everything under it is a card
 *    until somebody drills in.
 * 3. **Mixed echelons.** Real orders of battle are not uniform — reorganisation
 *    leaves battalions beside groups, batteries and companies under the same
 *    parent. A fixture where tier 3 is fifty copies of one shape tests nothing
 *    about how the canvas handles variety.
 *
 * Names are generic on purpose. The structure is drawn from how brigade staffs
 * are actually organised — a chief of staff who is first deputy, numbered staff
 * sections, chiefs of arms and services — not from any one army's order of
 * battle, because the product is a general org tool.
 */

const FIRST = [
  'Adrian', 'Bohdan', 'Cyril', 'Damian', 'Emil', 'Fedir', 'Gleb', 'Havryil',
  'Ihor', 'Julian', 'Kostiantyn', 'Lev', 'Maksym', 'Nazar', 'Oleh', 'Pavlo',
  'Roman', 'Serhii', 'Taras', 'Ustym', 'Vadym', 'Yaroslav', 'Zenon', 'Andrii',
] as const;

const LAST = [
  'Kravets', 'Lysenko', 'Moroz', 'Nazarenko', 'Ostapchuk', 'Panasiuk',
  'Romaniuk', 'Savchuk', 'Tkachuk', 'Verbytskyi', 'Yaremchuk', 'Zhurba',
] as const;

/** Deterministic name for seat `i` — a fixture that shuffles is a fixture that lies. */
function nameFor(i: number): string {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
}

interface Cell {
  /** Position id suffix; also the department when the cell heads one. */
  key: string;
  title: string;
  /** Who this position reports to. Absent only for the tier-2 head. */
  reportsTo?: string;
  department: string;
  status?: 'filled' | 'vacant' | 'acting';
  /** Officers under this position, in the same department. */
  reports?: readonly { key: string; title: string; status?: 'filled' | 'vacant' | 'acting' }[];
}

const HIGHER_COMMAND = 'jfc';
const BRIGADE = 'brigade';

/**
 * Tier 1 — a higher command shows its principals, not its whole staff.
 *
 * `SPEC.md` §2.2: tier 1 is «керівний склад», and the brigade commander's line
 * up to it is a cross-tier link rather than a parent inside this tree.
 */
const HIGHER: readonly Cell[] = [
  { key: 'jfc-comd', title: 'Commander', department: 'jfc-command' },
  { key: 'jfc-cos', title: 'Chief of Staff', reportsTo: 'jfc-comd', department: 'jfc-command' },
  { key: 'jfc-dcomd', title: 'Deputy Commander', reportsTo: 'jfc-comd', department: 'jfc-command' },
  { key: 'jfc-ops', title: 'Chief of Operations', reportsTo: 'jfc-cos', department: 'jfc-command' },
  { key: 'jfc-log', title: 'Chief of Logistics', reportsTo: 'jfc-cos', department: 'jfc-command' },
  { key: 'jfc-pers', title: 'Chief of Personnel', reportsTo: 'jfc-cos', department: 'jfc-command' },
];

/** Tier 2 — the command group: the five principals every other branch hangs off. */
const COMMAND_GROUP: readonly Cell[] = [
  { key: 'bde-comd', title: 'Brigade Commander', department: 'bde-command' },
  {
    key: 'bde-cos',
    title: 'Chief of Staff · First Deputy',
    reportsTo: 'bde-comd',
    department: 'bde-command',
  },
  { key: 'bde-dcomd', title: 'Deputy Commander', reportsTo: 'bde-comd', department: 'bde-command' },
  {
    key: 'bde-dpers',
    title: 'Deputy Commander · Personnel',
    reportsTo: 'bde-comd',
    department: 'bde-command',
  },
  {
    key: 'bde-dlog',
    title: 'Deputy Commander · Chief of Logistics',
    reportsTo: 'bde-comd',
    department: 'bde-command',
  },
  {
    key: 'bde-legal',
    title: 'Legal Adviser',
    reportsTo: 'bde-comd',
    department: 'bde-command',
    status: 'acting',
  },
  {
    key: 'bde-pao',
    title: 'Public Affairs Officer',
    reportsTo: 'bde-comd',
    department: 'bde-command',
  },
];

/** Numbered staff sections. Logistics answers to its deputy, the rest to the chief of staff. */
const SECTIONS: readonly Cell[] = [
  {
    key: 's1',
    title: 'Chief S1 · Personnel',
    reportsTo: 'bde-cos',
    department: 's1',
    reports: [
      { key: 's1-str', title: 'Strength Accounting Officer' },
      { key: 's1-awards', title: 'Awards and Records Officer' },
      { key: 's1-repl', title: 'Replacements Officer', status: 'vacant' },
    ],
  },
  {
    key: 's2',
    title: 'Chief S2 · Intelligence',
    reportsTo: 'bde-cos',
    department: 's2',
    reports: [
      { key: 's2-coll', title: 'Collection Manager' },
      { key: 's2-anl', title: 'All-Source Analyst' },
      { key: 's2-cint', title: 'Counter-Intelligence Officer' },
    ],
  },
  {
    key: 's3',
    title: 'Chief S3 · Operations',
    reportsTo: 'bde-cos',
    department: 's3',
    reports: [
      { key: 's3-cur', title: 'Current Operations Officer' },
      { key: 's3-fires', title: 'Fires Coordinator' },
      { key: 's3-train', title: 'Training Officer' },
      { key: 's3-batt', title: 'Battle Captain' },
    ],
  },
  {
    key: 's4',
    title: 'Chief S4 · Logistics',
    reportsTo: 'bde-dlog',
    department: 's4',
    reports: [
      { key: 's4-supply', title: 'Supply Officer' },
      { key: 's4-tpt', title: 'Transport Officer' },
      { key: 's4-maint', title: 'Maintenance Officer' },
    ],
  },
  {
    key: 's5',
    title: 'Chief S5 · Plans',
    reportsTo: 'bde-cos',
    department: 's5',
    reports: [
      { key: 's5-plans', title: 'Future Plans Officer' },
      { key: 's5-liaison', title: 'Liaison Officer' },
    ],
  },
  {
    key: 's6',
    title: 'Chief S6 · Signals',
    reportsTo: 'bde-cos',
    department: 's6',
    reports: [
      { key: 's6-net', title: 'Network Officer' },
      { key: 's6-crypto', title: 'Crypto Custodian' },
      { key: 's6-radio', title: 'Radio Officer' },
    ],
  },
];

/** Chiefs of arms and services — the branch that makes the tree wide as well as deep. */
const ARMS: readonly Cell[] = [
  {
    key: 'arm-arty',
    title: 'Chief of Artillery',
    reportsTo: 'bde-dcomd',
    department: 'arms',
    reports: [
      { key: 'arm-arty-tgt', title: 'Targeting Officer' },
      { key: 'arm-arty-svy', title: 'Survey Officer' },
    ],
  },
  {
    key: 'arm-ad',
    title: 'Chief of Air Defence',
    reportsTo: 'bde-dcomd',
    department: 'arms',
    reports: [{ key: 'arm-ad-ctl', title: 'Airspace Control Officer' }],
  },
  {
    key: 'arm-eng',
    title: 'Chief of Engineers',
    reportsTo: 'bde-dcomd',
    department: 'arms',
    reports: [
      { key: 'arm-eng-mob', title: 'Mobility Officer' },
      { key: 'arm-eng-eod', title: 'Explosive Ordnance Officer' },
    ],
  },
  {
    key: 'arm-cbrn',
    title: 'Chief of CBRN Defence',
    reportsTo: 'bde-dcomd',
    department: 'arms',
    reports: [{ key: 'arm-cbrn-rec', title: 'CBRN Reconnaissance Officer', status: 'vacant' }],
  },
  {
    key: 'arm-recce',
    title: 'Chief of Reconnaissance',
    reportsTo: 'bde-dcomd',
    department: 'arms',
    reports: [{ key: 'arm-recce-uav', title: 'UAV Officer' }],
  },
  {
    key: 'svc-arm',
    title: 'Chief of Armament',
    reportsTo: 'bde-dlog',
    department: 'services',
    reports: [
      { key: 'svc-arm-veh', title: 'Vehicle Service Officer' },
      { key: 'svc-arm-ammo', title: 'Ammunition Officer' },
    ],
  },
  {
    key: 'svc-med',
    title: 'Chief of Medical Service',
    reportsTo: 'bde-dpers',
    department: 'services',
    reports: [
      { key: 'svc-med-evac', title: 'Evacuation Officer' },
      { key: 'svc-med-prev', title: 'Preventive Medicine Officer' },
    ],
  },
  {
    key: 'svc-fin',
    title: 'Chief of Finance',
    reportsTo: 'bde-dpers',
    department: 'services',
    reports: [{ key: 'svc-fin-pay', title: 'Pay Officer' }],
  },
];

/**
 * Tier 3 — subordinate units, deliberately not one repeated shape.
 *
 * Battalions beside a group, a battery and companies is what reorganisation
 * actually leaves behind, and a canvas that only ever sees uniform children has
 * not been asked the interesting question.
 */
const SUBORDINATE_UNITS: readonly { id: string; name: string; group?: string }[] = [
  { id: 'unit-mech-1', name: '1st Mechanised Battalion', group: 'grp-manoeuvre' },
  { id: 'unit-mech-2', name: '2nd Mechanised Battalion', group: 'grp-manoeuvre' },
  { id: 'unit-mech-3', name: '3rd Mechanised Battalion', group: 'grp-manoeuvre' },
  { id: 'unit-tank', name: 'Tank Battalion', group: 'grp-manoeuvre' },
  { id: 'unit-arty', name: 'Artillery Group', group: 'grp-fires' },
  { id: 'unit-mlrs', name: 'Rocket Artillery Battery', group: 'grp-fires' },
  { id: 'unit-ad', name: 'Air Defence Battery', group: 'grp-fires' },
  { id: 'unit-recce', name: 'Reconnaissance Company' },
  { id: 'unit-eng', name: 'Engineer Company' },
  { id: 'unit-sig', name: 'Signal Company' },
  { id: 'unit-log', name: 'Logistics Battalion' },
  { id: 'unit-med', name: 'Medical Company' },
];

function flatten(cells: readonly Cell[], organizationId: string) {
  const out: Array<{
    key: string;
    title: string;
    reportsTo?: string;
    department: string;
    status: 'filled' | 'vacant' | 'acting';
    organizationId: string;
  }> = [];
  for (const cell of cells) {
    out.push({
      key: cell.key,
      title: cell.title,
      reportsTo: cell.reportsTo,
      department: cell.department,
      status: cell.status ?? 'filled',
      organizationId,
    });
    for (const r of cell.reports ?? []) {
      out.push({
        key: r.key,
        title: r.title,
        reportsTo: cell.key,
        department: cell.department,
        status: r.status ?? 'filled',
        organizationId,
      });
    }
  }
  return out;
}

export interface StaffBrigadeData {
  data: DiagramData;
  /** Positions in tier 2 — the number the measurement fixture has to match. */
  brigadeSeats: number;
  subordinateUnits: number;
}

export function buildStaffBrigadeData(): StaffBrigadeData {
  const higher = flatten(HIGHER, HIGHER_COMMAND);
  const brigade = flatten([...COMMAND_GROUP, ...SECTIONS, ...ARMS], BRIGADE);
  const all = [...higher, ...brigade];

  const persons = all
    .filter((p) => p.status !== 'vacant')
    .map((p, i) => ({ id: `person-${p.key}`, fullName: nameFor(i) }));

  const positions = all.map((p) => ({
    id: `pos-${p.key}`,
    title: p.title,
    organizationId: p.organizationId,
    departmentId: p.department,
    groupIds: [],
    // A vacant seat carries no person — the card is drawn from the title alone.
    personId: p.status === 'vacant' ? undefined : `person-${p.key}`,
    status: p.status,
    isTemporary: p.status === 'acting',
    isHead: p.key === 'bde-comd' || p.key === 'jfc-comd',
    testId: p.key === 'bde-comd' ? ('brigade-head' as const) : undefined,
  }));

  const reportLines: DiagramData['reportLines'] = all
    .filter((p) => p.reportsTo)
    .map((p) => ({ fromId: `pos-${p.reportsTo!}`, toId: `pos-${p.key}`, kind: 'admin' as const }));

  // The brigade commander answers upward. Dotted, not admin: it crosses a tier
  // boundary, so it is a link between trees rather than a parent inside one.
  reportLines.push({ fromId: 'pos-jfc-comd', toId: 'pos-bde-comd', kind: 'dotted' });

  const departments = [
    { id: 'jfc-command', name: 'Command Group', organizationId: HIGHER_COMMAND },
    { id: 'bde-command', name: 'Command Group', organizationId: BRIGADE },
    { id: 's1', name: 'S1 · Personnel', organizationId: BRIGADE },
    { id: 's2', name: 'S2 · Intelligence', organizationId: BRIGADE },
    { id: 's3', name: 'S3 · Operations', organizationId: BRIGADE },
    { id: 's4', name: 'S4 · Logistics', organizationId: BRIGADE },
    { id: 's5', name: 'S5 · Plans', organizationId: BRIGADE },
    { id: 's6', name: 'S6 · Signals', organizationId: BRIGADE },
    { id: 'arms', name: 'Arms', organizationId: BRIGADE },
    { id: 'services', name: 'Services', organizationId: BRIGADE },
  ];

  return {
    brigadeSeats: brigade.length,
    subordinateUnits: SUBORDINATE_UNITS.length,
    data: {
      organizations: [
        { id: HIGHER_COMMAND, name: 'Joint Forces Command', groupIds: [], collapsed: false },
        {
          id: BRIGADE,
          name: '12th Mechanised Brigade',
          parentOrgId: HIGHER_COMMAND,
          groupIds: [],
          collapsed: false,
        },
        ...SUBORDINATE_UNITS.map((u) => ({
          id: u.id,
          name: u.name,
          parentOrgId: BRIGADE,
          groupIds: u.group ? [u.group] : [],
          collapsed: false,
        })),
      ],
      groups: [
        { id: 'grp-manoeuvre', name: 'Manoeuvre' },
        { id: 'grp-fires', name: 'Fires' },
      ],
      departments,
      persons,
      positions,
      reportLines,
      orgLinks: [],
    },
  };
}
