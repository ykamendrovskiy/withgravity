# Сниппет: массовые действия и scroll-модель страницы (ActionsPanel)

> Адресный ресурс. Берётся при признаках `collection.selectable && collection.hasBulkActions`; выбор между whole-page и bounded — по `layout.scrollMode`. Источник — pattern-actions-panel.md 0.7.x (verified browser).

## Выбор за 10 секунд
`layout.scrollMode: document` (страница скроллится целиком, greenfield-дефолт) → **whole-page**: панель sticky к низу вьюпорта последним элементом потока — пример A ниже. `layout.scrollMode: bounded` (скролл внутри области, app-рамка) → **bounded**: панель sticky к низу скролл-области, ширина = таблице — пример B. Дальше читай только свой вариант и «Грабли прилипания».

## Раскладка = scroll-модель страницы (сборка / профиль)

Где закреплена панель — следствие того, **как страница скроллится**:

- **whole-page scroll** (нет закреплённой шапки — **greenfield-дефолт**): скроллит вся страница. Панель —
  **sticky к низу вьюпорта, последним элементом в потоке**. Чисто, без машинерии (verified browser):

```tsx
// uikit Table + HOC — плоская таблица — uikit Table по официальному скиллу («DataTable» в uikit НЕ существует);
// 2-й generic внешнего HOC = накопленные пропы внутреннего (traps/uikit «Грабли пропов»):
const ListTable = withTableActions<Item, WithTableSelectionProps<Item>>(withTableSelection<Item, {}>(Table));

<ListTable width="max" data={rows} columns={columns} selectedIds={selected}
           onSelectionChange={setSelected} getRowId={(r) => r.id}
           getRowActions={(r) => [{text:'Изменить', handler:() => onEdit(r)},
                                  {text:'Удалить', theme:'danger', handler:() => onDelete(r)}]}
           edgePadding />
{selected.length > 0 && (
  <div style={{position:'sticky', bottom:'var(--g-spacing-4)', zIndex:3, marginTop:'var(--g-spacing-2)'}}>
    <ActionsPanel actions={actions} onClose={clearSelection}
                  renderNote={() => `${selected.length} выбрано`} />
  </div>
)}
```
Почему чисто: панель **последняя в потоке** → при полном скролле садится под последнюю строку (та открывается,
**клиренс НЕ нужен**); короткий список → sticky no-op, панель просто под таблицей; `zIndex:3` — над sticky-колонкой
действий (z:2). Не нужно «прилипание» вовсе — убери `position`/`zIndex`, останется панель в потоке под таблицей.

- **fixed top + scrolling body / bounded region** (закреплённая шапка): whole-page-sticky НЕ подходит (скроллит не
  вся страница). Панель — sticky к низу **скролл-области**; тут добавляются клиренс + реальная высота от app-shell
  (см. «bounded» в граблях). Апгрейд под scroll-модель конкретной сборки. В колонке-рамке панель — фикс-хром:
  `flex-shrink: 0` обязателен (вертикальный контракт — официальный скилл `gravity-ui` (`rules/hallucination-traps.md` §Layout; замер — источник: лаборатория (замер ActionBar 40→28px))); прилипание и высоту панели
  гейт меряет сам (штатный хром), при кастомном закреплении не-sticky способом — пометь `data-pinned`
  (`templates/app-shell/README.md` «Манифест сценариев»).

## Грабли прилипания (выверено браузером)

Каждый пункт = реальный баг, пойманный в браузере:

- **`width="max"` на таблице** — иначе таблица по ширине контента, панель по контейнеру → **рассинхрон ширины**.
- **`zIndex` панели > sticky action-колонки** — колонка действий это `g-table__cell_sticky_end` с **z:2** (verified
  inspect) → панели нужен **z ≥ 3** (+ непрозрачный фон, он есть); иначе «⋯» уезжающих под панель строк **всплывают над ней**.
- **whole-page: панель — ПОСЛЕДНИЙ элемент в потоке** → клиренс НЕ нужен (садится под последнюю строку сама).
- **bounded-область (fixed-top модель):** (a) клиренс-отступ = высоте панели **ТОЛЬКО когда реально скроллит**
  (`scrollHeight > clientHeight`) — иначе лишняя пустая «строка»; (b) высота области — от app-shell flex-цепочки
  (`flex:1; minHeight:0`), **НЕ** магический `maxHeight: calc(100vh - Npx)` (оставляет отступ снизу вьюпорта, ломается
  при другой шапке); (c) панель **БЕЗ** padded-блока с фоном — иначе белая полоса (панель непрозрачна).

bounded-сниппет (только для fixed-top/bounded — иначе бери whole-page выше):

```tsx
const PANEL_H = 52; const ref = useRef<HTMLDivElement>(null); const [scrolls, setScrolls] = useState(false);
useEffect(() => { const el = ref.current; if (!el) return;
  const check = () => setScrolls(el.scrollHeight > el.clientHeight + 1);
  check(); const ro = new ResizeObserver(check); ro.observe(el); return () => ro.disconnect();
}, [rows.length, selected.length]);

<div ref={ref} style={{flex: 1, minHeight: 0, overflowY: 'auto', position: 'relative'}}>  {/* высота от app-shell flex, НЕ magic maxHeight */}
  <div style={{paddingBottom: selected.length && scrolls ? PANEL_H : 0}}>   {/* клиренс ТОЛЬКО при скролле */}
    <ListTable width="max" /* …те же пропы… */ />
  </div>
  {selected.length > 0 && (
    <div style={{position: 'sticky', bottom: 0, zIndex: 3}}>                 {/* z≥3 (выше sticky-колонки z:2); БЕЗ bg-полосы */}
      <ActionsPanel actions={actions} onClose={clearSelection}
                    renderNote={() => `${selected.length} выбрано`} />
    </div>
  )}
</div>
```

Форма item: `{id; collapsed?; button: {props: ButtonProps}; dropdown: {item: DropdownMenuItem; group?: string}}`
— у КАЖДОГО item и `button` (видимая кнопка), и `dropdown` (overflow; `group?` — группировка в overflow-меню).
⚠️ **`ActionsPanelItem` НЕ экспортируется** из `@gravity-ui/uikit` (→ TS2724) — типизируй массив через
`ActionsPanelProps['actions']` (элемент — `ActionsPanelProps['actions'][number]`). Экспортируются только
`ActionsPanel` + `ActionsPanelProps`. (verified uikit@7.50 source+tsc — `build/.../ActionsPanel/types.d.ts`)
`ActionsPanelProps` = `{actions; onClose?; renderNote?; noteClassName?; className?; maxRowActions?}` — `maxRowActions`
по умолчанию **4**; пропов `open`/`sticky`/`position` НЕТ (видимость и позиционирование — на потребителе).
Подменю/switcher — НЕ отдельный вид item: задай `dropdown.item.items: [...]` → панель сама отрендерит кнопку как
`DropdownMenu`-switcher. Кнопки рендерятся как `view="flat-contrast" size="m"` (переопредели в `button.props`).
Иконка действия — внутри `button.props.children` (отдельного `icon`-слота нет). (verified uikit@7.50 source)

