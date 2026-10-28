// Шаблон кода для use_figma (figma-index). Подставить PAGE_ID, OFFSET, LIMIT. Вернёт окно сетов страницы в компактном виде.
// Секция styles — отдельный вызов: вернуть стили и коллекции переменных файла.
const PAGE_ID = '__PAGE_ID__'; const OFFSET = 0; const LIMIT = 300; const MODE = 'components'; // 'components' | 'pages' | 'styles' | 'variables' | 'ext'
const COLLECTION = '__COLLECTION__'; // для MODE='variables': имя коллекции; окно OFFSET..LIMIT (≈250 строк на 48 КБ)
if (MODE === 'pages') { return figma.root.children.map((p) => ({ id: p.id, name: p.name })); }
if (MODE === 'ext') {
  // Цели внешних алиасов (переменные чужих библиотек): name|key|префикс id коллекции — окнами по ~550 имён; потом variables.mjs --ext … --ext-lib <префикс>=<libraryId>.
  const cols = await figma.variables.getLocalVariableCollectionsAsync(); const local = new Set(cols.map((c) => c.id)); const targets = {}; const ambiguous = {};
  for (const c of cols) for (const id of c.variableIds) { const v = await figma.variables.getVariableByIdAsync(id); for (const x of Object.values(v.valuesByMode)) { if (!x || x.type !== 'VARIABLE_ALIAS') continue; const t = await figma.variables.getVariableByIdAsync(x.id); if (!t || local.has(t.variableCollectionId)) continue; const row = t.key + '|' + t.variableCollectionId.replace('VariableCollectionId:', ''); if (targets[t.name] && targets[t.name] !== row) (ambiguous[t.name] ||= new Set([targets[t.name]])).add(row); targets[t.name] = row; } }
  // ambiguous: одно имя у разных целей (ключей) — такие ссылки по имени не разрешать; variables.mjs откажет на дубле
  const names = Object.keys(targets).sort(); return { total: names.length, offset: OFFSET, ambiguous: Object.fromEntries(Object.entries(ambiguous).map(([n, s]) => [n, [...s]])), rows: names.slice(OFFSET, OFFSET + LIMIT).map((n) => n + '|' + targets[n]) };
}
if (MODE === 'variables') {
  // Строки «name|T[h]|v1|v2…» (T = C/F/S/B, h = hiddenFromPublishing; одно v = одинаково во всех модах; алиас = @имя, в своей верхней группе — @/x).
  // Переменные внешних библиотек (палитры) в getLocalVariableCollectionsAsync отсутствуют — их алиасы приходят голым именем; variables.mjs помечает их @ext:.
  const cols = await figma.variables.getLocalVariableCollectionsAsync(); const c = cols.find((x) => x.name === COLLECTION);
  const hex = (v) => { const h = (n) => Math.round(n * 255).toString(16).padStart(2, '0'); const a = v.a === undefined ? 1 : v.a; return '#' + h(v.r) + h(v.g) + h(v.b) + (a < 1 ? '@' + Math.round(a * 100) : ''); };
  const cache = {}; const nameOf = async (id) => { if (!cache[id]) { const v = await figma.variables.getVariableByIdAsync(id); const vc = cols.find((x) => x.id === v.variableCollectionId); cache[id] = (vc && vc.name !== COLLECTION ? vc.name + '/' : '') + v.name; } return cache[id]; };
  const rows = [];
  for (const id of c.variableIds.slice(OFFSET, OFFSET + LIMIT)) {
    const v = await figma.variables.getVariableByIdAsync(id); const grp = v.name.split('/')[0] + '/'; const vals = [];
    for (const m of c.modes) { const x = v.valuesByMode[m.modeId]; if (x && x.type === 'VARIABLE_ALIAS') { const n = await nameOf(x.id); vals.push(n.startsWith(grp) ? '@/' + n.slice(grp.length) : '@' + n); } else if (v.resolvedType === 'COLOR') vals.push(hex(x)); else { const sv = String(x); vals.push(v.resolvedType === 'STRING' && (/^[@=\\]/.test(sv) || sv.includes('|')) ? '\\' + sv.replace(/\|/g, '\\u007c') : sv); } }
    const same = vals.every((x) => x === vals[0]); rows.push([v.name, v.resolvedType[0] + (v.hiddenFromPublishing ? 'h' : ''), ...(same ? [vals[0]] : vals)].join('|'));
  }
  return { collection: COLLECTION, total: c.variableIds.length, modes: c.modes.map((m) => m.name), offset: OFFSET, n: rows.length, rows };
}
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
