#!/usr/bin/env node
// validate.mjs <profile.json> [schema.json] — машинная валидация профиля сервиса по service-profile.schema.json без зависимостей
// (поддерживаемое подмножество draft-07: type · enum · required · properties · additionalProperties · items · pattern — всё,
// что использует схема). Exit 0 — валиден; 1 — ошибки (печатаются путь: сообщение); 2 — ошибка вызова.
import fs from 'fs'; import path from 'path';
const [profilePath, schemaArg] = process.argv.slice(2);
if (!profilePath) { console.error('usage: node validate.mjs <profile.json> [schema.json]'); process.exit(2); }
const here = path.dirname((await import('url')).fileURLToPath(import.meta.url));
const schemaPath = schemaArg || path.join(here, 'service-profile.schema.json');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
let profile, schema;
try { profile = read(profilePath); } catch (e) { console.error('профиль не читается:', e.message); process.exit(2); }
try { schema = read(schemaPath); } catch (e) { console.error('схема не читается:', e.message); process.exit(2); }
const errors = [];
const typeOf = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v === 'number' && Number.isInteger(v) ? 'integer' : typeof v;
function check(node, v, p) {
  if (!node || typeof node !== 'object') return;
  if (node.type) { const ts = [].concat(node.type); const t = typeOf(v); if (!ts.includes(t) && !(t === 'integer' && ts.includes('number'))) { errors.push(`${p || '<root>'}: тип ${t}, ожидается ${ts.join('|')}`); return; } }
  if (node.enum && !node.enum.some((e) => JSON.stringify(e) === JSON.stringify(v))) errors.push(`${p || '<root>'}: значение ${JSON.stringify(v)} не входит в enum [${node.enum.join(' | ')}]`);
  if (node.pattern && typeof v === 'string' && !new RegExp(node.pattern).test(v)) errors.push(`${p}: не соответствует pattern ${node.pattern}`);
  if (typeOf(v) === 'object') {
    for (const r of node.required || []) if (!(r in v)) errors.push(`${p || '<root>'}: нет обязательного поля ${r}`);
    const props = node.properties || {};
    for (const [k, val] of Object.entries(v)) {
      if (k === '$schema' && !p) continue;
      if (k in props) check(props[k], val, p ? `${p}.${k}` : k);
      else if (node.additionalProperties === false) errors.push(`${p || '<root>'}: лишнее поле ${k}`);
      else if (node.additionalProperties && typeof node.additionalProperties === 'object') check(node.additionalProperties, val, p ? `${p}.${k}` : k);
    }
  }
  if (typeOf(v) === 'array' && node.items) v.forEach((it, i) => check(node.items, it, `${p}[${i}]`));
}
check(schema, profile, '');
if (errors.length) { for (const e of errors) console.log('  ✗ ' + e); console.log(`профиль НЕ валиден: ${errors.length} ошибок (${path.basename(profilePath)})`); process.exit(1); }
console.log(`профиль валиден (${path.basename(profilePath)})`);
