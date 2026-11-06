import { readFileSync } from 'node:fs';
import { afterEach, expect, it, rstest } from '@rstest/core';
import { act, createElement } from 'react';
import { emptyDiagramData, OrgHierarchyDiagram } from '@org-hierarchy/sdk';
import * as reactHost from '@org-hierarchy/sdk/react';
import { App } from './App.js';

let diagram: OrgHierarchyDiagram | undefined;
let overlay: reactHost.ReactPromoteOverlay | undefined;

afterEach(() => {
  act(() => overlay?.dispose());
  diagram?.destroy();
  rstest.restoreAllMocks();
  document.body.innerHTML = '';
  window.history.replaceState(null, '', '/');
});

it('connects demo card selection and hover to the diagram interaction state', async () => {
  document.documentElement.innerHTML = readFileSync('src/index.html', 'utf8');
  window.history.replaceState(null, '', '/?tab=variant-b&promote=near-visible');
  const media = window.matchMedia('screen');
  rstest.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: false });
  diagram = await OrgHierarchyDiagram.create(document.createElement('div'), {
    data: emptyDiagramData(), useWorker: false, motionBlur: false,
  });
  const liveDiagram = diagram;
  rstest.spyOn(OrgHierarchyDiagram, 'create').mockResolvedValue(liveDiagram);
  rstest.spyOn(liveDiagram, 'getViewport').mockReturnValue({ x: 0, y: 0, scale: 1 });
  rstest.spyOn(liveDiagram, 'getLodLevel').mockReturnValue('near');
  rstest.spyOn(liveDiagram, 'getScreenSize').mockReturnValue({ width: 800, height: 600 });
  rstest.spyOn(liveDiagram, 'listPromoteBoxes').mockReturnValue([
    { id: 'seat-a', kind: 'position', x: 10, y: 20, width: 100, height: 60 },
  ]);
  rstest.spyOn(liveDiagram, 'listPromoteCandidates').mockReturnValue([{
    id: 'seat-a', kind: 'position',
    world: { x: 10, y: 20, width: 100, height: 60 },
    node: { ref: { kind: 'position', id: 'seat-a' } },
  }]);
  const select = rstest.spyOn(liveDiagram, 'selectNode');
  const hover = rstest.spyOn(liveDiagram, 'setHovered');
  const createOverlay = reactHost.createReactPromoteOverlay;
  let card: reactHost.PromoteSlotProps | undefined;
  const construction = rstest.spyOn(reactHost, 'createReactPromoteOverlay').mockImplementation((options) => {
    overlay = createOverlay({
      ...options,
      component: (props) => {
        card = props;
        return createElement(options.component, props);
      },
    });
    return overlay;
  });
  await act(async () => { await new App().init(); });
  expect(construction).toHaveBeenCalledTimes(1);
  expect(construction.mock.calls[0]?.[0].interaction).toBeDefined();
  expect(card).toBeDefined();
  if (!card) throw new Error('Demo card was not rendered');
  expect(card.selected).toBe(false);
  expect(card.hovered).toBe(false);

  const mods = { ctrlKey: true, metaKey: false, shiftKey: false };
  act(() => card?.onSelect(mods));
  expect(select).toHaveBeenLastCalledWith({ kind: 'position', id: 'seat-a' }, mods);
  expect(card.selected).toBe(true);
  act(() => card?.onSelect(mods));
  expect(card.selected).toBe(false);
  await act(async () => { await liveDiagram.select({ kind: 'position', id: 'seat-a' }); });
  expect(card.selected).toBe(true);

  act(() => card?.onHover(true));
  expect(hover).toHaveBeenLastCalledWith({ kind: 'position', id: 'seat-a' });
  expect(card.hovered).toBe(true);
  act(() => card?.onHover(false));
  expect(hover).toHaveBeenLastCalledWith(null);
  expect(card.hovered).toBe(false);
  await act(async () => { await liveDiagram.select({ kind: 'organization', id: 'seat-a' }); });
  expect(card.selected).toBe(false);
});
