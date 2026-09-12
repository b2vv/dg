import { describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from './index.js';
import type { DiagramData } from './data/types.js';

type ExistingCallbacks = NonNullable<
  Parameters<typeof OrgHierarchyDiagram.create>[1]['callbacks']
>;
type PendingBackgroundCallbacks = ExistingCallbacks & {
  onBackgroundClick?(): void;
};

function data(): DiagramData {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: false },
      {
        id: 'org-2',
        name: 'Org 2',
        groupIds: [],
        parentOrgId: 'root',
        collapsed: false,
      },
      {
        id: 'org-3',
        name: 'Org 3',
        groupIds: [],
        parentOrgId: 'org-2',
        collapsed: true,
      },
    ],
    groups: [],
    departments: [],
    persons: [],
    positions: [
      {
        id: 'pos-9',
        title: 'Position 9',
        organizationId: 'org-2',
        groupIds: [],
        status: 'vacant',
        isTemporary: false,
      },
    ],
    reportLines: [],
  };
}

type RootPointerTarget = {
  emit(event: 'pointertap'): boolean;
  listeners(event: 'pointertap'): Array<() => void>;
};

function rootOf(diagram: OrgHierarchyDiagram): RootPointerTarget {
  return (
    diagram as unknown as {
      host: { renderer: { layers: { root: RootPointerTarget } } };
    }
  ).host.renderer.layers.root;
}

function retainBackgroundClick(diagram: OrgHierarchyDiagram): () => void {
  const listener = rootOf(diagram).listeners('pointertap')[0];
  if (!listener) throw new Error('expected the rendered background-click listener');
  return listener;
}

async function mount(callbacks?: PendingBackgroundCallbacks) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);

  const diagram = await OrgHierarchyDiagram.create(container, {
    data: data(),
    staffCurrentOrgId: 'org-2',
    useWorker: false,
    ...(callbacks
      ? {
          // This narrow local cast disappears with T3, when production owns the field.
          callbacks: callbacks as ExistingCallbacks,
        }
      : {}),
  });

  return {
    diagram,
    cleanup: () => {
      diagram.destroy();
      container.remove();
    },
  };
}

const selectedPosition = {
  kind: 'position' as const,
  id: 'pos-9',
  positionId: 'pos-9',
  organizationId: 'org-2',
};

describe('onBackgroundClick contract', () => {
  it('row 1: fires once before the selected position is cleared', async () => {
    let diagramAtCall: OrgHierarchyDiagram | undefined;
    const selectionsAtCall: unknown[] = [];
    const onBackgroundClick = rstest.fn(() => {
      selectionsAtCall.push(diagramAtCall?.getSelection());
    });
    const mounted = await mount({ onBackgroundClick });
    diagramAtCall = mounted.diagram;

    try {
      await mounted.diagram.select(selectedPosition);
      rootOf(mounted.diagram).emit('pointertap');

      expect(onBackgroundClick).toHaveBeenCalledTimes(1);
      expect(selectionsAtCall).toEqual([selectedPosition]);
    } finally {
      mounted.cleanup();
    }
  });

  it('row 4: omitting both callbacks preserves background clear and org toggle behavior', async () => {
    const mounted = await mount();

    try {
      await mounted.diagram.select(selectedPosition);
      rootOf(mounted.diagram).emit('pointertap');
      expect(mounted.diagram.getSelection()).toBeNull();

      await expect(mounted.diagram.toggleOrgExpand('org-2')).resolves.toBe(false);
      expect(
        mounted.diagram.getData().organizations.find((org) => org.id === 'org-2')?.collapsed,
      ).toBe(true);
    } finally {
      mounted.cleanup();
    }
  });

  it('row 10a: a throwing handler still cannot prevent selection clearing', async () => {
    const hostError = new Error('background host callback failed');
    let thrown: unknown;
    const onBackgroundClick = rstest.fn(() => {
      try {
        throw hostError;
      } catch (error) {
        thrown = error;
        throw error;
      }
    });
    const mounted = await mount({ onBackgroundClick });
    const originalConsoleError = console.error;
    const consoleError = rstest.fn();
    console.error = consoleError;

    try {
      await mounted.diagram.select(selectedPosition);
      rootOf(mounted.diagram).emit('pointertap');

      expect(onBackgroundClick).toHaveBeenCalledTimes(1);
      expect(thrown).toBe(hostError);
      expect(mounted.diagram.getSelection()).toBeNull();
      expect(consoleError).toHaveBeenCalledTimes(1);
      expect(consoleError.mock.calls[0]?.[0]).toContain('host callback threw');
      expect(consoleError.mock.calls[0]?.[1]).toBe(hostError);
    } finally {
      console.error = originalConsoleError;
      mounted.cleanup();
    }
  });

  it('row 11: a retained background click after destroy does not notify the host', async () => {
    const onBackgroundClick = rstest.fn();
    const mounted = await mount({ onBackgroundClick });
    const backgroundClick = retainBackgroundClick(mounted.diagram);

    try {
      backgroundClick();
      expect(onBackgroundClick).toHaveBeenCalledTimes(1);
      onBackgroundClick.mockClear();

      mounted.diagram.destroy();
      backgroundClick();

      expect(onBackgroundClick).not.toHaveBeenCalled();
    } finally {
      mounted.cleanup();
    }
  });
});
