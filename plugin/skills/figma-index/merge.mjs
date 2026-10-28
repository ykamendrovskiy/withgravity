#!/usr/bin/env node
// figma-index: extract.jsonl (строки {page,name,kind,key,variants,axes,props}) + папка паспорта → inventory.json, binding.json, дифф, валидация.
// node merge.mjs <libdir> <extract.jsonl> [--styles styles.json] [--library-key lk-…] [--file-key …] [--id <libraryId>] [--icons]
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const [, , libdir, extractPath, ...rest] = process.argv;
if (!libdir || !extractPath) { console.error('usage: merge.mjs <libdir> <extract.jsonl> [--styles f] [--library-key k] [--file-key k] [--id id] [--icons]'); process.exit(2); }
const opt = (f) => { const i = rest.indexOf(f); return i >= 0 ? rest[i + 1] : null; };
const HERE = path.dirname(fileURLToPath(import.meta.url)); const SCHEMAS = path.resolve(HERE, '..', '..', 'resources', 'libraries');
const read = (p, d) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : d);
const rows = fs.readFileSync(extractPath, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const invP = path.join(libdir, 'inventory.json'), bindP = path.join(libdir, 'binding.json');
const inv = read(invP, null), bind = read(bindP, null); const fresh = !inv;
const libraryId = opt('--id') || (inv && inv.libraryId) || path.basename(libdir);
const slug = (s) => s.toLowerCase().replace(/^\./, '').replace(/[^a-z0-9а-яё]+/gi, '-').replace(/^-|-$/g, '');
const prevByKey = new Map(), prevByName = new Map();
if (bind) for (const c of bind.components) prevByKey.set(c.key, c);
if (inv) for (const c of inv.components) prevByName.set(c.name, c);
const prevInvById = new Map((inv ? inv.components : []).map((c) => [c.logicalId, c]));
const icons = rest.includes('--icons');
const comps = [], binds = [], diff = { new: [], removed: [], renamed: [], axesChanged: [], propsChanged: [], keyChanged: [], variantsChanged: [] };
const seenKeys = new Set();
for (const r of rows) {
  seenKeys.add(r.key);
  const prevB = prevByKey.get(r.key); const prevI = prevB ? prevInvById.get(prevB.logicalId) : prevByName.get(r.name);
  const logicalId = prevB ? prevB.logicalId : prevI ? prevI.logicalId : slug(r.name);
  const kind = icons ? (r.variants > 1 ? 'set' : 'icon') : r.kind;
  const c = { logicalId, name: r.name, kind };
  if (Object.keys(r.axes || {}).length) c.variantAxes = r.axes;
  if (r.props && r.props.length) c.properties = r.props.map(([name, type]) => ({ name, type }));
  if (r.page) c.page = r.page;
  if (prevI) { for (const k of ['notes', 'codeMappingRef']) if (prevI[k]) c[k] = prevI[k]; }
  comps.push(c);
  const b = { logicalId, key: r.key, status: 'bound' };
  if (prevB && prevB.note) b.note = prevB.note;
  if (prevB && prevB.variants) b.variants = prevB.variants;
  binds.push(b);
  if (!prevB && !prevI) diff.new.push(r.name);
  else if (prevB && prevI && prevI.name !== r.name) diff.renamed.push(`${prevI.name} → ${r.name}`);
  else if (!prevB && prevI) { diff.keyChanged.push(r.name); b.status = 'ambiguous'; b.note = 'ключ изменился при том же имени — проверить публикацию'; }
  if (prevI) {
    if (JSON.stringify(prevI.variantAxes || {}) !== JSON.stringify(c.variantAxes || {})) diff.axesChanged.push(r.name);
    if (JSON.stringify((prevI.properties || []).map((p) => p.name + ':' + p.type)) !== JSON.stringify((c.properties || []).map((p) => p.name + ':' + p.type))) diff.propsChanged.push(r.name);
  }
}
if (bind) for (const c of bind.components) if (!seenKeys.has(c.key)) { const pi = prevInvById.get(c.logicalId); const nm = pi ? pi.name : c.logicalId; if (!rows.some((r) => r.name === nm)) diff.removed.push(nm); }
const today = new Date().toISOString().slice(0, 10); const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const rev = `${today}.${fresh ? 1 : ((inv.inventoryRevision || '').startsWith(today) ? Number((inv.inventoryRevision.split('.')[1] || 0)) + 1 : 1)}`;
const newInv = { schemaVersion: '1', libraryId, inventoryRevision: rev, description: inv ? inv.description : `Библиотека «${libraryId}»: опись сетов и одиночных компонентов исходного файла (figma-index).`, components: comps, tokens: inv ? inv.tokens || {} : {}, dependencies: inv ? inv.dependencies || [] : [] };
const source = Object.assign({ kind: 'published-library' }, bind ? bind.source : {}); if (opt('--library-key')) source.libraryKey = opt('--library-key'); if (opt('--file-key')) source.fileKey = opt('--file-key');
const newBind = Object.assign({}, bind || {}, { schemaVersion: '1', libraryId, inventoryRevision: rev, source, indexedAt: now, lastVerifiedAt: now, indexedBy: 'figma-index (use_figma по исходному файлу библиотеки: все COMPONENT_SET и одиночные COMPONENT страниц, ключи = key узла)', components: binds, variables: bind ? bind.variables || {} : {}, styles: bind ? bind.styles || {} : {}, compatibility: bind ? bind.compatibility || {} : {} });
const stylesP = opt('--styles');
if (stylesP) { const st = read(stylesP, {}); const styles = {}; for (const s of [...(st.textStyles || []), ...(st.paintStyles || [])]) styles[s.name] = s.key; newBind.styles = Object.assign({}, newBind.styles, styles); if (st.collections) newBind.variableCollections = Object.assign({}, newBind.variableCollections || {}, Object.fromEntries(st.collections.map((c) => [c.name, { key: c.key, modes: c.modes, count: c.count }]))); }
// валидация (draft-07 подмножество: required / additionalProperties / enum / type)
function validate(obj, schema, pathStr = '') { const errs = []; const t = schema.type; if (t === 'object' && typeof obj === 'object' && obj !== null) { for (const r of schema.required || []) if (!(r in obj)) errs.push(`${pathStr}: нет поля ${r}`); const props = schema.properties || {}; for (const [k, v] of Object.entries(obj)) { if (props[k]) errs.push(...validate(v, props[k], `${pathStr}/${k}`)); else if (schema.additionalProperties === false) errs.push(`${pathStr}: лишнее поле ${k}`); else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') errs.push(...validate(v, schema.additionalProperties, `${pathStr}/${k}`)); } } else if (t === 'array' && Array.isArray(obj)) { obj.forEach((it, i) => errs.push(...validate(it, schema.items || {}, `${pathStr}[${i}]`))); } else if (schema.enum && !schema.enum.includes(obj)) errs.push(`${pathStr}: ${obj} не из ${schema.enum.join('|')}`); return errs; }
const e1 = validate(newInv, read(path.join(SCHEMAS, 'inventory.schema.json'), {})), e2 = validate(newBind, read(path.join(SCHEMAS, 'binding.schema.json'), {}));
if (e1.length || e2.length) { console.error('схема:', [...e1, ...e2].slice(0, 10).join('\n')); process.exit(1); }
fs.writeFileSync(invP, JSON.stringify(newInv, null, 1) + '\n'); fs.writeFileSync(bindP, JSON.stringify(newBind, null, 1) + '\n');
console.log(`${libraryId}: ${comps.length} записей (sets ${comps.filter((c) => c.kind === 'set').length}, одиночных/иконок ${comps.filter((c) => c.kind !== 'set').length}), ревизия ${rev}`);
for (const [k, v] of Object.entries(diff)) if (v.length) console.log(`  ${k}: ${v.length} — ${v.slice(0, 8).join(', ')}${v.length > 8 ? '…' : ''}`);
if (!Object.values(diff).some((v) => v.length)) console.log('  дифф: нет изменений');
