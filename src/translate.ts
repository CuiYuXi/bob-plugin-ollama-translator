import type {
  BobTranslateQuery,
  BobTranslateResult,
  BobTranslatePayload,
} from "./bob";
import { readConfig } from "./config";
import { toServiceError } from "./errors";
import { streamOllamaChat } from "./ollama";
import { buildMessages } from "./prompt";

function buildResult(
  query: BobTranslateQuery,
  content: string,
  thinking: string,
  showThinking: boolean,
): BobTranslateResult {
  return {
    from: query.detectFrom,
    to: query.detectTo,
    toParagraphs: content ? [content] : [],
    ...(showThinking && thinking
      ? {
          thinkInfo: {
            content: thinking,
            splitThinkTag: false,
          },
        }
      : {}),
  };
}

export function translate(query: BobTranslateQuery): void {
  let completed = false;

  const complete = (payload: BobTranslatePayload) => {
    if (completed) return;
    completed = true;
    query.onCompletion(payload);
  };

  try {
    const config = readConfig();
    const messages = buildMessages(query, config);
    const showThinking = config.showThinking;

    streamOllamaChat(query, config, messages, {
      onUpdate: (content, thinking) => {
        const visibleThinking = showThinking ? thinking : "";
        if (completed || (!content && !visibleThinking)) return;
        query.onStream({
          result: buildResult(
            query,
            content,
            thinking,
            showThinking,
          ),
        });
      },
      onDone: (content, thinking) => {
        complete({
          result: buildResult(
            query,
            content,
            thinking,
            showThinking,
          ),
        });
      },
      onError: (error) => complete({ error: toServiceError(error) }),
    });
  } catch (error) {
    complete({ error: toServiceError(error) });
  }
}
