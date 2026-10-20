# Сниппет: @gravity-ui/table — настройка и перестановка колонок

> Адресный ресурс. Берётся, когда таблице нужны меню настроек колонок или drag-перестановка. Обвязка таблицы, выбор и группировка — `table-grouping.md`.

## Data table — column reorder

**В `@gravity-ui/table` нет нативного drag-on-header API.** Два штатных пути:

### (a) Settings menu — canonical

```tsx
import {Table, useTable, useTableSettings, getSettingsColumn, selectionColumn} from '@gravity-ui/table';

const columns: ColumnDef<Supply>[] = [
  selectionColumn as ColumnDef<Supply>,
  {id: 'number',   accessorKey: 'number',   header: 'Поставка'},
  {id: 'supplier', accessorKey: 'supplier', header: 'Поставщик'},
  {id: 'qty',      accessorKey: 'qty',      header: 'Кол-во'},
  {id: 'status',   accessorKey: 'status',   header: 'Статус'},
  getSettingsColumn<Supply>(),
];

const {state, callbacks} = useTableSettings({
  // ⚠️ ВСЕ id, включая '_select'/'_settings' — грабли в traps/table «Настройка колонок»
  initialOrdering: ['_select', 'number', 'supplier', 'qty', 'status', '_settings'],
  initialVisibility: {},
});

const table = useTable({
  columns, data,
  state: {columnOrder: state.columnOrder, columnVisibility: state.columnVisibility},
  onColumnOrderChange: callbacks.onColumnOrderChange,
  onColumnVisibilityChange: callbacks.onColumnVisibilityChange,
});
```

Альтернатива — не передавать `initialOrdering` вовсе: тогда порядок берётся из определения `columns`. `selectionColumn.id === '_select'`, `getSettingsColumn().id === '_settings'`.

### (b) Custom HTML5 drag on header — literal drag

Когда пользователь явно требует «перетаскивать сами хедеры», навесь drag-handlers через `headerCellAttributes` и обнови порядок через `table.setColumnOrder`:

```tsx
const draggedColRef = useRef<string | null>(null);

<Table
  table={table}
  headerCellAttributes={(header) => {
    if (header.column.id === '_select') return {};
    return {
      draggable: true,
      onDragStart: (e) => { draggedColRef.current = header.column.id; e.dataTransfer.effectAllowed = 'move'; },
      onDragOver: (e) => e.preventDefault(),
      onDrop: (e) => {
        e.preventDefault();
        const fromId = draggedColRef.current;
        const toId = header.column.id;
        if (!fromId || fromId === toId) return;
        const order = table.getState().columnOrder.length
          ? table.getState().columnOrder
          : table.getAllLeafColumns().map((c) => c.id);
        const next = [...order];
        next.splice(next.indexOf(fromId), 1);
        next.splice(next.indexOf(toId), 0, fromId);
        table.setColumnOrder(next);
      },
      onDragEnd: () => { draggedColRef.current = null; },
      style: {cursor: 'grab', userSelect: 'none'},
    };
  }}
/>
```

Это bypass-ит Gravity settings-UI. Не забудь визуальную обратную связь (drop-indicator, курсор `grabbing` во время drag) — без неё UX слабый.

