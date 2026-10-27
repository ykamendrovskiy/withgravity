# withgravity

> «with gravity» — сборка на Gravity UI как принято.

Тонкий плагин Claude Code для сборки «как принято» на [Gravity UI](https://gravity-ui.com) поверх официального скилла
[`gravity-ui`](https://github.com/gravity-ui/skills): корректность компонентов — у официального скилла, плагин держит модель сервиса
(профиль, шаблоны, записи конвенций и состояний, план приёмки) и тонкие процедуры. Темы брендов и профили сервисов живут в отдельном
пакете команды и подключаются на входе в сборку. Предшественник — [gravity-build](https://github.com/ykamendrovskiy/gravity-build).

## Установка
```
/plugin marketplace add ykamendrovskiy/withgravity
/plugin install withgravity@withgravity
npx skills add gravity-ui/skills        # официальный скилл — обязателен
```
Для надёжной авто-активации официального скилла — блок «Activation tip» из README gravity-ui/skills в `AGENTS.md` проекта.
Полная проверка — Playwright: `npm i -g playwright && playwright install chromium`; без него гейт работает в static-only.

## Что внутри
Скиллы `build` · `research-prototype` · `profile` · `verify` · `catalog` · `feedback`.
Модель — `plugin/resources/model.md`; что считается проверенным — `plugin/skills/verify/harness/HARNESS.md`; ограничения и
экспериментальное — `plugin/README.md`.
