import { describe, expect, it } from '@rstest/core';
import type { DiagramData } from '../data/types.js';
import { buildDiagramSvg } from './svgExport.js';

describe('SVG export department routing', () => {
  it('wires the v2 flag through staff layout and routing', async () => {
    const currentOrgId = 'org';
    const data: DiagramData = {
      organizations: [{ id: currentOrgId, name: 'Organization', groupIds: [] }],
      groups: [],
      departments: [
        { id: 'a', name: 'Department A', organizationId: currentOrgId },
        { id: 'b', name: 'Department B', organizationId: currentOrgId },
      ],
      persons: [],
      positions: ['a1', 'b1', 'a2', 'b2'].map((id) => ({
        id,
        title: id,
        organizationId: currentOrgId,
        departmentId: id.startsWith('a') ? 'a' : 'b',
        groupIds: [],
        status: 'vacant',
        isTemporary: false,
      })),
      reportLines: [
        { fromId: 'a1', toId: 'b1', kind: 'admin' },
        { fromId: 'b1', toId: 'a2', kind: 'admin' },
        { fromId: 'a2', toId: 'b2', kind: 'admin' },
      ],
    };

    const v2 = await buildDiagramSvg({ data, currentOrgId, config: { staffEdgeRouter: 'v2' } });
    const legacy = await buildDiagramSvg({ data, currentOrgId, config: {} });

    for (const svg of [v2, legacy]) {
      expect(svg).toContain('<g id="edges">');
      expect(svg).toMatch(/<g id="edges">\s*<path d=/);
    }
    expect(v2).not.toEqual(legacy);
  });
});
