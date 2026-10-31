import { copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const target = path.join(root, 'www');
const files = ['index.html', 'styles.css', 'app.js'];

await mkdir(target, { recursive: true });

for (const file of files) {
  await copyFile(path.join(root, file), path.join(target, file));
  console.log(`www/${file}`);
}

console.log('Pasta www atualizada.');
