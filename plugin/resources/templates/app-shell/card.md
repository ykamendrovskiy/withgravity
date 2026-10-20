# app-shell
- **id:** app-shell · **scale:** app · **когда брать:** новый проект без рабочей обвязки (маршрут build «новый проект»); в существующий проект не копируется
- **состав:** Vite + React + TS по официальному примеру gravity-ui-vite-example; `src/main.tsx` с ThemeProvider → ToasterProvider → App + ToasterComponent; стили `fonts.css` → `styles.css` → тема сервиса → reset
- **зависимости:** @gravity-ui/uikit (версия — установленная), опционально @gravity-ui/components; тема — из профиля
- **контракт интеграции (app):** точка входа и владельцы провайдеров/темы/роутера названы в README; перенос ThemeProvider внутрь App — вместе с ToasterProvider и ToasterComponent
- **обязательные состояния/конвенции:** `shell.providers-order` (conventions.json), `shell.border-box`
- **проверки:** запуск без ошибок консоли · тост вызывается · обе темы (`check.id`: shell-runtime, shell-toast, theme-modes)
- **источник и ревизия:** templates/app-shell/README.md плагина 0.7.x; инвариант провайдеров — прогон 2026-10-14 (пустая страница при ToasterComponent вне ThemeProvider)
