import { afterEach, beforeEach, describe, expect, it, rstest } from '@rstest/core';
import { OrgHierarchyDiagram } from './OrgHierarchyDiagram.js';
import { emptyDiagramData } from './data/types.js';
import { DiagramRenderer } from './render/DiagramRenderer.js';
import type { NodeRef } from './core/index.js';
import type { SelectionPointerMods } from './interaction/selection.js';
import type { ReactPromoteOverlayOptions } from './react/createReactPromoteOverlay.js';

const diagrams: OrgHierarchyDiagram[] = [];
const mediaTemplate = window.matchMedia('screen');
beforeEach(() => {
  rstest.spyOn(window, 'matchMedia').mockReturnValue({ ...mediaTemplate, matches: false });
});
afterEach(() => {
  for (const diagram of diagrams.splice(0)) diagram.destroy();
  rstest.restoreAllMocks();
});
const posRef = (id: string): NodeRef => ({ kind: 'position', id });
async function mount() {
  const diagram = await OrgHierarchyDiagram.create(document.createElement('div'), {
    data: emptyDiagramData(), theme: 'light', useWorker: false, motionBlur: false,
  });
  diagrams.push(diagram);
  return diagram;
}

describe('R2 host interaction primitives', () => {
  it('reads selection and hover by kind and id without opting in on reads', async () => {
    const source = rstest.spyOn(DiagramRenderer.prototype, 'setInteractionSource');
    const diagram = await mount();
    expect(diagram.isSelected(posRef('a'))).toBe(false);
    expect(diagram.isHovered(posRef('a'))).toBe(false);
    expect(source).not.toHaveBeenCalled();
    await diagram.select(posRef('a'));
    diagram.setHovered(posRef('b'));
    expect(diagram.isSelected(posRef('a'))).toBe(true);
    expect(diagram.isSelected(posRef('b'))).toBe(false);
    expect(diagram.isSelected({ kind: 'organization', id: 'a' })).toBe(false);
    expect(diagram.isHovered(posRef('b'))).toBe(true);
    expect(diagram.isHovered(posRef('a'))).toBe(false);
    expect(diagram.isHovered({ kind: 'organization', id: 'b' })).toBe(false);
    await diagram.select(null);
    diagram.setHovered(null);
    expect(diagram.isSelected(posRef('a'))).toBe(false);
    expect(diagram.isHovered(posRef('b'))).toBe(false);
  });
  it('uses pointer modifiers to add, toggle off, and replace selection', async () => {
    const diagram = await mount();
    const shift = { shiftKey: true, ctrlKey: false, metaKey: false };
    await diagram.select(posRef('a'));
    diagram.selectNode(posRef('b'), shift);
    expect(diagram.getSelections()).toEqual([posRef('a'), posRef('b')]);
    diagram.selectNode(posRef('a'), shift);
    expect(diagram.getSelections()).toEqual([posRef('b')]);
    diagram.selectNode(posRef('c'));
    expect(diagram.getSelections()).toEqual([posRef('c')]);
  });

  it('composes the host seam with the same hover and selection consumed by Pixi', async () => {
    const source = rstest.spyOn(DiagramRenderer.prototype, 'setInteractionSource');
    const repaint = rstest.spyOn(DiagramRenderer.prototype, 'repaintSelection');
    const diagram = await mount();
    const interaction = {
      isSelected: (id) => diagram.isSelected(posRef(id)),
      isHovered: (id) => diagram.isHovered(posRef(id)),
      subscribe: (callback) => diagram.subscribeInteraction(callback),
      select: (id, mods?: SelectionPointerMods) => diagram.selectNode(posRef(id), mods),
      hover: (id, on) => diagram.setHovered(on ? posRef(id) : null),
    } satisfies NonNullable<ReactPromoteOverlayOptions['interaction']>;
    const changed = rstest.fn();
    const unsubscribe = interaction.subscribe(changed);
    interaction.select('a');
    expect(interaction.isSelected('a')).toBe(true);
    expect(repaint).toHaveBeenLastCalledWith([posRef('a')]);
    interaction.hover('b', true);
    expect(interaction.isHovered('b')).toBe(true);
    const rendererSource = source.mock.calls[0]?.[0];
    expect(rendererSource?.getHovered()).toEqual(posRef('b'));
    rendererSource?.setHovered(posRef('a'));
    expect(interaction.isHovered('a')).toBe(true);
    expect(interaction.isHovered('b')).toBe(false);
    interaction.hover('a', false);
    expect(rendererSource?.getHovered()).toBeNull();
    expect(changed).toHaveBeenCalledTimes(4);
    unsubscribe();
    interaction.hover('a', true);
    expect(changed).toHaveBeenCalledTimes(4);
  });

});
