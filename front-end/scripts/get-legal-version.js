import fs from 'fs';
import path from 'path';
const publicDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public');
const file = fs.readdirSync(publicDir).find(f => /^cookies-\d{8}\.html$/.test(f));
if (!file) process.exit(1);
const match = file.match(/cookies-(\d{8})\.html/);
console.log(match ? match[1] : '');