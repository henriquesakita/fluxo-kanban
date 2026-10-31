import { create } from 'tar';
import { cp, mkdir, readFile, rm, copyFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const version = pkg.version;
const name = `Fluxo-${version}-linux-x64`;

const source = path.join(root, 'dist', 'linux-unpacked');
const stageRoot = path.join(root, 'dist', 'linux-stage');
const stage = path.join(stageRoot, name);
const output = path.join(root, 'dist', `${name}.tar.gz`);

await rm(stageRoot, { recursive: true, force: true });
await mkdir(stage, { recursive: true });

console.log(`Copiando ${source}...`);
await cp(source, stage, { recursive: true });

await copyFile(path.join(root, 'linux', 'install.sh'), path.join(stage, 'install.sh'));
await copyFile(path.join(root, 'linux', 'LEIA-ME.txt'), path.join(stage, 'LEIA-ME.txt'));
await copyFile(path.join(root, 'build', 'icon.png'), path.join(stage, 'fluxo.png'));

const executable = new Set(['fluxo', 'chrome_crashpad_handler', 'install.sh']);

function onWriteEntry(entry) {
  const base = entry.path.split('/').pop();

  if (entry.type === 'Directory') {
    entry.stat.mode = 0o755;
    return;
  }

  if (base === 'chrome-sandbox') {
    entry.stat.mode = 0o4755;
    return;
  }

  entry.stat.mode = executable.has(base) ? 0o755 : 0o644;
}

console.log('Gerando tar.gz...');
await create(
  {
    gzip: true,
    file: output,
    cwd: stageRoot,
    portable: false,
    onWriteEntry
  },
  [name]
);

await rm(stageRoot, { recursive: true, force: true });

const size = (await readFile(output)).length;
console.log(`OK: ${output} (${(size / 1024 / 1024).toFixed(1)} MB)`);
