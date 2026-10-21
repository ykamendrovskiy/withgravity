# Сниппет: кастомная тема из базового цвета бренда (`@gravity-ui/uikit-themer`)

> Адресный ресурс. Берётся, когда в вопросе на входе build выбрана «кастомная тема» и дан базовый цвет (HEX/rgb), а Themer-экспорта нет.
> Выход — `src/theme/brand.css` (импорт **после** `styles.css`) + `brand.theme.json`; путь записывается в профиль `theme.themeConfig.css`.
> Источник: замер 2026-10 (uikit-themer 2.0.0, uikit 7.51), замеры в браузере.

## Границы рецепта
Рассчитан на `DEFAULT_THEME` библиотеки версий 1.8.0 и 2.0.0 (проверено): перевод ссылок yellow/orange → brand применять только к ней, в чужой
теме жёлтые ссылки могут быть осмысленными. Один цвет на light и dark — дефолт генератора, не намерение владельца (в тёмной теме средние тона
дают контраст ниже). Путь к теме в `service-profile.json` записывается только при поручении на профиль.

## Две ловушки
1. **`updateBaseColor({colorToken: 'brand'})` пересобирает только приватную палитру `brand`** — так и обещает README; утилитарные токены
   бренд-группы (`base-brand`, `base-brand-hover`, `base-selection*`, `line-brand`, `text-brand*`, `text-link`, `text-link-hover`) остаются на
   **yellow/orange** → интерфейс по-прежнему жёлтый. Веб-Themer переносит их сам (пресетами). При генерации из библиотеки переведи ссылки
   бренд-группы на `brand` тем же индексом через `updateUtilityColor` (ниже); `text-link-visited` (purple) и `warning` (yellow) не трогать.
2. **`text-brand-contrast` выбирает автор темы, не библиотека** (в веб-Themer это ручной контрол; в дефолте тёмный текст под жёлтый). Генератор
   ниже выбирает по правилу — больший APCA из `text-dark-primary` / `text-light-primary` на каждую тему; в сдаче это **решение генератора**,
   решением владельца оно становится после подтверждения. Lc ниже 60 — предупреждение (порог рецепта, не гарантия читаемости всех размеров).

Стенд (uikit-themer 2.0.0, четыре цвета): переведено 18 ссылок; `warning` и `visited` не тронуты; выбор текста — светлый бренд `#F2F2F2` →
тёмный текст Lc 95/97; тёмный `#1B1F3B` → светлый Lc 106/84; `#6C91C9` → светлый 65/54; `#E53935` → светлый 73/58 (light/dark).

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
Проверка: в обеих темах `--g-color-base-brand`, `-hover`, `--g-color-text-link`, `--g-color-base-selection` = оттенки бренда, `warning`/`visited`
прежние (вычисленные значения на `.g-root`); гейт — `brand_text_mismatch` 0; видимый результат — кнопка, ссылка, выделение в light и dark. Кандидат в апстрим uikit-themer: `updateBaseColor('brand')` не переводит бренд-группу — issue/PR или строка в README.
