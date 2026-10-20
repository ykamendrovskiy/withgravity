# traps/dates — `@gravity-ui/date-components` v4 + `date-utils`

- **Локаль грузится, не только ставится:** `await settings.loadLocale('ru')` (`@gravity-ui/date-utils`) до рендера; при мультиязычии — прелоад всех локалей.
- **Invalid-даты (v4): displayed ≠ value молча.** Поле показывает `31.02`, не снапает; `onUpdate` зовётся только на валидном (`(value: DateTime | null) => void`) → connected value остаётся прежним. Лови через `validationState="invalid"` + `errorMessage` (out-of-bounds рисуется сам).
- **`onUpdate` только на валидном** — не вешай per-keystroke реакции на `DateField`/`RelativeDateField`.
