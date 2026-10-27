# traps/uikit — грабли, которых нет в официальном скилле и доках пакета

Приоритет у установленного пакета (`tsc`): противоречие → строку удалить. Кросс-пакетные правила (типографика, flex-контракт, тема, `view`/`data`) — у официального `rules/hallucination-traps.md`, здесь не повторяются.

## Имена (тянешься за … → в uikit@7 на самом деле)
| Тянешься за… | На самом деле | Почему промах |
|---|---|---|
| `RadioButton` | `SegmentedRadioGroup` (сегменты) или `Radio` + `RadioGroup` | устаревшее имя, в экспортах нет |
| `<Tabs items />` | `TabProvider` + `TabList` + `Tab` + `TabPanel` | в 7.x разнесено на композицию |
| `TreeSelect` / `TreeList` / `ListItemView` / `FileDropZone` из корня | `unstable_*` из `@gravity-ui/uikit/unstable` (`components/lab/`, реэкспорт в `unstable.d.ts`) | в корневом экспорте нет; листинг `components/` их не показывает |
| `<Grid>` | `Row` + `Col` | компонента `Grid` нет |
| `<Toaster />` как JSX | класс `new Toaster()` + `useToaster()`; дерево провайдеров — `templates/app-shell/README.md` | — |
| `Badge` / `Chip` / `Tag` | `Label` | — |
| `Modal` с `title` | `Dialog` (`Header` / `Body` / `Footer`) | `Modal` низкоуровневый |
| `Table.Head/Row/Cell` | uikit `Table` — `data`/`columns`, подкомпонентов нет; группировка/дерево → `@gravity-ui/table` | рефлекс из HTML/MUI |

## Пропы
| Компонент | Грабли | Правильно |
|---|---|---|
| `NumberInput` | `onUpdate` отдаёт `number \| null` → TS2322 на `useState<number \| undefined>` | стейт `number \| null` |
| `Select` | нет `style`; `value` **всегда массив**, и для single | `width` (`number \| 'auto' \| 'max'`); `value={['eu']}` + `onUpdate={([v]) => …}`; слота иконки нет — `renderControl` |
| `TextInput` | нет `width` (это `Select`); слоты `leftContent`/`rightContent` не существуют | полноширинный по умолчанию, ширина обёрткой; `startContent` / `endContent` (инсет — `traps/icons.md`) |
| `PlaceholderContainer` | `image` **required**; пустой `<span />` в `image` при `direction="row"` держит колонку и сдвигает текст (замер 2026-10) | иллюстрация из `@gravity-ui/illustrations` (`traps/illustrations.md`) или `direction="column"` |
| uikit `Table` HOC-стек | `withTableSorting(withTableSelection(withTableActions(Table)))` теряет пропы в типах | у каждого HOC `withX<I, E>`: `I` — строка, `E` — накопленные пропы, протяни оба; не `as unknown as` |
| uikit `Table` колонка | `sortable` не существует (TS2353); `align: 'left'/'right'` deprecated | `meta: {sort: true}`; `align: 'start'/'end'` |
| uikit `Table` | без `getRowId` строки кеятся индексом → при фильтре/сортировке paint-глюк «пропала линия» | `getRowId="id"` всегда |
| `Dialog.Footer preset="danger"` | в 7.47 все пресеты дают `view="action"` (синяя кнопка для опасного действия) | `propsButtonApply={{view: 'outlined-danger'}}` явно |
| `Dialog.Footer errorText` | длинный текст — Popup без ограничения ширины, уходит за край диалога | короткая фраза в `errorText`, пояснение — в теле диалога |

## Поведение
- **`Button` иконка+текст — дети массивом** `[<Icon data={X} size={16}/>, 'Текст']`, не Fragment: `prepareChildren` ищет иконку среди прямых детей; Fragment → иконка в `g-button__text` поверх текста (verified uikit 7.50 source; то же для `ActionsPanel` `button.props.children`).
- **`Breadcrumbs` в `ActionBar` — цепочка `min-width:0`:** у `Section → Group → Item` `min-width:auto`; без `pull="left-grow"` у `Group` и `Item` плюс `min-width:0` на всей цепочке крошки не сворачиваются и выталкивают правый контрол, с `pull="left"` — сворачиваются и не разворачиваются обратно. Ширина крошкам — от раскладки, не от контента (хук свёртки мерит `<ol>`, усаженные по контенту не развернутся). Элементы — `<Breadcrumbs.Item>`-дети, не `items`-проп (legacy v5, в 7.x пустой рендер). Контролы текущего айтема — сиблинги ряда вне `span[role=link]`. (verified uikit 7.50 + navigation 7.0 Playwright; замер: «…/Подключения» при свободном месте.)
- **Controlled `DropdownMenu`:** в `onOpenToggle` приходит и функция-апдейтер (`SetStateAction<boolean>`, тип обещает boolean; verified 7.50 source) — разворачивай `typeof v === 'function' ? v(open) : v`. `ActionTooltip` на switcher'е — `disabled={menuOpen}`, иначе тултип перехватывает клик по первому пункту.
- **`Card type="selection"` + `Checkbox` внутри — не делай:** событие двоится, карточка получает `role="radio"`. Строка с чекбоксом = полноширинный `Checkbox` с `content`; длинный `content` не ужимается (`.g-control-label__text` без `min-width:0`) — добавь `flex: 1 1 auto; min-width: 0`.
- **`unstable_ListItemView` в сайдбаре:** дефолт `selectionViewType="multiple"` рисует чекмарк; для навигации — `"single"`; плотность — `height={N}`; разделитель — `<li role="separator">` с `--g-color-line-generic`.
- **`SegmentedRadioGroup` icon-only:** `<Icon>` прямым значением (`content={<Icon/>}`), без `<span>`-обёртки — иначе ломается `isIcon` и `_icon`-модификатор; на `^7.43` центрируется сама, заплатки не нужны.
- **`Stepper`:** отметку «выполнено» и кликабельность держи в state (visited/completed-набор), не из сравнения индексов; `Stepper.Item` `id` и `value` — строками оба (числовой `value` при строковом `id` молча гасит подсветку); на узких экранах оборачивай в `overflowX:auto` (непереносящийся `<ol>`, ~450px на 3 шага); `<ol>` наследует UA-паддинг — reset в app-shell.
- **`Progress` прямым ребёнком flex-колонки схлопывается в 0:** у `.g-progress` `margin: 0 auto` и нет `width`; auto-поля по поперечной оси
  отменяют `align-items: stretch`, и пустой блок получает собственную ширину 0 (verified uikit 7.51 CSS, замер 2026-10). Оберни в
  блочный `div` или задай `width: 100%`.
- **`DefinitionList`:** точечные лидеры — дефолт без пропа; без точек — узкий оверрайд `.g-definition-list__dots { border-block-end: none; }` с пометкой (ступень 3 лестницы кастомизации официального).

## Не подтверждено на uikit 7.47–7.51
Safari: двоение вуали `Dialog` выше вьюпорта на 7.4x (workaround через `modalClassName`) — `lab/thin-moved/traps/uikit-dialog-safari.md`.

## Подтверждено на uikit 7.51
| Симптом | Причина | Что делать |
|---|---|---|
| `Progress` во flex-колонке шириной 0 | у `.g-progress` `margin: 0 auto` (центрирование как блока) | блочный родитель с заданной шириной или `width: 100%` на обёртке |
| `NumberInput` после сброса в `undefined` перестаёт обновляться | переход controlled → uncontrolled | сбрасывать в `null`, не в `undefined` |
