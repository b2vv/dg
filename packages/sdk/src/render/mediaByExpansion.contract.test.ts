import { describe, expect, it } from '@rstest/core';
import { OrgHierarchyDiagram } from '../index.js';

/**
 * T97 §В3, rows 18-23: images load for **expanded** organisations, not for the
 * whole dataset.
 *
 * The main path already behaved: a collapsed branch is not laid out, so no card
 * is built and the renderer never asks for its texture. `prefetchConfiguredMedia`
 * was the exception — it walked every organisation and every person regardless
 * of `collapsed`, and it only runs when a host opts into `prefetchMediaThemeKeys`,
 * which is exactly the host that cares about the bill.
 */

const ORG_IMG = 'https://example.test/org-';
const FACE_IMG = 'https://example.test/face-';

function data() {
  return {
    organizations: [
      { id: 'root', name: 'Root', groupIds: [], collapsed: false, matrixOrder: 0, symbolUrl: `${ORG_IMG}root.png` },
      // Closed: everything under it is out of sight, so out of budget.
      { id: 'shut', name: 'Shut', parentOrgId: 'root', groupIds: [], collapsed: true, matrixOrder: 1, symbolUrl: `${ORG_IMG}shut.png` },
      { id: 'under', name: 'Under', parentOrgId: 'shut', groupIds: [], collapsed: false, matrixOrder: 2, symbolUrl: `${ORG_IMG}under.png` },
      { id: 'open', name: 'Open', parentOrgId: 'root', groupIds: [], collapsed: false, matrixOrder: 3, symbolUrl: `${ORG_IMG}open.png` },
      // No media at all — must produce no request and no error (row 22).
      { id: 'bare', name: 'Bare', parentOrgId: 'root', groupIds: [], collapsed: false, matrixOrder: 4 },
    ],
    groups: [],
    departments: [],
    persons: [
      { id: 'p-open', fullName: 'Open Person', photoUrl: `${FACE_IMG}open.png` },
      { id: 'p-under', fullName: 'Hidden Person', photoUrl: `${FACE_IMG}under.png` },
    ],
    positions: [
      { id: 'pos-open', title: 'Open seat', organizationId: 'open', groupIds: [], personId: 'p-open', status: 'filled' as const, isTemporary: false, isHead: true },
      { id: 'pos-under', title: 'Hidden seat', organizationId: 'under', groupIds: [], personId: 'p-under', status: 'filled' as const, isTemporary: false, isHead: true },
    ],
    reportLines: [],
    orgLinks: [] as const,
  };
}

/** Mount with theme prefetch on — the only path that reaches the whole dataset. */
async function mount() {
  const container = document.createElement('div');
  container.style.width = '800px';
  container.style.height = '600px';
  document.body.appendChild(container);
  const diagram = await OrgHierarchyDiagram.create(container, {
    data: data(),
    useWorker: false,
    prefetchMediaThemeKeys: ['dark'],
  });
  const asked: string[] = [];
  const media = (diagram as unknown as {
    mediaService: { loadTexture: (url: string, rev?: string | number) => Promise<null> };
  }).mediaService;
  media.loadTexture = async (url: string) => {
    asked.push(url);
    return null;
  };
  return { container, diagram, asked };
}

describe('media loads by expansion (T97 rows 18-23)', () => {
  it('row 18: a collapsed branch asks for no organisation image', async () => {
    const { diagram, asked } = await mount();
    await diagram.setTheme('light');

    expect(asked.some((u) => u.includes('org-under'))).toBe(false);
    // The closed organisation itself is visible — it is its children that are not.
    expect(asked.some((u) => u.includes('org-open'))).toBe(true);
    diagram.destroy();
  });

  it('row 19: nor for the people inside it', async () => {
    const { diagram, asked } = await mount();
    await diagram.setTheme('light');

    // A person is reachable only through a position, so a closed org takes its
    // people with it — this half was missing entirely before T97's defense.
    expect(asked.some((u) => u.includes('face-under'))).toBe(false);
    expect(asked.some((u) => u.includes('face-open'))).toBe(true);
    diagram.destroy();
  });

  it('row 20: opening the branch is what asks for its images', async () => {
    const { diagram, asked } = await mount();
    await diagram.setTheme('light');
    expect(asked.some((u) => u.includes('org-under'))).toBe(false);

    asked.length = 0;
    await diagram.expandOrg('shut');

    expect(asked.some((u) => u.includes('org-under'))).toBe(true);
    expect(asked.some((u) => u.includes('face-under'))).toBe(true);
    diagram.destroy();
  });

  it('row 22: an organisation with no media asks for nothing and throws nothing', async () => {
    const { diagram, asked } = await mount();
    await diagram.setTheme('light');
    expect(asked.some((u) => u.includes('bare'))).toBe(false);
    diagram.destroy();
  });

  it('row 23: at far zoom nothing loads at all, and expansion has nothing to do with it', async () => {
    // The two gates do not fight, and this says so rather than leaving it to
    // coincidence. Below farMax the card draws no image at all — that is M6,
    // asserted in OrganizationNode.test.ts — so prefetching one would be work
    // for a texture nobody is going to show. Expansion decides *which* images
    // may load; the LOD decides *whether any* are wanted.
    const { diagram, asked } = await mount();
    diagram.setZoom(0.2); // farMax is 0.45
    await diagram.setTheme('light');
    expect(asked).toEqual([]);

    // Back within reach, the expansion rule applies again — unchanged.
    asked.length = 0;
    diagram.setZoom(1.5);
    await diagram.setTheme('dark');
    expect(asked.some((u) => u.includes('org-open'))).toBe(true);
    expect(asked.some((u) => u.includes('org-under'))).toBe(false);
    diagram.destroy();
  });

  it('failure: a cycle in parentOrgId is refused before anything can walk it', async () => {
    // T97 row 10 assumed the depth walk would have to survive a cycle. It never
    // sees one: validateOrgHierarchy rejects the data at create, by name. The
    // guard inside the visibility walk stays as defence in depth for data that
    // arrives by another door, but the contract the row should state is this.
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.height = '600px';
    document.body.appendChild(container);
    const looped = data();
    looped.organizations = [
      { id: 'a', name: 'A', parentOrgId: 'b', groupIds: [], collapsed: false, matrixOrder: 0, symbolUrl: `${ORG_IMG}a.png` },
      { id: 'b', name: 'B', parentOrgId: 'a', groupIds: [], collapsed: false, matrixOrder: 1, symbolUrl: `${ORG_IMG}b.png` },
    ];
    looped.positions = [];
    looped.persons = [];
    await expect(
      OrgHierarchyDiagram.create(container, { data: looped, useWorker: false }),
    ).rejects.toThrow(/[Cc]ycle/);
  });
});
