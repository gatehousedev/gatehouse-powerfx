#!/usr/bin/env node
/**
 * regen-grammar-symbols.mjs — keep gatehouse-powerfx in sync with Microsoft's
 * canonical .pa.yaml v3.0 schema.
 *
 * Reads the upstream schema (default: github.com/microsoft/PowerApps-Tooling
 * MIT) and extracts the schema-defined facts that the TextMate grammar needs
 * to highlight correctly:
 *
 *   - Top-level structural keys      (App, Screens, ComponentDefinitions, ...)
 *   - Control-instance sub-keys      (Properties, Children, Control, Group, ...)
 *   - Canonical ControlTypeId regex  (^([A-Z]\\w*\\/)?[A-Z]\\w*(@\\d+\\.\\d+\\.\\d+)?$)
 *
 * Function lists and enum members live in the Power Fx engine, not the schema,
 * so they are NOT extracted here — see Tier 1 #A and #B in
 * .local/plan-2026-05-05-grammar-knowledge-transfer.md (deferred phase 2).
 *
 * Usage:
 *   node tools/regen-grammar-symbols.mjs                # network fetch (default)
 *   node tools/regen-grammar-symbols.mjs --source <url> # explicit URL
 *   node tools/regen-grammar-symbols.mjs --source <path> # local file (file://...)
 *   node tools/regen-grammar-symbols.mjs --check        # dry-run; fail on drift
 *   node tools/regen-grammar-symbols.mjs --apply        # patch grammar in place
 *
 * Output:
 *   - grammar/data/schema-snapshot.json (always written; tracked in git as the
 *     committed source-of-truth that the grammar's regexes were generated from)
 *   - syntaxes/pa-yaml.tmLanguage.json (only with --apply; updates structural-
 *     key alternation if it has drifted)
 *
 * Exit codes:
 *   0 = grammar matches schema
 *   1 = drift detected (only in --check or default modes; --apply never errors
 *       on drift, it just patches)
 *   2 = fetch / parse error
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml } from "yaml";

const PUBLIC_SCHEMA_URL =
  "https://raw.githubusercontent.com/microsoft/PowerApps-Tooling/master/schemas/pa-yaml/v3.0/pa.schema.yaml";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GRAMMAR_PATH = join(REPO_ROOT, "syntaxes", "pa-yaml.tmLanguage.json");
const SNAPSHOT_DIR = join(REPO_ROOT, "grammar", "data");
const SNAPSHOT_PATH = join(SNAPSHOT_DIR, "schema-snapshot.json");

// ─────────────────────────────────────────────────────────────────────────────
// CLI

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};

const source = opt("--source") ?? PUBLIC_SCHEMA_URL;
const mode = flag("--apply") ? "apply" : flag("--check") ? "check" : "report";

// ─────────────────────────────────────────────────────────────────────────────
// Fetch + parse the schema

async function loadSchema(src) {
  if (src.startsWith("http://") || src.startsWith("https://")) {
    const res = await fetch(src);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${src}`);
    return await res.text();
  }
  // file path or file:// URL
  const path = src.startsWith("file://") ? fileURLToPath(src) : src;
  return await readFile(path, "utf8");
}

let schema;
try {
  const text = await loadSchema(source);
  schema = parseYaml(text);
} catch (e) {
  console.error(`✕ Failed to load/parse schema from ${source}: ${e.message}`);
  process.exit(2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract canonical facts

function extractStructuralKeys(s) {
  const props = s?.properties;
  if (!props || typeof props !== "object") {
    throw new Error("Schema has no top-level properties block");
  }
  return Object.keys(props).sort();
}

function extractControlInstanceSubKeys(s) {
  // Walk known definitions and collect explicit property names that appear as
  // sub-keys of Control-instance / Screen-instance / ComponentDefinition-instance.
  const defs = s?.definitions ?? {};
  const targets = [
    "Control-instance",
    "Screen-instance",
    "App-instance",
    "ComponentDefinition-instance",
    "DataSource-instance",
  ];
  const subKeys = new Set();
  for (const t of targets) {
    const def = defs[t];
    if (!def) continue;
    // Collect from `properties:` block at this level or nested (oneOf/then/else).
    const stack = [def];
    while (stack.length) {
      const node = stack.pop();
      if (!node || typeof node !== "object") continue;
      if (node.properties && typeof node.properties === "object") {
        for (const k of Object.keys(node.properties)) subKeys.add(k);
      }
      for (const k of ["oneOf", "anyOf", "allOf"]) {
        if (Array.isArray(node[k])) stack.push(...node[k]);
      }
      for (const k of ["then", "else", "if", "additionalProperties"]) {
        if (node[k] && typeof node[k] === "object") stack.push(node[k]);
      }
    }
  }
  // Drop anything that's also a top-level structural key — those are tracked
  // separately and we don't want them double-listed.
  for (const k of extractStructuralKeys(s)) subKeys.delete(k);
  return [...subKeys].sort();
}

function extractControlTypeIdPattern(s) {
  return s?.definitions?.["ControlTypeId-pattern"]?.pattern ?? null;
}

const facts = {
  source,
  fetchedAt: new Date().toISOString(),
  schemaId: schema?.$id ?? null,
  schemaTitle: schema?.title ?? null,
  structuralKeys: extractStructuralKeys(schema),
  controlInstanceSubKeys: extractControlInstanceSubKeys(schema),
  controlTypeIdPattern: extractControlTypeIdPattern(schema),
};

// ─────────────────────────────────────────────────────────────────────────────
// Compare against current grammar

const grammarText = await readFile(GRAMMAR_PATH, "utf8");
const grammar = JSON.parse(grammarText);

function findStructuralKeyRule(g) {
  return g?.repository?.["structural-key"] ?? null;
}

function parseAlternation(regexSrc) {
  // Pull the (a|b|c) inside an anchored ^(...)(:\\s*)$ shape.
  const m = /^\^\(([^)]+)\)/.exec(regexSrc);
  if (!m) return null;
  return m[1].split("|").sort();
}

const rule = findStructuralKeyRule(grammar);
const grammarKeys = rule?.match ? parseAlternation(rule.match) : null;
const schemaKeys = facts.structuralKeys;

let drift = false;
const driftReport = [];
if (!grammarKeys) {
  drift = true;
  driftReport.push(
    "Grammar repository.structural-key.match could not be parsed; expected ^(...)(:\\s*)$ shape"
  );
} else {
  const onlyInSchema = schemaKeys.filter((k) => !grammarKeys.includes(k));
  const onlyInGrammar = grammarKeys.filter((k) => !schemaKeys.includes(k));
  if (onlyInSchema.length || onlyInGrammar.length) drift = true;
  if (onlyInSchema.length)
    driftReport.push(`Schema has but grammar lacks: ${onlyInSchema.join(", ")}`);
  if (onlyInGrammar.length)
    driftReport.push(`Grammar has but schema lacks: ${onlyInGrammar.join(", ")}`);
}

// Verify ControlTypeId regex parity
const grammarControlPattern =
  grammar?.repository?.["key-control-value"]?.match ??
  grammar?.repository?.["control-typeid"]?.match ??
  null;
const schemaControlPattern = facts.controlTypeIdPattern;

// ─────────────────────────────────────────────────────────────────────────────
// Write snapshot (always)

if (!existsSync(SNAPSHOT_DIR)) await mkdir(SNAPSHOT_DIR, { recursive: true });
await writeFile(SNAPSHOT_PATH, JSON.stringify(facts, null, 2) + "\n", "utf8");

// ─────────────────────────────────────────────────────────────────────────────
// Apply if requested

let applied = false;
if (mode === "apply" && drift && grammarKeys) {
  const newAlternation = schemaKeys.join("|");
  const oldMatch = rule.match;
  const newMatch = oldMatch.replace(/\^\([^)]+\)/, `^(${newAlternation})`);
  if (newMatch !== oldMatch) {
    grammar.repository["structural-key"].match = newMatch;
    await writeFile(GRAMMAR_PATH, JSON.stringify(grammar, null, 2) + "\n", "utf8");
    applied = true;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Report

console.log(`Schema source: ${source}`);
console.log(`Schema ID:     ${facts.schemaId ?? "(none)"}`);
console.log(`Snapshot:      grammar/data/schema-snapshot.json (${facts.structuralKeys.length} structural keys, ${facts.controlInstanceSubKeys.length} sub-keys)`);
console.log("");
console.log(`Structural keys (canonical):   ${schemaKeys.join(", ")}`);
console.log(`Control-instance sub-keys:     ${facts.controlInstanceSubKeys.join(", ")}`);
console.log(`ControlTypeId pattern:         ${facts.controlTypeIdPattern ?? "(none)"}`);
console.log("");

if (drift) {
  console.log("⚠ Grammar drift detected:");
  for (const line of driftReport) console.log(`  - ${line}`);
  if (applied) {
    console.log("→ Patched syntaxes/pa-yaml.tmLanguage.json structural-key alternation.");
  } else if (mode === "check") {
    console.log("→ Re-run with --apply to patch.");
    process.exit(1);
  } else {
    console.log("→ Re-run with --apply to patch, or --check to fail CI on drift.");
  }
} else {
  console.log("✓ Grammar structural keys match schema.");
}

if (
  schemaControlPattern &&
  grammarControlPattern &&
  !grammarControlPattern.includes(schemaControlPattern.replace(/^\^|\$$/g, ""))
) {
  console.log(
    `ℹ ControlTypeId pattern in grammar does not literally contain the schema pattern; manual review recommended.`
  );
  console.log(`    schema:  ${schemaControlPattern}`);
  console.log(`    grammar: ${grammarControlPattern}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Engine-symbols coverage check (Phase 2 #A + #B)
//
// If grammar/data/powerfx-engine-symbols.json exists (produced by the LSP
// branch's `pfx-check --dump-symbols`), cross-reference it against the
// grammar's pfx-builtin-function and pfx-builtin-enum alternations. Reports:
//   - ENGINE → GRAMMAR gap: engine names the grammar is missing (real bugs)
//   - GRAMMAR → ENGINE gap: grammar names the engine doesn't expose (canvas-
//     host functions/enums; informational only)
//
// Never auto-patches the function/enum lists — the canvas-host overrides
// the engine surface and a blind regen would drop them. Maintainer reviews
// the engine→grammar gap manually and adds entries one by one.

const ENGINE_SYMBOLS_PATH = join(REPO_ROOT, "grammar", "data", "powerfx-engine-symbols.json");
let engineDrift = false;
if (existsSync(ENGINE_SYMBOLS_PATH)) {
  const engineData = JSON.parse(await readFile(ENGINE_SYMBOLS_PATH, "utf8"));
  const grammarFnRule = grammar?.repository?.["pfx-function-call"];
  const grammarEnumRule = grammar?.repository?.["pfx-builtin-enum"];

  function alternationFrom(rule) {
    if (!rule?.match) return [];
    const m = /\\b\(([^)]+)\)/.exec(rule.match) ?? /\(([^)]+)\)/.exec(rule.match);
    return m ? m[1].split("|").sort() : [];
  }

  const grammarFns = alternationFrom(grammarFnRule);
  const grammarEnums = alternationFrom(grammarEnumRule);
  const engineFns = engineData.functions ?? [];
  const engineEnums = Object.keys(engineData.enums ?? {});

  const fnsMissingFromGrammar = engineFns.filter((f) => !grammarFns.includes(f));
  const enumsMissingFromGrammar = engineEnums.filter((e) => !grammarEnums.includes(e));
  const fnsBeyondEngine = grammarFns.filter((f) => !engineFns.includes(f));
  const enumsBeyondEngine = grammarEnums.filter((e) => !engineEnums.includes(e));

  console.log("");
  console.log(`Engine snapshot: ${ENGINE_SYMBOLS_PATH.split("/").slice(-3).join("/")} (Power Fx ${engineData.powerFxVersion ?? "?"})`);
  console.log(`  Grammar: ${grammarFns.length} fns / ${grammarEnums.length} enums   Engine: ${engineFns.length} fns / ${engineEnums.length} enums`);

  if (fnsMissingFromGrammar.length || enumsMissingFromGrammar.length) {
    engineDrift = true;
    console.log("⚠ Engine symbols missing from grammar (real coverage gaps):");
    if (fnsMissingFromGrammar.length)
      console.log(`  fns:   ${fnsMissingFromGrammar.join(", ")}`);
    if (enumsMissingFromGrammar.length)
      console.log(`  enums: ${enumsMissingFromGrammar.join(", ")}`);
  } else {
    console.log("✓ Grammar covers every Power Fx engine function + enum.");
  }
  console.log(`ℹ Grammar-only (canvas-host or hand-curated): ${fnsBeyondEngine.length} fns, ${enumsBeyondEngine.length} enums — informational, expected.`);

  if (engineDrift && mode === "check") {
    process.exit(1);
  }
}

process.exit(drift && mode === "check" ? 1 : 0);
