import fs from 'fs';
import path from 'path';

const key = process.env.VITE_VAPID_PUBLIC_KEY || '';
const swPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'sw.js');
let content = fs.readFileSync(swPath, 'utf8');
content = content.replace('%VAPID_PUBLIC_KEY%', key);
fs.writeFileSync(swPath, content);

