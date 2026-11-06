import { afterEach, beforeEach, describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from './OrgHierarchyDiagram.js';
import { emptyDiagramData, type DiagramData } from './data/types.js';
import { DiagramRenderer } from './render/DiagramRenderer.js';

const mediaTemplate = window.matchMedia('screen');
const diagrams: OrgHierarchyDiagram[] = [];
beforeEach(() => {
  rstest.spyOn(window, 'matchMedia').mockReturnValue({ ...mediaTemplate, matches: false });
});
afterEach(() => {
  for (const diagram of diagrams.splice(0)) diagram.destroy();
  rstest.restoreAllMocks();
});
function data(): DiagramData {
  return {
    ...emptyDiagramData(),
    positions: ['a', 'b'].map((id, col) => ({
      id, title: id, organizationId: 'o', groupIds: [], status: 'vacant',
      isTemporary: false, gridCell: { col, row: 0 },
    })),
    reportLines: [{ fromId: 'a', toId: 'b', kind: 'admin' }],
  };
}
async function mount() {
  const diagram = await OrgHierarchyDiagram.create(document.createElement('div'), {
    data: data(), theme: 'light', useWorker: false, motionBlur: false,
  });
  diagrams.push(diagram);
  return diagram;
}

describe('OrgHierarchyDiagram emphasis', () => {
  it('success: highlight drives existing slot state and repaint without rebuilding', async () => {
    const diagram = await mount();
    const node = diagram.getNode({ kind: 'position', id: 'a' });
    const repaint = rstest.spyOn(DiagramRenderer.prototype, 'repaintHighlight');
    const render = rstest.spyOn(DiagramRenderer.prototype, 'render');
    diagram.highlightPath('a');
    expect(diagram['emphasis'].highlight).toBe('a');
    expect(node?.getState().hovered).toBe(true);
    expect(repaint).toHaveBeenLastCalledWith('a', null, data().reportLines, expect.anything());
    diagram.highlightPath('b');
    expect(node?.getState().hovered).toBe(false);
    diagram.highlightPath('');
    expect(diagram['emphasis'].highlight).toBeNull();
    expect(repaint).toHaveBeenCalledTimes(3);
    expect(render).not.toHaveBeenCalled();
  });

  it('success: expands bare ids and preserves typed keys before repaint', async () => {
    const diagram = await mount();
    const repaint = rstest.spyOn(DiagramRenderer.prototype, 'repaintHighlight');
    diagram.setFoundFocus(['a', 'person:b', '', 'a']);
    const expected = new Set(['position:a', 'organization:a', 'person:a', 'person:b']);
    expect(diagram['emphasis'].found).toEqual(expected);
    expect(repaint).toHaveBeenLastCalledWith(null, expected, data().reportLines, expect.anything());
    expect(repaint.mock.calls[0]?.[1]).toBe(diagram['emphasis'].found);
    diagram.setFoundFocus(null);
    expect(diagram['emphasis'].found).toBeNull();
    expect(repaint).toHaveBeenLastCalledWith(null, null, data().reportLines, expect.anything());
    expect(repaint).toHaveBeenCalledTimes(2);
  });

  it('failure: setData clears both fields even when highlighted and found ids survive', async () => {
    const diagram = await mount();
    diagram.setFoundFocus('a');
    diagram.highlightPath('a');
    expect(diagram['emphasis'].state).toEqual({
      found: new Set(['position:a', 'organization:a', 'person:a']), highlight: 'a',
    });
    await diagram.setData(data());
    expect(diagram.getNode({ kind: 'position', id: 'a' })).not.toBeNull();
    expect(diagram['emphasis'].state).toEqual({ found: null, highlight: null });
    expect(diagram.getNode({ kind: 'position', id: 'a' })?.getState().hovered).toBe(false);
    const repaint = rstest.spyOn(DiagramRenderer.prototype, 'repaintHighlight');
    diagram.highlightPath(null);
    expect(repaint).toHaveBeenLastCalledWith(null, null, data().reportLines, expect.anything());
  });

  it('success: emphasis and interaction have independent state owners', async () => {
    const diagram = await mount();
    const changed = rstest.fn();
    diagram.subscribeInteraction(changed);
    diagram.setFoundFocus('a');
    diagram.highlightPath('a');
    expect(diagram['emphasis'].highlight).toBe('a');
    expect(diagram['emphasis'].found).not.toBeNull();
    expect(changed).not.toHaveBeenCalled();
    diagram.setHovered({ kind: 'position', id: 'b' });
    expect(changed).toHaveBeenCalledExactlyOnceWith({
      selected: [], primary: null, hovered: { kind: 'position', id: 'b' },
    });
    expect(diagram['emphasis'].highlight).toBe('a');
  });
});
