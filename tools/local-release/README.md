# Local macOS release

This fork is based on upstream v0.15.1. It fixes explicit MCP page switching while preserving background `page_id` reads and edits. The desktop build is named **OpenPencil Local** and uses version `0.15.1+yangkeao.1`.

The bundle identifier stays `net.dannote.open-pencil` to retain existing settings. Quit the official app before starting this build. The local build disables in-app upstream updates; Nix owns updates. The separate `@open-pencil/mcp@0.15.1` installation remains required.

## Build

Requirements: Apple Silicon macOS, Xcode Command Line Tools, Rust/Cargo, Bun 1.4.2. From a clean repository checkout:

```sh
bash tools/local-release/src/build-macos.sh
```

Output: `scratch/releases/local-v0.15.1-1/`. The `.app` is ad-hoc signed for local use, not Developer ID signed or notarized. The build records the source commit and ZIP checksum. Do not use the upstream `v*` publishing workflow; this fork does not publish npm packages or signed updater artifacts.

## Deployment

Publish the ZIP, `SHA256SUMS`, and `source-commit.txt` on this fork under the immutable tag `local-v0.15.1-1`. Nix installs the ZIP by fixed URL and hash. Never replace an asset under an existing version: publish a new local tag and update the Nix package instead.

Keep the original `.fig` files; installing this app does not migrate or rewrite them. To roll back, remove the local package from nix-darwin and restore the `openpencil` Homebrew cask entry, then rebuild. Do not run both variants simultaneously on the default MCP ports.
