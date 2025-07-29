import fs from 'fs';
import path from 'path';

const key = process.env.VITE_VAPID_PUBLIC_KEY || '';
const version = process.env.VITE_COMMIT_HASH || '';
const swPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'sw.js');
let content = fs.readFileSync(swPath, 'utf8');
content = content.replace('%VAPID_PUBLIC_KEY%', key);
content = content.replace('%SW_VERSION%', version);
fs.writeFileSync(swPath, content);

const legalVersion = process.env.LEGAL_VERSION || '';
const indexPath = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'index.html');
let idx = fs.readFileSync(indexPath, 'utf8');
idx = idx.replace('%LEGAL_VERSION%', legalVersion);
fs.writeFileSync(indexPath, idx);

