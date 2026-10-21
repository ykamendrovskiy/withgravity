# Гейт — обычный путь

Автоматическая проверка собранного прототипа: контраст (APCA-эвристика + brand-токены), оверфлоу документа и областей, обход состояний
по манифесту, рамка и закрепления, статика по исходникам, **проверки по плану приёмки**. Справочник полей, exit-кодов, установки и
особых сборок — `HARNESS-REFERENCE.md` (читать адресно, по id находки или вопросу).

## Запуск
```bash
VITE_SCENARIOS=1 npm run build                      # сборка с живыми сценариями (plain build их вырезает)
npx vite preview --port <временный> --strictPort &  # предпросмотр на временном порту, не на порту пользователя
node <скилл>/harness/run-gate.mjs http://localhost:<порт> <проект> <проект>/gate-out   # [--plan=<файл>] [--fail-on=any|high] [--strict]
```
Полный режим требует Playwright (ищется: проект → `GRAVITY_GATE_PLAYWRIGHT` → рядом → глобальный npm; одна установка на машину:
`npm i -g playwright && playwright install chromium`, ~130 МБ — спроси). Нет Playwright → гейт сам уходит в **static-only**: только
исходники, `complete: false`, браузерные ячейки `skipped` — честно неполный результат, не «чисто».

## Четыре признака вердикта (`gate-out/verdict.json`) — читать в этом порядке
1. **`valid`** — проверка состоялась. `false` + `invalid_reason` (нет проекта, битый манифест, пустая/недостижимая страница, `ready` не
   появился) = вердикта нет; exit 3.
2. **`complete`** — всё запрошенное выполнено. `incomplete_reasons` словами: пропущенные линии, нет плана приёмки, обязательные
   проверки `not-run`, `fact_mismatch`, `needs_clarification`. **Ноль находок при обязательных not-run — неполная проверка, не чистая.**
3. **`summary`** — находки, агрегат по всем состояниям (`default_summary` — только дефолт). Контраст: `invisible` / `poor` / `weak` и
   `brand_text_mismatch`; `contrast_*_known` — известные ограничения библиотеки (запись `known-limitations.json` с проверкой версии
   установленного пакета; не подтверждена — находка обычная). Оверфлоу: `overflow_widths` (документ), `region_overflow` (скролл-контейнер
   без `data-scroll="intended"`), ниже `intendedMinWidth` — политика, не находка.
4. **`checks`** — проверки по `acceptance-plan.json`: гейт пересчитывает применимость сам, бренд-признак сверяет с DOM
   (`fact_mismatch`), `unknown` → `needs_clarification`; по каждой записи execution `done` / `not-run{needs_human | no_implementation |
   no_scenarios_manifest | line_skipped}`. Статусы и реализации — `checks.json`.

## Что делать с результатом
- Находка → чини **классом** по записи (`conventions.json`, `snippets/`, `traps/`), не константой под чек; максимум 2 итерации, re-gate.
  Ширинозависимые замеры называй с шириной.
- `not-run` измеримое (панель над последней строкой, внутренний скролл, валидация, guard) → выполни Playwright-скриптом и запиши в
  `gate-out/evidence.json` — объект `{schemaVersion: "1", note?, items: [{check, scope, revision, executor: gate|agent-script|human,
  result: pass|fail|inconclusive, artifact}]}`; `revision` — git sha сборки, не дата;
  суждение, требующее человека, — остаётся открытым. AUDIT.md — из вердикта и evidence, не из памяти.
- `known` — не твоя находка и не «чисто»: строка «известные ограничения: N».
- Скриншоты `gate-out/full*.png` — глаза на все состояния; впечатление чинится только после замера.

## Не делать
Не править `harness/`; не подгонять код под чек; static-only не выдавать за полную проверку; не занимать порт пользователя.
Контроли гейта (положительные/отрицательные) — `lab/gate-fixtures/run-fixtures.sh` в авторском репозитории.
