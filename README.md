# Gatehouse Power Fx

Syntax highlighting for Power Apps `.pa.yaml` files with embedded Power Fx formulas.

The `.pa.yaml` format is the modern source format for Microsoft Power Apps canvas apps, used by [Power Platform Git Integration](https://learn.microsoft.com/power-platform/alm/git-integration/overview), `pac canvas download`, and the [PAC CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction). This extension brings first-class editor support to VS Code.

## Features

### Power Fx formula highlighting

Full syntax highlighting for Power Fx formulas embedded in YAML property values:

- **212 built-in functions** — `Filter`, `LookUp`, `Set`, `Navigate`, `Patch`, `If`, `Switch`, and more
- **60 built-in enums** — `Color.Red`, `DisplayMode.Edit`, `ScreenTransition.Fade`, `LayoutMode.Auto`, `Appearance.Primary`, `DropShadow.Bold`, and more
- **String literals** — correct `""` escape handling (Power Fx convention, not backslash)
- **Interpolated strings** — `$"Hello {User().FullName}"`
- **Quoted enum members** — `DecimalPrecision.'0'` and similar
- **Operators** — arithmetic, comparison (`<>`, `>=`), logical (`&&`, `||`), concatenation (`&`)
- **Comments** — `//` line comments and `/* */` block comments
- **Disambiguation** — `[@DataSource]` operator

### YAML structure awareness

The grammar understands the `.pa.yaml` schema:

- **Structural keys** — `Screens`, `App`, `ComponentDefinitions`, `DataSources`, `EditorState` highlighted as keywords (verified against the official [Microsoft PowerApps-Tooling schema](https://github.com/microsoft/PowerApps-Tooling/blob/master/schemas/pa-yaml/v3.0/pa.schema.yaml))
- **Control types** — `Control: Classic/Button@2.2.0` with namespace, type, and version highlighting
- **Property names** — `Fill`, `OnSelect`, `Text` highlighted distinctly from formulas
- **Children lists** — control names in `- controlName:` highlighted as entity names
- **Block scalars** — multi-line formulas after `|-` with per-line `=` prefix highlighting
- **Section openers** — `Properties:`, `Children:`, `Parameters:`, `CustomProperties:` highlighted as structural metadata
- **Inline-value sub-keys** — `Variant`, `Layout`, `IsLocked`, `Group`, `MetadataKey`, `DefinitionType`, `ComponentName`, `ComponentLibraryUniqueName`, `Description`, `Type` with value highlighting

### File icons

Custom file icons for `.pa.yaml` files in both light and dark themes.

## Supported file patterns

| Pattern | Description |
|---------|-------------|
| `*.pa.yaml` | Power Apps canvas app source files |

This includes:
- `App.pa.yaml` — app-level properties and named formulas
- `Screen1.pa.yaml` — per-screen source with controls and formulas
- `Components/*.pa.yaml` — component definitions
- `_EditorState.pa.yaml` — screen and component ordering

## What is `.pa.yaml`?

Power Apps canvas apps can be exported to source files using the [PAC CLI](https://learn.microsoft.com/power-platform/developer/cli/introduction) or [Git Integration](https://learn.microsoft.com/power-platform/alm/git-integration/overview). The `.pa.yaml` format (v3.0) is Microsoft's current source format, replacing the older `.fx.yaml` and `.msapp` formats.

The official schema is published at [microsoft/PowerApps-Tooling](https://github.com/microsoft/PowerApps-Tooling/blob/master/schemas/pa-yaml/v3.0/pa.schema.yaml).

## Requirements

None. This is a pure syntax highlighting extension with no external dependencies.

## Known issues

- Power Fx formulas inside YAML double-quoted strings (`"=formula"`) are not highlighted (use unquoted `=formula` instead, which is the standard `.pa.yaml` convention)

## About

Built by [Gatehouse](https://gatehousedev.co.uk) — quality assurance tooling for Microsoft Power Apps.

## License

[MIT](LICENSE)
