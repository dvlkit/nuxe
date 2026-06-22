#!/usr/bin/env node

// lib/index.ts
import { cpSync, existsSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var TEMPLATE_DIR = resolve(__dirname, "../lib/template");
var projectName = process.argv[2];
if (!projectName) {
  console.error("Usage: create-nuxe <project-name>");
  process.exit(1);
}
if (!/^[a-z0-9-_]+$/i.test(projectName)) {
  console.error(`Error: invalid project name "${projectName}"`);
  console.error("Use only letters, numbers, dashes, and underscores");
  process.exit(1);
}
var projectDir = resolve(process.cwd(), projectName);
if (existsSync(projectDir)) {
  console.error(`Error: directory "${projectName}" already exists`);
  process.exit(1);
}
console.log(`
Creating ${projectName}...`);
cpSync(TEMPLATE_DIR, projectDir, { recursive: true });
var pkgPath = join(projectDir, "package.json");
var pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
pkg.name = projectName;
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(`
\u2713 Created ${projectName}/
`);
console.log("Next steps:");
console.log(`  cd ${projectName}`);
console.log(`  pnpm install`);
console.log(`  pnpm dev`);
console.log("\nOpen http://localhost:3000\n");
