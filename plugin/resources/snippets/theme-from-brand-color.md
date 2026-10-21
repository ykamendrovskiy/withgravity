# Сниппет: кастомная тема из базового цвета бренда (`@gravity-ui/uikit-themer`)

> Адресный ресурс. Берётся, когда в вопросе на входе build выбрана «кастомная тема» и дан базовый цвет (HEX/rgb), а Themer-экспорта нет.
> Выход — `src/theme/brand.css` (импорт **после** `styles.css`) + `brand.theme.json`; путь записывается в профиль `theme.themeConfig.css`.
> Источник: прогон владельца 2026-10-21 (uikit-themer 2.0.0, uikit 7.51), замеры в браузере.

## Две ловушки (без них UI остаётся жёлтым, а текст на бренде — тёмным)
1. **В библиотеке `updateBaseColor({colorToken: 'brand'})` пересобирает только приватную палитру `brand`** (проверено на 1.8.0 и 2.0.0:
   `DEFAULT_THEME.utilityColors['base-brand'].ref` до и после = `private.yellow.550-solid`). Утилитарные токены бренд-группы (`base-brand`,
   `base-brand-hover`, `base-selection*`, `line-brand`, `text-brand*`, `text-link`, `text-link-hover`) остаются на **yellow/orange** →
   интерфейс по-прежнему жёлтый. Веб-Themer делает перенос сам (пресеты несут готовые utilityColors; в коде TODO «use updateUtilityColor
   from uikit-themer») — при генерации из библиотеки это надо сделать руками: перевести ссылки бренд-группы на `brand` тем же индексом
   (ниже). `text-link-visited` (purple) и `warning` (yellow) — не бренд.
2. **`text-brand-contrast` — решение автора темы, не библиотеки.** В веб-Themer это ручной контрол, контраст оценивает тот, кто делает
   тему; в дефолте стоит тёмный текст (под жёлтый). Плагин **предлагает** вариант по APCA (`text-dark-primary` / `text-light-primary`, выше Lc к
   `base-brand`, на каждую тему отдельно) и записывает Lc в сдачу как решение владельца; ниже 60 — скажи явно, не «исправляй» оттенок бренда.

```js
// scripts/generate-theme.mjs — node scripts/generate-theme.mjs
import {writeFileSync} from 'node:fs';
import {DEFAULT_THEME, createInternalPrivateColorReference, createInternalUtilityColorReference, generateCSS, generateJSON,
  isInternalPrivateColorReference, parseInternalPrivateColorReference, updateBaseColor, updateUtilityColor} from '@gravity-ui/uikit-themer';

const BRAND = '#6C91C9';                              // базовый цвет из профиля/ответа владельца
let theme = updateBaseColor({theme: DEFAULT_THEME, colorToken: 'brand', value: {light: BRAND, dark: BRAND}});

// 1) бренд-группа утилитарных токенов: yellow/orange → brand тем же индексом
const BRAND_GROUP = /^(text-brand|text-link$|text-link-hover$|base-brand|base-selection|line-brand)/;
for (const [token, variants] of Object.entries(theme.utilityColors)) {
  if (!BRAND_GROUP.test(token)) continue;
  for (const variant of ['light', 'dark']) {
    const ref = variants[variant]?.ref;
    if (!isInternalPrivateColorReference(ref)) continue;
    const {mainColorToken, privateColorCode} = parseInternalPrivateColorReference(ref);
    if (mainColorToken !== 'yellow' && mainColorToken !== 'orange') continue;
    theme = updateUtilityColor({theme, themeVariant: variant, colorToken: token,
      value: theme.privateColors.brand[variant][privateColorCode].value,
      ref: createInternalPrivateColorReference('brand', privateColorCode)});
  }
}

// 2) text-brand-contrast — по APCA к base-brand, на каждую тему
const rgb = (v) => { const m = v.match(/rgb\(([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*\/\s*([\d.]+))?/); return m ? {c: [+m[1], +m[2], +m[3]], a: m[4] === undefined ? 1 : +m[4]} : null; };
const Y = ([r, g, b]) => { const l = (c) => (c / 255) ** 2.4; return 0.2126729 * l(r) + 0.7151522 * l(g) + 0.072175 * l(b); };
const apca = (t, bg) => { const cl = (y) => (y > 0.022 ? y : y + (0.022 - y) ** 1.414); const yt = cl(Y(t)), yb = cl(Y(bg));
  const s = yb > yt ? (yb ** 0.56 - yt ** 0.57) * 1.14 : (yb ** 0.65 - yt ** 0.62) * 1.14; return Math.abs(s) < 0.1 ? 0 : Math.abs((s > 0 ? s - 0.027 : s + 0.027) * 100); };
const blend = ({c, a}, bg) => c.map((x, i) => x * a + bg[i] * (1 - a));
for (const variant of ['light', 'dark']) {
  const bg = rgb(theme.utilityColors['base-brand'][variant].value).c;
  const best = ['text-dark-primary', 'text-light-primary']
    .map((token) => ({token, value: theme.utilityColors[token][variant].value, lc: apca(blend(rgb(theme.utilityColors[token][variant].value), bg), bg)}))
    .reduce((a, b) => (b.lc > a.lc ? b : a));
  theme = updateUtilityColor({theme, themeVariant: variant, colorToken: 'text-brand-contrast', value: best.value, ref: createInternalUtilityColorReference(best.token)});
  console.log(`text-brand-contrast/${variant}: ${best.token}, Lc ${best.lc.toFixed(1)}`);
}
writeFileSync('src/theme/brand.css', generateCSS({theme}));
writeFileSync('src/theme/brand.theme.json', JSON.stringify(generateJSON({theme}), null, 2));
```
Проверка: после сборки `getComputedStyle(.g-root).getPropertyValue('--g-color-base-brand')` в обеих темах = цвет бренда; гейт —
`brand_text_mismatch` 0. Кандидат в апстрим uikit-themer: `updateBaseColor('brand')` не переводит бренд-группу — issue/PR или строка в README.
