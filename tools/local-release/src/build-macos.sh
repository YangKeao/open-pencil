#!/usr/bin/env bash
set -euo pipefail

# Run from the repository root. This release is for one local Apple Silicon Mac.
[[ "$(uname -s)" == Darwin && "$(uname -m)" == arm64 ]]
[[ "$(bun --version)" == 1.4.2 ]]
git diff --quiet
git diff --cached --quiet
bun install --frozen-lockfile
VITE_OPENPENCIL_DISABLE_UPDATES=true APPLE_SIGNING_IDENTITY=-   bun run tauri build --bundles app --config desktop/tauri.local.conf.json

app_path="desktop/target/release/bundle/macos/OpenPencil Local.app"
release_dir="scratch/releases/local-v0.15.1-2"
mkdir -p "$release_dir"
codesign --verify --deep --strict "$app_path"
ditto -c -k --sequesterRsrc --keepParent "$app_path"   "$release_dir/OpenPencil-Local-0.15.1-yangkeao.2-aarch64-darwin.zip"
git rev-parse HEAD > "$release_dir/source-commit.txt"
shasum -a 256 "$release_dir/OpenPencil-Local-0.15.1-yangkeao.2-aarch64-darwin.zip"   > "$release_dir/SHA256SUMS"
printf 'Build output: %s\n' "$release_dir"
