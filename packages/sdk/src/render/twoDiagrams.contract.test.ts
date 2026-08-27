import { describe, expect, it, vi } from 'vitest';
import { OrgHierarchyDiagram } from '../index.js';
import { emptyDiagramData, type DiagramData } from '../data/types.js';

/**
 * Two diagrams on one page. The worker bridges used to be module-level, so
 * creating the second one terminated the first one's worker and replaced its
 * factory — silently, because both fall back to the main thread.
 */
function data(prefix: string): DiagramData {
  return {
    ...emptyDiagramData(),
    organizations: [{ id: `${prefix}-org`, name: `${prefix} Org`, groupIds: [] }],
    persons: [{ id: `${prefix}-per`, fullName: `${prefix} Ada Byron` }],
    positions: [
      {
        id: `${prefix}-pos`,
        organizationId: `${prefix}-org`,
        title: 'Head',
        personId: `${prefix}-per`,
        isHead: true,
      },
    ],
  };
}

function mount(): HTMLElement {
  const el = document.createElement('div');
  el.style.width = '600px';
  el.style.height = '400px';
  document.body.appendChild(el);
  return el;
}

/** A worker that never answers: every call must fall back, none may hang. */
function silentWorkerFactory() {
  const terminate = vi.fn();
  const factory = vi.fn(
    () =>
      ({
        postMessage: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        terminate,
      }) as unknown as Worker,
  );
  return { factory, terminate };
}

describe('two diagrams on one page', () => {
  it('success: each keeps its own worker factory, and neither search breaks', async () => {
    const a = silentWorkerFactory();
    const b = silentWorkerFactory();
    const elA = mount();
    const elB = mount();

    const first = await OrgHierarchyDiagram.create(elA, {
      data: data('a'),
      workerFactory: a.factory,
    });
    const second = await OrgHierarchyDiagram.create(elB, {
      data: data('b'),
      workerFactory: b.factory,
    });

    // Creating the second diagram must not have torn down the first one.
    expect(a.terminate).not.toHaveBeenCalled();

    // Both still answer their own data — the first one's index is not the
    // second one's, which is what a shared module-level worker used to risk.
    // Each hit set belongs to its own diagram — the seat matches through its
    // person, so both the person and the position come back.
    const idsA = (await first.search('Ada')).map((r) => r.node.id);
    const idsB = (await second.search('Ada')).map((r) => r.node.id);
    expect(idsA).toContain('a-per');
    expect(idsA.every((id) => id.startsWith('a-'))).toBe(true);
    expect(idsB).toContain('b-per');
    expect(idsB.every((id) => id.startsWith('b-'))).toBe(true);

    first.destroy();
    // …and destroying one leaves the other fully alive.
    expect((await second.search('Ada')).map((r) => r.node.id)).toContain('b-per');

    second.destroy();
    document.body.removeChild(elA);
    document.body.removeChild(elB);
  });

  it('success: a diagram pinned to canvas keeps that engine next to an auto neighbour', async () => {
    const elA = mount();
    const elB = mount();

    const pinned = await OrgHierarchyDiagram.create(elA, {
      data: data('pinned'),
      renderer: 'canvas',
      workerFactory: silentWorkerFactory().factory,
    });
    const auto = await OrgHierarchyDiagram.create(elB, {
      data: data('auto'),
      workerFactory: silentWorkerFactory().factory,
    });

    expect(pinned.getRendererKind()).toBe('canvas');
    // The neighbour's engine is the environment's business — jsdom has no real
    // WebGL, so asserting 'webgl' here would only be asserting the mock. What
    // this contract owns is that the pinned one is not moved by the neighbour.
    expect(auto.getRendererKind()).not.toBeNull();
    expect(pinned.getRendererKind()).toBe('canvas');

    pinned.destroy();
    auto.destroy();
    document.body.removeChild(elA);
    document.body.removeChild(elB);
  });

  it('failure: destroy releases this diagram only, and twice is safe', async () => {
    const el = mount();
    const w = silentWorkerFactory();
    const diagram = await OrgHierarchyDiagram.create(el, {
      data: data('solo'),
      workerFactory: w.factory,
      workerPoolSize: 1,
    });

    diagram.destroy();
    expect(() => diagram.destroy()).not.toThrow();
    expect(await diagram.search('Ada')).toEqual([]);
    document.body.removeChild(el);
  });
});
