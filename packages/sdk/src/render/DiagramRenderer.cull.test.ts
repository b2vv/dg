import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { Container } from 'pixi.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import type { WorldBox } from './promoteMath.js';
import type { ViewportTransform } from './Viewport.js';

const camera = { x: 0, y: 0, scale: 2 } satisfies ViewportTransform;
const screen = { width: 800, height: 600 };
const inside = { x: 10, y: 10, width: 20, height: 20 } satisfies WorldBox;
const outside = { ...inside, x: 2000 };
const renderers: DiagramRenderer[] = [];

function fixture(count = 300) {
  const renderer = new DiagramRenderer();
  renderers.push(renderer);
  const scene = renderer['scene'];
  const views = Array.from({ length: count }, (_, index) => {
    const view = new Container();
    renderer.layers.persons.addChild(view);
    scene.registerView('position', String(index), view);
    scene.rememberBox({ id: String(index), kind: 'position', ...outside });
    return view;
  });
  function box(index: number, bounds: WorldBox) {
    scene.rememberBox({ id: String(index), kind: 'position', ...bounds });
  }
  return { renderer, scene, views, box };
}

afterEach(() => {
  rstest.restoreAllMocks();
  for (const renderer of renderers.splice(0)) renderer.destroy();
});

describe('DiagramRenderer viewport culling', () => {
  it('success: culls at 300 views, restores on pan and counts every pass (AC1/3)', () => {
    const { renderer, views, box } = fixture();
    box(0, inside);
    expect(renderer.getCullStats()).toEqual({ drawn: 0, culled: 0, passes: 0 });
    renderer.cullToViewport(camera, screen);
    expect(views[0].renderable).toBe(true);
    expect(views.slice(1).every((view) => !view.renderable)).toBe(true);
    expect(renderer.getCullStats()).toEqual({ drawn: 1, culled: 299, passes: 1 });
    renderer.cullToViewport({ ...camera, x: -4000 }, screen);
    expect(views[0].renderable).toBe(false);
    expect(views.slice(1).every((view) => view.renderable)).toBe(true);
    expect(renderer.getCullStats()).toEqual({ drawn: 299, culled: 1, passes: 2 });
  });

  it('boundary: below 300 resets stale flags without looking up boxes (AC4)', () => {
    const { renderer, scene, views } = fixture(299);
    for (const view of views) view.renderable = false;
    const lookup = rstest.spyOn(scene, 'getBox');
    renderer.cullToViewport(camera, screen);
    expect(views.every((view) => view.renderable)).toBe(true);
    expect(lookup).not.toHaveBeenCalled();
    expect(renderer.getCullStats()).toEqual({ drawn: 299, culled: 0, passes: 1 });
  });

  it('boundary: empty scenes still count invocations (AC3/4)', () => {
    const { renderer } = fixture(0);
    renderer.cullToViewport(camera, screen);
    renderer.cullToViewport(camera, screen);
    expect(renderer.getCullStats()).toEqual({ drawn: 0, culled: 0, passes: 2 });
  });

  it('success: padding is half the longest screen dimension on all sides (AC6)', () => {
    const { renderer, views, box } = fixture();
    const locations = [
      { x: 599, y: 10 }, { x: 601, y: 10 },
      { x: -219, y: 10 }, { x: -221, y: 10 },
      { x: 10, y: 499 }, { x: 10, y: 501 },
      { x: 10, y: -219 }, { x: 10, y: -221 },
    ];
    locations.forEach((location, index) => box(index, { ...inside, ...location }));
    renderer.cullToViewport(camera, screen);
    expect(views.slice(0, 8).map((view) => view.renderable)).toEqual([
      true, false, true, false, true, false, true, false,
    ]);
    renderer.cullToViewport(camera, { width: 600, height: 800 });
    expect(views[0].renderable).toBe(false);
    expect(views[5].renderable).toBe(true);
  });

  it('success: zoom-out restores the whole tree (AC5 part)', () => {
    const { renderer, views } = fixture();
    renderer.cullToViewport(camera, screen);
    renderer.cullToViewport({ ...camera, scale: 0.1 }, screen);
    expect(views.every((view) => view.renderable)).toBe(true);
    expect(renderer.getCullStats()).toEqual({ drawn: 300, culled: 0, passes: 2 });
  });

  it('success: cull and reset preserve promote visibility and all edge flags (AC7)', () => {
    const { renderer, scene, views } = fixture();
    scene.setPromotedIds(['0']);
    const edge = renderer.layers.edges.addChild(new Container());
    const hiddenEdge = renderer.layers.edges.addChild(new Container());
    hiddenEdge.renderable = false;
    renderer.cullToViewport(camera, screen);
    expect(views[0].visible).toBe(false);
    expect(renderer.layers.edges.renderable).toBe(true);
    expect(edge.renderable).toBe(true);
    expect(hiddenEdge.renderable).toBe(false);
    renderer.resetCull();
    expect(views.every((view) => view.renderable)).toBe(true);
    expect(views[0].visible).toBe(false);
    expect(views.slice(1).every((view) => view.visible)).toBe(true);
    expect(renderer.layers.edges.renderable).toBe(true);
    expect(edge.renderable).toBe(true);
    expect(hiddenEdge.renderable).toBe(false);
    expect(renderer.getCullStats()).toEqual({ drawn: 300, culled: 0, passes: 1 });
  });

  it('success: identical passes preserve flags and return independent stats snapshots (AC10)', () => {
    const { renderer, views, box } = fixture();
    box(0, inside);
    renderer.cullToViewport(camera, screen);
    const first = renderer.getCullStats();
    const flags = views.map((view) => view.renderable);
    renderer.cullToViewport(camera, screen);
    expect(views.map((view) => view.renderable)).toEqual(flags);
    expect(renderer.getCullStats()).toEqual({ ...first, passes: 2 });
    first.drawn = 999;
    expect(renderer.getCullStats().drawn).toBe(1);
  });

  for (const field of ['x', 'y', 'width', 'height'] as const) {
    for (const value of [NaN, Infinity, -Infinity]) {
      it(`failure: ${field}=${value} explicitly restores a previously culled view (AC12/NB1)`, () => {
        const { renderer, views, box } = fixture();
        renderer.cullToViewport(camera, screen);
        expect(views[0].renderable).toBe(false);
        box(0, { ...outside, [field]: value });
        expect(() => renderer.cullToViewport(camera, screen)).not.toThrow();
        expect(views[0].renderable).toBe(true);
        expect(renderer.getCullStats()).toEqual({ drawn: 1, culled: 299, passes: 2 });
      });
    }
  }

  it('failure: missing box explicitly restores stale false and continues (AC12/NB1)', () => {
    const { renderer, scene, views } = fixture();
    renderer.cullToViewport(camera, screen);
    scene.clear();
    views.forEach((view, index) => scene.registerView('position', String(index), view));
    expect(() => renderer.cullToViewport(camera, screen)).not.toThrow();
    expect(views.every((view) => view.renderable)).toBe(true);
    expect(renderer.getCullStats()).toEqual({ drawn: 300, culled: 0, passes: 2 });
  });

  it('failure: a box lookup exception cannot abort the paint or remaining views (N3)', () => {
    const { renderer, scene, views, box } = fixture();
    renderer.cullToViewport(camera, screen);
    box(1, inside);
    rstest.spyOn(scene, 'getBox').mockImplementationOnce(() => { throw new Error('bad box'); });
    expect(() => renderer.cullToViewport(camera, screen)).not.toThrow();
    expect(views[0].renderable).toBe(true);
    expect(views[1].renderable).toBe(true);
    expect(renderer.getCullStats()).toEqual({ drawn: 2, culled: 298, passes: 2 });
  });
});
