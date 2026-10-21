# traps/navigation — `AsideHeader` / `PageLayout`: модель высоты

- Ни `AsideHeader`, ни `PageLayout`-пара **не ограничивают высоту content-pane**: контент растёт, скроллится документ, рельса `sticky; height:100vh`. `height:100%` на контент-колонке резолвится от контента → «sticky» топбар/`ActionBar` уезжают вместе с документом. Для страниц-документов это норма; для app-экрана — нет.
- **App-рамка — обязанность сборки:** контент-колонке `height: 100vh` (+ `min-height`-гард), скролл внутрь области (`overflow-y:auto`), не `height:100%`. В манифесте — `frame: {viewport: true, minHeight}` (гейт меряет `frame_leak`, `pinned_drift`, `chrome_squeeze`).
- **`ActionBar` в колонке-рамке — `flex-shrink: 0` сам:** бар высоту не защищает (verified: 40→28px на лестнице 900→560).
- `PageLayout` + `PageLayoutAside` + `PageLayout.Content` — про сплит поддеревьев, `topAlert` и контекст ширины, не про высоту; ширину контента `AsideHeader` синхронизирует сам.
- **`AsideHeader` `panelItems`: панель (Drawer) по умолчанию 400px и содержимое вылезает за подложку** — для панели с формой/настройками задай `size: 'auto'` (или нужную ширину) у элемента `panelItems` (замер 2026-10).
