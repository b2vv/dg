import { defineConfig } from '@rstest/core';

/**
 * The migration's one real unknown was the WASM load in `beforeAll` — jsdom and
 * setup files already run under rstest in another project here. It survives:
 * all 697 tests pass, including every contour suite that calls into the module.
 */
export default defineConfig({
  testEnvironment: 'jsdom',
  // ⚠️ `*.measure.test.ts` **не** в дефолтній сюїті, і це вимір, а не смак.
  // Перф-проби тут не вміють відрізнити дефект від сусіднього процесу: під
  // двома паралельними сюїтами лінійна валідація 200k роздувається ×40
  // (271 мс → 10 846 мс), а квадратична всього в 30–60 разів дорожча за
  // лінійну. Тобто смуга шуму накриває смугу дефекту, і жодна стеля не сидить
  // між ними. Прецедент той самий, що в e2e: `t87-motion` і `t92-software-pan`
  // винесені з прогону з тієї ж причини.
  //
  // Запуск: `npm run measure -w @org-hierarchy/sdk`.
  include: ['src/**/*.test.ts'],
  exclude: process.env.MEASURE ? [] : ['src/**/*.measure.test.ts'],
  setupFiles: ['./rstest.setup.ts'],
  testTimeout: 15_000,
  globals: true,
});
