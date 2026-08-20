import { describe, it, expect, beforeEach } from 'vitest';
import {
  HierarchyBuilder,
  buildFromFlat,
  computeLayout,
  renderSvg,
  renderHtml,
  DuplicateNodeError,
  HierarchyError,
  resetIdCounter,
} from '../src/index.js';

beforeEach(() => {
  resetIdCounter();
});

describe('HierarchyBuilder', () => {
  it('будує просте дерево', () => {
    const root = HierarchyBuilder.create('ceo')
      .label('Генеральний директор')
      .type('root')
      .position('CEO')
      .person('Іван Петренко')
      .child('cto', (b) =>
        b
          .label('Технічний директор')
          .type('position')
          .position('CTO')
          .person('Олена Коваленко'),
      )
      .build();

    expect(root.id).toBe('ceo');
    expect(root.children).toHaveLength(1);
    expect(root.children[0].person).toBe('Олена Коваленко');
    expect(root.descendantCount()).toBe(1);
  });

  it('визначає вакантну посаду без person', () => {
    const root = HierarchyBuilder.create('vacant-pos')
      .label('Менеджер проєктів')
      .position('PM')
      .build();

    expect(root.status).toBe('vacant');
  });

  it('кидає помилку при дублікаті id', () => {
    expect(() =>
      HierarchyBuilder.create('a').child('x').child('x'),
    ).toThrow(DuplicateNodeError);
  });

  it('серіалізує та десеріалізує', () => {
    const builder = HierarchyBuilder.create('root')
      .label('Root')
      .child('c1', (b) => b.label('Child'));
    const json = builder.serialize();
    const restored = HierarchyBuilder.fromJSON(json).build();

    expect(restored.id).toBe('root');
    expect(restored.children[0].label).toBe('Child');
  });

  it('переміщує вузол', () => {
    const root = HierarchyBuilder.create('root')
      .label('Root')
      .child('a', (b) => b.label('A').child('b', (b2) => b2.label('B')))
      .child('c', (b) => b.label('C'))
      .moveTo('b', 'c')
      .build();

    const c = root.findById('c')!;
    expect(c.children[0].id).toBe('b');
  });
});

describe('buildFromFlat', () => {
  it('будує з плоского списку', () => {
    const root = buildFromFlat([
      { id: '1', label: 'CEO', person: 'Alice' },
      { id: '2', parentId: '1', label: 'CTO', person: 'Bob' },
      { id: '3', parentId: '1', label: 'CFO', person: 'Carol' },
      { id: '4', parentId: '2', label: 'Dev Lead', person: 'Dave' },
    ]);

    expect(root.children).toHaveLength(2);
    expect(root.findById('4')?.parent?.id).toBe('2');
  });

  it('кидає помилку без кореня', () => {
    expect(() =>
      buildFromFlat([
        { id: '1', parentId: '2', label: 'A' },
        { id: '2', parentId: '1', label: 'B' },
      ]),
    ).toThrow(HierarchyError);
  });
});

describe('TreeLayout', () => {
  it('розраховує координати без перекриття', () => {
    const root = HierarchyBuilder.create('r')
      .label('Root')
      .child('a', (b) => b.label('A'))
      .child('b', (b) => b.label('B'))
      .child('c', (b) => b.label('C'))
      .build();

    const layout = computeLayout(root);
    expect(layout.nodes).toHaveLength(4);
    expect(layout.edges).toHaveLength(3);
    expect(layout.width).toBeGreaterThan(0);
    expect(layout.height).toBeGreaterThan(0);

    const xs = layout.nodes.map((n) => n.x);
    const uniqueXs = new Set(xs);
    expect(uniqueXs.size).toBe(xs.length);
  });

  it('підтримує горизонтальний напрямок', () => {
    const root = HierarchyBuilder.create('r')
      .label('Root')
      .child('a', (b) => b.label('A'))
      .build();

    const layout = computeLayout(root, { direction: 'horizontal' });
    const rootNode = layout.nodes.find((n) => n.id === 'r')!;
    const childNode = layout.nodes.find((n) => n.id === 'a')!;
    expect(childNode.x).toBeGreaterThan(rootNode.x);
  });
});

describe('Renderers', () => {
  const sample = () =>
    HierarchyBuilder.create('ceo')
      .label('Директор')
      .person('Іван')
      .child('dev', (b) =>
        b.label('Розробник').person('Петро').child('vac', (b2) =>
          b2.label('QA').position('Тестувальник').status('vacant'),
        ),
      )
      .build();

  it('генерує валідний SVG', () => {
    const svg = renderSvg(sample());
    expect(svg).toContain('<svg');
    expect(svg).toContain('Директор');
    expect(svg).toContain('Вакантна посада');
    expect(svg).toContain('org-edge');
  });

  it('генерує HTML', () => {
    const html = renderHtml(sample());
    expect(html).toContain('org-chart-container');
    expect(html).toContain('data-node-id="ceo"');
    expect(html).toContain('org-node__vacant');
  });
});
