import { describe, expect, it, vi } from 'vitest';
import { emptyDiagramData } from '../data/types.js';
import { ContextMenuController, type ContextMenuCommands } from './ContextMenuController.js';
import type { NodeRef } from './types.js';

const data = {
  ...emptyDiagramData(),
  organizations: [
    { id: 'o1', name: 'Cedar Lake', groupIds: [] },
    { id: 'o2', name: 'Birch Hill', groupIds: [] },
  ],
};

const orgRef = (id: string): NodeRef => ({ kind: 'organization', id, organizationId: id });

function harness(options?: {
  selection?: NodeRef[];
  onContextMenu?: Parameters<typeof vi.fn>[0];
}) {
  const commands = {
    expandOrg: vi.fn(async () => {}),
    collapseOrg: vi.fn(async () => {}),
    focusNode: vi.fn(async () => {}),
    setOrgsCollapsed: vi.fn(async () => {}),
    clearSelection: vi.fn(async () => {}),
  } satisfies ContextMenuCommands;
  const copied: string[] = [];
  const onContextMenuAction = vi.fn();
  const controller = new ContextMenuController({
    data: () => data,
    selection: () => options?.selection ?? [],
    hooks: () => ({ onContextMenu: options?.onContextMenu, onContextMenuAction }),
    commands,
    writeClipboard: async (text) => {
      copied.push(text);
    },
  });
  return { controller, commands, copied, onContextMenuAction };
}

describe('ContextMenuController', () => {
  it('success: open builds a request and run dispatches the item', async () => {
    const { controller, commands, onContextMenuAction } = harness();
    controller.open(orgRef('o1'), { clientX: 10, clientY: 20 });
    expect(controller.lastRequest?.node.ref.id).toBe('o1');
    await controller.run('expand');
    expect(commands.expandOrg).toHaveBeenCalledWith('o1');
    expect(onContextMenuAction).toHaveBeenCalledOnce();
    // The request is consumed, so a stale second click cannot re-fire it.
    expect(controller.lastRequest).toBeNull();
  });

  it('success: a host may replace the item list', async () => {
    const { controller, commands } = harness({
      onContextMenu: () => [{ id: 'collapse', label: 'Only collapse' }],
    });
    controller.open(orgRef('o1'), { clientX: 0, clientY: 0 });
    expect(controller.lastRequest?.items).toHaveLength(1);
    await controller.run('expand');
    expect(commands.expandOrg).not.toHaveBeenCalled();
    await controller.run('collapse');
    expect(commands.collapseOrg).toHaveBeenCalledWith('o1');
  });

  it('success: bulk items act on the whole selection', async () => {
    const selection = [orgRef('o1'), orgRef('o2')];
    const { controller, commands, copied } = harness({ selection });
    controller.open(orgRef('o1'), { clientX: 0, clientY: 0 });
    await controller.run('bulk-collapse');
    expect(commands.setOrgsCollapsed).toHaveBeenCalledWith(['o1', 'o2'], true);
    controller.open(orgRef('o1'), { clientX: 0, clientY: 0 });
    await controller.run('bulk-copy-ids');
    expect(copied).toEqual(['organization:o1 organization:o2']);
  });

  it('failure: host veto, unknown item and disabled item all dispatch nothing', async () => {
    const vetoed = harness({ onContextMenu: () => false });
    vetoed.controller.open(orgRef('o1'), { clientX: 0, clientY: 0 });
    expect(vetoed.controller.lastRequest).toBeNull();
    await vetoed.controller.run('expand');
    expect(vetoed.commands.expandOrg).not.toHaveBeenCalled();

    const { controller, commands, onContextMenuAction } = harness({
      onContextMenu: () => [{ id: 'expand', label: 'Expand', disabled: true }],
    });
    controller.open(orgRef('o1'), { clientX: 0, clientY: 0 });
    await controller.run('expand');
    await controller.run('no-such-item');
    expect(commands.expandOrg).not.toHaveBeenCalled();
    expect(onContextMenuAction).not.toHaveBeenCalled();
  });
});
