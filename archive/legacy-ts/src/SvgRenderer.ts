import {
  DEFAULT_EDGE_STYLE,
  DEFAULT_NODE_STYLE,
  NODE_TYPE_COLORS,
  STATUS_COLORS,
  type LayoutNode,
  type LayoutResult,
  type NodeStyle,
  type SvgRenderOptions,
  type HierarchyNode,
} from './types.js';
import { computeLayout } from './TreeLayout.js';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function resolveNodeStyle(
  node: LayoutNode,
  options: SvgRenderOptions,
): Required<NodeStyle> {
  const base = { ...DEFAULT_NODE_STYLE };
  const typeFill = NODE_TYPE_COLORS[node.type];
  base.fill = typeFill;

  if (typeof options.nodeStyle === 'function') {
    return { ...base, ...options.nodeStyle(node) };
  }
  if (options.nodeStyle) {
    return { ...base, ...options.nodeStyle };
  }
  return base;
}

function renderNodeSvg(node: LayoutNode, options: SvgRenderOptions): string {
  const style = resolveNodeStyle(node, options);
  const { x, y, width, height } = node;
  const lines: string[] = [];

  lines.push(
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" ` +
    `rx="${style.borderRadius}" ry="${style.borderRadius}" ` +
    `fill="${style.fill}" stroke="${style.stroke}" stroke-width="${style.strokeWidth}" ` +
    `data-node-id="${escapeXml(node.id)}" class="org-node org-node--${node.type}"/>`,
  );

  const padding = 10;
  let textY = y + padding + style.fontSize;

  if (node.department) {
    lines.push(
      `<text x="${x + width / 2}" y="${textY}" text-anchor="middle" ` +
      `fill="${style.textColor}" font-size="${style.fontSize - 2}" opacity="0.7" ` +
      `class="org-node__department">${escapeXml(node.department)}</text>`,
    );
    textY += style.fontSize + 2;
  }

  lines.push(
    `<text x="${x + width / 2}" y="${textY}" text-anchor="middle" ` +
    `fill="${style.textColor}" font-size="${style.fontSize + 1}" font-weight="600" ` +
    `class="org-node__label">${escapeXml(node.label)}</text>`,
  );
  textY += style.fontSize + 4;

  if (node.position) {
    lines.push(
      `<text x="${x + width / 2}" y="${textY}" text-anchor="middle" ` +
      `fill="${style.textColor}" font-size="${style.fontSize - 1}" opacity="0.85" ` +
      `class="org-node__position">${escapeXml(node.position)}</text>`,
    );
    textY += style.fontSize + 2;
  }

  if (node.person) {
    lines.push(
      `<text x="${x + width / 2}" y="${textY}" text-anchor="middle" ` +
      `fill="${style.textColor}" font-size="${style.fontSize - 1}" ` +
      `class="org-node__person">${escapeXml(node.person)}</text>`,
    );
  } else if (options.showVacantBadge !== false && node.status === 'vacant') {
    lines.push(
      `<text x="${x + width / 2}" y="${textY}" text-anchor="middle" ` +
      `fill="${STATUS_COLORS.vacant}" font-size="${style.fontSize - 1}" font-style="italic" ` +
      `class="org-node__vacant">Вакантна посада</text>`,
    );
  }

  if (node.status === 'acting') {
    const badgeX = x + width - 8;
    const badgeY = y + 8;
    lines.push(
      `<circle cx="${badgeX}" cy="${badgeY}" r="5" fill="${STATUS_COLORS.acting}"/>`,
      `<title>Тимчасово виконуючий обов'язки</title>`,
    );
  }

  return `<g class="org-node-group" data-node-id="${escapeXml(node.id)}">${lines.join('')}</g>`;
}

/** Рендерер SVG для ієрархічних та штатно-посадових діаграм. */
export class SvgRenderer {
  private readonly options: SvgRenderOptions;

  constructor(options: SvgRenderOptions = {}) {
    this.options = options;
  }

  renderLayout(layout: LayoutResult): string {
    const edgeStyle = { ...DEFAULT_EDGE_STYLE, ...this.options.edgeStyle };
    const bg = this.options.background ?? 'transparent';
    const className = this.options.className ?? 'org-chart';

    const edges = layout.edges
      .map(
        (e) =>
          `<path d="${e.path}" fill="none" stroke="${edgeStyle.stroke}" ` +
          `stroke-width="${edgeStyle.strokeWidth}" class="org-edge"/>`,
      )
      .join('\n');

    const nodes = layout.nodes
      .map((n) => renderNodeSvg(n, this.options))
      .join('\n');

    return [
      `<svg xmlns="http://www.w3.org/2000/svg"`,
      `  width="${layout.width}" height="${layout.height}"`,
      `  viewBox="0 0 ${layout.width} ${layout.height}"`,
      `  class="${escapeXml(className)}"`,
      `  role="img" aria-label="Організаційна діаграма">`,
      bg !== 'transparent' ? `<rect width="100%" height="100%" fill="${bg}"/>` : '',
      `<g class="org-edges">${edges}</g>`,
      `<g class="org-nodes">${nodes}</g>`,
      `</svg>`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  render(root: HierarchyNode): string {
    const layout = computeLayout(root, this.options);
    return this.renderLayout(layout);
  }
}

export function renderSvg(root: HierarchyNode, options?: SvgRenderOptions): string {
  return new SvgRenderer(options).render(root);
}

export function renderOrgChart(
  root: HierarchyNode,
  options?: SvgRenderOptions,
): { layout: LayoutResult; svg: string } {
  const layout = computeLayout(root, options);
  const svg = new SvgRenderer(options).renderLayout(layout);
  return { layout, svg };
}
