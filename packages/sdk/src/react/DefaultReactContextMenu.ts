import { createElement, type ReactElement } from 'react';
import type { ReactContextMenuRenderProps } from './createReactContextMenuHost.js';
import type { MenuItem } from '../interaction/types.js';

function clampMenuPosition(clientX: number, clientY: number, menuW = 200, menuH = 240): {
  left: number;
  top: number;
} {
  if (typeof window === 'undefined') return { left: clientX, top: clientY };
  const margin = 8;
  const left = Math.min(Math.max(margin, clientX), window.innerWidth - menuW - margin);
  const top = Math.min(Math.max(margin, clientY), window.innerHeight - menuH - margin);
  return { left, top };
}

/** Minimal default React menu — hosts usually pass their own component. */
export function DefaultReactContextMenu(props: ReactContextMenuRenderProps): ReactElement {
  const { request, onClose, onAction } = props;
  const { node, items, pointer } = request;
  const title =
    node.person?.fullName ??
    node.organization?.name ??
    node.position?.title ??
    node.ref.id;

  const pos = clampMenuPosition(pointer.clientX, pointer.clientY);

  const panel = createElement(
    'div',
    {
      role: 'menu',
      'data-testid': 'org-context-menu',
      style: {
        position: 'fixed',
        left: pos.left,
        top: pos.top,
        pointerEvents: 'auto',
        minWidth: 180,
        background: '#fff',
        border: '1px solid #cbd5e1',
        borderRadius: 8,
        boxShadow: '0 8px 24px rgba(15,23,42,0.12)',
        padding: '8px 0',
        fontFamily: 'system-ui, sans-serif',
        fontSize: 13,
        zIndex: 10001,
      },
      onClick: (e: { stopPropagation: () => void }) => e.stopPropagation(),
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    },
    createElement(
      'div',
      {
        style: {
          padding: '6px 12px',
          color: '#64748b',
          borderBottom: '1px solid #e2e8f0',
          marginBottom: 4,
        },
      },
      title,
      node.position ? createElement('div', { style: { fontSize: 11 } }, node.position.title) : null,
      node.department
        ? createElement('div', { style: { fontSize: 11 } }, node.department.name)
        : null,
    ),
    ...items.map((item: MenuItem) =>
      createElement(
        'button',
        {
          key: item.id,
          type: 'button',
          role: 'menuitem',
          disabled: item.disabled,
          style: {
            display: 'block',
            width: '100%',
            textAlign: 'left',
            border: 0,
            background: 'transparent',
            padding: '8px 12px',
            cursor: item.disabled ? 'not-allowed' : 'pointer',
          },
          onClick: () => onAction(item),
        },
        item.label,
      ),
    ),
    createElement(
      'button',
      {
        type: 'button',
        style: {
          display: 'block',
          width: '100%',
          textAlign: 'left',
          border: 0,
          background: 'transparent',
          padding: '8px 12px',
          color: '#94a3b8',
          cursor: 'pointer',
        },
        onClick: onClose,
      },
      'Close',
    ),
  );

  return createElement(
    'div',
    {
      style: {
        position: 'fixed',
        inset: 0,
        pointerEvents: 'auto',
        zIndex: 10000,
      },
      onClick: onClose,
      onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
    },
    panel,
  );
}
