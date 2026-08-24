import type { BobHttpResult, BobTranslateQuery } from "./bob";
import { ollamaUrl, type OllamaConfig } from "./config";
import { OllamaError } from "./errors";
import { createNdjsonParser } from "./ndjson";
import type { OllamaMessage } from "./prompt";

interface OllamaChatChunk {
  message?: {
    role?: string;
    content?: string;
    thinking?: string;
  };
  done?: boolean;
  done_reason?: string;
  error?: string;
}

interface OllamaTagsResponse {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
}

export interface OllamaStreamCallbacks {
  onUpdate(content: string, thinking: string): void;
  onDone(content: string, thinking: string, reason?: string): void;
  onError(error: OllamaError): void;
}

export interface OllamaValidationCallbacks {
  onSuccess(): void;
  onError(error: OllamaError): void;
}

function responseStatus(result: BobHttpResult): number {
  return result.response?.statusCode || 0;
}

function transportMessage(result: BobHttpResult): string {
  if (typeof result.error === "string") return result.error;
  return result.error?.message || result.error?.debugMessage || "";
}

function errorFromMessage(message: string): OllamaError {
  if (/model.+(?:not found|does not exist)|pull model/i.test(message)) {
    return new OllamaError(
      "model",
      "本地 Ollama 中没有找到所配置的模型",
      message,
    );
  }
  return new OllamaError("api", `Ollama 返回错误：${message}`, message);
}

function httpError(status: number): OllamaError {
  if (status === 404) {
    return new OllamaError(
      "http",
      "Ollama 接口不存在，请检查地址和 Ollama 版本",
      `HTTP ${status}`,
    );
  }
  return new OllamaError(
    "http",
    `Ollama 请求失败（HTTP ${status}）`,
    `HTTP ${status}`,
  );
}

function networkError(detail?: string): OllamaError {
  return new OllamaError(
    "network",
    "无法连接本地 Ollama，请确认 Ollama 已启动",
    detail || "请运行 Ollama 应用或执行 ollama serve。",
  );
}

function buildChatBody(config: OllamaConfig, messages: OllamaMessage[]) {
  return {
    model: config.model,
    messages,
    stream: true,
    keep_alive: config.keepAlive,
    options: {
      temperature: config.temperature,
    },
    ...(config.think !== undefined ? { think: config.think } : {}),
  };
}

export function streamOllamaChat(
  query: BobTranslateQuery,
  config: OllamaConfig,
  messages: OllamaMessage[],
  callbacks: OllamaStreamCallbacks,
): void {
  let content = "";
  let thinking = "";
  let settled = false;

  const fail = (error: OllamaError) => {
    if (settled) return;
    settled = true;
    callbacks.onError(error);
  };

  const finish = (reason?: string) => {
    if (settled) return;
    if (!content.trim()) {
      fail(
        new OllamaError(
          "empty",
          "Ollama 未返回翻译结果",
          reason ? `done_reason: ${reason}` : undefined,
        ),
      );
      return;
    }
    settled = true;
    callbacks.onDone(content, thinking, reason);
  };

  const parser = createNdjsonParser<OllamaChatChunk>(
    (chunk) => {
      if (settled) return;
      if (chunk.error) {
        fail(errorFromMessage(chunk.error));
        return;
      }

      const nextContent = chunk.message?.content || "";
      const nextThinking = chunk.message?.thinking || "";
      content += nextContent;
      thinking += nextThinking;

      if (nextContent || nextThinking) {
        callbacks.onUpdate(content, thinking);
      }

      if (chunk.done) finish(chunk.done_reason);
    },
    () =>
      fail(
        new OllamaError(
          "parse",
          "无法解析 Ollama 流式响应",
          "Ollama 返回了格式无效的 NDJSON 数据。",
        ),
      ),
  );

  try {
    $http.streamRequest({
      method: "POST",
      url: ollamaUrl(config, "/api/chat"),
      timeout: 170,
      cancelSignal: query.cancelSignal,
      header: {
        "Content-Type": "application/json",
      },
      body: buildChatBody(config, messages),
      streamHandler: (stream) => {
        if (stream.text) parser.feed(stream.text);
      },
      handler: (result) => {
        parser.finish();
        if (settled) return;

        const status = responseStatus(result);
        if (status >= 400) {
          fail(httpError(status));
          return;
        }

        const transport = transportMessage(result);
        if (transport) {
          fail(networkError(transport));
          return;
        }

        if (content.trim()) {
          finish("stream_closed");
        } else {
          fail(networkError("连接已关闭，但没有收到 Ollama 响应。"));
        }
      },
    });
  } catch (error) {
    fail(networkError(error instanceof Error ? error.message : undefined));
  }
}

function isInstalledModel(configured: string, installed: string[]): boolean {
  if (installed.includes(configured)) return true;
  if (!configured.includes(":")) {
    return installed.includes(`${configured}:latest`);
  }
  return false;
}

export function validateOllama(
  config: OllamaConfig,
  callbacks: OllamaValidationCallbacks,
): void {
  let settled = false;
  const succeed = () => {
    if (settled) return;
    settled = true;
    callbacks.onSuccess();
  };
  const fail = (error: OllamaError) => {
    if (settled) return;
    settled = true;
    callbacks.onError(error);
  };

  try {
    $http.request({
      method: "GET",
      url: ollamaUrl(config, "/api/tags"),
      timeout: 8,
      header: { Accept: "application/json" },
      handler: (result) => {
        const status = responseStatus(result);
        if (status >= 400) {
          fail(httpError(status));
          return;
        }

        const transport = transportMessage(result);
        if (transport) {
          fail(networkError(transport));
          return;
        }

        const data = result.data as OllamaTagsResponse | undefined;
        const installed = (data?.models || [])
          .map((model) => model.name || model.model || "")
          .filter(Boolean);

        if (!isInstalledModel(config.model, installed)) {
          fail(
            new OllamaError(
              "model",
              `本地未找到模型 ${config.model}`,
              `请执行 ollama pull ${config.model}，或填写 ollama list 中已有的模型名称。`,
            ),
          );
          return;
        }

        succeed();
      },
    });
  } catch (error) {
    fail(networkError(error instanceof Error ? error.message : undefined));
  }
}
