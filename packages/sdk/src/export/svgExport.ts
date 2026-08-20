import type { DiagramData } from '../data/types.js';
import { computeAllContours } from '../contour/bridge.js';
import { diagramPositionsToContourInputs } from '../contour/config.js';
import { layoutStaffCanvas } from '../layout/staff/canvasLayout.js';
import type { RenderConfig } from '../render/types.js';
import { defaultRenderConfig } from '../render/types.js';
import { buildStaffEdgeSegments } from '../render/staffEdgeGeometry.js';

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export interface SvgExportInput {
  data: DiagramData;
  config?: Partial<RenderConfig>;
  background?: string;
  includeLabels?: boolean;
  currentOrgId?: string;
  expandedOrgIds?: readonly string[];
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
      { expandedOrgIds: input.expandedOrgIds },
    );
    width = Math.max(width, Math.ceil(canvas.width));
    height = Math.max(height, Math.ceil(canvas.height));

    const positionById = new Map(data.positions.map((p) => [p.id, p]));
    const contourInputs = canvas.positionNodes
      .filter((n) => positionById.get(n.id)?.departmentId)
      .map((n) => {
        const p = positionById.get(n.id)!;
        return {
          id: n.id,
          departmentId: p.departmentId!,
          col: Math.round(n.x / config.cellWidth),
          row: Math.round(n.y / config.cellHeight),
        };
      });

    const contours =
      contourInputs.length > 0
        ? await computeAllContours(contourInputs, {
            paddingCells: config.paddingCells,
            cellWidth: config.cellWidth,
            cellHeight: config.cellHeight,
            smoothIterations: config.smoothIterations,
            magnetRadius: config.magnetRadius ?? 1.5,
          })
        : [];

    parts.push('<g id="departments">');
    for (const c of contours) {
      if (!c.path) continue;
      parts.push(
        `<path d="${esc(c.path)}" fill="#dbeafe" stroke="#3b82f6" stroke-width="2" data-dept="${esc(c.departmentId)}"/>`,
      );
    }
    parts.push('</g>');

    const segments = buildStaffEdgeSegments(canvas.edges, canvas.positionNodes);
    parts.push('<g id="edges">');
    for (const s of segments) {
      parts.push(
        `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#64748b" stroke-width="2"/>`,
      );
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
        `<rect width="${n.width}" height="${n.height}" rx="8" fill="#fff" stroke="#94a3b8"/>`,
      );
      if (includeLabels) {
        const name = person?.fullName ?? '—';
        parts.push(
          `<text x="8" y="24" font-size="12" fill="#0f172a">${esc(name)}</text>`,
          `<text x="8" y="40" font-size="11" fill="#64748b">${esc(position.title)}</text>`,
        );
      }
      parts.push('</g>');
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
    });
    parts.push('<g id="departments">');
    for (const c of contours) {
      if (!c.path) continue;
      parts.push(
        `<path d="${esc(c.path)}" fill="#dbeafe" stroke="#3b82f6" stroke-width="2" data-dept="${esc(c.departmentId)}"/>`,
      );
    }
    parts.push('</g>');

    const personById = new Map(data.persons.map((p) => [p.id, p]));
    parts.push('<g id="persons">');
    for (const position of data.positions) {
      if (!position.gridCell) continue;
      const x = position.gridCell.col * config.cellWidth + 10;
      const y = position.gridCell.row * config.cellHeight + 10;
      width = Math.max(width, x + 140);
      height = Math.max(height, y + 80);
      const person = position.personId ? personById.get(position.personId) : undefined;
      parts.push(
        `<g data-position="${esc(position.id)}" transform="translate(${x},${y})">`,
        `<rect width="120" height="64" rx="8" fill="#fff" stroke="#94a3b8"/>`,
      );
      if (includeLabels) {
        parts.push(
          `<text x="8" y="24" font-size="12" fill="#0f172a">${esc(person?.fullName ?? '—')}</text>`,
          `<text x="8" y="40" font-size="11" fill="#64748b">${esc(position.title)}</text>`,
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
