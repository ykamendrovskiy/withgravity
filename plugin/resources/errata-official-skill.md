# Errata к официальному скиллу `gravity-ui` (gravity-ui/skills)

Временный оверлей: строки официального скилла, которые по фактчеку неверны или неполны. Каждая строка — с источником и
условием удаления (влито в апстрим → строку убрать). Проверено против gravity-ui/skills `753ea8b` и uikit@7.47.2; применимость к
установленной версии скилла и пакетов сверять перед использованием.

| # | Где в официальном | Что не так | Как правильно | Источник | Удалить, когда |
|---|---|---|---|---|---|
| 1 | `rules/hallucination-traps.md`, «Button uses view» | в списке валидных view есть `special` и `clear` — их нет в uikit@7 | 22 view из `BUTTON_VIEWS`; для цветного фона — семейство `*-contrast` | uikit `src/components/Button/constants.ts` | список в апстриме исправлен |
| 2 | там же, про gap | «halves allowed: 0.5, 1.5…» | полушаг один: `0.5`; шкала `0 \| 0.5 \| 1…10` | uikit `src/components/layout/types.ts` | исправлено |
| 3 | там же, «Flex/Box only expose gap» | у `Box` есть проп `spacing` | `<Box spacing={{p: 4, mb: 3}}>` первым вариантом; `sp()` — для не-Box | uikit `Box.tsx` | исправлено |
| 4 | там же, «Controls on a brand background» | советует тематический `view="raised"` | `normal-contrast` / `outlined-contrast` / `flat-contrast` | `BUTTON_VIEWS` | исправлено |
| 5 | hosted `llms/uikit/llms.txt`, pitfalls | theme без `system` | `DEFAULT_THEME = 'system'` | uikit `theme/constants.ts` | генератор llms.txt синхронизирован |
| 6 | `references/package-routing.md` | нет `@gravity-ui/components` (FormRow, ConfirmDialog, AdaptiveTabs) | бери пакет; состав — `library-components.md` здесь | фактчек 05.08 | секция появилась в роутинге |
| 7 | page-constructor | сетка требует глобальный `box-sizing: border-box` от хоста, доки молчат | reset в `scaffold-app-shell` | bootstrap.scss#L58, замер 27.07 | required setup в доках/скилле |
| 9 | `SKILL.md`, LOCAL-слой | `dist/docs` есть не во всех версиях/пакетах | нет `build/docs` → README пакета → online major-line | open-issue в skills от 01.09 | issue закрыт |
