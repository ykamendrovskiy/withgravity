// Шаблон кода для use_figma (figma-index). Подставить PAGE_ID, OFFSET, LIMIT. Вернёт окно сетов страницы в компактном виде.
// Секция styles — отдельный вызов: вернуть стили и коллекции переменных файла.
const PAGE_ID = '__PAGE_ID__'; const OFFSET = 0; const LIMIT = 300; const MODE = 'components'; // 'components' | 'pages' | 'styles'
if (MODE === 'pages') { return figma.root.children.map((p) => ({ id: p.id, name: p.name })); }
if (MODE === 'styles') {
  const ts = (await figma.getLocalTextStylesAsync()).map((s) => ({ name: s.name, key: s.key, desc: (s.description || '').slice(0, 60) }));
  const ps = (await figma.getLocalPaintStylesAsync()).map((s) => ({ name: s.name, key: s.key, desc: (s.description || '').slice(0, 60) }));
  const cols = (await figma.variables.getLocalVariableCollectionsAsync()).map((c) => ({ name: c.name, key: c.key, modes: c.modes.map((m) => m.name), count: c.variableIds.length }));
  return { textStyles: ts, paintStyles: ps, collections: cols };
}
const page = await figma.getNodeByIdAsync(PAGE_ID);
const sets = page.findAllWithCriteria({ types: ['COMPONENT_SET'] });
const loose = page.findAllWithCriteria({ types: ['COMPONENT'] }).filter((c) => c.parent.type !== 'COMPONENT_SET');
const all = [...sets, ...loose].sort((a, b) => a.name.localeCompare(b.name));
const rows = [];
for (const n of all.slice(OFFSET, OFFSET + LIMIT)) {
  const axes = {}; const props = [];
  for (const [k, d] of Object.entries(n.componentPropertyDefinitions || {})) {
    if (d.type === 'VARIANT') axes[k] = d.variantOptions; else props.push([k.replace(/#.*$/, '').trim(), d.type]);
  }
  rows.push({ page: page.name, name: n.name, kind: n.type === 'COMPONENT_SET' ? 'set' : 'component', key: n.key, variants: n.type === 'COMPONENT_SET' ? n.children.length : 1, axes, props });
}
return { page: page.name, total: all.length, offset: OFFSET, rows };
