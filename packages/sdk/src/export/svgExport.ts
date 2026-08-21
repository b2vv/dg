import type { DiagramData } from '../data/types.js';
import { computeAllContours } from '../contour/bridge.js';
import { diagramPositionsToContourInputs } from '../contour/config.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
import {
  DEFAULT_STAFF_LAYOUT_OPTIONS,
  type StaffLayoutOptions,
} from '../layout/staff/types.js';
import type { RenderConfig } from '../render/types.js';
import {
  defaultNodeTheme,
  defaultRenderConfig,
  PERSON_CARD_HEIGHT,
  PERSON_CARD_WIDTH,
} from '../render/types.js';
import { buildStaffEdgeSegments } from '../render/staffEdgeGeometry.js';
import { mapStaffEdgeBoxesForLod } from '../render/visualEdgeBox.js';
import {
  mapContourPointToWorld,
  resolveContourWorldTransform,
} from '../render/contourWorldTransform.js';
import { polishContourRing } from '../render/contourPolish.js';
import { arrowHeadTriangle, shortenPolylineForArrow } from '../render/staffEdgeArrows.js';

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
}

export async function buildDiagramSvg(input: SvgExportInput): Promise<string> {
  const config = { ...defaultRenderConfig, ...input.config };
  const bg = input.background ?? '#f8fafc';
  const includeLabels = input.includeLabels !== false;
  const data = input.data;

  const parts: string[] = [];
  let width = 800;
  let height = 600;

  const orgId =
    input.currentOrgId ??
    (data.organizations.length === 1
      ? data.organizations[0]!.id
      : data.positions[0]?.organizationId);

  if (orgId && data.organizations.some((o) => o.id === orgId) && data.positions.length > 0) {
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

    const positionById = new Map(data.positions.map((p) => [p.id, p]));
    const contourInputs = canvas.positionNodes
      .map((n) => positionById.get(n.id))
      .filter(
        (p): p is NonNullable<typeof p> & { departmentId: string; gridCell: { col: number; row: number } } =>
          !!p?.departmentId && !!p.gridCell,
      )
      .map((p) => ({
        id: p.id,
        departmentId: p.departmentId,
        col: p.gridCell.col,
        row: p.gridCell.row,
      }));

    const contours =
      contourInputs.length > 0
        ? await computeAllContours(contourInputs, {
            paddingCells: config.paddingCells,
            cellWidth: config.cellWidth,
            cellHeight: config.cellHeight,
            smoothIterations: config.smoothIterations,
            magnetRadius: config.magnetRadius ?? 1.5,
            preferNotch: true,
          })
        : [];

    const merged = { ...DEFAULT_STAFF_LAYOUT_OPTIONS, ...staffOpts };
    const world = resolveContourWorldTransform(
      canvas.positionNodes,
      positionById,
      config.cellWidth,
      config.cellHeight,
      merged.refCellWidth + merged.horizontalGap,
      merged.refCellHeight + merged.verticalGap,
    );

    const boxesByDept = new Map<string, { x: number; y: number; width: number; height: number }[]>();
    for (const n of canvas.positionNodes) {
      const pos = positionById.get(n.id);
      if (!pos?.departmentId) continue;
      const list = boxesByDept.get(pos.departmentId) ?? [];
      list.push({ x: n.x, y: n.y, width: n.width, height: n.height });
      boxesByDept.set(pos.departmentId, list);
    }

    const polishedByDept: { deptId: string; d: string }[] = [];
    for (const c of contours) {
      if (c.points.length < 2) continue;
      const mapped = c.points.map((p) => mapContourPointToWorld(p.x, p.y, world));
      const boxes = boxesByDept.get(c.departmentId) ?? [];
      const polished = polishContourRing(mapped, boxes, DEPT_STROKE_W);
      const d = polished.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
      polishedByDept.push({ deptId: c.departmentId, d });
    }

    parts.push('<g id="departments">');
    for (const c of polishedByDept) {
      parts.push(
        `<path d="${c.d} Z" fill="${DEPT_FILL}" fill-opacity="${DEPT_FILL_ALPHA}" stroke="none" data-dept="${esc(c.deptId)}"/>`,
      );
    }
    parts.push('</g>');

    const segments = buildStaffEdgeSegments(
      canvas.edges,
      mapStaffEdgeBoxesForLod(
        canvas.positionNodes,
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
    for (const c of polishedByDept) {
      parts.push(
        `<path d="${c.d} Z" fill="none" stroke="${DEPT_STROKE}" stroke-width="${DEPT_STROKE_W}" stroke-linejoin="round" stroke-linecap="round" data-dept="${esc(c.deptId)}"/>`,
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
    const inputs = diagramPositionsToContourInputs(data.positions);
    const contours = await computeAllContours(inputs, {
      paddingCells: config.paddingCells,
      cellWidth: config.cellWidth,
      cellHeight: config.cellHeight,
      smoothIterations: config.smoothIterations,
      preferNotch: true,
    });
    parts.push('<g id="departments">');
    for (const c of contours) {
      if (!c.path) continue;
      parts.push(
        `<path d="${esc(c.path)}" fill="${DEPT_FILL}" fill-opacity="${DEPT_FILL_ALPHA}" stroke="${DEPT_STROKE}" stroke-width="${DEPT_STROKE_W}" data-dept="${esc(c.departmentId)}"/>`,
      );
    }
    parts.push('</g>');

    const personById = new Map(data.persons.map((p) => [p.id, p]));
    parts.push('<g id="persons">');
    const cardW = PERSON_CARD_WIDTH;
    const cardH = PERSON_CARD_HEIGHT;
    const insetX = (config.cellWidth - cardW) / 2;
    const insetY = (config.cellHeight - cardH) / 2;
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
