# Таблица признаков задачи (build заполняет, verify перепроверяет)

Выбор конвенций и состояний не угадывается: build перед сборкой записывает признаки по областям экрана со значением
`true | false | unknown`, областью (`scope`: маршрут / область / операция) и ссылкой на основание (бриф, код, профиль).
`unknown` ≠ `false` и не даёт not-applicable; если признак важен и неизвестен — одно уточнение до зависимой работы.

| Признак | Что значит | Основание |
|---|---|---|
| `form.hasSubmit` | есть форма с явным сохранением | бриф / код |
| `form.hasDirtyData` | ввод может быть потерян при закрытии | бриф / код |
| `operation.async` | операция идёт асинхронно (pending / error) | бриф |
| `operation.destructive` | операция необратима (удаление) | бриф |
| `collection.selectable` | у списка есть выбор строк | бриф / код |
| `collection.hasBulkActions` | над выбором есть массовое действие | бриф |
| `layout.scrollMode` | `document` (скроллит страница) или `bounded` (область) | профиль / код shell |
| `layout.hasPinnedChrome` | есть закреплённые шапка/футер/панель | код shell |
| `surface.usesBrandBackground` | есть контент на бренд-фоне: **action-кнопка (view=action) — уже true**, как и brand-Label, выбранный сегмент, бренд-шапка | код / профиль / макет |
| `route` | маршрут build: `new-project` / `new-page` / `local-fix` / `theme-shell` | задача |
| `ui.hasIconOnlyControls` | есть кнопки без текста (иконка) | код / макет |
| `ui.hasEmbeddedEditor` | встроен сторонний редактор/виджет со своей раскладкой (markdown-editor и т. п.) | бриф / код |
| `theme.modes` | какие темы обязаны работать (light, dark, hc) | профиль |

Формат — файл `acceptance-plan.json` в корне проекта (build пишет, verify читает и **пересчитывает сам**; отчёт и карточка ссылаются на него,
второго списка не ведут): `{schemaVersion: "1", route, facts: [{fact, value, scope, basis}], conventions: [id], states: [id],
rules_revision: <sha12 conventions.json+states.json>, build_revision: <git sha или дата>, entry: {query: "screen=connections"}}` — `entry` адресует
проверяемый экран (query-параметры к базовому URL; приложение обязано их уважать — иначе гейт аудирует не тот экран); состояния — `scenarios.manifest.json`. Verify сверяет свой пересчёт с `conventions`/`states` плана
(расхождение — `plan_mismatch`), для каждой применимой записи ищет реализацию `check.id` (`verify/harness/checks.json`): нет реализации или
нужен человек → `not-run` с причиной, не pass; `unknown` → запись `needs_clarification`. Ноль находок при обязательных `not-run` — неполная проверка. Вычислитель: запись Convention/State берётся, если все её
условия `applies_to.all` выполняются по таблице; при `unknown` — запись помечается «требует уточнения», не отбрасывается.
