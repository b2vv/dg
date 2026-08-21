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

  it('success: fitBounds scales content into screen with padding', () => {
    const world = fakeWorld();
    const vp = new Viewport(world, { minScale: 0.1, maxScale: 4 });
    vp.setScreenSize(400, 300);
    expect(vp.fitBounds({ x: 0, y: 0, width: 200, height: 100 }, 50)).toBe(true);
    const t = vp.getTransform();
    expect(t.scale).toBeCloseTo(1.5); // min(300/200, 200/100) = min(1.5, 2)
    expect((0 + 100) * t.scale + t.x).toBeCloseTo(200); // center x
    expect((0 + 50) * t.scale + t.y).toBeCloseTo(150); // center y
  });

  it('failure: fitBounds rejects empty bounds', () => {
    const world = fakeWorld();
    const vp = new Viewport(world);
    expect(vp.fitBounds({ x: 0, y: 0, width: 0, height: 10 })).toBe(false);
    expect(vp.fitBounds({ x: 0, y: 0, width: 10, height: Number.NaN })).toBe(false);
  });

  it('success: resetView returns identity camera', () => {
    const world = fakeWorld();
    const vp = new Viewport(world);
    vp.setTransform({ x: 10, y: 20, scale: 2 });
    vp.resetView();
    expect(vp.getTransform()).toEqual({ x: 0, y: 0, scale: 1 });
  });

  it('success: animateTo reaches target and cancel stops mid-flight', async () => {
    const world = fakeWorld();
    const vp = new Viewport(world);
    vp.setScreenSize(200, 200);
    vp.setTransform({ x: 0, y: 0, scale: 1 });

    let time = 0;
    const queue: Array<(t: number) => void> = [];
    const handle = vp.animateTo(
      { x: 100, y: 50, scale: 2 },
      {
        durationMs: 100,
        now: () => time,
        requestFrame: (cb) => {
          queue.push(cb);
          return queue.length;
        },
        cancelFrame: () => {
          queue.length = 0;
        },
      },
    );

    while (queue.length) {
      time += 40;
      const cb = queue.shift()!;
      cb(time);
    }
    await handle.done;
    expect(vp.getTransform().x).toBeCloseTo(100);
    expect(vp.getZoom()).toBeCloseTo(2);

    time = 0;
    const queue2: Array<(t: number) => void> = [];
    vp.setTransform({ x: 0, y: 0, scale: 1 });
    const h2 = vp.animateTo(
      { x: 80, y: 0, scale: 1 },
      {
        durationMs: 200,
        now: () => time,
        requestFrame: (cb) => {
          queue2.push(cb);
          return 1;
        },
        cancelFrame: vi.fn(),
      },
    );
    time = 20;
    queue2.shift()?.(time);
    h2.cancel();
    await h2.done;
    expect(vp.getTransform().x).toBeGreaterThan(0);
    expect(vp.getTransform().x).toBeLessThan(80);
  });

  it('success: fitBounds with animate:true tweens toward fit', async () => {
    const world = fakeWorld();
    const vp = new Viewport(world, { minScale: 0.1, maxScale: 4 });
    vp.setScreenSize(400, 300);
    let time = 0;
    const queue: Array<(t: number) => void> = [];
    expect(
      vp.fitBounds(
        { x: 0, y: 0, width: 200, height: 100 },
        50,
        {
          animate: true,
          durationMs: 80,
          now: () => time,
          requestFrame: (cb) => {
            queue.push(cb);
            return queue.length;
          },
          cancelFrame: () => {
            queue.length = 0;
          },
        },
      ),
    ).toBe(true);
    while (queue.length) {
      time += 40;
      queue.shift()!(time);
    }
    expect(vp.getZoom()).toBeCloseTo(1.5);
  });

  it('success: zoomBy steps around screen center', () => {
    const world = fakeWorld();
    const vp = new Viewport(world, { minScale: 0.25, maxScale: 4 });
    vp.setScreenSize(200, 200);
    vp.setTransform({ x: 0, y: 0, scale: 1 });
    vp.zoomBy(2);
    expect(vp.getZoom()).toBe(2);
    const t = vp.getTransform();
    // world (100,100) stays under screen center
    expect((100 - t.x) / t.scale).toBeCloseTo(100);
    expect((100 - t.y) / t.scale).toBeCloseTo(100);
  });

  it('regression: pinch pan-then-zoom keeps initial mid world point', () => {
    if (typeof PointerEvent === 'undefined') {
      // jsdom without PointerEvent — skip environment limitation
      expect(true).toBe(true);
      return;
    }
    const world = fakeWorld();
    const vp = new Viewport(world, { minScale: 0.25, maxScale: 8 });
    vp.setScreenSize(200, 200);
    vp.setTransform({ x: 0, y: 0, scale: 1 });
    const canvas = document.createElement('canvas');
    canvas.getBoundingClientRect = () =>
      ({ left: 0, top: 0, right: 200, bottom: 200, width: 200, height: 200, x: 0, y: 0, toJSON: () => ({}) });
    vp.attachPinch(canvas);

    const fire = (type: string, id: number, x: number, y: number) => {
      canvas.dispatchEvent(
        new PointerEvent(type, {
          pointerId: id,
          clientX: x,
          clientY: y,
          pointerType: 'touch',
          bubbles: true,
        }),
      );
    };

    fire('pointerdown', 1, 80, 100);
    fire('pointerdown', 2, 120, 100);
    const worldUnderMid = (100 - vp.getTransform().x) / vp.getZoom();

    fire('pointermove', 1, 80, 100);
    fire('pointermove', 2, 140, 100);

    const t = vp.getTransform();
    const worldNow = (110 - t.x) / t.scale;
    expect(worldNow).toBeCloseTo(worldUnderMid, 0);
    expect(vp.getZoom()).toBeGreaterThan(1);
    vp.destroy();
  });

  it('success: zoomBy focal math matches setZoom at center', () => {
    const world = fakeWorld();
    const vp = new Viewport(world, { minScale: 0.25, maxScale: 4 });
    vp.setScreenSize(200, 200);
    vp.setTransform({ x: 0, y: 0, scale: 1 });
    // Simulate pinch math: pan mid delta then zoomAt
    const midX = 100;
    const midY = 100;
    const before = (midX - vp.getTransform().x) / vp.getZoom();
    vp.setTransform({
      x: vp.getTransform().x + 10,
      y: vp.getTransform().y,
      scale: vp.getZoom(),
    });
    vp.setZoom(1.5, midX + 10, midY);
    const after = (midX + 10 - vp.getTransform().x) / vp.getZoom();
    expect(after).toBeCloseTo(before);
  });

  it('failure: beginPan cancels in-flight camera tween', async () => {
    const world = fakeWorld();
    const vp = new Viewport(world);
    let time = 0;
    const queue: Array<(t: number) => void> = [];
    const handle = vp.animateTo(
      { x: 200, y: 0, scale: 1 },
      {
        durationMs: 200,
        now: () => time,
        requestFrame: (cb) => {
          queue.push(cb);
          return 1;
        },
        cancelFrame: vi.fn(),
      },
    );
    time = 10;
    queue.shift()?.(time);
    vp.beginPan(1, 0, 0);
    await handle.done;
    const xAfterCancel = vp.getTransform().x;
    expect(xAfterCancel).toBeLessThan(200);
  });
});
