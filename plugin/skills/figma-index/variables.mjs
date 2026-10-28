#!/usr/bin/env node
// figma-index: окна переменных (extract.js, режим variables) → <libdir>/variables.json (+ внешние цели алиасов → binding.variables библиотек палитр).
// node variables.mjs <libdir> <окно.txt>... [--file-key K] [--init <libraryId>] [--ext <ext-targets.txt>] [--ext-lib <prefix>=<libraryId>[,…]] [--ext-dir <libraries/figma>]
// Окно: первая строка `# collection=<имя> modes=a|b|c [format=grouped] … [groups: Мода→Группа, …]`.
//   строковый формат: name|T[h]|v1|v2… (T = C/F/S/B; h = hidden; одно v = одинаково во всех модах);
//   grouped (палитры, одна мода): prefix|leaf=hex[@alpha],… — leaf «Ns» = «N Solid», значение без «#».
//   v: #rrggbb[@alpha%] | число | true/false | строка | @имя (алиас) | @/x (алиас в своей верхней группе) | =path (⇒ @Appearance/<группа моды>/path).
// ext-targets: name|key|collectionIdPrefix — цели внешних алиасов исходника; --ext-lib сопоставляет префикс коллекции библиотеке пакета.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2); const flags = new Set(['--file-key', '--init', '--ext', '--ext-lib', '--ext-dir']);
const opt = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : undefined; };
const pos = args.filter((a, i) => !a.startsWith('--') && !flags.has(args[i - 1]));
const [libdir, ...files] = pos; if (!libdir || !files.length) { console.error('usage: variables.mjs <libdir> <окно.txt>... [--file-key K] [--init id] [--ext f] [--ext-lib p=id,…] [--ext-dir d]'); process.exit(2); }
const HERE = path.dirname(fileURLToPath(import.meta.url)); const SCHEMAS = path.resolve(HERE, '..', '..', 'resources', 'libraries');
const fail = (m) => { console.error('variables: ' + m); process.exit(1); };
const readJ = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const bindP = path.join(libdir, 'binding.json');
let bind = fs.existsSync(bindP) ? readJ(bindP) : null;
if (!bind) { const id = opt('--init'); if (!id) fail(`${bindP} нет; для новой библиотеки задайте --init <libraryId>`); const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  bind = { schemaVersion: '1', libraryId: id, inventoryRevision: now.slice(0, 10) + '.1', source: { kind: 'published-library', fileKey: opt('--file-key') || undefined }, indexedAt: now, indexedBy: 'figma-index (variables.mjs --init: библиотека переменных без компонентов)', components: [], variables: {}, styles: {}, compatibility: {}, variableCollections: {} };
  fs.mkdirSync(libdir, { recursive: true });
  const invP = path.join(libdir, 'inventory.json'); if (!fs.existsSync(invP)) fs.writeFileSync(invP, JSON.stringify({ schemaVersion: '1', libraryId: id, inventoryRevision: bind.inventoryRevision, description: `Библиотека «${id}»: переменные (палитра), компонентов нет.`, components: [], tokens: {}, dependencies: [] }, null, 1) + '\n'); }
const TYPES = { C: 'COLOR', F: 'FLOAT', S: 'STRING', B: 'BOOLEAN' };
const HEX = /^#[0-9a-f]{6}(@\d{1,3})?$/; const okAlpha = (h) => { const m = /@(\d+)$/.exec(h); return !m || (Number(m[1]) >= 0 && Number(m[1]) <= 100); };
const cols = {}; const seenNames = new Set();
const addVar = (col, name, type, hidden, values, src) => { const k = col + '\u0000' + name; if (seenNames.has(k)) fail(`${src}: повтор переменной «${name}» в коллекции «${col}»`); seenNames.add(k); cols[col].variables[name] = { type, ...(hidden ? { hidden: true } : {}), values }; };
const conv = (v, type, src, name) => {
  if (typeof v === 'string' && v.startsWith('\\')) { if (type !== 'STRING') fail(`${src}: ${name}: экранированный литерал допустим только для STRING`); return { literal: v.slice(1) }; }
  if (typeof v === 'string' && v.startsWith('@')) { if (type === 'STRING' && !/^@[^/]+\//.test(v) && !v.startsWith('@/')) fail(`${src}: ${name}: STRING «${v}» — алиас или литерал? литерал экранировать как \\${v}`); return v; }
  if (type === 'STRING' && typeof v === 'string' && v.startsWith('=')) fail(`${src}: ${name}: STRING «${v}» начинается с «=» — литерал экранировать как \\${v}`);
  if (type === 'COLOR') { const h = v.startsWith('#') ? v : '#' + v; if (!HEX.test(h) || !okAlpha(h)) fail(`${src}: ${name}: не цвет или alpha вне 0–100 «${v}»`); return h; }
  if (type === 'FLOAT') { const n = Number(v); if (v === '' || !Number.isFinite(n)) fail(`${src}: ${name}: не конечное число «${v}»`); return n; }
  if (type === 'BOOLEAN') { if (v !== 'true' && v !== 'false') fail(`${src}: ${name}: не bool «${v}»`); return v === 'true'; }
  return v;
};
for (const f of files) {
  let col = null, groups = {}, grouped = false;
  for (const raw of fs.readFileSync(f, 'utf8').split('\n')) {
    const line = raw.replace(/\r$/, ''); if (!line.trim()) continue;
    if (line.startsWith('#')) {
      const m = /collection=(.+?)(?=\s+modes=|\s+format=|\s+offset=|\s*;|\s*$)/.exec(line); if (m) { col = m[1].trim(); cols[col] ||= { key: (bind.variableCollections || {})[col]?.key, modes: [], variables: {} }; grouped = false; groups = {}; }
      const md = /modes=(.+?)(?=\s+format=|\s+offset=|\s+groups:|\s*;|\s{2,}|\s*\(|\s*$)/.exec(line); if (md && col) { const ms = md[1].trim().split('|').map((s) => s.trim()); if (cols[col].modes.length && cols[col].modes.join('|') !== ms.join('|')) fail(`${f}: моды коллекции «${col}» не совпадают с прежним окном`); cols[col].modes = ms; }
      if (/format=grouped/.test(line)) grouped = true;
      for (const g of line.matchAll(/([^,:;]+?)→([^,;]+)/g)) groups[g[1].trim()] = g[2].trim();
      continue;
    }
    if (!col) fail(`${f}: строка до заголовка collection=`); const modes = cols[col].modes; if (!modes.length) fail(`${f}: у коллекции «${col}» не заданы modes=`);
    if (grouped) {
      if (modes.length !== 1) fail(`${f}: grouped-формат только для коллекций с одной модой`);
      const i = line.indexOf('|'); if (i < 0) fail(`${f}: нет «|»: ${line.slice(0, 60)}`); const prefix = line.slice(0, i); const items = line.slice(i + 1).split(',');
      for (const it of items) { const j = it.indexOf('='); if (j < 0) fail(`${f}: нет «=» в «${it}»`); let leaf = it.slice(0, j), val = it.slice(j + 1); if (/^\d+i?s$/.test(leaf)) leaf = leaf.slice(0, -1) + ' Solid'; const name = prefix ? prefix + '/' + leaf : leaf; addVar(col, name, 'COLOR', false, [conv(val, 'COLOR', f, name)], f); }
      continue;
    }
    const [name, t, ...vals] = line.split('|'); const type = TYPES[(t || '')[0]]; if (!type) fail(`${f}: ${name}: неизвестный тип «${t}»`); const hidden = (t || '').endsWith('h'); const grp = name.split('/')[0];
    if (!vals.length) fail(`${f}: ${name}: нет значений`);
    let values;
    if (vals.length === 1 && vals[0].startsWith('=') && type !== 'STRING') values = modes.map((m) => '@Appearance/' + (groups[m] || m) + '/' + vals[0].slice(1));
    else { const vv = vals.length === 1 ? modes.map(() => vals[0]) : vals; if (vv.length !== modes.length) fail(`${f}: ${name}: ${vv.length} значений при ${modes.length} модах`); values = vv.map((v) => (v.startsWith('@/') ? '@' + grp + '/' + v.slice(2) : v)); }
    addVar(col, name, type, hidden, values.map((v) => conv(v, type, f, name)), f);
  }
}
// внешние цели: карта имя → {key, collection-prefix}, префикс → libraryId пакета
const extMap = {}; const extLib = {}; for (const kv of (opt('--ext-lib') || '').split(',').filter(Boolean)) { const [p, id] = kv.split('='); extLib[p] = id; }
const extDup = []; if (opt('--ext')) for (const raw of fs.readFileSync(opt('--ext'), 'utf8').split('\n')) { if (!raw.trim() || raw.startsWith('#')) continue; const [name, key, pref] = raw.replace(/\r$/, '').split('|'); if (!key) fail(`ext: нет ключа у «${name}»`); if (extMap[name] && extMap[name].key !== key) extDup.push(name); const lib = Object.keys(extLib).find((p) => pref && (pref.startsWith(p) || p.startsWith(pref))); extMap[name] = { key, collection: pref, library: lib ? extLib[lib] : null }; }
if (extDup.length) fail(`ext: имя цели неоднозначно (разные ключи): ${[...new Set(extDup)].join(', ')} — имя не идентификатор, нужна ссылка по ключу`);
// алиасы: своя коллекция → @<Коллекция>/имя; другая коллекция файла → @<Коллекция>/имя; внешняя цель с известной библиотекой → @ext:<libraryId>/имя; известная без библиотеки → @ext:?/имя; неизвестная → @missing:имя
const names = Object.fromEntries(Object.entries(cols).map(([c, v]) => [c, new Set(Object.keys(v.variables))]));
let total = 0, ext = 0, extUnknownLib = 0, missing = 0; const missingNames = new Set(); const external = {};
for (const [c, v] of Object.entries(cols)) for (const vr of Object.values(v.variables)) { total++; vr.values = vr.values.map((x) => {
  if (typeof x !== 'string' || !x.startsWith('@')) return x; const n = x.slice(1);
  if (names[c].has(n)) return '@' + c + '/' + n; const i = n.indexOf('/'); const cn = i > 0 ? n.slice(0, i) : ''; if (cols[cn] && names[cn].has(n.slice(i + 1))) return '@' + n;
  const e = extMap[n]; if (e) { ext++; external[n] = { key: e.key, library: e.library || undefined, collection: e.collection }; if (!e.library) extUnknownLib++; return '@ext:' + (e.library || '?') + '/' + n; }
  if (Object.keys(extMap).length) { missing++; missingNames.add(n); return '@missing:' + n; } ext++; return '@ext:?/' + n; }); }
for (const v of Object.values(cols)) for (const vr of Object.values(v.variables)) vr.values = vr.values.map((x) => (x && typeof x === 'object' && 'literal' in x ? x.literal : x));
const out = { schemaVersion: '1', libraryId: bind.libraryId, source: Object.assign({}, bind.source, opt('--file-key') ? { fileKey: opt('--file-key') } : {}), extractedAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  note: 'Значения переменных исходника по модам (use_figma, режим variables). Цвет #rrggbb[@alpha%]; @Коллекция/имя — алиас внутри файла; @ext:<libraryId>/имя — алиас на переменную внешней библиотеки (ключ и коллекция — в external, значение — в variables.json этой библиотеки); @ext:?/имя — внешняя библиотека не сопоставлена; @missing:имя — цель алиаса не найдена ни в файле, ни среди внешних целей.',
  collections: cols };
if (Object.keys(external).length) out.external = external;
// схема, атомарная запись
const schema = readJ(path.join(SCHEMAS, 'variables.schema.json'));
function validate(obj, s, p = '') { const errs = []; const t = s.type; if (t && typeof obj !== 'undefined') { const jt = Array.isArray(obj) ? 'array' : obj === null ? 'null' : typeof obj; if ((t === 'number' ? jt !== 'number' : t !== jt)) { errs.push(`${p}: ожидался ${t}, получен ${jt}`); return errs; } }
  if (t === 'object' && obj) { for (const r of s.required || []) if (!(r in obj)) errs.push(`${p}: нет поля ${r}`); const pr = s.properties || {}; for (const [k, v] of Object.entries(obj)) { if (pr[k]) errs.push(...validate(v, pr[k], `${p}/${k}`)); else if (s.additionalProperties === false) errs.push(`${p}: лишнее поле ${k}`); else if (s.additionalProperties && typeof s.additionalProperties === 'object') errs.push(...validate(v, s.additionalProperties, `${p}/${k}`)); } }
  else if (t === 'array') obj.forEach((it, i) => errs.push(...validate(it, s.items || {}, `${p}[${i}]`))); else if (s.enum && !s.enum.includes(obj)) errs.push(`${p}: ${obj} не из ${s.enum.join('|')}`); return errs; }
const errs = validate(out, schema); if (errs.length) fail('схема: ' + errs.slice(0, 5).join('; '));
const outP = path.join(libdir, 'variables.json'); fs.writeFileSync(outP + '.tmp', JSON.stringify(out, null, 1) + '\n'); fs.renameSync(outP + '.tmp', outP);
// ключи внешних целей — в binding.variables соответствующих библиотек пакета (имя → {key, collection})
const extDir = opt('--ext-dir'); const perLib = {}; for (const [n, e] of Object.entries(external)) if (e.library) (perLib[e.library] ||= {})[n] = { key: e.key, collection: e.collection };
if (extDir) for (const [lib, vars] of Object.entries(perLib)) { const bp = path.join(extDir, lib, 'binding.json'); if (!fs.existsSync(bp)) { console.log(`  ${lib}: binding.json нет — ключи ${Object.keys(vars).length} целей не записаны (создайте паспорт: variables.mjs ${path.join(extDir, lib)} … --init ${lib})`); continue; } const b = readJ(bp); b.variables = Object.assign({}, b.variables || {}, vars); fs.writeFileSync(bp + '.tmp', JSON.stringify(b, null, 1) + '\n'); fs.renameSync(bp + '.tmp', bp); console.log(`  ${lib}/binding.json: variables += ${Object.keys(vars).length} ключей`); }
if (!fs.existsSync(bindP)) fs.writeFileSync(bindP, JSON.stringify(bind, null, 1) + '\n');
console.log(`${bind.libraryId}: variables.json — коллекций ${Object.keys(cols).length}, переменных ${total}, внешних значений-алиасов ${ext}${extUnknownLib ? ` (без библиотеки: ${extUnknownLib} значений, ${new Set(Object.entries(external).filter(([,e])=>!e.library).map(([n])=>n)).size} целей)` : ''}${missing ? `, битых ${missing}: ${[...missingNames].slice(0, 5).join(', ')}` : ''}`);
for (const [c, v] of Object.entries(cols)) console.log(`  ${c}: ${Object.keys(v.variables).length} × ${v.modes.length} мод${v.key ? '' : ' (ключа коллекции в binding нет)'}`);
