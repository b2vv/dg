import { expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';
import { PersonNodeView } from './PersonNode.js';
import { DiagramRenderer } from './DiagramRenderer.js';
import { resolveNodeTheme } from './theme.js';

it('setStyles renders new overrides, replaces old overrides and resets to the active base', async () => {
  const container = document.createElement('div');
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: {
      organizations: [{ id: 'org', name: 'Org', groupIds: [] }],
      groups: [], departments: [],
      persons: [{ id: 'person', fullName: 'Marker Person' }],
      positions: [{ id: 'position', organizationId: 'org', personId: 'person', title: 'Title',
        groupIds: [], status: 'filled', isTemporary: false, gridCell: { col: 0, row: 0 } }],
      reportLines: [],
    },
    useWorker: false,
    theme: 'dark',
    styles: { person: { nameColor: 0x123456 } },
  });
  const render = rstest.spyOn(DiagramRenderer.prototype, 'render');
  const createPerson = rstest.spyOn(PersonNodeView, 'create');
  try {
    const partial = { fonts: { sans: 'Comic Sans MS' }, person: { nameColor: 0xff0000 } };
    await diagram.setStyles(partial);
    expect(render).toHaveBeenCalledTimes(1);
    expect(render.mock.calls[0]?.[1]).toEqual(resolveNodeTheme('dark', partial));
    const name = createPerson.mock.results[0]?.value.findText('Marker Person');
    expect(name?.style.fontFamily).toBe('Comic Sans MS');
    expect(name?.style.fill).toBe(0xff0000);
    await diagram.setTheme('light');
    expect(render.mock.calls[1]?.[1]).toEqual(resolveNodeTheme('light', partial));
    await diagram.setStyles({ fonts: { mono: 'Host Mono' } });
    expect(render.mock.calls[2]?.[1]).toEqual(resolveNodeTheme('light', { fonts: { mono: 'Host Mono' } }));
    await diagram.setStyles(undefined);
    expect(render).toHaveBeenCalledTimes(4);
    expect(render.mock.calls[3]?.[1]).toEqual(resolveNodeTheme('light'));
  } finally {
    createPerson.mockRestore();
    render.mockRestore();
    diagram.destroy();
  }
});
