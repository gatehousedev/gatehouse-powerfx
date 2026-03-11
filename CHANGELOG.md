# Changelog

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
