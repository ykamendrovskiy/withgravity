# Template «app-shell» (масштаб: приложение) — минимальная обвязка

Тип: Template · scale: app · **только новый проект** (маршрут build new-project); в существующий проект не копируется, в new-page/local-fix
не читается, если обвязка не меняется. Контракт: точка входа `src/main.tsx`; владельцы провайдеров ThemeProvider → ToasterProvider → App +
ToasterComponent; тема сервиса `theme/*.css` после `styles.css`; reset border-box; **адресация экранов** (каждый экран открывается
URL/параметром, иначе verify проверит не тот экран; состояния — `scenarios.manifest.json`, см. `resources/scenarios.md`).
Проверка: запуск без ошибок консоли · тост вызывается · обе темы.

## Скаффолд — официальный `gravity-ui-vite-example`, не сочинять
Конфиги (`tsconfig.json`, `vite.config.ts`, build-скрипт `tsc && vite build`) — из github.com/gravity-ui/gravity-ui-vite-example. Апстрим
недоступен → known-good минимум: один `tsconfig.json` без `references` на composite-проект (иначе `TS6310` валит сборку):
```jsonc
{ "compilerOptions": { "target": "ES2020", "lib": ["ES2020", "DOM", "DOM.Iterable"], "module": "ESNext", "moduleResolution": "bundler",
  "jsx": "react-jsx", "resolveJsonModule": true, "isolatedModules": true, "noEmit": true, "strict": true, "skipLibCheck": true }, "include": ["src"] }
```
`vite.config.ts`: `export default defineConfig({plugins: [react()]})`. `index.html` в корне с `<div id="root">` и `<script type="module" src="/src/main.tsx">`.
`src/vite-env.d.ts`: `/// <reference types="vite/client" />` (иначе `import.meta.env` → TS2339). Next.js/Remix — другая обвязка, здесь не покрыта.

## Точка входа — нормативное дерево провайдеров
```tsx
// src/main.tsx
import {createRoot} from 'react-dom/client';
import {ThemeProvider, Toaster, ToasterProvider, ToasterComponent} from '@gravity-ui/uikit';
import '@gravity-ui/uikit/styles/fonts.css';
import '@gravity-ui/uikit/styles/styles.css';
import './theme/service.theme.css';   // тема сервиса — ПОСЛЕ styles.css (если есть)
import './index.css';                 // reset — после стилей uikit
import {App} from './App';

const toaster = new Toaster();        // класс, один экземпляр на модуль (не внутри компонента)
createRoot(document.getElementById('root')!).render(
  <ThemeProvider theme={theme}>       {/* выше всех потребителей темы; 'light'|'dark'|'light-hc'|'dark-hc'|'system' */}
    <ToasterProvider toaster={toaster}>   {/* проп toaster обязателен */}
      <App />
      <ToasterComponent />            {/* Portal читает тему → обязан быть под ThemeProvider */}
    </ToasterProvider>
  </ThemeProvider>,
);
```
Контекст определяется деревом компонентов, не DOM: переносишь `ThemeProvider` внутрь `App` (тема из состояния) — переноси туда же
`ToasterProvider` и `ToasterComponent`, иначе пустая страница `useTheme* hooks must be used within ThemeProvider` (tsc/build зелёные —
ловится только запуском: после сборки вызови тост). Вызов: `const {add} = useToaster(); add({name, title, theme: 'success', autoHiding: 3000})`.
Мобильность (`AsideHeader` и др. читают контекст): `<MobileProvider>` под `ThemeProvider`, когда нужна адаптивность.

## Reset — чтобы шелл прилегал к краям
```css
/* src/index.css */
*, *::before, *::after { box-sizing: border-box; }   /* сетка page-constructor молча ждёт border-box от хоста */
html, body, #root { height: 100%; margin: 0; }        /* без margin:0 AsideHeader не прилегает */
ul, ol { margin: 0; padding: 0; }                     /* uikit Stepper — <ol>, без сброса уезжает на 40px */
```

## Не делать
Компоненты без `ThemeProvider`/`styles.css` · `ToasterProvider` без `toaster` · `new Toaster()` внутри компонента · без `ToasterComponent`
(тосты не видны) · `console.log` вместо видимого подтверждения · самописный `tsconfig` с composite+noEmit · переключатель состояний без
dev-гейтинга и манифест с id, которые ничего не переключают.
