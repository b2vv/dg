import type { DiagramData } from '@org-hierarchy/sdk';

/**
 * Seat box for the ШПС scene. Taller than {@link FIGMA_SEAT} (248×44) because
 * the near-zoom React card ({@link ShpsStaffCard}) carries the full mockup body
 * — avatar, a title that wraps to three lines, name, date row and (for heads) a
 * `N [M]` footer — and the promote slot is exactly the Pixi node box.
 */
export const SHPS_SEAT = { width: 300, height: 112 } as const;

/** Staff layout tuned for {@link SHPS_SEAT} — looser gaps than the Figma wall. */
export const SHPS_STAFF_LAYOUT = {
  horizontalGap: 28,
  verticalGap: 60,
  tierGap: 64,
  margin: 24,
  nodeWidth: SHPS_SEAT.width,
  nodeHeight: SHPS_SEAT.height,
  orgCardWidth: 300,
  orgCardHeight: 64,
  refCellWidth: SHPS_SEAT.width,
  refCellHeight: SHPS_SEAT.height,
  collapseUnexpandedPositions: false,
} as const;

/**
 * Clean staff(ШПС) scene in the shape of the reference mockup
 * (`~/Downloads/mock2/ШПС картка v3.html`).
 *
 * Unlike {@link buildMockupStaffFigmaData}, this is **not** a routing stress
 * scene: every department is one contiguous admin subtree, so tree-mode layout
 * + `departmentStyle: 'card'` reproduces the mockup — Рада директорів (just the
 * Директор) on top, over «Відділ з продажів» and «Відділ розробки» side by side.
 *
 * Two organizations stack vertically: `golovnyi-ofis` (managing, `role:
 * 'leading'`) on top and `hpvnu` (current, `role: 'current'`) below; the SDK
 * draws the lead-org plink connector between their heads.
 */
function seat(
  partial: Omit<
    DiagramData['positions'][number],
    'groupIds' | 'status' | 'isTemporary' | 'width' | 'height'
  > & { status?: DiagramData['positions'][number]['status']; isTemporary?: boolean },
): DiagramData['positions'][number] {
  return {
    groupIds: [],
    status: 'filled',
    isTemporary: false,
    width: SHPS_SEAT.width,
    height: SHPS_SEAT.height,
    ...partial,
  };
}

export function buildShpsStaffData(): DiagramData {
  return {
    organizations: [
      {
        id: 'golovnyi-ofis',
        name: 'Головний офіс',
        role: 'leading',
        groupIds: [],
        collapsed: false,
      },
      {
        id: 'hpvnu',
        name: 'ХПВНУ',
        parentOrgId: 'golovnyi-ofis',
        role: 'current',
        groupIds: [],
        collapsed: false,
        testId: 'shps-current',
      },
    ],
    groups: [],
    departments: [
      // order drives the left→right / top band placement in dept-grouping;
      // in tree-mode the frames follow where the subtree lands, order is a
      // tie-break only.
      { id: 'rada', name: 'Рада директорів', organizationId: 'hpvnu', order: 0 },
      { id: 'prodazh', name: 'Відділ з продажів', organizationId: 'hpvnu', order: 1 },
      { id: 'rozrobka', name: 'Відділ розробки', organizationId: 'hpvnu', order: 2 },
    ],
    persons: [
      { id: 'per-sydorenko', fullName: 'Сидоренко В. М.' },
      { id: 'per-petrenko', fullName: 'Петренко О. В.' },
      { id: 'per-kovalenko', fullName: 'Коваленко Т. С.' },
      { id: 'per-melnyk', fullName: 'Мельник А. С.' },
      { id: 'per-bondar', fullName: 'Бондар Д. І.' },
      { id: 'per-tkach', fullName: 'Ткач М. О.' },
    ],
    positions: [
      // Tier 1 — managing org «Головний офіс»: a single leadership card, no
      // department frame (the mockup shows the xcard bare, outside any зона).
      seat({
        id: 'pos-gd',
        title: 'Генеральний директор',
        organizationId: 'golovnyi-ofis',
        personId: 'per-sydorenko',
        isHead: true,
      }),

      // Tier 2 — current org «ХПВНУ».
      // Рада директорів (1 поз.) — the Директор alone, org head, over the two
      // service departments.
      seat({
        id: 'pos-dyr',
        title: 'Директор',
        organizationId: 'hpvnu',
        departmentId: 'rada',
        personId: 'per-petrenko',
        isHead: true,
        childrenCount: 2,
        allDescendantCount: 8,
        periodStart: '2025-02-03',
        periodEnd: null,
        testId: 'shps-head',
      }),

      // Відділ з продажів (3 поз.) — vacant head over two acting deputies.
      seat({
        id: 'pos-np',
        title: 'Начальник відділу з продажів',
        organizationId: 'hpvnu',
        departmentId: 'prodazh',
        status: 'vacant',
        childrenCount: 2,
        allDescendantCount: 3,
      }),
      seat({
        id: 'pos-np-z',
        title: 'Тимчасово виконуючий обов’язки заступника начальника відділу з продажів',
        organizationId: 'hpvnu',
        departmentId: 'prodazh',
        personId: 'per-kovalenko',
        status: 'acting',
        periodStart: '2025-09-15',
        periodEnd: null,
      }),
      seat({
        id: 'pos-np-kk',
        title:
          'Тимчасово виконуючий обов’язки заступника начальника відділу з роботи з ключовими клієнтами',
        organizationId: 'hpvnu',
        departmentId: 'prodazh',
        status: 'vacant',
      }),

      // Відділ розробки (5 поз.) — head over four seats.
      seat({
        id: 'pos-nr',
        title: 'Начальник розробки',
        organizationId: 'hpvnu',
        departmentId: 'rozrobka',
        personId: 'per-melnyk',
        childrenCount: 4,
        allDescendantCount: 4,
        periodStart: '2023-01-11',
        periodEnd: null,
      }),
      seat({
        id: 'pos-dev',
        title: 'Розробник',
        organizationId: 'hpvnu',
        departmentId: 'rozrobka',
        personId: 'per-bondar',
        periodStart: '2024-06-01',
        periodEnd: null,
      }),
      seat({
        id: 'pos-dev-pz',
        title: 'Провідний спеціаліст з розробки програмного забезпечення',
        organizationId: 'hpvnu',
        departmentId: 'rozrobka',
        status: 'vacant',
      }),
      seat({
        id: 'pos-da',
        title: 'Дата аналітик',
        organizationId: 'hpvnu',
        departmentId: 'rozrobka',
        personId: 'per-tkach',
        status: 'acting',
        periodStart: '2026-03-20',
        periodEnd: null,
      }),
      seat({
        id: 'pos-test-pz',
        title: 'Провідний спеціаліст з тестування програмного забезпечення',
        organizationId: 'hpvnu',
        departmentId: 'rozrobka',
        status: 'vacant',
      }),
    ],
    reportLines: [
      // Current-org admin tree. The managing→current lead-org plink edge
      // (pos-gd → pos-dyr) is derived by the canvas layout, not authored here.
      { fromId: 'pos-dyr', toId: 'pos-np', kind: 'admin' },
      { fromId: 'pos-dyr', toId: 'pos-nr', kind: 'admin' },
      { fromId: 'pos-np', toId: 'pos-np-z', kind: 'admin' },
      { fromId: 'pos-np', toId: 'pos-np-kk', kind: 'admin' },
      { fromId: 'pos-nr', toId: 'pos-dev', kind: 'admin' },
      { fromId: 'pos-nr', toId: 'pos-dev-pz', kind: 'admin' },
      { fromId: 'pos-nr', toId: 'pos-da', kind: 'admin' },
      { fromId: 'pos-nr', toId: 'pos-test-pz', kind: 'admin' },
    ],
    orgLinks: [],
  };
}
