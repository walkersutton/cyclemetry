// Release preflight: the checks that exercise release-only code paths and
// Tauri resource bundling, so build breaks surface before a tag is created.
//
// Unlike a hand-maintained list of inline TAURI_CONFIG strings, this reads the
// REAL per-platform Tauri config files (tauri.macos/linux/windows.conf.json).
// Tauri auto-merges only the host platform's config during a normal build, so
// without forcing each file here a stale resource glob in another platform's
// config stays invisible until that platform builds in CI. Sourcing the config
// from disk means the check can never drift from what CI actually bundles.
//
// Run directly (`node scripts/release-check.mjs` / `pnpm release:check`) or as
// the automatic preflight inside scripts/release.mjs.

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)))

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    ...options,
  })
}

function step(label) {
  console.log(`\nrelease-check: ${label}`)
}

step('frontend lint (ESLint)…')
run('pnpm', ['-C', 'app', 'lint'])

step('frontend tests…')
run('pnpm', ['-C', 'app', 'test'])

step('website build (Nextra)…')
run('pnpm', ['-C', 'website', 'build'])

// cargo check runs Tauri's build script, which validates every bundle resource
// glob in the merged config — the exact failure mode that broke a past release
// ("glob pattern ../templates/assets/*.png path not found"). Forcing each real
// platform config catches that locally in seconds instead of minutes into CI.
const platformConfigs = ['tauri.macos.conf.json', 'tauri.linux.conf.json', 'tauri.windows.conf.json']

for (const config of platformConfigs) {
  step(`cargo check --release with ${config}…`)
  const tauriConfig = readFileSync(join(repoRoot, 'src-tauri', config), 'utf8')
  run('cargo', ['check', '--release', '--manifest-path', 'src-tauri/Cargo.toml'], {
    env: { ...process.env, TAURI_CONFIG: tauriConfig },
  })
}

console.log('\nrelease-check: all checks passed.')
