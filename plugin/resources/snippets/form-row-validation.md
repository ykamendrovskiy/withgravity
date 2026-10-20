# Сниппет: FormRow + контрол + место валидации

> Адресный ресурс. Берётся при признаке `form.hasSubmit`. Источник — recipe-settings-form.md 0.7.x.

## Построение формы — Гравити-реализация (hard-parts)

> **Что делает форму хорошей** (FormRow vs инлайн `label=`, выравнивание ширины, размещение описаний,
> валидация, data-safety) — агностичный спек **`conventions.json` (form.*)**. Здесь — неочевидные Гравити-куски.

- **Подпись + описание → `FormRow`** (`@gravity-ui/components`), не инлайновый `label=` контрола. **`validationState` / `errorMessage` — на КОНТРОЛЕ, НЕ на `FormRow`** (канон граблей — `traps/components.md` «FormRow — грабли»):

  ```tsx
  import {FormRow} from '@gravity-ui/components';
  import {TextInput} from '@gravity-ui/uikit';

  <FormRow label="Название проекта" fieldId="projectName" required>
    <TextInput
      id="projectName" value={name} onUpdate={setName}
      validationState={nameOk ? undefined : 'invalid'}      // валидация — на КОНТРОЛЕ, не на FormRow
      errorMessage={nameOk ? undefined : 'Введите название'}
    />
    <FormRow.FieldDescription>Отображается в шапке консоли и в аудит-логе.</FormRow.FieldDescription>
  </FormRow>
  ```

- **Длинное / второстепенное описание → `HelpMark`** в слоте `labelHelpPopover` (форма не разъезжается):

  ```tsx
  import {HelpMark} from '@gravity-ui/uikit';

  <FormRow
    label="Шаг раскатки, %"
    labelHelpPopover={<HelpMark>Инкремент процента пользователей при постепенной раскатке.</HelpMark>}
  >
    <Slider min={1} max={100} value={step} onUpdate={setStep} />
  </FormRow>
  ```

- Ширину полосы формы ограничь (`maxWidth` ≈ 560–720px); ширину контролов в секции выравнивай (см. `conventions.json` (form.*)).

