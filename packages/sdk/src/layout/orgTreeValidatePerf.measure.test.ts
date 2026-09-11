import { describe, expect, it } from '@rstest/core';
import { validateOrgHierarchy } from './orgTree.js';
import type { DiagramOrganization } from '../data/types.js';

/**
 * ⚠️ **Не входить у дефолтну сюїту** (`rstest.config.ts` → `exclude`). Запуск:
 * `npm run measure -w @org-hierarchy/sdk`, і бажано без паралельних прогонів.
 *
 * T77-M08 — валідація O(n): `byId` і три-кольоровий DFS будуються раз на виклик.
 *
 * 🔴 **Друга редакція, і перша була недійсною під навантаженням.** Тут стояло
 * `20 000 < 500 мс` — стабільно поодинці, **червоно в повному прогоні**: у
 * контендованій сюїті годинник міряє машину, а не алгоритм (T101, ризик 12).
 *
 * ⚠️ Частку (`n` проти `4n`) теж спробували й **виміряли як недійсну**: на
 * 20k→80k вона дає 4,45 … 6,54 у спокої, **8,42** під однією паралельною
 * сюїтою і **14,2** під двома, тоді як навмисно квадратична версія (`ids` як
 * масив із `includes`) дає **16,7 … 19,2**. Тобто під навантаженням лінійне й
 * квадратичне змикаються, і частка перестає розділяти.
 *
 * Що лишилось: **розмір, на якому дефект відстоїть на порядки, а не в рази.**
 * 200 000 орг лінійно коштують 183 … 271 мс у спокої й 180 … 255 мс під
 * паралельною сюїтою (вимір стабільний саме тому, що робота велика), а
 * квадратична перевірка належності — 2·10¹⁰ кроків, тобто хвилини. Стеля 4 000
 * мс сидить ×15 над найгіршим виміряним і на **три порядки** під дефектом.
 */
const CEILING_MS = 4_000;
const SIZE = 200_000;

function chain(n: number): DiagramOrganization[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `org-${i}`,
    name: `Org ${i}`,
    groupIds: [] as string[],
    ...(i > 0 ? { parentOrgId: `org-${i - 1}` } : {}),
  }));
}

function flat(n: number): DiagramOrganization[] {
  return [
    { id: 'root', name: 'Root', groupIds: [] },
    ...Array.from({ length: n }, (_, i) => ({
      id: `org-${i}`,
      name: `Org ${i}`,
      groupIds: [] as string[],
      parentOrgId: 'root',
    })),
  ];
}

function validateMs(orgs: DiagramOrganization[]): number {
  const started = performance.now();
  validateOrgHierarchy(orgs);
  return performance.now() - started;
}

describe('validateOrgHierarchy at scale', () => {
  it('success: a 200k-deep chain validates in milliseconds, not in minutes', () => {
    expect(validateMs(chain(SIZE))).toBeLessThan(CEILING_MS);
  }, 30_000);

  it('success: 200k flat siblings validate too', () => {
    expect(validateMs(flat(SIZE))).toBeLessThan(CEILING_MS);
  }, 30_000);

});
