import { describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createElement, useEffect } from 'react';
import {
  createReactContextMenuHost,
  type ReactContextMenuRenderProps,
} from './createReactContextMenuHost.js';
import type { ContextMenuRequest } from '../interaction/contextMenuPayload.js';

function sampleRequest(): ContextMenuRequest {
  return {
    node: {
      ref: {
        kind: 'person',
        id: 'p1',
        personId: 'p1',
        positionId: 'pos1',
        organizationId: 'org1',
      },
      person: { id: 'p1', fullName: 'Alice Smith' },
      position: {
        id: 'pos1',
        title: 'CEO',
        organizationId: 'org1',
        groupIds: [],
        personId: 'p1',
        status: 'filled',
        isTemporary: false,
      },
      organization: { id: 'org1', name: 'Ops', groupIds: [] },
    },
    items: [{ id: 'focus', label: 'Focus' }],
    pointer: { clientX: 40, clientY: 60 },
  };
}

describe('createReactContextMenuHost', () => {
  it('success: mounts React component with node payload', async () => {
    const seen: string[] = [];
    const Menu = (props: ReactContextMenuRenderProps) => {
      seen.push(props.request.node.person?.fullName ?? '');
      return createElement('div', { 'data-testid': 'menu' }, props.request.node.person?.fullName);
    };

    const host = createReactContextMenuHost({ component: Menu });
    await act(async () => {
      host.handleContextMenu(sampleRequest());
    });
    expect(host.isOpen()).toBe(true);
    expect(seen).toEqual(['Alice Smith']);
    const el = document.querySelector('[data-testid="menu"]');
    expect(el?.textContent).toBe('Alice Smith');
    await act(async () => {
      host.dispose();
    });
  });

  it('success: onAction receives item and closes', async () => {
    const onAction = vi.fn();
    const Menu = (props: ReactContextMenuRenderProps) => {
      useEffect(() => {
        props.onAction(props.request.items[0]!);
      }, [props]);
      return createElement('div', { 'data-testid': 'menu-action' });
    };
    const host = createReactContextMenuHost({ component: Menu, onAction });
    await act(async () => {
      host.handleContextMenu(sampleRequest());
    });
    expect(onAction).toHaveBeenCalledWith(
      { id: 'focus', label: 'Focus' },
      expect.objectContaining({ node: expect.objectContaining({ person: expect.anything() }) }),
    );
    expect(host.isOpen()).toBe(false);
    await act(async () => {
      host.dispose();
    });
  });

  it('success: enables pointer events on mount while open', async () => {
    const mount = document.createElement('div');
    document.body.appendChild(mount);
    const Menu = (props: ReactContextMenuRenderProps) =>
      createElement('div', { 'data-testid': 'menu-pe' }, props.request.node.ref.id);
    const host = createReactContextMenuHost({ component: Menu, container: mount });
    expect(mount.style.pointerEvents).not.toBe('auto');
    await act(async () => {
      host.handleContextMenu(sampleRequest());
    });
    expect(mount.style.pointerEvents).toBe('auto');
    await act(async () => {
      host.close();
    });
    expect(mount.style.pointerEvents).toBe('none');
    host.dispose();
    mount.remove();
  });
});
