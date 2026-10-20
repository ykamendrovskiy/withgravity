# traps/markdown-editor — `@gravity-ui/markdown-editor`

```tsx
const editor = useMarkdownEditor({initial: {markup: value}}); // создаётся один раз
editor.on('change', () => onValueChange(editor.getValue()));  // синк наружу — событием
<MarkdownEditorView editor={editor} stickyToolbar={false} />  // stickyToolbar — required (TS2741)
```
- `ToasterProvider` обязателен (runtime-throw из `useToaster`, README молчит) — дерево провайдеров в `templates/app-shell/README.md`; `@gravity-ui/components` приезжает в bundle редактора.
- CSS руками не импортировать (side-effect из JS); высоту ограничивай снаружи (`height` + `min-width:0`, контент `overflow-y:auto`); скрепка — только с `handlers.uploadFile`.
- Build-варнинги (externalized builtins, `eval` в diplodoc, chunks > 500kB) — не фейлящие; бандл ≈ +3.3 MB JS.
- Доки на пине: тег `markdown-editor-v<версия>` (не `v<версия>`), корневые `README.md` + `AGENTS.md`; фолбэк `npm view @gravity-ui/markdown-editor@<пин> readme`.
