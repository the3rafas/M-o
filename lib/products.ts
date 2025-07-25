import fs from 'fs';
import path from 'path';

export function getAllProducts() {
  const file = path.join(process.cwd(), 'data', 'products.json');
  const json = fs.readFileSync(file, 'utf-8');
  return JSON.parse(json);
}
