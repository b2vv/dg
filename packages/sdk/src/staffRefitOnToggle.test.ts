import { describe, expect, it, rstest } from '@rstest/core';
import {
  OrgHierarchyDiagram,
  computeStaffFit,
  type PixiHost,
  type OrgHierarchyConfig,
} from './index.js';
import type { DiagramData } from './data/types.js';

function treeData(): DiagramData {
  return {
    organizations: [{ id: 'org', name: 'Org', groupIds: [], collapsed: false }],
    groups: [],
    departments: [],
    persons: [{ id: 'person', fullName: 'Ada Lovelace' }],
    positions: ['head', 'manager', 'target'].map((id) => ({
      id,
      title: id,
      organizationId: 'org',
      groupIds: [],
      status: 'filled',
      isTemporary: false,
      expanded: false,
      ...(id === 'head' ? { isHead: true } : {}),
      ...(id === 'target' ? { personId: 'person' } : {}),
    })),
    reportLines: [
      { fromId: 'head', toId: 'manager', kind: 'admin' },
      { fromId: 'manager', toId: 'target', kind: 'admin' },
    ],
  };
}

async function mount(options: Partial<OrgHierarchyConfig> = {}) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: treeData(),
    useWorker: false,
    staffCurrentOrgId: 'org',
    ...options,
  });
  const host = (diagram as unknown as { host: PixiHost }).host;
  return {
    diagram,
    host,
    cleanup: () => {
      diagram.destroy();
      container.remove();
    },
  };
}

const box = { x: 100, y: 200, width: 1000, height: 1500, name: 'Org' };
const screen = { width: 800, height: 600 };

describe('staffRefitOnToggle', () => {
  for (const option of [undefined, false, true]) {
    it(`pans on expand and collapse when option=${option} and chrome is absent`, async () => {
      const m = await mount({ staffRefitOnToggle: option });
      const pan = rstest.spyOn(m.host, 'panTo').mockImplementation(() => undefined);
      const animate = rstest.spyOn(m.host, 'animateViewport');
      rstest.spyOn(m.diagram, 'getStaffChromeGeometry').mockReturnValue(null);
      try {
        for (const expanded of [true, false]) {
          expect(await m.diagram.togglePositionExpand('head')).toBe(expanded);
          const center = m.diagram.nodeCanvasPoint('head');
          expect(center).not.toBeNull();
          const viewport = m.diagram.getViewport();
          expect(pan).toHaveBeenLastCalledWith(
            expect.closeTo((center!.x - viewport.x) / viewport.scale),
            expect.closeTo((center!.y - viewport.y) / viewport.scale),
            { animate: true },
          );
        }
        expect(pan).toHaveBeenCalledTimes(2);
        expect(animate).not.toHaveBeenCalled();
      } finally {
        m.cleanup();
      }
    });
  }

  for (const option of [undefined, false, true, { padding: 10 }]) {
    it(`uses the configured camera policy with chrome: ${JSON.stringify(option)}`, async () => {
      const m = await mount({ staffRefitOnToggle: option });
      rstest
        .spyOn(m.diagram, 'getStaffChromeGeometry')
        .mockReturnValue({ org: box, depts: [], lines: [], nodeBoxes: {} });
      rstest.spyOn(m.diagram, 'getScreenSize').mockReturnValue(screen);
      const pan = rstest.spyOn(m.host, 'panTo').mockImplementation(() => undefined);
      const events: unknown[] = [];
      const animate = rstest.spyOn(m.host, 'animateViewport').mockImplementation((target) => {
        events.push(['animate', m.diagram.getViewport(), target]);
        m.host.setViewport(target);
      });
      const unsubscribe = m.diagram.subscribePromoteSync((reason) => {
        if (reason === 'prepare-camera') events.push(['prepare', m.diagram.getViewport()]);
      });
      try {
        for (const expanded of [true, false]) {
          const from = { x: -300, y: -400, scale: 0.8 };
          m.diagram.setViewport(from);
          events.length = 0;
          expect(await m.diagram.togglePositionExpand('head')).toBe(expanded);
          if (option) {
            const target = computeStaffFit(box, screen, option === true ? {} : option);
            if (option !== true) expect(target).not.toEqual(computeStaffFit(box, screen));
            expect(events).toEqual([
              ['prepare', target],
              ['animate', from, target],
            ]);
            expect(m.diagram.getViewport()).toEqual(target);
            expect(pan).not.toHaveBeenCalled();
          } else {
            const center = m.diagram.nodeCanvasPoint('head');
            expect(center).not.toBeNull();
            const viewport = m.diagram.getViewport();
            expect(pan).toHaveBeenLastCalledWith(
              expect.closeTo((center!.x - viewport.x) / viewport.scale),
              expect.closeTo((center!.y - viewport.y) / viewport.scale),
              { animate: true },
            );
            expect(animate).not.toHaveBeenCalled();
            expect(events).toEqual([]);
          }
        }
      } finally {
        unsubscribe();
        m.cleanup();
      }
    });
  }
});
