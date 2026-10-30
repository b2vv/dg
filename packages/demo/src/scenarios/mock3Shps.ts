import type { DiagramData } from '@org-hierarchy/sdk';
import { SHPS_SEAT, SHPS_STAFF_LAYOUT } from './shpsStaff';

/**
 * ШПС «лінії зв'язку» scene on the data of the routing reference mockup
 * (`~/Downloads/mock3/ШПС лінії зв'язку.html` + `shps-links.js`: `DEPTS` + `POS`).
 *
 * This is the R3 comparison tab (T128 T8): the same org data the mockup renders, fed through OUR
 * Rust pipeline with the A* router ON (`render.staffUseAstar`), so the owner can lay our routed lines
 * next to the mockup screens (`mock3/screenshots`). Only the DATA is taken from the third-party
 * `shps-links.js` (department ids/names, position id/parent/dept/title/worker) — never its routing
 * code. The managing-org `p2` on `da` becomes a second admin report line, exercising the bypass /
 * secondary-port path.
 */
export { SHPS_STAFF_LAYOUT as MOCK3_STAFF_LAYOUT };

const ORG_ID = 'mock3-org';

const DEPTS: ReadonlyArray<{ id: string; name: string }> = [
  { id: 'fin', name: 'Фінансовий департамент' },
  { id: 'sal', name: 'Департамент продажів' },
  { id: 'dev', name: 'Департамент розробки' },
  { id: 'ana', name: 'Аналітичний відділ' },
  { id: 'qa', name: 'Відділ контролю якості' },
  { id: 'hr', name: 'Департамент персоналу' },
  { id: 'leg', name: 'Юридичний департамент' },
  { id: 'mkt', name: 'Департамент маркетингу' },
  { id: 'lgs', name: 'Департамент логістики' },
  { id: 'sec', name: 'Служба безпеки' },
];

interface Pos {
  id: string;
  p: string | null;
  d: string | null;
  t: string;
  w: string | null;
  p2?: string;
}

const POS: ReadonlyArray<Pos> = [
  { id: 'ceo', p: null, d: null, t: 'Генеральний директор', w: 'Петренко О. В.' },
  { id: 'asst', p: 'ceo', d: null, t: 'Помічник директора', w: 'Ткач М. О.' },
  { id: 'cfo', p: 'ceo', d: 'fin', t: 'Фінансовий директор', w: 'Коваленко Т. С.' },
  { id: 'acc', p: 'cfo', d: 'fin', t: 'Головний бухгалтер', w: 'Шевчук Н. Г.' },
  { id: 'fan', p: 'cfo', d: 'fin', t: 'Фінансовий аналітик', w: null },
  { id: 'bk', p: 'acc', d: 'fin', t: 'Бухгалтер', w: 'Савчук Р. В.' },
  { id: 'bz', p: 'acc', d: 'fin', t: 'Бухгалтер з зарплати', w: 'Данилюк О. І.' },
  { id: 'bp', p: 'acc', d: 'fin', t: 'Бухгалтер з ПДВ', w: null },
  { id: 'trs', p: 'cfo', d: 'fin', t: 'Казначей', w: 'Захарчук І. М.' },
  { id: 'csh', p: 'trs', d: 'fin', t: 'Касир', w: 'Білик Т. В.' },
  { id: 'pay', p: 'trs', d: 'fin', t: 'Фахівець з платежів', w: 'Гуцал А. П.' },
  { id: 'fa2', p: 'fan', d: 'fin', t: 'Молодший аналітик', w: 'Павленко Д. С.' },
  { id: 'fa3', p: 'fan', d: 'fin', t: 'Аналітик бюджетування', w: 'Власенко Л. О.' },
  { id: 'eco', p: 'cfo', d: 'fin', t: 'Економіст', w: 'Кузьменко Р. А.' },
  { id: 'pln', p: 'eco', d: 'fin', t: 'Фінансовий планувальник', w: null },
  { id: 'ctl', p: 'cfo', d: 'fin', t: 'Фінансовий контролер', w: 'Степаненко М. Ю.' },
  { id: 'aud', p: 'acc', d: null, t: 'Внутрішній аудитор', w: 'Олійник В. П.' },
  { id: 'cco', p: 'ceo', d: 'sal', t: 'Комерційний директор', w: 'Гнатюк С. П.' },
  { id: 's1', p: 'cco', d: 'sal', t: 'Менеджер з продажів', w: 'Марченко О. Л.' },
  { id: 's2', p: 'cco', d: 'sal', t: 'Менеджер з продажів', w: null },
  { id: 'cto', p: 'ceo', d: 'dev', t: 'Технічний директор', w: 'Мельник А. С.' },
  { id: 'tlb', p: 'cto', d: 'dev', t: 'Тімлід бекенду', w: 'Бондар Д. І.' },
  { id: 'tlf', p: 'cto', d: 'dev', t: 'Тімлід фронтенду', w: 'Левченко І. А.' },
  { id: 'd1', p: 'tlb', d: 'dev', t: 'Розробник', w: 'Кравець Ю. М.' },
  { id: 'd2', p: 'tlb', d: 'dev', t: 'Розробник', w: 'Литвин П. О.' },
  { id: 'ah', p: 'cfo', d: 'ana', t: 'Керівник аналітики', w: 'Сидоренко В. М.' },
  { id: 'da', p: 'ah', p2: 'ceo', d: 'ana', t: 'Аналітик даних', w: 'Руденко К. В.' },
  { id: 'bi', p: 'cto', d: 'ana', t: 'BI-аналітик', w: 'Мороз Є. С.' },
  { id: 'qh', p: 'tlb', d: 'qa', t: 'Керівник QA', w: 'Поліщук Г. Р.' },
  { id: 'q1', p: 'qh', d: 'qa', t: 'QA-інженер', w: 'Ковальчук А. Б.' },
  { id: 'q2', p: 'qh', d: 'qa', t: 'Інженер з автотестів', w: 'Романенко В. Д.' },
  { id: 'hrd', p: 'ceo', d: 'hr', t: 'Директор з персоналу', w: 'Тарасенко О. М.' },
  { id: 'rec', p: 'hrd', d: 'hr', t: 'Рекрутер', w: 'Іваненко С. О.' },
  { id: 'trn', p: 'hrd', d: 'hr', t: 'Менеджер з навчання', w: null },
  { id: 'hrb', p: 'hrd', d: 'hr', t: 'HR бізнес-партнер', w: 'Клименко Н. В.' },
  { id: 'rc2', p: 'rec', d: 'hr', t: 'Молодший рекрутер', w: 'Остапенко Ю. А.' },
  { id: 'lgl', p: 'ceo', d: 'leg', t: 'Головний юрист', w: 'Федоренко А. Г.' },
  { id: 'lw1', p: 'lgl', d: 'leg', t: 'Юрист з корпоративного права', w: 'Гончаренко М. В.' },
  { id: 'lw2', p: 'lgl', d: 'leg', t: 'Юрист з договірної роботи', w: 'Лисенко Р. І.' },
  { id: 'cmo', p: 'cco', d: 'mkt', t: 'Директор з маркетингу', w: 'Яковенко Д. С.' },
  { id: 'smm', p: 'cmo', d: 'mkt', t: 'SMM-менеджер', w: 'Нестеренко А. О.' },
  { id: 'brd', p: 'cmo', d: 'mkt', t: 'Бренд-менеджер', w: null },
  { id: 'mka', p: 'cmo', d: 'mkt', t: 'Маркетинг-аналітик', w: 'Бойко Л. П.' },
  { id: 'lgh', p: 'cco', d: 'lgs', t: 'Керівник логістики', w: 'Кириленко В. В.' },
  { id: 'wh', p: 'lgh', d: 'lgs', t: 'Завідувач складу', w: 'Мартинюк О. С.' },
  { id: 'dsp', p: 'lgh', d: 'lgs', t: 'Диспетчер', w: 'Ничипорук І. Т.' },
  { id: 'wk', p: 'wh', d: 'lgs', t: 'Комірник', w: null },
  { id: 'sch', p: 'ceo', d: 'sec', t: 'Керівник служби безпеки', w: 'Дмитренко П. Л.' },
  { id: 'ib', p: 'cto', d: 'sec', t: 'Фахівець з інформаційної безпеки', w: 'Савченко Є. Р.' },
  { id: 'grd', p: 'sch', d: 'sec', t: 'Інспектор з охорони', w: 'Петрук Б. М.' },
];

function seat(
  partial: Omit<
    DiagramData['positions'][number],
    'groupIds' | 'isTemporary' | 'width' | 'height'
  >,
): DiagramData['positions'][number] {
  return {
    groupIds: [],
    isTemporary: false,
    width: SHPS_SEAT.width,
    height: SHPS_SEAT.height,
    ...partial,
  };
}

export function buildMock3ShpsData(): DiagramData {
  return {
    organizations: [
      { id: ORG_ID, name: 'Організація (mock3)', role: 'current', groupIds: [], collapsed: false },
    ],
    groups: [],
    departments: DEPTS.map((d, i) => ({
      id: d.id,
      name: d.name,
      organizationId: ORG_ID,
      order: i,
    })),
    persons: POS.filter((p) => p.w).map((p) => ({ id: `per-${p.id}`, fullName: p.w as string })),
    positions: POS.map((p) =>
      seat({
        id: p.id,
        title: p.t,
        organizationId: ORG_ID,
        ...(p.d ? { departmentId: p.d } : {}),
        ...(p.w
          ? { personId: `per-${p.id}`, status: 'filled' as const }
          : { status: 'vacant' as const }),
        // Only the org root is the authored head; department heads are derived by the layout.
        ...(p.id === 'ceo' ? { isHead: true } : {}),
      }),
    ),
    reportLines: POS.flatMap((p) => [
      ...(p.p ? [{ fromId: p.p, toId: p.id, kind: 'admin' as const }] : []),
      ...(p.p2 ? [{ fromId: p.p2, toId: p.id, kind: 'admin' as const }] : []),
    ]),
    orgLinks: [],
  };
}
