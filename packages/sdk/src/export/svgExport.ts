import type { DiagramData } from '../data/types.js';
import { computeOrgLayout } from '../layout/rowTreeLayout.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
import {
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  type StaffLayoutOptions,
} from '../layout/staff/types.js';
import type { RenderConfig, PersonNodeStyle } from '../render/types.js';
import {
  defaultNodeTheme,
  defaultRenderConfig,
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
} from '../render/types.js';
import { buildStaffEdgeSegments } from '../layout/staffEdgeGeometry.js';
import { mapStaffEdgeBoxesForLod, mapPositionNodesToStaffEdgeBoxes } from '../render/visualEdgeBox.js';
import { paintMagneticGroups } from '../render/contour/paintMagneticGroups.js';
import type { ContourMemberBox } from '../render/contour/contourClearance.js';
import { resolveMagnetRadius } from '../contour/magnetRadius.js';
import { inferStaffCurrentOrgId } from '../render/inferStaffCurrentOrgId.js';
import { arrowHeadTriangle, shortenPolylineForArrow } from '../render/staffEdgeArrows.js';
import { enrichStaffTierBands } from '../render/staffZoneBounds.js';
import { contourButtonGroupMargin } from '../render/contour/contourButtonGroup.js';
import { contourSceneInputs, matrixNodeBoxes } from '../render/contour/contourInputs.js';
import { computeFloodContours } from '../render/contour/floodContourEngine.js';
import { resolveContourWorldTransform } from '../render/contour/contourWorldTransform.js';
import {
  DEFAULT_CORRIDOR_CELLS,
  corridorCellsForFlood,
} from '../render/contour/contourCorridor.js';
import type { ContourPositionInput } from '../contour/bridge.js';

/** Один ринг відділу, готовий до запису в SVG. */
interface ExportDeptRing {
  departmentId: string;
  d: string;
}

interface ExportRingsInput {
  /** Насінини контуру в cell-space + бокси карток — уже зібрані гілкою. */
  inputs: ContourPositionInput[];
  memberBoxesByDept: Map<string, ContourMemberBox[]>;
  personCounts: Map<string, number>;
  /** positionId → organizationId: `gridCell` локальний для org-блоку. */
  orgByPosition: ReadonlyMap<string, string>;
  config: RenderConfig;
  /** Геометрія карток сцени; для сітки — розміри клітини, для staff — staffMerged. */
  cards: { cardWidth: number; cardHeight: number };
  /**
   * Cell-space → world. `null` означає, що сцена не має авторських `gridCell`
   * у вигляді, придатному для flood — рівно як на канвасі поза staff-сценою.
   */
  transform: ReturnType<typeof resolveContourWorldTransform> | null;
  report: (message: string) => void;
}

/**
 * Кільця відділів для SVG — тим самим рушієм, яким малює канвас.
 *
 * Правило одне: **SVG ніколи не малює рушієм, якого не використав канвас.** Тому
 * при `cell-flood` без трансформи (сітка) або з порожнім результатом шар лишається
 * порожнім і причина йде в діагностику — підстановка button-group показала б те,
 * чого користувач на екрані не бачив.
 */
async function resolveExportContourRings(input: ExportRingsInput): Promise<ExportDeptRing[]> {
  const { config, inputs, memberBoxesByDept, personCounts, cards, transform, report } = input;
  const { orgByPosition } = input;
  const minContourMembers = config.minContourMembers ?? defaultRenderConfig.minContourMembers ?? 1;
  const toRings = (rings: { x: number; y: number }[][], departmentId: string): ExportDeptRing[] =>
    rings.map((ring) => ({
      departmentId,
      d: ring.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' '),
    }));

  // Строга рівність, як у ContourPainter: невідоме значення = дефолтний рушій,
  // а не «щось не button-group» (інакше на 'bogus' обіцяли б flood і брехали).
  if ((config.contourEngine ?? defaultRenderConfig.contourEngine) === 'cell-flood') {
    if (!transform) {
      report(
        'SVG export: cell-flood needs a cell transform this scene has none of ' +
          '(grid without staff focus) — the department layer stays empty, as it does on canvas.',
      );
      return [];
    }
    const { ringsByDept, diagnostics } = await computeFloodContours({
      inputs,
      magnet: {
        // Дослівно як ContourPainter.paint: padding і smoothing робить фарба, не flood.
        paddingCells: 0,
        corridorCells: corridorCellsForFlood(
          config.corridorCells ?? defaultRenderConfig.corridorCells ?? DEFAULT_CORRIDOR_CELLS,
        ),
        cellWidth: config.cellWidth,
        cellHeight: config.cellHeight,
        smoothIterations: 0,
        magnetRadius: resolveMagnetRadius(config.magnetRadius),
      },
      orgByPosition,
      memberBoxes: [...memberBoxesByDept.values()].flat(),
      transform,
      cards: {
        cardWidth: cards.cardWidth,
        cardHeight: cards.cardHeight,
        insetX: (config.cellWidth - cards.cardWidth) / 2,
        insetY: (config.cellHeight - cards.cardHeight) / 2,
        padding: contourButtonGroupMargin(config.paddingCells ?? 0, DEPT_STROKE_W),
      },
      personCounts,
      minContourMembers,
    });
    for (const message of diagnostics) report(message);
    return [...ringsByDept.entries()].flatMap(([deptId, rings]) => toRings(rings, deptId));
  }

  const painted = paintMagneticGroups({
    inputs,
    memberBoxesByDept,
    departmentIds: [...new Set(inputs.map((p) => p.departmentId))].sort(),
    magnetRadius: resolveMagnetRadius(config.magnetRadius),
    strokeWidth: DEPT_STROKE_W,
    paddingCells: config.paddingCells ?? 0,
    smoothIterations: config.smoothIterations ?? 0,
    personCounts,
    minContourMembers,
  });
  return painted.map((g) => ({
    departmentId: g.departmentId,
    d: g.ring.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' '),
  }));
}

/** Скільки посад у кожному відділі — і `paintMagneticGroups`, і flood фільтрують за цим. */
function countPositionsByDept(positions: DiagramData['positions']): Map<string, number> {
  const counts = new Map<string, number>();
  for (const p of positions) {
    if (!p.departmentId) continue;
    counts.set(p.departmentId, (counts.get(p.departmentId) ?? 0) + 1);
  }
  return counts;
}

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const DEPT_FILL = '#dbeafe';
const DEPT_FILL_ALPHA = defaultNodeTheme.department.fillAlpha;
const DEPT_STROKE = '#93c5fd';
const DEPT_STROKE_W = defaultNodeTheme.department.strokeWidth;
const EDGE_STROKE = '#334155';
const EDGE_W = 2.25;
const ARROW_SIZE = 7;

export interface SvgExportInput {
  data: DiagramData;
  config?: Partial<RenderConfig>;
  background?: string;
  includeLabels?: boolean;
  currentOrgId?: string;
  expandedOrgIds?: readonly string[];
  /** Must match live diagram staffLayout or contours/nodes drift. */
  staffLayout?: StaffLayoutOptions;
  /** Person seat theme for edge ports (must match live diagram `nodeTheme.person`). */
  personTheme?: Partial<PersonNodeStyle>;
  /**
   * Why the picture is not what the caller might expect — a skipped contour
   * engine, an empty department layer. Without this channel the SVG path has
   * no way to say anything: it returns a string and nothing else.
   */
  onDiagnostic?: (message: string) => void;
}

function resolveFocusedStaffOrgId(
  data: DiagramData,
  currentOrgId?: string,
): string | undefined {
  if (currentOrgId && data.organizations.some((o) => o.id === currentOrgId)) {
    return currentOrgId;
  }
  // Match canvas: infer when host omitted focus (T78-L4).
  return inferStaffCurrentOrgId(data);
}

async function paintOrgHierarchySvg(
  data: DiagramData,
  includeLabels: boolean,
): Promise<{ parts: string[]; width: number; height: number }> {
  const layout = await computeOrgLayout(data.organizations, data.orgLinks ?? []);
  const orgById = new Map(data.organizations.map((o) => [o.id, o]));
  const parts: string[] = [];
  parts.push('<g id="edges">');
  for (const e of layout.edges) {
    if (!e.path) continue;
    parts.push(
      `<path d="${esc(e.path)}" fill="none" stroke="${EDGE_STROKE}" stroke-width="${EDGE_W}" stroke-linecap="round" stroke-linejoin="round"/>`,
    );
  }
  parts.push('</g>');
  parts.push('<g id="org-cards">');
  for (const n of layout.nodes) {
    const org = orgById.get(n.orgId);
    parts.push(
      `<g data-org="${esc(n.orgId)}" transform="translate(${n.x},${n.y})">`,
      `<rect width="${n.width}" height="${n.height}" rx="8" fill="#f1f5f9" stroke="#64748b"/>`,
    );
    if (includeLabels) {
      parts.push(
        `<text x="12" y="28" font-size="13" fill="#0f172a">${esc(org?.name ?? n.orgId)}</text>`,
      );
    }
    parts.push('</g>');
  }
  parts.push('</g>');
  return {
    parts,
    width: Math.max(1, Math.ceil(layout.width) || 800),
    height: Math.max(1, Math.ceil(layout.height) || 600),
  };
}

export async function buildDiagramSvg(input: SvgExportInput): Promise<string> {
  const config = { ...defaultRenderConfig, ...input.config };
  const report = (message: string) => input.onDiagnostic?.(message);
  const bg = input.background ?? '#f8fafc';
  const includeLabels = input.includeLabels !== false;
  const data = input.data;

  const parts: string[] = [];
  let width = 800;
  let height = 600;

  const focusedStaffOrgId = resolveFocusedStaffOrgId(data, input.currentOrgId);
  const orgOnly = data.organizations.length > 0 && data.positions.length === 0;
  // Only force org-hierarchy when there are no seats; with seats, canvas infers staff focus.
  if (orgOnly && data.organizations.length > 0) {
    const painted = await paintOrgHierarchySvg(data, includeLabels);
    width = Math.max(width, painted.width);
    height = Math.max(height, painted.height);
    parts.push(...painted.parts);
  } else if (
    focusedStaffOrgId &&
    data.organizations.some((o) => o.id === focusedStaffOrgId) &&
    data.positions.length > 0
  ) {
    const orgId = focusedStaffOrgId;
    const staffOpts: StaffLayoutOptions = {
      refCellWidth: config.cellWidth,
      refCellHeight: config.cellHeight,
      ...input.staffLayout,
      expandedOrgIds: input.expandedOrgIds ?? input.staffLayout?.expandedOrgIds,
    };
    const canvas = await layoutStaffCanvas(
      {
        organizations: data.organizations,
        positions: data.positions,
        reports: data.reportLines,
        groups: data.groups,
        departments: data.departments,
        persons: data.persons,
      },
      orgId,
      staffOpts,
    );
    width = Math.max(width, Math.ceil(canvas.width));
    height = Math.max(height, Math.ceil(canvas.height));

    const staffMerged = { ...DEFAULT_STAFF_LAYOUT_OPTIONS, ...staffOpts };
    if (config.staffZoneChrome) {
      const tiers = enrichStaffTierBands(
        canvas.tiers,
        canvas.positionNodes,
        canvas.orgCards,
        data.organizations,
        {
          margin: staffMerged.margin,
          canvasWidth: canvas.width,
          // Same rule as the canvas: the block wraps the department washes.
          contentPadding: contourButtonGroupMargin(config.paddingCells ?? 0, DEPT_STROKE_W),
        },
      );
      parts.push('<g id="zones">');
      for (const tier of tiers) {
        if (tier.kind !== 'staff-block' || tier.x === undefined || tier.width === undefined) continue;
        const fill = bg === '#0f172a' || bg.startsWith('#0') || bg.startsWith('#1') ? '#191f26' : '#f1f5f9';
        const stroke = fill === '#191f26' ? '#3d5067' : '#cbd5e1';
        const labelFill = fill === '#191f26' ? '#f1f5f9' : '#0f172a';
        parts.push(
          `<rect x="${tier.x}" y="${tier.y}" width="${tier.width}" height="${tier.height}" rx="12" fill="${fill}" fill-opacity="0.95" stroke="${stroke}" stroke-width="1"/>`,
        );
        if (includeLabels && tier.label) {
          const tx = tier.x + tier.width - 8;
          parts.push(
            `<text x="${tx}" y="${tier.y + 18}" text-anchor="end" fill="${labelFill}" font-size="14" font-family="system-ui,sans-serif">${esc(tier.label)}</text>`,
          );
        }
      }
      parts.push('</g>');
    }

    const positionById = new Map(data.positions.map((p) => [p.id, p]));
    // One builder for canvas, matrix and export — see render/contourInputs.ts.
    const { inputs: contourInputs, memberBoxesByDept } = contourSceneInputs(
      canvas.positionNodes,
      positionById,
    );

    const personCounts = countPositionsByDept(data.positions);
    // Pitch — зі staffMerged, як у рендерері: кастомні gap'и хоста інакше зсунуть кільця.
    const pitchX = staffMerged.refCellWidth + staffMerged.horizontalGap;
    const pitchY = staffMerged.refCellHeight + staffMerged.verticalGap;
    const deptRings = await resolveExportContourRings({
      inputs: contourInputs,
      memberBoxesByDept,
      personCounts,
      orgByPosition: new Map(data.positions.map((p) => [p.id, p.organizationId])),
      config,
      cards: { cardWidth: staffMerged.nodeWidth, cardHeight: staffMerged.nodeHeight },
      transform:
        contourInputs.length > 0
          ? resolveContourWorldTransform(
              canvas.positionNodes,
              positionById,
              config.cellWidth,
              config.cellHeight,
              pitchX,
              pitchY,
            )
          : null,
      report,
    });

    parts.push('<g id="departments">');
    for (const ring of deptRings) {
      parts.push(
        `<path d="${ring.d} Z" fill="${DEPT_FILL}" fill-opacity="${DEPT_FILL_ALPHA}" stroke="none" data-dept="${esc(ring.departmentId)}"/>`,
      );
    }
    parts.push('</g>');

    const personTheme: PersonNodeStyle = {
      ...defaultNodeTheme.person,
      ...input.personTheme,
    };

    const segments = buildStaffEdgeSegments(
      canvas.edges,
      mapStaffEdgeBoxesForLod(
        mapPositionNodesToStaffEdgeBoxes(canvas.positionNodes, positionById, personTheme),
        canvas.orgCards.map((c) => ({
          id: c.orgId,
          x: c.x,
          y: c.y,
          width: c.width,
          height: c.height,
        })),
        'near',
      ),
    );
    parts.push('<g id="edges">');
    for (const s of segments) {
      const withArrow = s.kind === 'admin' || s.kind === 'cross-tier';
      const drawPts = withArrow ? shortenPolylineForArrow(s.points, ARROW_SIZE) : s.points;
      const d = drawPts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
      parts.push(
        `<path d="${d}" fill="none" stroke="${EDGE_STROKE}" stroke-width="${EDGE_W}" stroke-linecap="round" stroke-linejoin="round"/>`,
      );
      if (withArrow && s.points.length >= 2) {
        const tri = arrowHeadTriangle(
          s.points[s.points.length - 2]!,
          s.points[s.points.length - 1]!,
          ARROW_SIZE,
        );
        if (tri) {
          parts.push(
            `<polygon points="${tri.map((p) => `${p.x},${p.y}`).join(' ')}" fill="${EDGE_STROKE}"/>`,
          );
        }
      }
    }
    parts.push('</g>');

    const personById = new Map(data.persons.map((p) => [p.id, p]));
    parts.push('<g id="persons">');
    for (const n of canvas.positionNodes) {
      const position = positionById.get(n.id);
      if (!position) continue;
      const person = position.personId ? personById.get(position.personId) : undefined;
      parts.push(
        `<g data-position="${esc(n.id)}" transform="translate(${n.x},${n.y})">`,
        `<rect width="${n.width}" height="${n.height}" rx="10" fill="#fff" stroke="#94a3b8"/>`,
      );
      if (includeLabels) {
        const name = person?.fullName ?? '—';
        const nameY = Math.round(n.height * 0.55);
        const titleY = Math.round(n.height * 0.72);
        parts.push(
          `<text x="8" y="${nameY}" font-size="12" fill="#0f172a">${esc(name)}</text>`,
          `<text x="8" y="${titleY}" font-size="11" fill="#64748b">${esc(position.title)}</text>`,
        );
      }
      parts.push('</g>');
    }
    parts.push('</g>');

    // Contour stroke above cards (canvas departmentStrokes parity).
    parts.push('<g id="department-strokes">');
    for (const ring of deptRings) {
      parts.push(
        `<path d="${ring.d} Z" fill="none" stroke="${DEPT_STROKE}" stroke-width="${DEPT_STROKE_W}" stroke-linejoin="round" stroke-linecap="round" data-dept="${esc(ring.departmentId)}"/>`,
      );
    }
    parts.push('</g>');

    parts.push('<g id="org-cards">');
    for (const card of canvas.orgCards) {
      parts.push(
        `<g data-org="${esc(card.orgId)}" transform="translate(${card.x},${card.y})">`,
        `<rect width="${card.width}" height="${card.height}" rx="8" fill="#f1f5f9" stroke="#64748b"/>`,
      );
      if (includeLabels) {
        parts.push(
          `<text x="12" y="28" font-size="13" fill="#0f172a">${esc(card.name)}</text>`,
          `<text x="12" y="48" font-size="11" fill="#64748b">${card.positionCount} positions</text>`,
        );
      }
      parts.push('</g>');
    }
    parts.push('</g>');
  } else if (data.positions.some((p) => p.gridCell)) {
    // T78-C3: same TS button-group as canvas (not Rust flood).
    const cardW = PERSON_CARD_WIDTH;
    const cardH = PERSON_CARD_HEIGHT;
    const insetX = (config.cellWidth - cardW) / 2;
    const insetY = (config.cellHeight - cardH) / 2;
    const { inputs, memberBoxesByDept } = contourSceneInputs(
      matrixNodeBoxes(data.positions, {
        cellWidth: config.cellWidth,
        cellHeight: config.cellHeight,
        cardWidth: cardW,
        cardHeight: cardH,
      }),
      new Map(data.positions.map((p) => [p.id, p])),
    );
    // Сітка не має cell-transform (канвас ставить його лише в staff-сцені), тож
    // `transform: null` — і резолвер сам вирішить: дефолт малює, flood лишає порожньо.
    const deptRings = await resolveExportContourRings({
      inputs,
      memberBoxesByDept,
      personCounts: countPositionsByDept(data.positions),
      orgByPosition: new Map(data.positions.map((p) => [p.id, p.organizationId])),
      config,
      cards: { cardWidth: cardW, cardHeight: cardH },
      transform: null,
      report,
    });
    parts.push('<g id="departments">');
    for (const ring of deptRings) {
      parts.push(
        `<path d="${ring.d} Z" fill="${DEPT_FILL}" fill-opacity="${DEPT_FILL_ALPHA}" stroke="${DEPT_STROKE}" stroke-width="${DEPT_STROKE_W}" stroke-linejoin="round" stroke-linecap="round" data-dept="${esc(ring.departmentId)}"/>`,
      );
    }
    parts.push('</g>');

    const personById = new Map(data.persons.map((p) => [p.id, p]));
    parts.push('<g id="persons">');
    for (const position of data.positions) {
      if (!position.gridCell) continue;
      const x = position.gridCell.col * config.cellWidth + insetX;
      const y = position.gridCell.row * config.cellHeight + insetY;
      width = Math.max(width, x + cardW + 24);
      height = Math.max(height, y + cardH + 24);
      const person = position.personId ? personById.get(position.personId) : undefined;
      parts.push(
        `<g data-position="${esc(position.id)}" transform="translate(${x},${y})">`,
        `<rect width="${cardW}" height="${cardH}" rx="10" fill="#fff" stroke="#94a3b8"/>`,
      );
      if (includeLabels) {
        const nameY = Math.round(cardH * 0.55);
        const titleY = Math.round(cardH * 0.72);
        parts.push(
          `<text x="8" y="${nameY}" font-size="12" fill="#0f172a">${esc(person?.fullName ?? '—')}</text>`,
          `<text x="8" y="${titleY}" font-size="11" fill="#64748b">${esc(position.title)}</text>`,
        );
      }
      parts.push('</g>');
    }
    parts.push('</g>');
  }

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="100%" height="100%" fill="${esc(bg)}"/>`,
    ...parts,
    `</svg>`,
  ].join('\n');
}
