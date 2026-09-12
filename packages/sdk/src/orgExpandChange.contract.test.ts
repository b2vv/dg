import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from './index.js';
import type { DiagramData, DiagramOrganization } from './data/types.js';

interface OrgExpandChange {
  reason: 'toggle' | 'data' | 'reveal' | 'reveal-rollback';
  changedIds: readonly string[];
  expanded: boolean | null;
}

type ExistingCallbacks = NonNullable<
  Parameters<typeof OrgHierarchyDiagram.create>[1]['callbacks']
>;
type PendingOrgExpandCallbacks = ExistingCallbacks & {
  onOrgExpandChange?(state: OrgExpandChange): void;
};

function treeData(overrides: Partial<Record<string, boolean>> = {}): DiagramData {
  const organizations: DiagramOrganization[] = [
    { id: 'root', name: 'Root', groupIds: [], collapsed: overrides.root ?? false },
    {
      id: 'org-1',
      name: 'Org 1',
      groupIds: [],
      parentOrgId: 'root',
      collapsed: overrides['org-1'] ?? false,
    },
    {
      id: 'org-2',
      name: 'Org 2',
      groupIds: [],
      parentOrgId: 'org-1',
      collapsed: overrides['org-2'] ?? false,
    },
    {
      id: 'org-3',
      name: 'Org 3',
      groupIds: [],
      parentOrgId: 'org-2',
      collapsed: overrides['org-3'] ?? true,
    },
  ];
  return {
    organizations,
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
      {
        id: 'pos-42',
        title: 'Position 42',
        organizationId: 'org-3',
        groupIds: [],
        status: 'vacant',
        isTemporary: false,
      },
    ],
    reportLines: [],
  };
}

function twelveExpandedOrgs(): DiagramData {
  const ids = [
    'org-1',
    'org-2',
    'org-3',
    'org-4',
    'org-5',
    'org-6',
    'org-7',
    'org-8',
    'org-9',
    'org-10',
    'org-11',
    'org-12',
  ] as const;
  return {
    organizations: ids.map((id, index) => ({
      id,
      name: `Org ${index + 1}`,
      groupIds: [],
      collapsed: false,
      ...(index > 0 ? { parentOrgId: ids[index - 1] } : {}),
    })),
    groups: [],
    departments: [],
    persons: [],
    positions: [],
    reportLines: [],
  };
}

async function mount(
  data: DiagramData = treeData(),
  callbacks?: PendingOrgExpandCallbacks,
) {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data,
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

const collapsedOf = (diagram: OrgHierarchyDiagram, orgId: string): boolean | undefined =>
  diagram.getData().organizations.find((org) => org.id === orgId)?.collapsed;

describe('onOrgExpandChange contract', () => {
  it('row 2: toggle reports the changed org and its new collapsed state', async () => {
    const changes: OrgExpandChange[] = [];
    const mounted = await mount(treeData(), {
      onOrgExpandChange: (state) => changes.push(state),
    });

    try {
      expect(await mounted.diagram.toggleOrgExpand('org-2')).toBe(false);
      expect(changes).toEqual([
        { reason: 'toggle', changedIds: ['org-2'], expanded: false },
      ]);
    } finally {
      mounted.cleanup();
    }
  });

  it('row 3: expanding an org reports a toggle and preserves selection', async () => {
    const changes: OrgExpandChange[] = [];
    const mounted = await mount(treeData({ 'org-2': true }), {
      onOrgExpandChange: (state) => changes.push(state),
    });
    const selected = {
      kind: 'position' as const,
      id: 'pos-9',
      positionId: 'pos-9',
      organizationId: 'org-2',
    };

    try {
      await mounted.diagram.select(selected);
      await mounted.diagram.expandOrg('org-2');

      expect(changes).toEqual([
        { reason: 'toggle', changedIds: ['org-2'], expanded: true },
      ]);
      expect(mounted.diagram.getSelection()).toEqual(selected);
    } finally {
      mounted.cleanup();
    }
  });

  it('row 5: collapsing 12 expanded orgs emits one aggregate change', async () => {
    const changes: OrgExpandChange[] = [];
    const mounted = await mount(twelveExpandedOrgs(), {
      onOrgExpandChange: (state) => changes.push(state),
    });

    try {
      await mounted.diagram.collapseAllOrgs();
      expect(changes).toEqual([
        {
          reason: 'toggle',
          changedIds: [
            'org-1',
            'org-2',
            'org-3',
            'org-4',
            'org-5',
            'org-6',
            'org-7',
            'org-8',
            'org-9',
            'org-10',
            'org-11',
            'org-12',
          ],
          expanded: false,
        },
      ]);
    } finally {
      mounted.cleanup();
    }
  });

  it('row 6: a second collapse of an already-collapsed tree emits no event', async () => {
    const changes: OrgExpandChange[] = [];
    const mounted = await mount(treeData(), {
      onOrgExpandChange: (state) => changes.push(state),
    });

    try {
      await mounted.diagram.collapseAllOrgs();
      expect(changes).toHaveLength(1);
      changes.length = 0;

      await mounted.diagram.collapseAllOrgs();
      expect(changes).toEqual([]);
    } finally {
      mounted.cleanup();
    }
  });

  it('row 7: setData reports a snapshot that a toggle-only host ignores', async () => {
    const changes: OrgExpandChange[] = [];
    const toggleChanges: OrgExpandChange[] = [];
    const mounted = await mount(treeData(), {
      onOrgExpandChange: (state) => {
        changes.push(state);
        if (state.reason === 'toggle') toggleChanges.push(state);
      },
    });

    try {
      const replacement = treeData({ root: true, 'org-1': true, 'org-2': true });
      replacement.organizations = replacement.organizations.map((org) => ({
        ...org,
        id: `replacement-${org.id}`,
        parentOrgId: org.parentOrgId ? `replacement-${org.parentOrgId}` : undefined,
      }));
      replacement.positions = [];
      await mounted.diagram.setData(replacement);

      expect(changes).toEqual([
        { reason: 'data', changedIds: [], expanded: null },
      ]);
      expect(toggleChanges).toEqual([]);
    } finally {
      mounted.cleanup();
    }
  });

  it('row 8: every expansion entry point emits a concrete change', async () => {
    const changes: OrgExpandChange[] = [];
    const emissionCounts: number[] = [];
    const mounted = await mount(treeData(), {
      onOrgExpandChange: (state) => changes.push(state),
    });

    try {
      await mounted.diagram.expandOrg('org-3');
      emissionCounts.push(changes.length);
      await mounted.diagram.collapseOrg('org-3');
      emissionCounts.push(changes.length);
      await mounted.diagram.setOrgsCollapsed(['org-2'], true);
      emissionCounts.push(changes.length);
      await mounted.diagram.collapseAllOrgs();
      emissionCounts.push(changes.length);
      await mounted.diagram.setData(treeData());
      emissionCounts.push(changes.length);
      await mounted.diagram.revealPath('pos-42');
      emissionCounts.push(changes.length);

      expect(emissionCounts).toEqual([1, 2, 3, 4, 5, 6]);
      expect(changes.map((change) => change.reason)).toEqual([
        'toggle',
        'toggle',
        'toggle',
        'toggle',
        'data',
        'reveal',
      ]);
    } finally {
      mounted.cleanup();
    }
  });

  it('row 9: reveal render failure reports reveal, rollback, then throws', async () => {
    const changes: OrgExpandChange[] = [];
    const order: string[] = [];
    const renderError = new Error('layout died');
    const mounted = await mount(treeData(), {
      onOrgExpandChange: (state) => {
        changes.push(state);
        order.push(state.reason);
      },
    });
    const host = (
      mounted.diagram as unknown as {
        host: { renderer: { render: () => Promise<void> } };
      }
    ).host;
    host.renderer.render = async () => {
      throw renderError;
    };

    try {
      let thrown: unknown;
      try {
        await mounted.diagram.revealPath('pos-42');
      } catch (error) {
        thrown = error;
        order.push('throw');
      }

      expect(changes).toEqual([
        { reason: 'reveal', changedIds: ['org-3'], expanded: true },
        { reason: 'reveal-rollback', changedIds: ['org-3'], expanded: false },
      ]);
      expect(order).toEqual(['reveal', 'reveal-rollback', 'throw']);
      expect(thrown).toBe(renderError);
    } finally {
      mounted.cleanup();
    }
  });

  it('row 10: a throwing host callback is rethrown once on window.onerror', async () => {
    const hostError = new Error('expand host callback failed');
    const errorHits: unknown[] = [];
    const mounted = await mount(treeData(), {
      onOrgExpandChange: () => {
        throw hostError;
      },
    });
    const host = (
      mounted.diagram as unknown as {
        host: { renderer: { render: (...args: unknown[]) => Promise<void> } };
      }
    ).host;
    const render = host.renderer.render.bind(host.renderer);
    let frames = 0;
    host.renderer.render = (...args: unknown[]) => {
      frames += 1;
      return render(...args);
    };
    const onError = (event: ErrorEvent): void => {
      errorHits.push(event.error);
      event.preventDefault();
    };
    window.addEventListener('error', onError);

    try {
      expect(await mounted.diagram.toggleOrgExpand('org-2')).toBe(false);
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });

      expect(frames).toBe(1);
      expect(collapsedOf(mounted.diagram, 'org-2')).toBe(true);
      expect(errorHits).toHaveLength(1);
      expect(errorHits[0]).toBe(hostError);
    } finally {
      window.removeEventListener('error', onError);
      mounted.cleanup();
    }
  });

  it('row 12: toggle still emits after a proven destroy', async () => {
    const changes: OrgExpandChange[] = [];
    const mounted = await mount(treeData(), {
      onOrgExpandChange: (state) => changes.push(state),
    });

    try {
      expect(mounted.diagram.getLayoutDiagnostics().some((line) => line.startsWith('Renderer:')))
        .toBe(true);
      mounted.diagram.destroy();
      expect(mounted.diagram.getLayoutDiagnostics()).toEqual([]);

      expect(await mounted.diagram.toggleOrgExpand('org-2')).toBe(false);
      expect(changes).toEqual([
        { reason: 'toggle', changedIds: ['org-2'], expanded: false },
      ]);
    } finally {
      mounted.cleanup();
    }
  });
});
