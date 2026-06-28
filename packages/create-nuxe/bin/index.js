#!/usr/bin/env node

// lib/index.ts
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { intro, outro, text, confirm, isCancel, cancel } from "@clack/prompts";
var __filename = fileURLToPath(import.meta.url);
var __dirname = dirname(__filename);
var TEMPLATE_DIR = resolve(__dirname, "../lib/template");
async function resolveNuxeVersion() {
  try {
    const nuxePkg = resolve(__dirname, "../../nuxe/package.json");
    const { version } = JSON.parse(readFileSync(nuxePkg, "utf-8"));
    return version;
  } catch {
    const res = await fetch("https://registry.npmjs.org/@dvlkit/nuxe/latest");
    if (!res.ok) return "latest";
    const { version } = await res.json();
    return version;
  }
}
async function resolveLatestVersion(pkg) {
  const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`);
  if (!res.ok) throw new Error(`Failed to fetch latest version for ${pkg}`);
  const { version } = await res.json();
  return version;
}
async function main() {
  intro("\u2728 create-nuxe \u2014 scaffold a new nuxe project");
  let projectName = process.argv[2];
  if (!projectName) {
    const name = await text({
      message: "What is your project named?",
      placeholder: "my-nuxe-app",
      validate: (value) => {
        if (!value) return "Project name is required";
        if (!/^[a-z0-9-_]+$/i.test(value)) return "Use only letters, numbers, dashes, and underscores";
      }
    });
    if (isCancel(name) || !name) {
      cancel("Cancelled");
      process.exit(0);
    }
    projectName = name;
  }
  if (!/^[a-z0-9-_]+$/i.test(projectName)) {
    console.error(`Error: invalid project name "${projectName}"`);
    console.error("Use only letters, numbers, dashes, and underscores");
    process.exit(1);
  }
  const projectDir = resolve(process.cwd(), projectName);
  if (existsSync(projectDir)) {
    console.error(`Error: directory "${projectName}" already exists`);
    process.exit(1);
  }
  const port = await text({
    message: "Which port do you want to use in development?",
    placeholder: "3000",
    validate: (value) => {
      if (value && !/^\d+$/.test(value)) return "Port must be a number";
    }
  });
  const devPort = isCancel(port) || !port ? "3000" : port;
  const includeDemo = await confirm({
    message: "Include demo pages and a composable example?",
    initial: true
  });
  const useTailwind = await confirm({
    message: "Add Tailwind CSS v4?",
    initial: true
  });
  const s = `${projectName}/`;
  cpSync(TEMPLATE_DIR, projectDir, { recursive: true });
  const pkgPath = join(projectDir, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.name = projectName;
  const [nuxeVer, vueVer, vueRouterVer, tsVer] = await Promise.all([
    resolveNuxeVersion(),
    resolveLatestVersion("vue"),
    resolveLatestVersion("vue-router"),
    resolveLatestVersion("typescript")
  ]);
  pkg.dependencies["@dvlkit/nuxe"] = nuxeVer;
  pkg.dependencies.vue = vueVer;
  pkg.dependencies["vue-router"] = vueRouterVer;
  pkg.devDependencies.typescript = tsVer;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  const configPath = join(projectDir, "nuxe.config.ts");
  const configLines = [
    `import { defineConfig } from '@dvlkit/nuxe'`
  ];
  if (useTailwind) {
    configLines.push(`import tailwindcss from '@tailwindcss/vite'`);
  }
  configLines.push(
    ``,
    `export default defineConfig({`,
    `  server: {`,
    `    port: ${devPort},`,
    `  },`
  );
  if (useTailwind) {
    configLines.push(
      `  vite: {`,
      `    plugins: [tailwindcss()],`,
      `  },`
    );
  }
  configLines.push(`})`);
  writeFileSync(configPath, configLines.join("\n") + "\n");
  if (!includeDemo) {
    rmSync(join(projectDir, "app", "pages"), { recursive: true, force: true });
    rmSync(join(projectDir, "app", "components"), { recursive: true, force: true });
    rmSync(join(projectDir, "app", "composables"), { recursive: true, force: true });
    const appPath = join(projectDir, "app", "app.vue");
    writeFileSync(appPath, "<template>\n  <RouterView />\n</template>\n");
  }
  if (useTailwind) {
    const [twVer, twViteVer] = await Promise.all([
      resolveLatestVersion("tailwindcss"),
      resolveLatestVersion("@tailwindcss/vite")
    ]);
    const cssDir = join(projectDir, "app", "assets", "css");
    mkdirSync(cssDir, { recursive: true });
    writeFileSync(join(cssDir, "main.css"), '@import "tailwindcss";\n');
    pkg.devDependencies.tailwindcss = twVer;
    pkg.devDependencies["@tailwindcss/vite"] = twViteVer;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    const appPath = join(projectDir, "app", "app.vue");
    const appContent = readFileSync(appPath, "utf-8");
    if (!appContent.includes("assets/css/main.css")) {
      writeFileSync(appPath, appContent.trimEnd() + `

<script setup lang="ts">
import './assets/css/main.css'
</script>
`);
    }
  }
  outro(`Project created at ${s}`);
  console.log("");
  console.log("  Next steps:");
  console.log(`    cd ${projectName}`);
  console.log(`    pnpm install`);
  console.log(`    pnpm dev`);
  console.log("");
  console.log(`  Open http://localhost:${devPort}`);
  console.log("");
}
main().catch((err) => {
  console.error(err);
  process.exit(1);
});
