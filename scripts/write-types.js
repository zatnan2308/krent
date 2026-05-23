// Утилита: читает JSON-результат MCP generate_typescript_types
// и записывает поле types в src/types/database.ts.
const fs = require('fs');
const src = process.argv[2];
const dst = process.argv[3] || 'src/types/database.ts';
if (!src) {
  console.error('Usage: node scripts/write-types.js <input.txt> [dst]');
  process.exit(1);
}
const raw = fs.readFileSync(src, 'utf8');
const obj = JSON.parse(raw);
if (!obj || typeof obj.types !== 'string') {
  console.error('Invalid input: expected { types: string }');
  process.exit(1);
}
fs.writeFileSync(dst, obj.types);
console.log('wrote', dst, obj.types.length, 'chars');
