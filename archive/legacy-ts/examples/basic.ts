import { writeFileSync } from 'node:fs';
import {
  HierarchyBuilder,
  buildFromFlat,
  renderSvg,
  renderHtml,
  DEFAULT_CSS,
} from '../src/index.js';

/** Приклад штатно-посадової структуры IT-компанії */
const orgChart = HierarchyBuilder.create('ceo')
  .label('ТОВ «ТехІнновації»')
  .type('root')
  .position('Генеральний директор')
  .person('Сидorenко Андрій Вікторович')
  .child('coo', (b) =>
    b
      .label('Операційний відділ')
      .type('department')
      .department('Операційний блок')
      .position('Операційний директор')
      .person('Мельnyk Оksана Ігорівна')
      .child('hr', (b2) =>
        b2
          .label('HR-відділ')
          .type('department')
          .department('HR')
          .position('HR-менеджер')
          .person('Бondarenko Natalia'),
      )
      .child('finance', (b2) =>
        b2
          .label('Фінансовий відділ')
          .type('department')
          .department('Фінанси')
          .position('Головний бухгалтер')
          .status('vacant'),
      ),
  )
  .child('cto', (b) =>
    b
      .label('IT-департамент')
      .type('department')
      .department('IT')
      .position('Технічний директор')
      .person('Kovalenko Dmytro')
      .child('backend', (b2) =>
        b2
          .label('Backend-команда')
          .type('department')
          .department('Backend')
          .position('Team Lead')
          .person('Shevchenko Taras')
          .child('dev1', (b3) =>
            b3.label('Senior Developer').type('position').position('Senior Backend Dev').person('Ivanov Oleksii'),
          )
          .child('dev2', (b3) =>
            b3.label('Middle Developer').type('position').position('Middle Backend Dev').person('Petrov Mykola'),
          ),
      )
      .child('frontend', (b2) =>
        b2
          .label('Frontend-команда')
          .type('department')
          .department('Frontend')
          .position('Team Lead')
          .status('acting')
          .person('Moroz Anna'),
      )
      .child('qa', (b2) =>
        b2
          .label('QA-відділ')
          .type('department')
          .department('QA')
          .position('QA Lead')
          .status('vacant'),
      ),
  )
  .build();

console.log('=== Штатна структура (JSON) ===');
console.log(HierarchyBuilder.fromInput(orgChart.toInput()).serialize());

console.log('\n=== Побудова з плоского списку ===');
const flatOrg = buildFromFlat([
  { id: 'dir', label: 'Директор', person: 'А. Іванов' },
  { id: 'acc', parentId: 'dir', label: 'Бухгалтер', position: 'Бухгалтер', person: 'B. Петрова' },
  { id: 'sec', parentId: 'dir', label: 'Секретар', position: 'Секретар', status: 'vacant' },
]);
console.log(`Вузлів: ${1 + flatOrg.descendantCount()}`);

const svg = renderSvg(orgChart, {
  direction: 'vertical',
  nodeWidth: 220,
  nodeHeight: 80,
  background: '#f8fafc',
});

const html = renderHtml(orgChart, { nodeWidth: 220, nodeHeight: 80 });

writeFileSync('examples/output.svg', svg);
writeFileSync(
  'examples/output.html',
  `<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <title>Штатно-посадова структура</title>
  <style>${DEFAULT_CSS}</style>
</head>
<body>
  <h1>Штатно-посадова структура</h1>
  ${html}
</body>
</html>`,
);

console.log('\n✓ Збережено: examples/output.svg, examples/output.html');
