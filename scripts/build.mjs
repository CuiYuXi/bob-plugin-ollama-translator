import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { rollup } from "rollup";
import config from "../rollup.config.mjs";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

const bundle = await rollup(config);
await bundle.write(config.output);
await bundle.close();

await copyFile("public/info.json", "dist/info.json");

const info = JSON.parse(await readFile("public/info.json", "utf8"));
const packagePath = `dist/bob-plugin-ollama-translator-v${info.version}.bobplugin`;
const zip = spawnSync(
  "zip",
  ["-j", "-q", packagePath, "dist/main.js", "dist/info.json"],
  { stdio: "inherit" },
);

if (zip.status !== 0) {
  throw new Error(`zip failed with exit code ${zip.status ?? "unknown"}`);
}

console.log(`Built ${packagePath}`);
