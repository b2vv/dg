import type { HierarchyNode, HtmlRenderOptions, LayoutNode } from './types.js';
import { STATUS_COLORS } from './types.js';
import { computeLayout } from './TreeLayout.js';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function resolveNodeClass(node: LayoutNode, options: HtmlRenderOptions): string {
  const base = `org-node org-node--${node.type} org-node--${node.status}`;
  if (typeof options.nodeClassName === 'function') {
    return `${base} ${options.nodeClassName(node)}`;
  }
  if (options.nodeClassName) {
    return `${base} ${options.nodeClassName}`;
  }
  return base;
}

function renderNodeHtml(node: LayoutNode, options: HtmlRenderOptions): string {
  const className = resolveNodeClass(node, options);
  const statusColor = STATUS_COLORS[node.status];

  const parts: string[] = [
    `<div class="${className}" data-node-id="${escapeHtml(node.id)}" ` +
    `style="position:absolute;left:${node.x}px;top:${node.y}px;width:${node.width}px;height:${node.height}px;border-left:3px solid ${statusColor}">`,
  ];

  if (node.department) {
    parts.push(`<div class="org-node__department">${escapeHtml(node.department)}</div>`);
  }
  parts.push(`<div class="org-node__label">${escapeHtml(node.label)}</div>`);
  if (node.position) {
    parts.push(`<div class="org-node__position">${escapeHtml(node.position)}</div>`);
  }
  if (node.person) {
    parts.push(`<div class="org-node__person">${escapeHtml(node.person)}</div>`);
  } else if (options.showVacantBadge !== false && node.status === 'vacant') {
    parts.push(`<div class="org-node__vacant">Вакантна посада</div>`);
  }

  parts.push('</div>');
  return parts.join('');
}

/** HTML-рендерер для вбудовування org-chart у веб-сторінку. */
export class HtmlRenderer {
  private readonly options: HtmlRenderOptions;

  constructor(options: HtmlRenderOptions = {}) {
    this.options = options;
  }

  render(root: HierarchyNode): string {
    const layout = computeLayout(root, this.options);
    const containerClass = this.options.containerClassName ?? 'org-chart-container';

    const edges = layout.edges
      .map((e) => `<path d="${e.path}" class="org-edge"/>`)
      .join('');

    const nodes = layout.nodes
      .map((n) => renderNodeHtml(n, this.options))
      .join('');

    return [
      `<div class="${escapeHtml(containerClass)}" style="position:relative;width:${layout.width}px;height:${layout.height}px">`,
      `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" ` +
      `style="position:absolute;top:0;left:0;pointer-events:none" class="org-chart-edges">`,
      edges,
      `</svg>`,
      nodes,
      `</div>`,
    ].join('');
  }
}

export function renderHtml(root: HierarchyNode, options?: HtmlRenderOptions): string {
  return new HtmlRenderer(options).render(root);
}

export const DEFAULT_CSS = `
.org-chart-container {
  font-family: system-ui, -apple-system, sans-serif;
  background: #f8fafc;
  border-radius: 12px;
  overflow: auto;
}
.org-node {
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 8px 12px;
  box-sizing: border-box;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  overflow: hidden;
}
.org-node--root { background: #dbeafe; }
.org-node--department { background: #e0e7ff; }
.org-node--position { background: #f0fdf4; }
.org-node__department { font-size: 11px; color: #64748b; margin-bottom: 2px; }
.org-node__label { font-size: 14px; font-weight: 600; color: #1e293b; }
.org-node__position { font-size: 12px; color: #475569; margin-top: 2px; }
.org-node__person { font-size: 12px; color: #334155; margin-top: 2px; }
.org-node__vacant { font-size: 12px; color: #ef4444; font-style: italic; margin-top: 2px; }
.org-edge { fill: none; stroke: #94a3b8; stroke-width: 1.5; }
`.trim();
