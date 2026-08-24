import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const repository = "CuiYuXi/bob-plugin-ollama-translator";
const info = JSON.parse(await readFile("public/info.json", "utf8"));
const appcast = JSON.parse(await readFile("appcast.json", "utf8"));
const latest = appcast.versions?.[0];

function verify(condition, message) {
  if (!condition) throw new Error(`appcast verification failed: ${message}`);
}

verify(appcast.identifier === info.identifier, "identifier does not match info.json");
verify(latest, "versions must contain the latest release");
verify(latest.version === info.version, "latest version does not match info.json");
verify(
  latest.minBobVersion === info.minBobVersion,
  "minBobVersion does not match info.json",
);

const packageName = `bob-plugin-ollama-translator-v${info.version}.bobplugin`;
const packagePath = `dist/${packageName}`;
const expectedUrl = `https://github.com/${repository}/releases/download/v${info.version}/${packageName}`;
verify(latest.url === expectedUrl, "release asset URL is incorrect");

const packageData = await readFile(packagePath);
const sha256 = createHash("sha256").update(packageData).digest("hex");
verify(latest.sha256 === sha256, "SHA256 does not match the built plugin package");

console.log(`Verified appcast for v${info.version}: ${sha256}`);
