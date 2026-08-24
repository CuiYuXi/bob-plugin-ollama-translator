import type { BobServiceError } from "./bob";

export type OllamaErrorCode =
  | "network"
  | "model"
  | "http"
  | "parse"
  | "empty"
  | "api";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export class OllamaError extends Error {
  readonly code: OllamaErrorCode;
  readonly detail?: string;

  constructor(code: OllamaErrorCode, message: string, detail?: string) {
    super(message);
    this.name = "OllamaError";
    this.code = code;
    this.detail = detail;
  }
}

export function toServiceError(error: unknown): BobServiceError {
  if (error instanceof ConfigError) {
    return {
      type: "param",
      message: error.message,
      addition: "请检查 Ollama 本地翻译插件的配置。",
    };
  }

  if (error instanceof OllamaError) {
    const addition = error.detail || error.message;

    if (error.code === "network") {
      return {
        type: "network",
        message: error.message,
        addition,
        troubleshootingLink: "https://docs.ollama.com/api/introduction",
      };
    }

    if (error.code === "model") {
      return {
        type: "param",
        message: error.message,
        addition,
        troubleshootingLink: "https://docs.ollama.com/api/pull",
      };
    }

    return {
      type: "api",
      message: error.message,
      addition,
      troubleshootingLink: "https://docs.ollama.com/api/chat",
    };
  }

  return {
    type: "unknown",
    message: error instanceof Error ? error.message : "发生未知错误",
    addition: "Ollama 本地翻译过程中发生未知错误。",
  };
}
