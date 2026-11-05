import { describe, expect, it, rstest } from '@rstest/core';
import { EventBoundary, FederatedPointerEvent } from 'pixi.js';
import { PersonNodeView } from './PersonNode.js';
import { defaultNodeTheme } from './types.js';
import type { NodeRef } from '../core/index.js';
import type { LodLevel } from './lod.js';

function create(lod: LodLevel, onHover?: (ref: NodeRef | null) => void) {
  return PersonNodeView.create(undefined, { id: 'a', title: 'A', organizationId: 'o', groupIds: [], status: 'vacant', isTemporary: false }, defaultNodeTheme.person, lod, { onHover });
}

for (const lod of ['near', 'mid', 'far'] as const) {
  describe(`Person hover at ${lod}`, () => {
    it('success: routes pointer events without locally painting controlled hover', async () => {
      const onHover = rstest.fn();
      const view = create(lod, onHover);
      await view.mediaReady;
      const event = new FederatedPointerEvent(new EventBoundary(view));
      view.emit('pointerover', event);
      expect(onHover).toHaveBeenLastCalledWith({ kind: 'position', id: 'a' });
      expect(view['hoverRing'].visible).toBe(false);
      view.setHovered(true);
      expect(view['hoverRing'].visible).toBe(lod !== 'far');
      view.emit('pointerout', event);
      expect(onHover).toHaveBeenLastCalledWith(null);
      expect(view['hoverRing'].visible).toBe(lod !== 'far');
      view.setHovered(false);
      expect(view['hoverRing'].visible).toBe(false);
      view.destroy({ children: true });
    });
    it('failure boundary: absent callback retains local hover and far never paints a ring', async () => {
      const view = create(lod);
      await view.mediaReady;
      const event = new FederatedPointerEvent(new EventBoundary(view));
      view.emit('pointerover', event);
      expect(view['hoverRing'].visible).toBe(lod !== 'far');
      view.emit('pointerout', event);
      expect(view['hoverRing'].visible).toBe(false);
      view.destroy({ children: true });
    });
  });
}
