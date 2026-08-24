import type { BobServiceError } from "./bob";
import { readConfig } from "./config";
import { toServiceError } from "./errors";
import { supportLanguages } from "./languages";
import { validateOllama } from "./ollama";
import { translate } from "./translate";

type ValidateCompletion = (
  payload: { result: true } | { result: false; error: BobServiceError },
) => void;

export function pluginTimeoutInterval(): number {
  return 180;
}

export function pluginValidate(completion: ValidateCompletion): void {
  let completed = false;
  const finish = (
    payload: { result: true } | { result: false; error: BobServiceError },
  ) => {
    if (completed) return;
    completed = true;
    completion(payload);
  };

  try {
    const config = readConfig();
    validateOllama(config, {
      onSuccess: () => finish({ result: true }),
      onError: (error) =>
        finish({ result: false, error: toServiceError(error) }),
    });
  } catch (error) {
    finish({ result: false, error: toServiceError(error) });
  }
}

export { supportLanguages, translate };
