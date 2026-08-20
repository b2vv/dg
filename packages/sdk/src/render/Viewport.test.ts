import { describe, expect, it, vi } from 'vitest';
import { Viewport } from './Viewport.js';

function fakeWorld() {
  const position = { x: 0, y: 0, set: vi.fn((x: number, y: number) => {
    position.x = x;
    position.y = y;
  }) };
  const scale = { x: 1, y: 1, set: vi.fn((x: number, y: number) => {
    scale.x = x;
    scale.y = y;
  }) };
  return { position, scale };
}

describe('Viewport', () => {
  it('success: panTo centers world point at screen mid', () => {
    const world = fakeWorld();
    const vp = new Viewport(world);
    vp.setScreenSize(800, 600);
    vp.panTo(100, 50);
    expect(vp.getTransform()).toEqual({ x: 300, y: 250, scale: 1 });
    expect(world.position.set).toHaveBeenCalledWith(300, 250);
  });

  it('success: setZoom clamps and keeps anchor world point stable', () => {
    const world = fakeWorld();
    const vp = new Viewport(world, { minScale: 0.5, maxScale: 2 });
    vp.setScreenSize(200, 200);
    vp.setTransform({ x: 0, y: 0, scale: 1 });
    vp.setZoom(2, 100, 100);
    expect(vp.getZoom()).toBe(2);
    // world (100,100) under screen (100,100) before and after
    const t = vp.getTransform();
    expect((100 - t.x) / t.scale).toBeCloseTo(100);
    expect((100 - t.y) / t.scale).toBeCloseTo(100);

    vp.setZoom(99);
    expect(vp.getZoom()).toBe(2);
    vp.setZoom(0.01);
    expect(vp.getZoom()).toBe(0.5);
  });

  it('success: begin/move/end pan shifts translation', () => {
    const world = fakeWorld();
    const vp = new Viewport(world);
    vp.beginPan(1, 10, 10);
    vp.movePan(1, 40, 25);
    expect(vp.getTransform().x).toBe(30);
    expect(vp.getTransform().y).toBe(15);
    vp.endPan(1);
    vp.movePan(1, 100, 100);
    expect(vp.getTransform().x).toBe(30);
  });

  it('success: attachWheel zooms on wheel event', () => {
    const world = fakeWorld();
    const vp = new Viewport(world);
    vp.setScreenSize(100, 100);
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, x: 0, y: 0, toJSON: () => ({}) });
    vp.attachWheel(canvas);
    canvas.dispatchEvent(
      new WheelEvent('wheel', { deltaY: -100, clientX: 50, clientY: 50, cancelable: true }),
    );
    expect(vp.getZoom()).toBeGreaterThan(1);
    vp.destroy();
  });

  it('failure: non-finite transform fields are ignored', () => {
    const world = fakeWorld();
    const vp = new Viewport(world);
    vp.setTransform({ x: 10, y: 20, scale: 1 });
    vp.setTransform({ x: Number.NaN, y: Number.POSITIVE_INFINITY, scale: Number.NaN });
    expect(vp.getTransform()).toEqual({ x: 10, y: 20, scale: 1 });
  });
});
