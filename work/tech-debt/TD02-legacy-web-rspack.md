# TD02 — Legacy `packages/web` (Rspack)

**Пріоритет:** низький  
**Статус:** відкрито  
**Дата:** 2026-08-20

## Опис

Існує частковий scaffold demo у `packages/web/` з **Rspack**, тоді як у вимогах зафіксовано **Rsbuild** як bundler для SDK і demo.

```
packages/web/
  rspack.config.mjs
  index.html
  public/styles.css
```

SDK уже має `packages/sdk/rsbuild.config.ts`, але повноцінного demo app немає.

## Наслідки

- Дублювання конфігурації bundler
- Плутанина для розробників: який пакет є entry point demo
- Rspack scaffold не інтегрований з WASM contour / OrgHierarchyDiagram

## Рекомендовані дії

1. Створити `packages/demo` або розширити `packages/sdk` dev mode (див. T06)
2. Перенести корисне з `packages/web` (HTML, CSS) у Rsbuild demo
3. Архівувати або видалити `packages/web` після міграції
4. Оновити root `package.json` scripts

## Критерії закриття

- [ ] Demo працює на Rsbuild
- [ ] `packages/web` видалено або переміщено в `archive/`
- [ ] README вказує єдиний спосіб запуску demo
