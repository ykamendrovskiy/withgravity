# Модель плагина: объекты, операции, артефакты

Корректность компонентов (пакет, версия, API, typecheck) — официальный скилл `gravity-ui`; контекст сервиса — в проекте команды;
плагин — модель, которая их связывает, и процедуры под сценарии. Каждый объект — файл известной формы, каждая связь — поле или ссылка.

| Объект | Экземпляр живёт | Плагин знает |
|---|---|---|
| Component | установленный пакет `@gravity-ui/*` + официальный скилл | грабли по пакету `traps/<пакет>.md` (индекс `traps.json`), errata к официальному |
| Service | `service-profile.json` + `theme/` (+ `themeConfig.variants`) + `libraries` в проекте/пакете команды (`pack.json` → `profiles[].has`) | схему, валидатор (`profile/validate.mjs`), как применять (`profile/README.md`) |
| Template (app · screen · section) | `templates/<id>/` в пакете команды; у плагина — только `app-shell` | карточка источника (версия, перечень изменений, адресация экранов) и запись использования `TemplateUse` (`mode: copy \| import`); операции: взять (build) · изменить источник (profile) · сравнить (verify) |
| State | `states.json` | виды состояний с применимостью, показом, достижением, проверкой |
| Convention | `conventions.json` (owner plugin) · `profile.conventions[]` (owner service) | запись: `id · applies_to{all:[{fact,eq}]} · owner · strength · rule · how · check{method,id} · source` |
| AcceptancePlan | `acceptance-plan.json` в проекте (пишет build) | формат — `facts.md`; verify пересчитывает применимость сам, бренд-признак сверяет с DOM, остальные — из плана |
| Scenario | `scenarios.manifest.json` + панель | формат манифеста (`scenarios.md`) |
| Check | реестр `verify/harness/checks.json` + вердикт | три оси: execution done / not-run{причина} · result pass / fail / inconclusive / n-a · evidence (метод · исполнитель · область · ревизия · замер); непроверенное ≠ успех |
| KnownLimitation | `verify/harness/known-limitations.json` | классифицирует находку (селектор · контекст · тема · штатный токен), не удаляет её; `versions` пока не исполняется |
| Errata | `errata-official-skill.md` | строка · источник · версия · условие удаления |
| (Evidence) | свидетельства проверки | поле `source` у записей |

Связи: Service задаёт тему/плотность/раскладку/политики/словарь, ссылается на Template и `libraries` · Template состоит из секций и
Component · Convention и State применяются при признаках AcceptancePlan, проверяются Check по `check.id` · build пишет план, verify его
пересчитывает и ставит статусы; обязательные not-run → `complete: false` · KnownLimitation помечает находку · Errata перекрывает
правило официального до влития · конфликт: профиль выбирает среди допустимого, отклонение фиксируется, корректность не отменяется.

Артефакты конвейера: профиль · карточка шаблона + TemplateUse · записи конвенций/состояний · спецификация (`spec.md`) · план приёмки ·
манифест сценариев · вердикт (`verdict.json`: находки · покрытие · checks · known) + AUDIT.md · `proposals.json`
(`{schemaVersion, proposals[]}`) · errata. Скиллы — операции над этими файлами: `build` (4 маршрута) · `figma-read` → spec для build · `figma-write` · `figma-index` (паспорт библиотеки: опись + привязка, схемы `resources/libraries/`) — экспериментальные · `research-prototype` ·
`profile` · `verify` (3 режима) · `feedback`. Figma-конвейер (`figma-read` → спецификация → build → `figma-write`) — вне поставки: внутренняя библиотека команды, экспериментально; подключается отдельным пакетом/плагином команды.
