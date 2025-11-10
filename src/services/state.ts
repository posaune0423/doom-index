import { err, ok, Result } from "neverthrow";
import type { StateService, GlobalState, TokenState, RevenueReport } from "@/types/domain";
import type { AppError } from "@/types/app-error";
import type { BlobClient } from "@/lib/blob-client";
import { blobKeys, batchWriteJson } from "@/lib/blob-helpers";

type StateServiceDeps = {
  blobClient: BlobClient;
};

const JSON_CONTENT_TYPE = "application/json";

const validationError = (message: string, details?: unknown): AppError => ({
  type: "ValidationError",
  message,
  details,
});

async function readJson<T>(blobClient: BlobClient, key: string): Promise<Result<T | null, AppError>> {
  const getResult = await blobClient.get(key);
  if (getResult.isErr()) return err(getResult.error);

  const target = getResult.value;
  if (!target) return ok(null);

  try {
    const text = await target.text();
    return ok(JSON.parse(text) as T);
  } catch (parseError) {
    return err(
      validationError(`Invalid JSON for ${key}`, parseError instanceof Error ? parseError.message : parseError),
    );
  }
}

async function writeJson(blobClient: BlobClient, key: string, value: unknown): Promise<Result<void, AppError>> {
  const putResult = await blobClient.put(key, JSON.stringify(value), { contentType: JSON_CONTENT_TYPE });
  if (putResult.isErr()) return err(putResult.error);
  return ok(undefined);
}

export function createStateService({ blobClient }: StateServiceDeps): StateService {
  async function readGlobalState(): Promise<Result<GlobalState | null, AppError>> {
    return readJson<GlobalState>(blobClient, blobKeys.globalState());
  }

  async function writeGlobalState(state: GlobalState): Promise<Result<void, AppError>> {
    return writeJson(blobClient, blobKeys.globalState(), state);
  }

  async function readTokenState(ticker: string): Promise<Result<TokenState | null, AppError>> {
    return readJson<TokenState>(blobClient, blobKeys.tokenState(ticker));
  }

  async function writeTokenStates(states: TokenState[]): Promise<Result<void, AppError>> {
    const entries = states.map(state => ({
      key: blobKeys.tokenState(state.ticker),
      value: state,
    }));
    return batchWriteJson(blobClient, entries);
  }

  async function storeImage(key: string, buf: ArrayBuffer): Promise<Result<string, AppError>> {
    const putResult = await blobClient.put(key, buf, { contentType: "image/webp" });
    if (putResult.isErr()) return err(putResult.error);
    return ok(putResult.value);
  }

  async function writeRevenue(report: RevenueReport, minuteIso: string): Promise<Result<void, AppError>> {
    return writeJson(blobClient, blobKeys.revenue(minuteIso), report);
  }

  async function readRevenue(minuteIso: string): Promise<Result<RevenueReport | null, AppError>> {
    return readJson<RevenueReport>(blobClient, blobKeys.revenue(minuteIso));
  }

  return {
    readGlobalState,
    writeGlobalState,
    readTokenState,
    writeTokenStates,
    storeImage,
    writeRevenue,
    readRevenue,
  };
}
