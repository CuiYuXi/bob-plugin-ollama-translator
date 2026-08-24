import { ConfigError } from "./errors";

export type ThinkingMode =
  | "auto"
  | "off"
  | "on"
  | "low"
  | "medium"
  | "high";

export type OllamaThink = boolean | "low" | "medium" | "high";

export interface OllamaConfig {
  host: string;
  model: string;
  thinkingMode: ThinkingMode;
  think?: OllamaThink;
  showThinking: boolean;
  temperature: number;
  keepAlive: string;
  prompt: string;
}

const DEFAULT_HOST = "http://127.0.0.1:11434";
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_KEEP_ALIVE = "5m";
const LOCAL_HOST_PATTERN =
  /^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::(\d{1,5}))?$/i;
const KEEP_ALIVE_PATTERN = /^-?\d+(?:\.\d+)?(?:ms|s|m|h)?$/;

function normalizeHost(value: string | undefined): string {
  const host = (value || DEFAULT_HOST).trim().replace(/\/+$/, "");
  const match = LOCAL_HOST_PATTERN.exec(host);
  if (!match) {
    throw new ConfigError(
      "Ollama 地址必须是本机 HTTP 回环地址，例如 http://127.0.0.1:11434",
    );
  }

  if (match[1]) {
    const port = Number(match[1]);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new ConfigError("Ollama 地址中的端口号无效");
    }
  }

  return host;
}

function normalizeThinking(value: string | undefined): {
  mode: ThinkingMode;
  think?: OllamaThink;
} {
  switch (value) {
    case "auto":
      return { mode: "auto" };
    case "off":
      return { mode: "off", think: false };
    case "on":
      return { mode: "on", think: true };
    case "low":
    case "medium":
    case "high":
      return { mode: value, think: value };
    default:
      return { mode: "off", think: false };
  }
}

function normalizeTemperature(value: string | undefined): number {
  if (!value || !value.trim()) return DEFAULT_TEMPERATURE;
  const temperature = Number(value);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new ConfigError("Temperature 必须是 0 到 2 之间的数字");
  }
  return temperature;
}

function normalizeKeepAlive(value: string | undefined): string {
  const keepAlive = (value || DEFAULT_KEEP_ALIVE).trim();
  if (!KEEP_ALIVE_PATTERN.test(keepAlive)) {
    throw new ConfigError("Keep Alive 格式无效，请填写例如 5m、1h 或 0");
  }
  return keepAlive;
}

export function readConfig(): OllamaConfig {
  const model = ($option.model || "").trim();
  if (!model) {
    throw new ConfigError("请先在插件配置中填写 Ollama 模型名称");
  }

  const thinking = normalizeThinking($option.thinking);
  return {
    host: normalizeHost($option.host),
    model,
    thinkingMode: thinking.mode,
    ...(thinking.think !== undefined ? { think: thinking.think } : {}),
    showThinking: $option.showThinking === "on",
    temperature: normalizeTemperature($option.temperature),
    keepAlive: normalizeKeepAlive($option.keepAlive),
    prompt: $option.prompt || "",
  };
}

export function ollamaUrl(config: OllamaConfig, path: string): string {
  return `${config.host}${path}`;
}
