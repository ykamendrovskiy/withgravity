# scenarios — состояния как воспроизводимые пути, манифест и панель

Подключается, когда нужны переключаемые состояния для показа/исследования; манифест читает `verify` и обходит все состояния.

**Переключатель — dev-only, мёртв в prod-билде:**
```tsx
// src/scenarios.ts
export const SCENARIOS_ON = import.meta.env.DEV || !!import.meta.env.VITE_SCENARIOS;
export const scenario = SCENARIOS_ON ? (new URLSearchParams(location.search).get('scenario') ?? 'ideal') : 'ideal';
```
Сборка для гейта — `VITE_SCENARIOS=1 npm run build` (в `vite preview` `DEV` уже false); нужен `src/vite-env.d.ts`.

**Манифест `scenarios.manifest.json`** в корне проекта:
```jsonc
{"version": 1, "param": "scenario", "default": "ideal",
 "scenarios": ["ideal", "empty", "loading", "error", "filter-empty"],
 "labels": {"ideal": "1 — данные", "empty": "2 — пусто"},      // для панели
 "intendedMinWidth": 1000,                                       // floor: ниже — политика, не находка
 "frame": {"viewport": true, "minHeight": 560},                  // app-рамка: документ не скроллится
 "ready": ".app-root"}                                           // контракт готовности
```
- Декларируй только реализованное: id обязан реально переключать UI (задекларированный noop хуже отсутствия манифеста).
- Сценарий = путь: пресет данных · начальное состояние · действия · ожидания · сброс. Интеракционные (submit-pending / submit-error)
  **пресетят** состояние на загрузке (`FILLED_PRESET` + инициализатор статуса), не только меняют API после клика.
- Оверлеи (меню / диалог) — управляемые (`open` из пресета); тост в пресете — `autoHiding: false`.
- Маркеры для гейта: `data-proto-panel` на корне панели и чипа (поддерево исключается из аудита и noop-подписи); `data-pinned` —
  элементы, закреплённые не через sticky/fixed; `data-scroll="intended"` — намеренный внутренний скролл.

**Панель — когда она заказана (вопрос 4 build), она должна быть видна в сдаче без действий пользователя.** Правила: 1) показывать
по умолчанию (развёрнутой или чипом) везде, где `SCENARIOS_ON`; `?panel=0` прячет, никакого `?panel=1` для включения; 2) ссылка в сдаче
и превью-конфиг для владельца — dev-сервер (`npm run dev`) или сборка `VITE_SCENARIOS=1 npm run build` + preview, не plain-билд (в нём
панели и сценариев нет по определению); 3) шорткат `⌘+.` / `Ctrl+.` раскрывает и скрывает панель, назван в сдаче одной строкой; 4) plain
`npm run build` остаётся чистым — это отдельная команда для демо/прода, не то, что открывает владелец.
**Панель** (только при `SCENARIOS_ON`, `?panel=0` прячет): `Card(fixed, data-proto-panel)` → Select сценариев (`labels`) + Switch темы;
переключение — URL-параметр с перезагрузкой; тема — тоже URL (`?theme=dark`, `history.replaceState`); сворачивание в чип + скрытие по
`⌘+.`. Панель — дефолт при автономном прогоне; отказ — в отчёте.
