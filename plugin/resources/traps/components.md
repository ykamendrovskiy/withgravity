# traps/components — `@gravity-ui/components` (нет в роутинге официального, errata #6)

Надстройка над uikit: составные компоненты. Базовые контролы — в uikit. Пропы — README компонента и Storybook (`preview.gravity-ui.com/components`). Peer `@gravity-ui/markdown-editor` уже везёт пакет в bundle.

| Назначение | Компоненты |
|---|---|
| Формы | `FormRow` (подпись ↔ контрол), `DelayedTextInput`, `TokenizedInput`, `ItemSelector` |
| Диалоги | `ConfirmDialog`, `ChangelogDialog`, `PromoSheet`, `SharePopover` |
| Навигация и контент | `AdaptiveTabs` (переполнение → «More»), `Gallery`, `InfiniteScroll`, `Stories`/`StoriesGroup`, `OnboardingMenu` |
| Уведомления | `Notifications`/`Notification`, `Reactions`, `CookieConsent`, `StoreBadge` |

**`ConfirmDialog`** (деструктив, «закрыть без сохранения»): `title` (строка, не `caption`) · `message` (ReactNode) · `textButtonApply`/`textButtonCancel` · `onClickButtonApply`/`onClickButtonCancel` · `propsButtonApply={{view: 'outlined-danger'}}` · спред `DialogProps` (`open`, `onClose`, `size`).

**`FormRow`:** `validationState` / `errorMessage` — на контроле, не на `FormRow` (`FormRowProps` их не принимает → TS2322); с высоким контролом (вертикальная `RadioGroup`) подпись уезжает вниз — класс `.form-row-align-top .gc-form-row__left {min-height:0} … __field-name {align-self:flex-start}` только на такие строки. Применение в форме — `snippets/form-row-validation.md`.
