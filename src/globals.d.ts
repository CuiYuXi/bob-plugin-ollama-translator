import type {
  BobHttpRequestOptions,
  BobHttpStreamRequestOptions,
} from "./bob";

declare global {
  const $option: {
    host?: string;
    model?: string;
    thinking?: string;
    showThinking?: string;
    temperature?: string;
    keepAlive?: string;
    prompt?: string;
  };

  const $http: {
    request(options: BobHttpRequestOptions): void;
    streamRequest(options: BobHttpStreamRequestOptions): void;
  };
}

export {};
