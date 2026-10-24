#!/usr/bin/env node
/**
 * release:publish
 *
 * Publishes haath to npm from the public repo folder (../haath).
 * Run release:build first to ensure haath is up to date.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const isInternal = repoRoot.endsWith('haath-internal');
const PUBLIC_DIR = isInternal ? resolve(repoRoot, '../haath') : repoRoot;

const pkg = JSON.parse(readFileSync(resolve(PUBLIC_DIR, 'package.json'), 'utf8'));

function run(cmd, cwd) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

console.log(`\n[publish] Publishing ${pkg.name}@${pkg.version} to npm...`);
run('npm publish --access public', PUBLIC_DIR);
console.log(`\n[publish] Done. https://www.npmjs.com/package/${pkg.name}`);
