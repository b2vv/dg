import { afterEach, expect, it, rstest } from '@rstest/core';
import { Container, Graphics, EventBoundary, FederatedPointerEvent } from 'pixi.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { PersonNodeView } from './PersonNode.js';
import { emptyDiagramData } from '../data/types.js';
import { defaultNodeTheme, defaultRenderConfig } from './types.js';
import { resolveAnimate } from './transition/resolveAnimate.js';
import { InteractionStore } from '../state/InteractionStore.js';

const renderers: DiagramRenderer[] = [];
afterEach(() => { for (const renderer of renderers.splice(0)) renderer.destroy(); rstest.restoreAllMocks(); });
function setup(staff = false) {
  const renderer = new DiagramRenderer();
  renderers.push(renderer);
  const data = emptyDiagramData();
  data.positions = ['a', 'b', 'c'].map((id, col) => ({ id, title: id, organizationId: 'o', groupIds: [], status: 'vacant', isTemporary: false, gridCell: { col, row: 0 } }));
  data.reportLines = [{ fromId: 'a', toId: 'b', kind: 'admin' }];
  if (staff) data.organizations = [{ id: 'o', name: 'Current', role: 'current', groupIds: [] }];
  const render = () => renderer.render(data, defaultNodeTheme, 'light', defaultRenderConfig, staff ? { staff: { currentOrgId: 'o' } } : {});
  return { renderer, data, render };
}
for (const staff of [false, true]) {
  it(`success: simple factory receives input and SDK places its wrapper (staff=${staff})`, async () => {
    const { renderer, render } = setup(staff);
    const factory = rstest.fn(() => new Graphics().rect(0, 0, 30, 20).fill(0xff0000));
    renderer.setNodeViewFactory(factory);
    await render();
    expect(factory).toHaveBeenCalledTimes(3);
    const wrapper = renderer.layers.persons.children[1]!;
    const root = factory.mock.results[1]!.value;
    expect(wrapper).not.toBeInstanceOf(PersonNodeView);
    expect(root.parent).toBe(wrapper);
    expect(root.position.x).toBe(0);
    const box = renderer.getNodeBox('position:b')!;
    expect({ x: wrapper.x, y: wrapper.y }).toEqual({ x: box.x, y: box.y });
  });
}

for (const staff of [false, true]) {
  it(`success: retained roots update, sweep only vanished seats, and destroy once (staff=${staff})`, async () => {
    const { renderer, data, render } = setup(staff);
    data.reportLines = [];
    const entries = new Map<string, { root: Container; update: ReturnType<typeof rstest.fn>; destroy: ReturnType<typeof rstest.fn> }>();
    const create = rstest.fn((input) => {
      const root = new Container();
      const entry = { root, update: rstest.fn(), destroy: rstest.fn(() => root.destroy({ children: true })) };
      entries.set(input.id, entry);
      return entry;
    });
    renderer.setNodeViewFactory({ create });
    await render();
    const a = entries.get('a')!;
    const b = entries.get('b')!;
    data.positions = data.positions.filter((p) => p.id !== 'c');
    await render();
    expect(create).toHaveBeenCalledTimes(3);
    expect(a.update).toHaveBeenCalledTimes(1);
    expect(a.root.destroyed).toBe(false);
    expect(a.root.parent).toBe(renderer.layers.persons.children[0]);
    expect(a.destroy).not.toHaveBeenCalled();
    expect(b.destroy).not.toHaveBeenCalled();
    expect(entries.get('c')!.destroy).toHaveBeenCalledTimes(1);
    renderer.destroy();
    expect(a.destroy).toHaveBeenCalledTimes(1);
    expect(b.destroy).toHaveBeenCalledTimes(1);
    expect(entries.get('c')!.destroy).toHaveBeenCalledTimes(1);
  });
}

it('failure: throwing factory falls back per seat and warns once across passes', async () => {
  const { renderer, render } = setup();
  const warn = rstest.spyOn(console, 'warn').mockImplementation(() => {});
  renderer.setNodeViewFactory((input) => {
    if (input.id === 'a') throw new Error('host failed');
    return new Container();
  });
  await render();
  await render();
  expect(renderer.layers.persons.children).toHaveLength(3);
  expect(renderer.layers.persons.children[0]).toBeInstanceOf(PersonNodeView);
  expect(renderer.layers.persons.children[1]).not.toBeInstanceOf(PersonNodeView);
  expect(warn).toHaveBeenCalledTimes(1);
});

it('success: host hover accents wrapper in local coordinates, dims unrelated seats and preserves root', async () => {
  const { renderer, render } = setup();
  const store = new InteractionStore();
  renderer.setInteractionSource({ getHovered: () => store.state.hovered, setHovered: (ref) => { store.setHovered(ref); } });
  const roots: Graphics[] = [];
  renderer.setNodeViewFactory(() => {
    const root = new Graphics().rect(0, 0, 30, 20).fill(0xff0000);
    root.position.set(7, 9);
    roots.push(root);
    return root;
  });
  await render();
  const wrapper = renderer.layers.persons.children[1]!;
  wrapper.emit('pointerover', new FederatedPointerEvent(new EventBoundary(wrapper)));
  renderer.cullToViewport({ x: 0, y: 0, scale: 1 }, { width: 800, height: 600 });
  expect(store.state.hovered).toEqual({ kind: 'position', id: 'b' });
  expect(renderer.layers.persons.children.map((v) => v.alpha)).toEqual([1, 1, 0.45]);
  const accent = wrapper.children.find((child) => child !== roots[1])!;
  expect(accent.visible).toBe(true);
  expect(accent.getLocalBounds().x).toBe(4);
  expect(accent.getLocalBounds().y).toBe(6);
  expect(roots[1]!.position.x).toBe(7);
  expect(roots[1]!.alpha).toBe(1);
  renderer.repaintSelection([{ kind: 'position', id: 'b' }]);
  expect(accent.visible).toBe(false);
  expect(renderer.layers.overlay.children).toHaveLength(1);
});

it('success: absent factory keeps direct default views; clearing factory restores them', async () => {
  const { renderer, render } = setup();
  await render();
  expect(renderer.layers.persons.children.every((view) => view instanceof PersonNodeView)).toBe(true);
  renderer.setNodeViewFactory(() => new Container());
  await render();
  renderer.setNodeViewFactory(null);
  await render();
  expect(renderer.layers.persons.children.every((view) => view instanceof PersonNodeView)).toBe(true);
});

it('failure: retained update exception destroys its entry and restores default view', async () => {
  const { renderer, render } = setup();
  const warn = rstest.spyOn(console, 'warn').mockImplementation(() => {});
  const destroy = rstest.fn();
  renderer.setNodeViewFactory({ create: () => ({ root: new Container(), update: () => { throw new Error('update failed'); }, destroy }) });
  await render();
  await render();
  expect(renderer.layers.persons.children.every((view) => view instanceof PersonNodeView)).toBe(true);
  expect(destroy).toHaveBeenCalledTimes(3);
  expect(warn).toHaveBeenCalledTimes(3);
});

it('success: animation moves the wrapper while retained host coordinates stay local', async () => {
  const { renderer, data } = setup();
  data.positions = data.positions.slice(0, 1);
  data.reportLines = [];
  let now = 0;
  let serial = 0;
  const pending = new Map<number, FrameRequestCallback>();
  rstest.spyOn(performance, 'now').mockImplementation(() => now);
  rstest.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => { pending.set(++serial, cb); return serial; });
  rstest.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => { pending.delete(id); });
  const root = new Graphics().rect(0, 0, 30, 20).fill(0xff0000);
  const update = rstest.fn();
  renderer.setNodeViewFactory({ create: () => ({ root, update, destroy: () => root.destroy() }) });
  renderer.configureTransition(resolveAnimate(true, false));
  const draw = () => renderer.render(data, defaultNodeTheme, 'light', defaultRenderConfig, { transition: 'animate' });
  await draw();
  renderer.startTransition();
  const oldX = renderer.layers.persons.children[0]!.x;
  data.positions[0]!.gridCell = { col: 2, row: 0 };
  await draw();
  const wrapper = renderer.layers.persons.children[0]!;
  expect(wrapper.x).toBe(oldX);
  expect(root.parent).toBe(wrapper);
  expect(root.destroyed).toBe(false);
  renderer.startTransition();
  now += 750;
  for (const cb of [...pending.values()]) cb(now);
  expect(wrapper.x).toBe(renderer.getNodeBox('position:a')!.x);
  expect(wrapper.x).toBeGreaterThan(oldX);
  expect(root.x).toBe(0);
  expect(update).toHaveBeenCalledTimes(1);
});
