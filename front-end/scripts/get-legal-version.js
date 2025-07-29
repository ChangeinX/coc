import fs from 'fs';
import path from 'path';

const pubDir = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public');
const file = fs.readdirSync(pubDir).find(f => /^cookies-\d{8}\.html$/.test(f));
if (!file) throw new Error('legal file not found');
const ver = file.match(/\d{8}/)[0];
process.stdout.write(ver);

