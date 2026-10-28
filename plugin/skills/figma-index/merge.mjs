#!/usr/bin/env node
// figma-index: extract.jsonl (строки {page,name,kind,key,variants,axes,props}) + папка паспорта → inventory.json, binding.json, дифф, валидация.
// node merge.mjs <libdir> <extract.jsonl> [--styles styles.json] [--library-key lk-…] [--file-key …] [--id <libraryId>] [--icons] [--confirm-keys [key,key|all]] [--verified]
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
if (inv) for (const c of inv.components) { if (!prevByName.has(c.name)) prevByName.set(c.name, []); prevByName.get(c.name).push(c); }
const prevInvById = new Map((inv ? inv.components : []).map((c) => [c.logicalId, c]));
const prevIdCount = new Map(); if (inv) for (const c of inv.components) prevIdCount.set(c.logicalId, (prevIdCount.get(c.logicalId) || 0) + 1);
const icons = rest.includes('--icons'); const verified = rest.includes('--verified');
const confirmArg = opt('--confirm-keys'); const confirmAll = rest.includes('--confirm-keys') && (!confirmArg || confirmArg.startsWith('--') || confirmArg === 'all'); const confirmSet = new Set(confirmArg && !confirmAll ? confirmArg.split(',') : []);
const comps = [], binds = [], diff = { new: [], removed: [], renamed: [], axesChanged: [], propsChanged: [], keyChanged: [], variantsChanged: [], reId: [] };
const seenKeys = new Set(rows.map((r) => r.key));
if (seenKeys.size !== rows.length) { console.error('extract: повторяющиеся key'); process.exit(1); }
// идентичность: по ключу; иначе по имени, если кандидат ровно один и его прежний ключ в экстракте отсутствует (перепубликация); иначе — новая запись
const usedIds = new Set();
const uniqueId = (base, key) => { let id = base; for (let n = 6; usedIds.has(id); n += 2) { if (n > key.length) { id = `${base}-${key}-${usedIds.size}`; break; } id = `${base}-${key.slice(0, n)}`; } usedIds.add(id); return id; };
const plan = rows.map((r) => {
  const prevB = prevByKey.get(r.key) || null;
  let prevI = prevB ? prevInvById.get(prevB.logicalId) || null : null; let byName = false;
  if (!prevB) { const cands = (prevByName.get(r.name) || []).filter((c) => { const pb = bind && bind.components.find((b) => b.logicalId === c.logicalId); return !pb || !seenKeys.has(pb.key); }); if (cands.length === 1) { prevI = cands[0]; byName = true; } }
  return { r, prevB, prevI, byName };
});
// сначала раздаём id тем, у кого он был и уникален; коллизии прежних id (одинаковый logicalId у разных записей) получают суффикс по ключу
for (const p of plan) { const base = p.prevI ? p.prevI.logicalId : slug(p.r.name); const wasUnique = p.prevI && prevIdCount.get(base) === 1; if (wasUnique) { usedIds.add(base); p.logicalId = base; } }
for (const p of plan) if (!p.logicalId) { const base = p.prevI ? p.prevI.logicalId : slug(p.r.name); const id = uniqueId(base, p.r.key); p.logicalId = id; if (p.prevI && id !== base) diff.reId.push(`${base} → ${id} (${p.r.name})`); }
for (const { r, prevB, prevI, byName, logicalId } of plan) {
  const kind = icons ? (r.variants > 1 ? 'set' : 'icon') : r.kind;
  const c = { logicalId, name: r.name, kind };
  if (Object.keys(r.axes || {}).length) c.variantAxes = r.axes;
  if (r.props && r.props.length) c.properties = r.props.map(([name, type]) => ({ name, type }));
  if (r.page) c.page = r.page;
  if (prevI) { for (const k of ['notes', 'codeMappingRef']) if (prevI[k]) c[k] = prevI[k]; }
  comps.push(c);
  const priv = /^[._]/.test(r.name.trim());
  const b = { logicalId, key: r.key, status: priv ? 'unresolved' : 'bound' };
  if (priv) b.note = 'private: префикс . или _ — Figma не публикует, importComponent*ByKeyAsync не найдёт; доступен только внутри исходника';
  else if (prevB && prevB.status === 'ambiguous' && !(confirmAll || confirmSet.has(r.key))) { b.status = 'ambiguous'; b.note = prevB.note || 'ключ изменился при том же имени — проверить публикацию (снять: --confirm-keys)'; }
  else if (prevB && prevB.note) b.note = prevB.note;
  if (prevB && prevB.variants) b.variants = prevB.variants;
  binds.push(b);
  if (!prevB && !prevI) diff.new.push(r.name);
  else if (prevB && prevI && prevI.name !== r.name) diff.renamed.push(`${prevI.name} → ${r.name}`);
  else if (byName) { diff.keyChanged.push(r.name); if (!priv) { b.status = 'ambiguous'; b.note = 'ключ изменился при том же имени — проверить публикацию (снять: --confirm-keys)'; } }
  if (prevI) {
    if (JSON.stringify(prevI.variantAxes || {}) !== JSON.stringify(c.variantAxes || {})) diff.axesChanged.push(r.name);
    if (JSON.stringify((prevI.properties || []).map((p) => p.name + ':' + p.type)) !== JSON.stringify((c.properties || []).map((p) => p.name + ':' + p.type))) diff.propsChanged.push(r.name);
  }
}
const matchedPrevIds = new Set(plan.filter((p) => p.prevI).map((p) => p.prevI.logicalId));
if (inv) for (const c of inv.components) if (!matchedPrevIds.has(c.logicalId) && !rows.some((r) => r.name === c.name)) diff.removed.push(c.name);
const today = new Date().toISOString().slice(0, 10); const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const rev = `${today}.${fresh ? 1 : ((inv.inventoryRevision || '').startsWith(today) ? Number((inv.inventoryRevision.split('.')[1] || 0)) + 1 : 1)}`;
const newInv = { schemaVersion: '1', libraryId, inventoryRevision: rev, description: inv ? inv.description : `Библиотека «${libraryId}»: опись сетов и одиночных компонентов исходного файла (figma-index).`, components: comps, tokens: inv ? inv.tokens || {} : {}, dependencies: inv ? inv.dependencies || [] : [] };
const source = Object.assign({ kind: 'published-library' }, bind ? bind.source : {}); if (source.sourceFileKey) { if (!source.fileKey) source.fileKey = source.sourceFileKey; delete source.sourceFileKey; } if (opt('--library-key')) source.libraryKey = opt('--library-key'); if (opt('--file-key')) source.fileKey = opt('--file-key');
const newBind = Object.assign({}, bind || {}, { schemaVersion: '1', libraryId, inventoryRevision: rev, source, indexedAt: now, lastVerifiedAt: verified ? now : (bind && bind.lastVerifiedAt) || undefined, indexedBy: 'figma-index (use_figma по исходному файлу библиотеки: все COMPONENT_SET и одиночные COMPONENT страниц, ключи = key узла)', components: binds, variables: bind ? bind.variables || {} : {}, styles: bind ? bind.styles || {} : {}, compatibility: bind ? bind.compatibility || {} : {} });
const stylesP = opt('--styles');
if (stylesP) { const st = read(stylesP, {}); const styles = {}; for (const s of [...(st.textStyles || []), ...(st.paintStyles || [])]) styles[s.name] = s.key; newBind.styles = Object.assign({}, newBind.styles, styles); if (st.collections) newBind.variableCollections = Object.assign({}, newBind.variableCollections || {}, Object.fromEntries(st.collections.map((c) => [c.name, Object.assign({}, (newBind.variableCollections || {})[c.name] || {}, { key: c.key, modes: c.modes, count: c.count })]))); }
// валидация (draft-07 подмножество: required / additionalProperties / enum / type)
function validate(obj, schema, pathStr = '') { const errs = []; const t = schema.type; if (t && typeof obj !== 'undefined') { const jt = Array.isArray(obj) ? 'array' : obj === null ? 'null' : typeof obj; const ok = t === 'number' ? jt === 'number' : t === 'integer' ? Number.isInteger(obj) : t === jt; if (!ok) { errs.push(`${pathStr}: ожидался ${t}, получен ${jt}`); return errs; } } if (t === 'object' && typeof obj === 'object' && obj !== null) { for (const r of schema.required || []) if (!(r in obj)) errs.push(`${pathStr}: нет поля ${r}`); const props = schema.properties || {}; for (const [k, v] of Object.entries(obj)) { if (props[k]) errs.push(...validate(v, props[k], `${pathStr}/${k}`)); else if (schema.additionalProperties === false) errs.push(`${pathStr}: лишнее поле ${k}`); else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') errs.push(...validate(v, schema.additionalProperties, `${pathStr}/${k}`)); } } else if (t === 'array' && Array.isArray(obj)) { obj.forEach((it, i) => errs.push(...validate(it, schema.items || {}, `${pathStr}[${i}]`))); } else if (schema.enum && !schema.enum.includes(obj)) errs.push(`${pathStr}: ${obj} не из ${schema.enum.join('|')}`); return errs; }
{ const ids = comps.map((c) => c.logicalId), keys = binds.map((b) => b.key); const dupI = ids.filter((x, i) => ids.indexOf(x) !== i), dupK = keys.filter((x, i) => keys.indexOf(x) !== i); if (dupI.length || dupK.length || comps.length !== binds.length || comps.some((c, i) => c.logicalId !== binds[i].logicalId)) { console.error('идентичность: повторы logicalId ' + JSON.stringify([...new Set(dupI)]) + ', ключей ' + JSON.stringify([...new Set(dupK)]) + ', согласованность inventory↔binding ' + (comps.length === binds.length)); process.exit(1); } }
const e1 = validate(newInv, read(path.join(SCHEMAS, 'inventory.schema.json'), {})), e2 = validate(newBind, read(path.join(SCHEMAS, 'binding.schema.json'), {}));
if (e1.length || e2.length) { console.error('схема:', [...e1, ...e2].slice(0, 10).join('\n')); process.exit(1); }
fs.writeFileSync(invP, JSON.stringify(newInv, null, 1) + '\n'); fs.writeFileSync(bindP, JSON.stringify(newBind, null, 1) + '\n');
console.log(`${libraryId}: ${comps.length} записей (sets ${comps.filter((c) => c.kind === 'set').length}, одиночных/иконок ${comps.filter((c) => c.kind !== 'set').length}, из них приватных ${binds.filter((b) => b.status === 'unresolved').length}), ревизия ${rev}`);
for (const [k, v] of Object.entries(diff)) if (v.length) console.log(`  ${k}: ${v.length} — ${v.slice(0, 8).join(', ')}${v.length > 8 ? '…' : ''}`);
const amb = binds.filter((b) => b.status === 'ambiguous').length; if (amb) console.log(`  ambiguous: ${amb} (подтвердить импортом каждый и перезапустить с --confirm-keys <key,key> или all)`); if (!verified) console.log('  lastVerifiedAt не обновлён (нужен --verified после выборочного импорта)');
if (!Object.values(diff).some((v) => v.length)) console.log('  дифф: нет изменений');
