import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { createTestAnchorOverlay, type TestAnchorOverlayDiagram } from './createTestAnchorOverlay.js';
import type { TestAnchorCandidate } from '../interaction/nodeTestId.js';

function makeDiagram(overrides: Partial<TestAnchorOverlayDiagram> = {}): TestAnchorOverlayDiagram {
  const anchor: TestAnchorCandidate = {
    testId: 'root',
    kind: 'organization',
    ref: { kind: 'organization', id: 'org-1', organizationId: 'org-1' },
    world: { x: 10, y: 20, width: 120, height: 64 },
  };

  return {
    getViewport: () => ({ x: 0, y: 0, scale: 1 }),
    listTestAnchors: () => [anchor],
    focusByTestId: rstest.fn(async () => true),
    openContextMenu: rstest.fn(),
    subscribePromoteSync: (listener) => {
      listener();
      return () => {
        void listener;
      };
    },
    ...overrides,
  };
}

describe('createTestAnchorOverlay', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('success: renders data-testid anchors synced to viewport', () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const diagram = makeDiagram();
    const overlay = createTestAnchorOverlay({ diagram, mount });

    const el = mount.querySelector('[data-testid="node-root"]');
    expect(el).toBeTruthy();
    expect(el?.getAttribute('data-node-kind')).toBe('organization');

    overlay.dispose();
    expect(mount.querySelector('[data-org-hierarchy-test-anchors]')).toBeNull();
  });

  it('success: interactive click calls focusByTestId', async () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const diagram = makeDiagram();
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    const btn = mount.querySelector('[data-testid="node-root"]') as HTMLButtonElement;
    btn.click();
    expect(diagram.focusByTestId).toHaveBeenCalledWith('root');
  });

  it('success: interactive contextmenu opens menu for ref', () => {
    const mount = document.createElement('div');
    Object.defineProperty(mount, 'clientWidth', { value: 800 });
    Object.defineProperty(mount, 'clientHeight', { value: 600 });
    document.body.appendChild(mount);

    const diagram = makeDiagram();
    createTestAnchorOverlay({ diagram, mount, interactive: true });

    const btn = mount.querySelector('[data-testid="node-root"]') as HTMLButtonElement;
    btn.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 12, clientY: 34 }));
    expect(diagram.openContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'org-1' }),
      expect.objectContaining({ clientX: 12, clientY: 34 }),
    );
  });
});
