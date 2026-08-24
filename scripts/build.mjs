import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  rm,
  utimes,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { rollup } from "rollup";
import config from "../rollup.config.mjs";

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

const bundle = await rollup(config);
await bundle.write(config.output);
await bundle.close();

await copyFile("public/info.json", "dist/info.json");

const reproducibleTime = new Date("2000-01-01T00:00:00.000Z");
await Promise.all([
  chmod("dist/main.js", 0o644),
  chmod("dist/info.json", 0o644),
  utimes("dist/main.js", reproducibleTime, reproducibleTime),
  utimes("dist/info.json", reproducibleTime, reproducibleTime),
]);

const info = JSON.parse(await readFile("public/info.json", "utf8"));
const packagePath = `dist/bob-plugin-ollama-translator-v${info.version}.bobplugin`;
const zip = spawnSync(
  "zip",
  ["-X", "-j", "-q", packagePath, "dist/main.js", "dist/info.json"],
  {
    env: { ...process.env, TZ: "UTC" },
    stdio: "inherit",
  },
);

if (zip.status !== 0) {
  throw new Error(`zip failed with exit code ${zip.status ?? "unknown"}`);
}

console.log(`Built ${packagePath}`);
