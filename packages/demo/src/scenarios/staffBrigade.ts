import type { DiagramData } from '@org-hierarchy/sdk';

/**
 * A brigade staff — the shape the product is actually for.
 *
 * The `Staff · 1M` tab is a stress fixture: one wall, one head, a million
 * addresses. It proves the window follows the camera and it is deliberately
 * unlike anything real. This one is the opposite trade: small enough to read,
 * shaped like the thing on the box.
 *
 * Four properties it exists to carry, none of which `scaleStaff` has:
 *
 * 1. **A tree, not a star.** No position carries coordinates, so the layout is
 *    the pure tree branch of `SPEC.md` §2.2.1, built from `reportLines`. Every
 *    edge is local — a chief to their own officers, an officer to their own
 *    NCOs — which is the case the edge router is fast at and the star is not
 *    (2.9 ms against 111 at 4 000 cards).
 * 2. **Tiers that mean something.** Tier 1 is a higher command with its
 *    principals, tier 2 is this brigade's full staff, tier 3 is subordinate
 *    units as cards. That is `SPEC.md`'s own answer to «полотно вибухає»: heavy
 *    staff belongs to the focused organisation, everything under it is a card
 *    until somebody drills in.
 * 3. **Mixed echelons.** Real orders of battle are not uniform — reorganisation
 *    leaves battalions beside groups, batteries, companies and a platoon under
 *    one parent, plus a task force that exists for one season. A fixture where
 *    tier 3 is fifty copies of one shape tests nothing about variety.
 * 4. **The fields a host actually sends.** Ranks in titles, unit codes,
 *    manning badges, validity periods, acting appointments and vacancies. An
 *    org chart that is only boxes and lines exercises about half of what the
 *    card templates draw.
 *
 * Names are generic on purpose. The structure is drawn from how brigade staffs
 * are organised — a chief of staff who is first deputy, numbered staff
 * sections, chiefs of arms and services, an NCO beside each — not from any one
 * army's order of battle, because the product is a general org tool.
 */

const FIRST = [
  'Adrian', 'Bohdan', 'Cyril', 'Damian', 'Emil', 'Fedir', 'Gleb', 'Havryil',
  'Ihor', 'Julian', 'Kostiantyn', 'Lev', 'Maksym', 'Nazar', 'Oleh', 'Pavlo',
  'Roman', 'Serhii', 'Taras', 'Ustym', 'Vadym', 'Yaroslav', 'Zenon', 'Andrii',
  'Borys', 'Denys', 'Yevhen', 'Hryhorii', 'Illia', 'Kyrylo', 'Mykola', 'Ostap',
] as const;

const LAST = [
  'Kravets', 'Lysenko', 'Moroz', 'Nazarenko', 'Ostapchuk', 'Panasiuk',
  'Romaniuk', 'Savchuk', 'Tkachuk', 'Verbytskyi', 'Yaremchuk', 'Zhurba',
  'Bondar', 'Danyliuk', 'Hnatiuk', 'Koval', 'Marchuk', 'Petrenko',
] as const;

/** Deterministic name for seat `i` — a fixture that shuffles is a fixture that lies. */
function nameFor(i: number): string {
  return `${FIRST[i % FIRST.length]} ${LAST[(i * 7) % LAST.length]}`;
}

type Status = 'filled' | 'vacant' | 'acting';

/**
 * One seat and, by nesting, everyone under it.
 *
 * Nesting rather than a `reportsTo` string on every row: the shape of this
 * fixture *is* the tree, and a flat list with parent ids hides exactly the
 * property the file exists to guarantee.
 */
interface Seat {
  key: string;
  /** Rank first, the way a manning table reads. */
  title: string;
  status?: Status;
  /**
   * Open at first paint (T66), which only means anything because the tab turns
   * on `collapseUnexpandedPositions`. Set down to the section chiefs and no
   * further: eleven departments of officers side by side fit the screen at zoom
   * 0.15, which is a smear rather than a demo. The staff is all still there —
   * it opens on a click, which is also how the product behaves.
   */
  expanded?: boolean;
  /** Assignment window — drives the period chip (E7). */
  period?: { start: string; end?: string | null; label?: string };
  reports?: readonly Seat[];
}

interface Section {
  /** Department id and the key of the seat that heads it. */
  department: string;
  name: string;
  /** Key of the seat this section answers to. */
  reportsTo: string;
  root: Seat;
}

const HIGHER_COMMAND = 'jfc';
const BRIGADE = 'brigade';

/** Tier 1 — a higher command shows its principals, not its whole manning table. */
const HIGHER: Seat = {
  key: 'jfc-comd',
  title: 'Gen · Commander',
  expanded: true,
  reports: [
    { key: 'jfc-dcomd', title: 'Lt Gen · Deputy Commander' },
    { key: 'jfc-ig', title: 'Col · Inspector General' },
    {
      key: 'jfc-cos',
      title: 'Maj Gen · Chief of Staff',
      reports: [
        { key: 'jfc-ops', title: 'Col · Chief of Operations' },
        { key: 'jfc-int', title: 'Col · Chief of Intelligence' },
        { key: 'jfc-log', title: 'Col · Chief of Logistics' },
        { key: 'jfc-pers', title: 'Col · Chief of Personnel' },
      ],
    },
  ],
};

/** Tier 2 command group — the principals every other branch hangs off. */
const COMMAND_GROUP: Seat = {
  key: 'bde-comd',
  title: 'Col · Brigade Commander',
  expanded: true,
  reports: [
    { key: 'bde-cos', title: 'Lt Col · Chief of Staff · First Deputy', expanded: true },
    { key: 'bde-dcomd', title: 'Lt Col · Deputy Commander', expanded: true },
    { key: 'bde-dpers', title: 'Lt Col · Deputy Commander · Personnel', expanded: true },
    { key: 'bde-dlog', title: 'Lt Col · Deputy Commander · Logistics', expanded: true },
    {
      key: 'bde-legal',
      title: 'Maj · Legal Adviser',
      status: 'acting',
      period: { start: '2026-03-01', end: null, label: 'acting since 03.2026' },
    },
    { key: 'bde-pao', title: 'Maj · Public Affairs Officer' },
    { key: 'bde-csm', title: 'WO · Command Sergeant Major' },
  ],
};

const SECTIONS: readonly Section[] = [
  {
    department: 's1',
    name: 'S1 · Personnel',
    reportsTo: 'bde-cos',
    root: {
      key: 's1',
      title: 'Maj · Chief S1',
      reports: [
        { key: 's1-str', title: 'Capt · Strength Accounting Officer' },
        { key: 's1-awards', title: 'Capt · Awards and Records Officer' },
        { key: 's1-repl', title: 'Lt · Replacements Officer', status: 'vacant' },
        {
          key: 's1-nco',
          title: 'MSgt · Personnel NCO',
          reports: [{ key: 's1-clerk', title: 'Sgt · Personnel Clerk' }],
        },
      ],
    },
  },
  {
    department: 's2',
    name: 'S2 · Intelligence',
    reportsTo: 'bde-cos',
    root: {
      key: 's2',
      title: 'Maj · Chief S2',
      reports: [
        { key: 's2-coll', title: 'Capt · Collection Manager' },
        { key: 's2-anl', title: 'Capt · All-Source Analyst' },
        { key: 's2-cint', title: 'Lt · Counter-Intelligence Officer' },
        {
          key: 's2-nco',
          title: 'MSgt · Imagery NCO',
          reports: [{ key: 's2-clerk', title: 'Sgt · Intelligence Clerk' }],
        },
      ],
    },
  },
  {
    department: 's3',
    name: 'S3 · Operations',
    reportsTo: 'bde-cos',
    root: {
      key: 's3',
      title: 'Lt Col · Chief S3',
      reports: [
        {
          key: 's3-cur',
          title: 'Maj · Current Operations Officer',
          reports: [{ key: 's3-batt', title: 'Capt · Battle Captain' }],
        },
        { key: 's3-fires', title: 'Maj · Fires Coordinator' },
        { key: 's3-train', title: 'Capt · Training Officer' },
        {
          key: 's3-nco',
          title: 'MSgt · Operations NCO',
          reports: [{ key: 's3-clerk', title: 'Sgt · Operations Clerk' }],
        },
      ],
    },
  },
  {
    department: 's4',
    name: 'S4 · Logistics',
    reportsTo: 'bde-dlog',
    root: {
      key: 's4',
      title: 'Maj · Chief S4',
      reports: [
        { key: 's4-supply', title: 'Capt · Supply Officer' },
        { key: 's4-tpt', title: 'Capt · Transport Officer' },
        { key: 's4-maint', title: 'Capt · Maintenance Officer' },
        {
          key: 's4-nco',
          title: 'MSgt · Supply NCO',
          reports: [{ key: 's4-clerk', title: 'Sgt · Supply Clerk' }],
        },
      ],
    },
  },
  {
    department: 's5',
    name: 'S5 · Plans',
    reportsTo: 'bde-cos',
    root: {
      key: 's5',
      title: 'Maj · Chief S5',
      reports: [
        { key: 's5-plans', title: 'Capt · Future Plans Officer' },
        { key: 's5-liaison', title: 'Capt · Liaison Officer' },
        { key: 's5-clerk', title: 'Sgt · Plans Clerk' },
      ],
    },
  },
  {
    department: 's6',
    name: 'S6 · Signals',
    reportsTo: 'bde-cos',
    root: {
      key: 's6',
      title: 'Maj · Chief S6',
      reports: [
        { key: 's6-net', title: 'Capt · Network Officer' },
        { key: 's6-crypto', title: 'Capt · Crypto Custodian' },
        { key: 's6-radio', title: 'Lt · Radio Officer' },
        {
          key: 's6-nco',
          title: 'MSgt · Signal NCO',
          reports: [{ key: 's6-clerk', title: 'Sgt · Signal Clerk' }],
        },
      ],
    },
  },
  {
    department: 's7',
    name: 'S7 · Training',
    reportsTo: 'bde-cos',
    root: {
      key: 's7',
      title: 'Maj · Chief S7',
      reports: [
        { key: 's7-ind', title: 'Capt · Individual Training Officer' },
        { key: 's7-range', title: 'Capt · Ranges Officer' },
        { key: 's7-clerk', title: 'Sgt · Training Clerk' },
      ],
    },
  },
  {
    department: 's8',
    name: 'S8 · Resource Management',
    reportsTo: 'bde-dlog',
    root: {
      key: 's8',
      title: 'Maj · Chief S8',
      reports: [
        { key: 's8-budget', title: 'Capt · Budget Officer' },
        { key: 's8-contract', title: 'Capt · Contracts Officer' },
        { key: 's8-clerk', title: 'Sgt · Resource Clerk' },
      ],
    },
  },
  {
    department: 's9',
    name: 'S9 · Civil-Military',
    reportsTo: 'bde-cos',
    root: {
      key: 's9',
      title: 'Maj · Chief S9',
      reports: [
        { key: 's9-cimic', title: 'Capt · CIMIC Officer' },
        { key: 's9-liaison', title: 'Capt · Civil Liaison Officer', status: 'vacant' },
      ],
    },
  },
  {
    department: 'arms',
    name: 'Arms',
    reportsTo: 'bde-dcomd',
    root: {
      key: 'arms-chief',
      title: 'Lt Col · Chief of Artillery',
      reports: [
        {
          key: 'arm-arty-tgt',
          title: 'Maj · Targeting Officer',
          reports: [{ key: 'arm-arty-fdc', title: 'MSgt · Fire Direction NCO' }],
        },
        { key: 'arm-arty-svy', title: 'Capt · Survey Officer' },
        {
          key: 'arm-ad',
          title: 'Maj · Chief of Air Defence',
          reports: [{ key: 'arm-ad-ctl', title: 'Capt · Airspace Control Officer' }],
        },
        {
          key: 'arm-eng',
          title: 'Maj · Chief of Engineers',
          reports: [
            { key: 'arm-eng-mob', title: 'Capt · Mobility Officer' },
            { key: 'arm-eng-eod', title: 'Capt · Explosive Ordnance Officer' },
            { key: 'arm-eng-nco', title: 'MSgt · Engineer NCO' },
          ],
        },
        {
          key: 'arm-cbrn',
          title: 'Maj · Chief of CBRN Defence',
          reports: [
            { key: 'arm-cbrn-rec', title: 'Capt · CBRN Reconnaissance Officer', status: 'vacant' },
          ],
        },
        {
          key: 'arm-recce',
          title: 'Maj · Chief of Reconnaissance',
          reports: [
            { key: 'arm-recce-uav', title: 'Capt · UAV Officer' },
            { key: 'arm-recce-hum', title: 'Capt · HUMINT Officer' },
          ],
        },
        {
          key: 'arm-ew',
          title: 'Maj · Chief of Electronic Warfare',
          reports: [{ key: 'arm-ew-ops', title: 'Capt · EW Operations Officer' }],
        },
      ],
    },
  },
  {
    department: 'services',
    name: 'Services',
    reportsTo: 'bde-dpers',
    root: {
      key: 'svc-chief',
      title: 'Maj · Chief of Medical Service',
      reports: [
        { key: 'svc-med-evac', title: 'Capt · Evacuation Officer' },
        { key: 'svc-med-prev', title: 'Capt · Preventive Medicine Officer' },
        { key: 'svc-med-nco', title: 'MSgt · Medical NCO' },
        {
          key: 'svc-arm',
          title: 'Maj · Chief of Armament',
          reports: [
            { key: 'svc-arm-veh', title: 'Capt · Vehicle Service Officer' },
            { key: 'svc-arm-ammo', title: 'Capt · Ammunition Officer' },
            { key: 'svc-arm-nco', title: 'MSgt · Armourer' },
          ],
        },
        {
          key: 'svc-fin',
          title: 'Maj · Chief of Finance',
          reports: [{ key: 'svc-fin-pay', title: 'Capt · Pay Officer' }],
        },
        { key: 'svc-chap', title: 'Capt · Chaplain' },
        { key: 'svc-psy', title: 'Capt · Psychologist' },
        {
          key: 'svc-sec',
          title: 'Capt · Security Officer',
          status: 'acting',
          period: { start: '2026-06-15', end: '2026-12-31' },
        },
      ],
    },
  },
];

interface Unit {
  id: string;
  name: string;
  fullName: string;
  unitCode: string;
  filled: number;
  vacant: number;
  group?: string;
  temporary?: { start: string; end: string };
}

/**
 * Tier 3 — subordinate units, deliberately not one repeated shape.
 *
 * Battalions beside a group, a battery, companies and a platoon is what
 * reorganisation actually leaves behind, and the task force is the case a
 * fixture of permanent units never shows: a structure with an end date.
 */
const SUBORDINATE_UNITS: readonly Unit[] = [
  { id: 'unit-mech-1', name: '1 Mech Bn', fullName: '1st Mechanised Battalion', unitCode: 'A-1101', filled: 412, vacant: 38, group: 'grp-manoeuvre' },
  { id: 'unit-mech-2', name: '2 Mech Bn', fullName: '2nd Mechanised Battalion', unitCode: 'A-1102', filled: 398, vacant: 52, group: 'grp-manoeuvre' },
  { id: 'unit-mech-3', name: '3 Mech Bn', fullName: '3rd Mechanised Battalion', unitCode: 'A-1103', filled: 371, vacant: 79, group: 'grp-manoeuvre' },
  { id: 'unit-tank', name: 'Tank Bn', fullName: 'Tank Battalion', unitCode: 'A-1110', filled: 244, vacant: 16, group: 'grp-manoeuvre' },
  { id: 'unit-arty', name: 'Arty Gp', fullName: 'Artillery Group', unitCode: 'A-1120', filled: 336, vacant: 24, group: 'grp-fires' },
  { id: 'unit-mlrs', name: 'MLRS Bty', fullName: 'Rocket Artillery Battery', unitCode: 'A-1122', filled: 88, vacant: 12, group: 'grp-fires' },
  { id: 'unit-ad', name: 'AD Bty', fullName: 'Air Defence Battery', unitCode: 'A-1125', filled: 74, vacant: 26, group: 'grp-fires' },
  { id: 'unit-recce', name: 'Recce Coy', fullName: 'Reconnaissance Company', unitCode: 'A-1130', filled: 96, vacant: 8, group: 'grp-recce' },
  { id: 'unit-uav', name: 'UAV Coy', fullName: 'Unmanned Systems Company', unitCode: 'A-1131', filled: 61, vacant: 39, group: 'grp-recce' },
  { id: 'unit-ew', name: 'EW Coy', fullName: 'Electronic Warfare Company', unitCode: 'A-1132', filled: 48, vacant: 22, group: 'grp-recce' },
  { id: 'unit-eng', name: 'Eng Coy', fullName: 'Engineer Company', unitCode: 'A-1140', filled: 112, vacant: 18 },
  { id: 'unit-sig', name: 'Sig Coy', fullName: 'Signal Company', unitCode: 'A-1145', filled: 87, vacant: 13 },
  { id: 'unit-log', name: 'Log Bn', fullName: 'Logistics Battalion', unitCode: 'A-1150', filled: 289, vacant: 41, group: 'grp-support' },
  { id: 'unit-maint', name: 'Maint Coy', fullName: 'Maintenance Company', unitCode: 'A-1152', filled: 103, vacant: 17, group: 'grp-support' },
  { id: 'unit-med', name: 'Med Coy', fullName: 'Medical Company', unitCode: 'A-1155', filled: 78, vacant: 22, group: 'grp-support' },
  { id: 'unit-mp', name: 'MP Pl', fullName: 'Military Police Platoon', unitCode: 'A-1160', filled: 31, vacant: 4 },
  {
    id: 'unit-tf',
    name: 'TF Shield',
    fullName: 'Task Force «Shield»',
    unitCode: 'A-1199',
    filled: 156,
    vacant: 44,
    temporary: { start: '2026-05-01', end: '2026-11-30' },
  },
];

interface Flat {
  key: string;
  title: string;
  parent?: string;
  department: string;
  status: Status;
  period?: Seat['period'];
  expanded?: boolean;
  organizationId: string;
}

function walk(seat: Seat, ctx: { department: string; organizationId: string }, parent: string | undefined, out: Flat[]): void {
  out.push({
    key: seat.key,
    title: seat.title,
    parent,
    department: ctx.department,
    status: seat.status ?? 'filled',
    period: seat.period,
    expanded: seat.expanded,
    organizationId: ctx.organizationId,
  });
  for (const child of seat.reports ?? []) walk(child, ctx, seat.key, out);
}

export interface StaffBrigadeData {
  data: DiagramData;
  /** Positions in tier 2 — the number a measurement fixture has to match. */
  brigadeSeats: number;
  subordinateUnits: number;
}

export function buildStaffBrigadeData(): StaffBrigadeData {
  const higher: Flat[] = [];
  walk(HIGHER, { department: 'jfc-command', organizationId: HIGHER_COMMAND }, undefined, higher);

  const brigade: Flat[] = [];
  walk(COMMAND_GROUP, { department: 'bde-command', organizationId: BRIGADE }, undefined, brigade);
  for (const section of SECTIONS) {
    walk(section.root, { department: section.department, organizationId: BRIGADE }, section.reportsTo, brigade);
  }

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
    expanded: p.expanded,
    periodStart: p.period?.start,
    periodEnd: p.period?.end,
    periodLabel: p.period?.label,
    testId: p.key === 'bde-comd' ? ('brigade-head' as const) : undefined,
  }));

  const reportLines: DiagramData['reportLines'] = all
    .filter((p) => p.parent)
    .map((p) => ({ fromId: `pos-${p.parent!}`, toId: `pos-${p.key}`, kind: 'admin' as const }));

  // The brigade commander answers upward. Dotted, not admin: it crosses a tier
  // boundary, so it is a link between trees rather than a parent inside one.
  reportLines.push({ fromId: 'pos-jfc-comd', toId: 'pos-bde-comd', kind: 'dotted' });

  const departments = [
    { id: 'jfc-command', name: 'Command Group', organizationId: HIGHER_COMMAND },
    { id: 'bde-command', name: 'Command Group', organizationId: BRIGADE },
    ...SECTIONS.map((s) => ({ id: s.department, name: s.name, organizationId: BRIGADE })),
  ];

  return {
    brigadeSeats: brigade.length,
    subordinateUnits: SUBORDINATE_UNITS.length,
    data: {
      organizations: [
        {
          id: HIGHER_COMMAND,
          name: 'JFC',
          fullName: 'Joint Forces Command',
          unitCode: 'A-0100',
          groupIds: [],
          collapsed: false,
        },
        {
          id: BRIGADE,
          name: '12 Mech Bde',
          fullName: '12th Mechanised Brigade',
          unitCode: 'A-1100',
          parentOrgId: HIGHER_COMMAND,
          groupIds: [],
          collapsed: false,
          childrenCount: SUBORDINATE_UNITS.length,
          allDescendantCount: SUBORDINATE_UNITS.length,
        },
        ...SUBORDINATE_UNITS.map((u) => ({
          id: u.id,
          name: u.name,
          fullName: u.fullName,
          unitCode: u.unitCode,
          parentOrgId: BRIGADE,
          groupIds: u.group ? [u.group] : [],
          collapsed: false,
          filledCount: u.filled,
          vacantCount: u.vacant,
          isTemporary: u.temporary !== undefined,
          periodStart: u.temporary?.start,
          periodEnd: u.temporary?.end,
        })),
      ],
      groups: [
        { id: 'grp-manoeuvre', name: 'Manoeuvre' },
        { id: 'grp-fires', name: 'Fires' },
        { id: 'grp-recce', name: 'Recce and Strike' },
        { id: 'grp-support', name: 'Combat Service Support' },
      ],
      departments,
      persons,
      positions,
      reportLines,
      orgLinks: [],
    },
  };
}
