import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [metadataPath, packagePath, outputPath] = process.argv.slice(2);
if (!metadataPath || !packagePath || !outputPath) throw new Error('Expected metadata JS, data package and output directory.');

const source = await readFile(metadataPath, 'utf8');
const marker = ';loadPackage(';
const start = source.indexOf(marker);
const end = source.indexOf(')})();var moduleOverrides', start);
if (start < 0 || end < 0) throw new Error('Unable to find the Emscripten package manifest.');

const metadata = JSON.parse(source.slice(start + marker.length, end));
const packageData = await readFile(packagePath);
if (packageData.length !== metadata.remote_package_size) throw new Error('Package size does not match its manifest.');

const root = path.resolve(outputPath);
for (const file of metadata.files) {
  if (!file.filename.startsWith('/game_resources/') || file.start < 0 || file.end > packageData.length || file.end < file.start) {
    throw new Error(`Unsafe package entry: ${file.filename}`);
  }
  const destination = path.resolve(root, file.filename.slice('/game_resources/'.length));
  if (!destination.startsWith(`${root}${path.sep}`)) throw new Error(`Path escapes output directory: ${file.filename}`);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, packageData.subarray(file.start, file.end));
}

console.log(`Extracted ${metadata.files.length} game resources.`);
