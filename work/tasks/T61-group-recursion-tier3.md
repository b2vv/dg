# T61 — Рекурсія груп організацій у ярусі 3 (B8c)

**Пріоритет:** P3  
**Статус:** planned · ⛔ **заблоковано продуктом** — перший пункт acceptance («макет затверджено»)
не наш; поки макета немає, рекурсію груп ярусу 3 не починаємо, щоб не вигадувати дизайн за BA  
**Parity:** B8c  
**Блокує cutover:** **Ні**  
**Класифікація:** **нова фіча, не ціна міграції** (T73)  
**Узгодження:** [T73](../archive/tasks-2026-09-02.md)  
**Джерело:** 4245 §1 / `4245-group-recursion-level1.md` (черга, не почата)

---

## Вимога

Ярус 3 штатки: не лише підпорядковані **організації**, а й **групи організацій**, рекурсивно —  
«якщо є група, додати в неї підпорядковані групи та організації з посадами і спускатися вниз».

## Чому це не міграційний ризик

| Світ | Стан |
|------|------|
| GoJS / легасі | Рекурсія в cass-clone є, але виклик з `null` (коміт b0930ea4) — **фічі фактично немає** |
| Макет | «Головна прогалина», візуального референсу немає |
| `dg` | `DiagramGroup` = підпис на org-картці (`OrganizationNode` + `groupIds[0]`), **не** зона і не вкладеність |

Тобто T61 = **ціна нової фічі**, однакова в обох світах (лінза 3 parity). Не ставити в P0 міграції.

## Стан моделі `dg`

```ts
DiagramGroup { id, name, emblemUrl? }
DiagramOrganization.groupIds: string[]  // лише посилання для caption
```

Немає: `parentGroupId`, вкладених group nodes у staff canvas, рекурсивного обходу в `canvasLayout`.

## Пропозиція (коли буде макет)

1. Розширити модель: `DiagramGroup.parentGroupId?`, membership orgs/groups.
2. Staff tier-3: layout group blocks recursively (reuse zone paint з T64).
3. Візуал — **після** появи mockup; доти не імпровізувати.

## Acceptance (майбутнє)

- [ ] Макет затверджено
- [ ] Рекурсія depth≥2 рендериться
- [ ] Unit на tree of groups
- [ ] Не ламає простий `groupIds[0]` caption mode

## Не входить зараз

- Будь-яка імплементація до макета
- Підміна T64 (зони org/dept)

## Verify

N/A до старту фічі.

## Mockup (deferred)

Figma: [casiopeya](https://www.figma.com/design/alw0l86pqoZzpO8ofhjWjb/casiopeya) — nodes `1264-7906` (посади), `1264-8122` (організації). Implement after Figma MCP Connect or PNG export.
