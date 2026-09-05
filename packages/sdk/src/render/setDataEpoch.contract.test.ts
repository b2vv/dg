import { describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import type { DiagramData } from '../data/types.js';

/**
 * T103 — the newest `setData` must win, not the slowest one.
 *
 * `applyConfig` writes shared state *after* awaiting host mappers, so a slower
 * older call lands on top of a faster newer one. The mappers here are the
 * control: each resolves only when its gate is opened, so the interleaving is
 * chosen by the test rather than by timing luck.
 */

const dataWith = (orgName: string): DiagramData => ({
  organizations: [{ id: 'o1', name: orgName, groupIds: [] }],
  groups: [],
  departments: [],
  persons: [{ id: 'p1', fullName: 'Someone' }],
  positions: [
    {
      id: 'pos1',
      organizationId: 'o1',
      personId: 'p1',
      title: 'Dev',
      groupIds: [],
      status: 'filled',
      isTemporary: false,
    },
  ],
  reportLines: [],
});

async function mount() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const onDataMapped = rstest.fn();
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: dataWith('initial'),
    useWorker: false,
    callbacks: { onDataMapped },
  });
  return { container, diagram, onDataMapped };
}

describe('setData request epoch (T103)', () => {
  it('failure: a slower older setData must not overwrite a newer one', async () => {
    const { container, diagram, onDataMapped } = await mount();
    onDataMapped.mockClear();

    const gates: Array<() => void> = [];
    const gated = (name: string) => ({
      toDiagram: async () => {
        await new Promise<void>((r) => {
          gates.push(r);
        });
        return dataWith(name);
      },
    });

    // Older call first, newer second — then let the OLDER one finish last.
    const older = diagram.setData({}, gated('older'));
    const newer = diagram.setData({}, gated('newer'));

    gates[1]?.();
    await newer;
    gates[0]?.();
    const olderOutcome = await older.then(
      () => 'resolved',
      (e: Error) => e.message,
    );

    // The newest request is the truth, whatever order the mappers finished in.
    expect(diagram.getData().organizations[0]!.name).toBe('newer');
    // Being overtaken is the mechanism working, not a fault — and the
    // documented pattern is fire-and-forget, so rejecting here would make our
    // own recommendation a source of unhandled rejections.
    expect(olderOutcome).toBe('resolved');
    // It stays silent all the same: only the winner announced anything.
    expect(onDataMapped).toHaveBeenCalledTimes(1);

    diagram.destroy();
    container.remove();
  });

  it('success: a single call is unchanged — one mapping, one announcement', async () => {
    const { container, diagram, onDataMapped } = await mount();
    onDataMapped.mockClear();

    await diagram.setData(dataWith('only'));

    expect(diagram.getData().organizations[0]!.name).toBe('only');
    expect(onDataMapped).toHaveBeenCalledTimes(1);

    diagram.destroy();
    container.remove();
  });
});
