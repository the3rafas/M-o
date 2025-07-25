import fs from 'fs';
import path from 'path';

export function getAuth() {
  const file = path.join(process.cwd(), 'data', 'auth.json');
  const json = fs.readFileSync(file, 'utf-8');
  return JSON.parse(json);
}
