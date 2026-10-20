# Сниппет: @gravity-ui/table — группировка и выбор

> Адресный ресурс. Берётся, когда таблице нужны группировка / tree-rows / DnD колонок (плоская таблица — uikit Table, см. официальный скилл). Источник — recipe-dashboard.md 0.7.x.

## Data table (`@gravity-ui/table`) — обвязка для группировки / выбора (секции ниже)

> **Плоская таблица без группировки/дерева/DnD — это uikit `Table`** (канон сборки — официальный скилл (uikit Table) + `snippets/actions-panel-scroll-model.md`;
> строка решения в официальный скилл `gravity-ui` (версии — установленный пакет) routing). `@gravity-ui/table` в этом рецепте — ровно за grouping/tree/DnD.

```tsx
import {Table, useTable, selectionColumn} from '@gravity-ui/table';
import type {ColumnDef} from '@gravity-ui/table'; // расширенный (withNestingStyles), НЕ из /tanstack

const columns: ColumnDef<Supply>[] = [
  selectionColumn as ColumnDef<Supply>,
  {accessorKey: 'number',   header: 'Поставка',  size: 140},
  {accessorKey: 'supplier', header: 'Поставщик'},
  {accessorKey: 'qty',      header: 'Кол-во',    size: 100},
  {accessorKey: 'status',   header: 'Статус',    size: 120},
];

const table = useTable({columns, data, getRowId: (r) => r.id});

return <Table table={table} stickyHeader />;
```

`useTable` — обёртка над `useReactTable` с корректной мемоизацией state. `<Table>` — рендер, `selectionColumn` — готовая колонка чекбоксов с id `'_select'`.

**Не бери для ЭТОГО рецепта:** `@gravity-ui/uikit` `Table` + HOC (у него нет grouping/DnD/tree; для плоской таблицы он и есть канон — официальный скилл (uikit Table) + `snippets/actions-panel-scroll-model.md`); `@gravity-ui/react-data-table` (legacy); `@tanstack/react-table` напрямую (`@gravity-ui/table` — и есть обёртка над ним, плюс хелперы и стилизация; голый TanStack легко приводит к stability-багам, см. TanStack-pitfalls).

## Data table — selection + grouping

Обвязка выбора — канонический блок в **`traps/table.md#` «Выбор строк — обязательная обвязка»**
(`useRowSelectionFixedHandler` + `enableMultiRowSelection`; при группах обязателен — каскад родитель↔дети).
Дашборд-специфика: выбор включён и для групп, и для листьев (каскад/indeterminate штатные — см.
`traps/table.md#` «Групповые строки»); балк-действия скоупь на листья фильтром выбранных id.

## Data table — что делать с выбором → `ActionsPanel`

Раз у таблицы есть selection-чекбоксы — при **непустом выборе** покажи массовые действия: не оставляй выбор
«мёртвым» (выбрал строки — должно быть видно, что с ними сделать). Без этого selection бесполезен.

Идиома + критичная раскладка (sticky / ширина = таблице / компенсирующий отступ + container-width-механика
`ActionsPanel`) вынесена в под-паттерн **`snippets/actions-panel-scroll-model.md`** (применим к любой таблице).

**Per-row actions (колонка «⋯»)** — хелпер `getActionsColumn`, сигнатура и грабли (`'_actions'` в
`columnOrder`; НЕ `withTableActions` — тот для uikit `Table`) — **`traps/table.md#` «Per-row actions»**.

## Data table — grouping (tree-rows pattern)

В `@gravity-ui/table` группировка делается **через tree-rows**, не через TanStack-grouping. Данные — родительские объекты с массивом `items`:

```tsx
import {Table, TreeExpandableCell, useTable} from '@gravity-ui/table';
import type {ColumnDef} from '@gravity-ui/table';        // ⚠️ расширенный ColumnDef (withNestingStyles) — из ГЛАВНОГО пакета
import type {ExpandedState} from '@gravity-ui/table/tanstack'; // чистые TanStack-state-типы — из /tanstack

type Item = Group | Supply;
const data: Item[] = [
  {id: 'w-msk', name: 'Склад Москва',         items: [{id: 's1', ...}, {id: 's2', ...}]},
  {id: 'w-spb', name: 'Склад Санкт-Петербург', items: [...]},
];

const columns: ColumnDef<Item>[] = [
  {
    accessorKey: 'name',
    header: 'Поставка',
    withNestingStyles: true,            // визуальный отступ для вложенных строк
    showTreeDepthIndicators: false,     // опц. — убирает линии иерархии
    cell: ({row, getValue}) => (
      <TreeExpandableCell row={row}>{getValue<string>()}</TreeExpandableCell>
    ),
  },
  // ...другие колонки
];

const [expanded, setExpanded] = useState<ExpandedState>({});

const table = useTable({
  columns, data,
  enableExpanding: true,
  getSubRows: (item) => 'items' in item ? item.items : undefined,
  onExpandedChange: setExpanded,
  state: {expanded},
});

return <Table table={table} getGroupTitle={(row) => row.getValue<string>('name')} />;
```

Ключевое:
- `TreeExpandableCell` рендерит handle для expand/collapse. **Без него** клик по строке-группе не имеет видимого триггера.
- `withNestingStyles: true` даёт визуальные отступы для дочерних строк.
- `getGroupTitle` определяет text label группирующей ячейки — без него заголовок группы рендерится пустым.

Настройка/перестановка колонок — `table-column-settings.md`.
