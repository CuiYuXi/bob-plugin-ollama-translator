export interface NdjsonParser {
  feed(text: string): void;
  finish(): void;
}

export function createNdjsonParser<T>(
  onValue: (value: T) => void,
  onError: (error: Error) => void,
): NdjsonParser {
  let buffer = "";
  let failed = false;

  const parseLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed || failed) return;

    try {
      onValue(JSON.parse(trimmed) as T);
    } catch {
      failed = true;
      onError(new Error("无法解析 Ollama 返回的 NDJSON 数据"));
    }
  };

  return {
    feed(text: string) {
      if (!text || failed) return;
      buffer += text;

      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        parseLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    },

    finish() {
      if (buffer) parseLine(buffer);
      buffer = "";
    },
  };
}
