export interface BobServiceError {
  type:
    | "unknown"
    | "param"
    | "unsupportedLanguage"
    | "secretKey"
    | "network"
    | "api"
    | "notFound";
  message: string;
  addition?: unknown;
  troubleshootingLink?: string;
}

export interface BobThinkInfo {
  content: string;
  splitThinkTag: boolean;
}

export interface BobTranslateResult {
  from: string;
  to: string;
  toParagraphs: string[];
  thinkInfo?: BobThinkInfo;
}

export type BobTranslatePayload =
  | { result: BobTranslateResult }
  | { error: BobServiceError };

export interface BobTranslateQuery {
  text: string;
  originalText?: string;
  from: string;
  to: string;
  detectFrom: string;
  detectTo: string;
  cancelSignal?: unknown;
  onStream(payload: { result: BobTranslateResult }): void;
  onCompletion(payload: BobTranslatePayload): void;
}

export interface BobHttpResult {
  response?: {
    statusCode?: number;
  };
  data?: unknown;
  error?:
    | string
    | {
        message?: string;
        debugMessage?: string;
      };
}

export interface BobHttpRequestOptions {
  method: string;
  url: string;
  header?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  cancelSignal?: unknown;
  handler(result: BobHttpResult): void;
}

export interface BobHttpStreamRequestOptions extends BobHttpRequestOptions {
  streamHandler(data: { text?: string; rawData?: unknown }): void;
}
