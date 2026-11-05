import { afterEach, describe, expect, it, rstest } from '@rstest/core';
import { EventBoundary, FederatedPointerEvent } from 'pixi.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { PersonNodeView } from './PersonNode.js';
import { OrganizationNodeView } from './OrganizationNode.js';
import { defaultNodeTheme, defaultRenderConfig } from './types.js';
import { emptyDiagramData } from '../data/types.js';
import { InteractionStore } from '../state/InteractionStore.js';
import type { NodeRef } from '../core/index.js';
import type { DiagramData } from '../data/types.js';

const renderers: DiagramRenderer[] = [];
afterEach(() => { renderers.splice(0).forEach((r) => r.destroy()); });

function setup() {
  const renderer = new DiagramRenderer();
  renderers.push(renderer);
  const store = new InteractionStore();
  const source = { getHovered: () => store.state.hovered, setHovered: rstest.fn((ref: NodeRef | null) => { store.setHovered(ref); }) };
  const paint = () => renderer.cullToViewport({ x: 0, y: 0, scale: 1 }, { width: 800, height: 600 });
  return { renderer, store, source, paint };
}
function staffData(): DiagramData {
  const data = emptyDiagramData();
  data.positions = ['a', 'b', 'c'].map((id, col) => ({ id, title: id, organizationId: 'o', groupIds: [], status: 'vacant', isTemporary: false, gridCell: { col, row: 0 } }));
  data.reportLines = [{ fromId: 'a', toId: 'b', kind: 'admin' }];
  return data;
}
function seat(renderer: DiagramRenderer, index = 0) {
  const view = renderer.layers.persons.children[index];
  if (!(view instanceof PersonNodeView)) throw new Error('Expected real seat view');
  return view;
}
function over(view: PersonNodeView | OrganizationNodeView, type: 'pointerover' | 'pointerout' = 'pointerover') {
  view.emit(type, new FederatedPointerEvent(new EventBoundary(view)));
}

for (const lod of ['near', 'mid', 'far'] as const) {
  it(`success: ${lod} pointer routes to source, paint reads current hover without rebuilding`, async () => {
    const { renderer, store, source, paint } = setup();
    renderer.setInteractionSource(source);
    await renderer.render(staffData(), defaultNodeTheme, 'light', defaultRenderConfig, { lod });
    const a = seat(renderer);
    over(a);
    expect(source.setHovered).toHaveBeenLastCalledWith({ kind: 'position', id: 'a' });
    expect(a['hoverRing'].visible).toBe(false);
    paint();
    expect(a['hoverRing'].visible).toBe(lod !== 'far');
    store.setHovered({ kind: 'position', id: 'b' });
    paint();
    expect(seat(renderer)).toBe(a);
    expect(a['hoverRing'].visible).toBe(false);
    expect(seat(renderer, 1)['hoverRing'].visible).toBe(lod !== 'far');
    over(seat(renderer, 1), 'pointerout');
    expect(source.setHovered).toHaveBeenLastCalledWith(null);
    paint();
    expect(seat(renderer, 1)['hoverRing'].visible).toBe(false);
  });
}

describe('renderer interaction boundaries', () => {
  it('failure: null source preserves local behavior and can roll back mounted nodes', async () => {
    const { renderer, store, source, paint } = setup();
    await renderer.render(staffData(), defaultNodeTheme, 'light');
    const a = seat(renderer);
    over(a); paint();
    expect(a['hoverRing'].visible).toBe(true);
    renderer.setInteractionSource(source);
    paint();
    expect(a['hoverRing'].visible).toBe(false);
    over(a); paint();
    expect(store.state.hovered?.id).toBe('a');
    expect(seat(renderer, 2).alpha).toBe(0.45);
    renderer.setInteractionSource(null);
    paint();
    expect(seat(renderer, 2).alpha).toBe(1);
    source.setHovered.mockClear();
    over(a); paint();
    expect(a['hoverRing'].visible).toBe(true);
    over(a, 'pointerout');
    expect(a['hoverRing'].visible).toBe(false);
    expect(source.setHovered).not.toHaveBeenCalled();
  });
  it('failure: unknown or wrong-kind hover paints no accent and dims no nodes', async () => {
    const { renderer, store, source, paint } = setup();
    renderer.setInteractionSource(source);
    await renderer.render(staffData(), defaultNodeTheme, 'light');
    for (const ref of [{ kind: 'position', id: 'missing' }, { kind: 'organization', id: 'a' }] as const) {
      store.setHovered(ref); paint();
      expect(seat(renderer)['hoverRing'].visible).toBe(false);
      expect(renderer.layers.persons.children.map((v) => v.alpha)).toEqual([1, 1, 1]);
    }
  });
  it('success: selection wins its accent while related dimming remains derived (rows 14/15)', async () => {
    const { renderer, store, source, paint } = setup();
    renderer.setInteractionSource(source);
    const selected = { kind: 'position', id: 'a' } as const;
    store.setHovered(selected);
    await renderer.render(staffData(), defaultNodeTheme, 'light', defaultRenderConfig, { selected: [selected] });
    paint();
    expect(seat(renderer)['hoverRing'].visible).toBe(false);
    expect(renderer.layers.overlay.children).toHaveLength(1);
    expect(renderer.layers.persons.children.map((v) => v.alpha)).toEqual([1, 1, 0.45]);
    renderer.repaintSelection([]); paint();
    expect(seat(renderer)['hoverRing'].visible).toBe(true);
    expect(renderer.layers.overlay.children).toHaveLength(0);
    store.setHovered(null); paint();
    expect(renderer.layers.persons.children.map((v) => v.alpha)).toEqual([1, 1, 1]);
  });
  it('success: found focus and highlighted edges survive hover and selection (row 12)', async () => {
    const { renderer, store, source, paint } = setup();
    const data = staffData();
    renderer.setInteractionSource(source);
    await renderer.render(data, defaultNodeTheme, 'light');
    const found = new Set(['position:b']);
    renderer.repaintHighlight('a', found, data.reportLines, defaultNodeTheme);
    const edges = renderer.layers.edges.children.slice();
    store.setHovered({ kind: 'position', id: 'a' });
    renderer.repaintSelection([{ kind: 'position', id: 'a' }]); paint();
    expect(seat(renderer).alpha).toBe(defaultNodeTheme.foundDimAlpha ?? 0.38);
    expect(seat(renderer, 1).alpha).toBe(1);
    expect(seat(renderer, 2).alpha).toBeCloseTo((defaultNodeTheme.foundDimAlpha ?? 0.38) * 0.45);
    store.setHovered(null); paint();
    expect(renderer.layers.persons.children.map((v) => v.alpha)).toEqual([0.38, 1, 0.38]);
    expect(renderer.layers.edges.children).toEqual(edges);
    expect([...found]).toEqual(['position:b']);
    renderer.repaintHighlight(null, null, data.reportLines, defaultNodeTheme); paint();
    expect(renderer.layers.persons.children.map((v) => v.alpha)).toEqual([1, 1, 1]);
  });
  it('success: organization source can be replaced on existing nodes and selection wins', async () => {
    const { renderer, source, paint } = setup();
    const data = emptyDiagramData();
    data.organizations = [{ id: 'a', name: 'A', groupIds: [] }];
    renderer.setInteractionSource(source);
    await renderer.render(data, defaultNodeTheme, 'light');
    const view = renderer.layers.organizations.children[0];
    if (!(view instanceof OrganizationNodeView)) throw new Error('Expected real organization view');
    over(view); paint();
    expect(source.setHovered).toHaveBeenLastCalledWith({ kind: 'organization', id: 'a' });
    expect(view['hoverRing'].visible).toBe(true);
    renderer.repaintSelection([{ kind: 'organization', id: 'a' }]); paint();
    expect(view['hoverRing'].visible).toBe(false);
    const next = new InteractionStore();
    renderer.setInteractionSource({ getHovered: () => next.state.hovered, setHovered: (ref) => { next.setHovered(ref); } });
    over(view);
    expect(next.state.hovered).toEqual({ kind: 'organization', id: 'a' });
    over(view, 'pointerout');
    expect(next.state.hovered).toBeNull();
    expect(source.setHovered).toHaveBeenCalledTimes(1);
  });
  it('success: person refs resolve to their occupied seat for hover and selection', async () => {
    const { renderer, store, source, paint } = setup();
    const data = staffData();
    data.persons = [{ id: 'p', fullName: 'Person' }];
    data.positions[0]!.personId = 'p';
    renderer.setInteractionSource(source);
    await renderer.render(data, defaultNodeTheme, 'light');
    store.setHovered({ kind: 'person', id: 'p' }); paint();
    expect(seat(renderer)['hoverRing'].visible).toBe(true);
    renderer.repaintSelection([{ kind: 'person', id: 'p', positionId: 'a' }]); paint();
    expect(seat(renderer)['hoverRing'].visible).toBe(false);
  });
});

it('success: staff layout binds both seats and subordinate organization cards', async () => {
  const { renderer, source, paint } = setup();
  const data = staffData();
  data.organizations = [
    { id: 'o', name: 'Current', role: 'current', groupIds: [] },
    { id: 'sub', name: 'Subordinate', parentOrgId: 'o', groupIds: [] },
  ];
  renderer.setInteractionSource(source);
  await renderer.render(data, defaultNodeTheme, 'light', defaultRenderConfig, { staff: { currentOrgId: 'o' } });
  const a = seat(renderer);
  over(a); paint();
  expect(source.setHovered).toHaveBeenLastCalledWith({ kind: 'position', id: 'a' });
  expect(a['hoverRing'].visible).toBe(true);
  const org = renderer.layers.organizations.children.find((v) => v instanceof OrganizationNodeView);
  if (!(org instanceof OrganizationNodeView)) throw new Error('Expected subordinate org card');
  over(org); paint();
  expect(source.setHovered).toHaveBeenLastCalledWith({ kind: 'organization', id: 'sub' });
  expect(org['hoverRing'].visible).toBe(true);
  expect(a['hoverRing'].visible).toBe(false);
});

it('failure boundary: LOD crossing and mid marks paint no hover while selection survives', async () => {
  const { renderer, store, source, paint } = setup();
  renderer.setInteractionSource(source);
  store.setHovered({ kind: 'position', id: 'a' });
  await renderer.render(staffData(), defaultNodeTheme, 'light');
  expect(seat(renderer)['hoverRing'].visible).toBe(true);
  for (const lod of ['far', 'mid'] as const) {
    await renderer.render(staffData(), defaultNodeTheme, 'light', { ...defaultRenderConfig, staffReactChrome: true }, {
      lod, selected: [{ kind: 'position', id: 'a' }],
    });
    paint();
    expect(seat(renderer)['hoverRing'].visible).toBe(false);
    expect(renderer.layers.overlay.children).toHaveLength(1);
    expect(renderer.layers.persons.children.map((v) => v.alpha)).toEqual([1, 1, 1]);
  }
  await renderer.render(staffData(), defaultNodeTheme, 'light');
  expect(seat(renderer)['hoverRing'].visible).toBe(true);
  await renderer.render(emptyDiagramData(), defaultNodeTheme, 'light');
  expect(() => paint()).not.toThrow();
  expect(renderer.layers.persons.children).toHaveLength(0);
});
