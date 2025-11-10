import type { ImageProvider, ImageRequest, ImageResponse } from "@/types/domain";
import type { AppError } from "@/types/app-error";
import type { Result } from "neverthrow";
import { createAiSdkProvider } from "./ai-sdk";
import { createRunwareSdkProvider } from "./runware-sdk";
import { createMockImageProvider } from "./mock";

export type ProviderName = "ai-sdk" | "runware-sdk" | "smart";

// Mock provider is for testing only
export type ProviderNameWithMock = ProviderName | "mock";

/**
 * AI SDK supported models
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/image-generation
 */
const AI_SDK_MODELS = new Set([
  // xAI Grok
  "grok-2-image",
  // OpenAI
  "gpt-image-1",
  "dall-e-3",
  "dall-e-2",
  // Amazon Bedrock
  "amazon.nova-canvas-v1:0",
  // Fal
  "fal-ai/flux/dev",
  "fal-ai/flux-lora",
  "fal-ai/fast-sdxl",
  "fal-ai/flux-pro/v1.1-ultra",
  "fal-ai/ideogram/v2",
  "fal-ai/recraft-v3",
  "fal-ai/stable-diffusion-3.5-large",
  "fal-ai/hyper-sdxl",
  // DeepInfra
  "stabilityai/sd3.5",
  "black-forest-labs/FLUX-1.1-pro",
  "black-forest-labs/FLUX-1-schnell",
  "black-forest-labs/FLUX-1-dev",
  "black-forest-labs/FLUX-pro",
  "stabilityai/sd3.5-medium",
  "stabilityai/sdxl-turbo",
  // Replicate
  "black-forest-labs/flux-schnell",
  "recraft-ai/recraft-v3",
  // Google
  "imagen-3.0-generate-002",
  "imagen-3.0-fast-generate-001",
  // Fireworks
  "accounts/fireworks/models/flux-1-dev-fp8",
  "accounts/fireworks/models/flux-1-schnell-fp8",
  "accounts/fireworks/models/playground-v2-5-1024px-aesthetic",
  "accounts/fireworks/models/japanese-stable-diffusion-xl",
  "accounts/fireworks/models/playground-v2-1024px-aesthetic",
  "accounts/fireworks/models/SSD-1B",
  "accounts/fireworks/models/stable-diffusion-xl-1024-v1-0",
  // Luma
  "photon-1",
  "photon-flash-1",
  // Together.ai
  "stabilityai/stable-diffusion-xl-base-1.0",
  "black-forest-labs/FLUX.1-dev",
  "black-forest-labs/FLUX.1-dev-lora",
  "black-forest-labs/FLUX.1-schnell",
  "black-forest-labs/FLUX.1-canny",
  "black-forest-labs/FLUX.1-depth",
  "black-forest-labs/FLUX.1-redux",
  "black-forest-labs/FLUX.1.1-pro",
  "black-forest-labs/FLUX.1-pro",
  "black-forest-labs/FLUX.1-schnell-Free",
]);

/**
 * Determines the appropriate provider based on the model
 * - If model starts with "runware:" or matches Runware AIR format (civitai:xxx@xxx), use runware-sdk
 * - If model is in AI_SDK_MODELS, use ai-sdk
 * - Otherwise, use runware-sdk as default (supports any model via AIR system)
 */
const getProviderForModel = (model?: string): ProviderName => {
  if (!model) return "runware-sdk";

  // Runware AIR format: runware:xxx@xxx or civitai:xxx@xxx
  if (model.startsWith("runware:") || /^civitai:\d+@\d+$/.test(model)) {
    return "runware-sdk";
  }

  // AI SDK supported models
  if (AI_SDK_MODELS.has(model)) {
    return "ai-sdk";
  }

  // Default to runware-sdk (supports any model via AIR system)
  return "runware-sdk";
};

export const resolveProvider = (name: ProviderName = "smart"): ImageProvider => {
  switch (name) {
    case "ai-sdk":
      return createAiSdkProvider();
    case "runware-sdk":
      return createRunwareSdkProvider();
    case "smart":
      return createSmartProvider();
    default:
      return createSmartProvider();
  }
};

/**
 * Resolve provider including mock (for testing only)
 */
export const resolveProviderWithMock = (name: ProviderNameWithMock = "smart"): ImageProvider => {
  if (name === "mock") {
    return createMockImageProvider();
  }
  return resolveProvider(name as ProviderName);
};

/**
 * Smart provider that automatically selects the appropriate provider based on the model
 */
export const createSmartProvider = (): ImageProvider => ({
  name: "smart",

  async generate(input: ImageRequest): Promise<Result<ImageResponse, AppError>> {
    const providerName = getProviderForModel(input.model);
    const provider = resolveProvider(providerName);
    return provider.generate(input);
  },
});
