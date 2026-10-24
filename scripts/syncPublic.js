#!/usr/bin/env node
/**
 * release:build / syncPublic
 *
 * 1. Typechecks and builds dist/ in haath-internal (unless --prune-only).
 * 2. Prunes stale files/directories in ../haath that no longer exist in haath-internal.
 * 3. Reads .buildignore and copies everything NOT listed into ../haath.
 * 4. Writes a minimal .gitignore to ../haath (node_modules only).
 * 5. Commits, tags, and pushes from ../haath to its origin (haath public repo).
 */

import { execSync } from 'node:child_process';
import { readFileSync, cpSync, readdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const isInternal = repoRoot.endsWith('haath-internal');

const INTERNAL_DIR = isInternal ? repoRoot : resolve(repoRoot, '../haath-internal');
const PUBLIC_DIR = isInternal ? resolve(repoRoot, '../haath') : repoRoot;

const pkgPath = join(INTERNAL_DIR, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

const isDryRun = process.argv.includes('--dry-run');
const isPruneOnly = process.argv.includes('--prune-only');

function run(cmd, cwd = INTERNAL_DIR) {
  console.log(`> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

function runQuiet(cmd, cwd = INTERNAL_DIR) {
  try {
    return execSync(cmd, { cwd, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return '';
  }
}

function computeNextVersion(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  if (patch >= 10) {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
}

const ROOT_ALLOWLIST = new Set([
  '.git',
  '.gitignore',
  'LICENSE',
  'README.md',
  'package.json',
  'package-lock.json',
]);

/**
 * Recursively scans publicDir and prunes any file or directory that no longer
 * exists in internalDir or is part of ignoreList.
 */
export function pruneStaleFiles(publicDir, internalDir, ignoreList = [], dryRun = false) {
  const stale = [];

  function scan(currentPubDir) {
    if (!existsSync(currentPubDir)) return;
    const entries = readdirSync(currentPubDir, { withFileTypes: true });

    for (const ent of entries) {
      if (currentPubDir === publicDir && ROOT_ALLOWLIST.has(ent.name)) {
        continue;
      }
      if (ent.name === '.git') continue;

      const fullPub = join(currentPubDir, ent.name);
      const rel = relative(publicDir, fullPub);
      const fullInt = join(internalDir, rel);

      const isIgnored = ignoreList.includes(rel) || (currentPubDir === publicDir && ignoreList.includes(ent.name));
      const missingInInternal = !existsSync(fullInt);

      if (missingInInternal || isIgnored) {
        stale.push({ relPath: rel, fullPath: fullPub });
      } else if (ent.isDirectory()) {
        scan(fullPub);
      }
    }
  }

  scan(publicDir);

  console.log('\n============================================================');
  console.log(`[sync:prune] Checking for stale files in public repo (${publicDir})`);
  console.log('------------------------------------------------------------');

  if (stale.length === 0) {
    console.log('  No stale files or directories found. Public mirror is clean.');
  } else {
    console.log(`  Found ${stale.length} stale entry/entries:`);
    for (const item of stale) {
      console.log(`  [dry-run] will prune: ${item.relPath}`);
    }

    if (!dryRun) {
      for (const item of stale) {
        rmSync(item.fullPath, { recursive: true, force: true });
        console.log(`  [pruned] ${item.relPath}`);
      }
    } else {
      console.log('  (dry-run active: no files deleted)');
    }
  }
  console.log('============================================================\n');

  return stale;
}

// 0. If --prune-only, run pruning and exit
const buildIgnorePath = join(INTERNAL_DIR, '.buildignore');
const ignoreList = existsSync(buildIgnorePath)
  ? readFileSync(buildIgnorePath, 'utf8')
      .split('\n')
      .map(l => l.trim().replace(/\/$/, ''))
      .filter(l => l && !l.startsWith('#'))
  : [];

if (isPruneOnly) {
  pruneStaleFiles(PUBLIC_DIR, INTERNAL_DIR, ignoreList, isDryRun);
  process.exit(0);
}

// 1. Inspect npm version, changes since last bump, and prompt for optional version bump (default: No)
const npmVersion = runQuiet(`npm view ${pkg.name} version`, INTERNAL_DIR) || null;
const nextVersion = computeNextVersion(pkg.version);
const lastBumpHash = runQuiet('git log -G \'"version":\' -n 1 --format="%H" package.json', INTERNAL_DIR);
const lastBumpShort = lastBumpHash ? lastBumpHash.slice(0, 7) : 'initial';
const commitsSince = lastBumpHash
  ? runQuiet(`git log --oneline ${lastBumpHash}..HEAD`, INTERNAL_DIR)
  : runQuiet('git log --oneline -n 10', INTERNAL_DIR);
const diffStatSince = lastBumpHash
  ? runQuiet(`git diff --stat ${lastBumpHash}..HEAD`, INTERNAL_DIR)
  : runQuiet('git diff --stat', INTERNAL_DIR);
const workingTreeStatus = runQuiet('git status --short', INTERNAL_DIR);

console.log('\n============================================================');
console.log(`[sync] Version & Change Summary for ${pkg.name}`);
console.log('------------------------------------------------------------');
console.log(`  Local package.json : ${pkg.version}`);
console.log(`  Published on npm   : ${npmVersion ?? 'not published yet'}`);
console.log(`  Next candidate     : ${nextVersion}`);
console.log('------------------------------------------------------------');
console.log(`Commits since last version bump (${lastBumpShort}):`);
console.log(commitsSince ? commitsSince.split('\n').map(l => `  ${l}`).join('\n') : '  (no new commits since last bump)');
console.log('\nFile diff summary since last version bump:');
console.log(diffStatSince ? diffStatSince.split('\n').map(l => `  ${l}`).join('\n') : '  (no committed file diffs since last bump)');
console.log('\nUncommitted working tree changes:');
console.log(workingTreeStatus ? workingTreeStatus.split('\n').map(l => `  ${l}`).join('\n') : '  (working tree clean)');
if (npmVersion === pkg.version) {
  console.log(`\n[!] Note: ${pkg.name}@${pkg.version} is already live on npm. Bump if you plan to publish to npm.`);
}
console.log('============================================================\n');

if (process.stdin.isTTY) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = (await rl.question(`Bump version from ${pkg.version} -> ${nextVersion}? [y/N]: `)).trim().toLowerCase();
  rl.close();

  if (answer === 'y' || answer === 'yes') {
    pkg.version = nextVersion;
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
    console.log(`[sync] Bumped package.json version to ${pkg.version}`);
  } else {
    console.log(`[sync] Keeping current version ${pkg.version}`);
  }
}

const versionTag = `v${pkg.version}`;

// 2. Test + Typecheck + build in internal repo
console.log('\n[sync] Running tests, typechecking, and building...');
run('npm test', INTERNAL_DIR);
run('npm run typecheck', INTERNAL_DIR);
run('npm run build', INTERNAL_DIR);

// 3. Prune stale files from public repo before copying
pruneStaleFiles(PUBLIC_DIR, INTERNAL_DIR, ignoreList, isDryRun);

// 4. Copy everything not in .buildignore to public repo
console.log('\n[sync] Copying files to public repo...');
const entries = readdirSync(INTERNAL_DIR);
for (const entry of entries) {
  if (ignoreList.includes(entry)) continue;
  cpSync(join(INTERNAL_DIR, entry), join(PUBLIC_DIR, entry), { recursive: true, force: true });
  console.log(`  copied: ${entry}`);
}

// 5. Write a minimal .gitignore to the public repo (dist is intentionally committed)
writeFileSync(join(PUBLIC_DIR, '.gitignore'), 'node_modules/\n');
console.log('  wrote:  .gitignore');

// 6. Commit, tag, and push from public repo
console.log('\n[sync] Committing and pushing public repo...');
run('git add -A', PUBLIC_DIR);
const publicStatus = runQuiet('git status --porcelain', PUBLIC_DIR);
if (publicStatus) {
  run(`git commit -m "release: ${versionTag}"`, PUBLIC_DIR);
} else {
  console.log('  (no file changes in public repo to commit)');
}
run(`git tag -f ${versionTag}`, PUBLIC_DIR);
run('git push origin main --tags', PUBLIC_DIR);

console.log(`\n[sync] Done. ${pkg.name}@${pkg.version} synced to public repo.`);
