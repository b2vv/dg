import { describe, expect, it, vi } from 'vitest';
import { createContourPipeline } from './pipeline.js';
import { flatRowsToDiagram, type FlatDiagramRow } from '../mappers/flatToDiagram.js';
import { mapInWorker } from './bridge.js';

describe('createContourPipeline', () => {
  it('success: pipeline step contours returns dept paths', async () => {
    const worker = {
      postMessage: vi.fn((req: { id: string; mapperKey?: string; payload: unknown }) => {
        queueMicrotask(() => {
          handler({
            data: {
              id: req.id,
              ok: true,
              result: [{ departmentId: 'IT', path: 'M 0 0 Z', points: [], cornerCount: 4 }],
            },
          });
        });
      }),
      addEventListener: vi.fn((event: string, fn: (ev: MessageEvent) => void) => {
        if (event === 'message') handler = fn;
      }),
      removeEventListener: vi.fn(),
      terminate: vi.fn(),
    } as unknown as Worker;

    let handler: (ev: MessageEvent) => void = () => {};

    const pipeline = createContourPipeline();
    const result = await pipeline.runInWorker(worker, {
      positions: [{ id: 'P1', departmentId: 'IT', col: 0, row: 0 }],
      config: { smoothIterations: 0 },
    });

    expect(Array.isArray(result.data)).toBe(true);
    expect(result.stepDurationsMs).toHaveLength(1);
  });
});

describe('mapInWorker flatRowsToDiagram', () => {
  it('success: maps 1000 org rows via mock worker', async () => {
    const rows: FlatDiagramRow[] = Array.from({ length: 1000 }, (_, i) => ({
      id: `org-${i}`,
      kind: 'organization',
      label: `Org ${i}`,
    }));

    const worker = {
      postMessage: vi.fn((req: { id: string; mapperKey?: string; payload: unknown }) => {
        queueMicrotask(() => {
          const data = flatRowsToDiagram(req.payload as FlatDiagramRow[]);
          handler({ data: { id: req.id, ok: true, result: data } });
        });
      }),
      addEventListener: vi.fn((event: string, fn: (ev: MessageEvent) => void) => {
        if (event === 'message') handler = fn;
      }),
      removeEventListener: vi.fn(),
      terminate: vi.fn(),
    } as unknown as Worker;

    let handler: (ev: MessageEvent) => void = () => {};

    const data = await mapInWorker<FlatDiagramRow[], ReturnType<typeof flatRowsToDiagram>>(
      worker,
      'flatRowsToDiagram',
      rows,
    );
    expect(data.organizations).toHaveLength(1000);
  });
});
