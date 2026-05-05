# Changelog

## Unreleased

### Added

- **6 new highlighted structural sub-keys** in `.pa.yaml` files: `Properties`, `Children`, `Parameters`, `CustomProperties` (section openers) and `Description`, `Type` (inline-value sub-keys). Coverage of MS schema-defined sub-keys: 9/18 → 15/18.
- **`DropShadow` enum** added to the built-in enum highlight list (e.g. `DropShadow.Bold`, `DropShadow.Light`). Enum count: 59 → 60.
- **Grammar test harness** via [`vscode-tmgrammar-test`](https://github.com/PanAeon/vscode-tmgrammar-test). 6 fixture suites under `test/grammar/` covering structural keys, control types, operators, enums, strings + interpolation, and the new sub-keys. Run with `npm run test:grammar`.
- **Schema-sync regen tool** at `tools/regen-grammar-symbols.mjs`. Reads the canonical [Microsoft PowerApps-Tooling](https://github.com/microsoft/PowerApps-Tooling) `pa.schema.yaml` (MIT) and verifies grammar coverage for structural keys, sub-keys, and the `ControlTypeId` regex pattern. Run with `npm run regen:grammar` (or `-- --check` for CI mode that exits non-zero on drift).
- **Engine-symbols cross-check** — `tools/regen-grammar-symbols.mjs` also reads `grammar/data/powerfx-engine-symbols.json` (a snapshot generated from `Microsoft.PowerFx.Interpreter` introspection) and reports any function or enum the engine knows but the grammar does not.
- **Schema snapshot** at `grammar/data/schema-snapshot.json` — committed source-of-truth for the MS schema-derived facts, regeneratable from the public source.

### Changed

- `npm test` now runs the grammar fixtures **and** the schema drift check; either failing causes a non-zero exit.
- `.vscodeignore` tightened — explicit allowlist for what ships in the published `.vsix`. Excludes `tools/`, `grammar/data/`, `.local/`, `.github/`, build configs, and editor metadata. The published extension is now ~11 KB (vs ~3.7 MB before).

### Fixed

- `.local/` working-notes directory was not excluded from `.vsix` packages — `vsce package` would have bundled local plan documents into a published release. Added to both `.gitignore` and `.vscodeignore`.

## 0.0.3 — 2026-03-13

### Changed
- README: precise function count (212) and enum count (59) with examples
- README: added quoted enum members documentation
- Engine-validated: all 132 PowerFx.Core functions confirmed present, plus 80 canvas-app host functions

## 0.0.2 — 2026-03-11

### Added
- 8 missing Power Fx functions: `Asin`, `Confirm`, `Decimal`, `Float`, `Print`, `RecordOf`, `Summarize`, `Type`
- 21 missing enums: container layout family (`AlignInContainer`, `LayoutAlignItems`, `LayoutDirection`, `LayoutJustifyContent`, `LayoutMode`, `LayoutOverflow`), modern controls (`Appearance`, `ValidationState`, `TextInputType`, `TriggerOutput`, `DecimalPrecision`), core (`DateTimeFormat`, `TimeUnit`, `TraceOptions`, `RemoveFlags`, `FormPattern`, `GridStyle`, `TextPosition`, `TeamsTheme`, `VirtualKeyboardMode`, `PDFPasswordState`, `Zoom`)
- Support for quoted enum members (e.g. `DecimalPrecision.'0'`)

### Removed
- `SendAppNotification` (Dataverse action, not a Power Fx function)
- 5 questionable enum entries: `EditableEnum`, `DataCardValue`, `SelectedState`, `ViewMode` (undocumented or not standalone enums)

### Changed
- Function count: 204 → 212
- Enum count: 40 → 59

## 0.0.1 — 2026-03-11

### Added
- `.pa.yaml` file type recognition and language registration
- Full TextMate grammar for Power Apps YAML with embedded Power Fx
- Power Fx syntax highlighting: 200+ built-in functions, operators, keywords
- String literals with correct `""` escape handling (Power Fx convention)
- Interpolated string support (`$"Hello {User().FullName}"`)
- Built-in enum highlighting (Color, DisplayMode, Align, etc.)
- YAML structural key highlighting (Screens, Properties, Children, Control)
- Control type highlighting with namespace and version support
- Block scalar (`|-`) formula highlighting
- `@[]` disambiguation operator support
- File icons for `.pa.yaml` files (light and dark themes)
