import { ok } from "neverthrow";
import type { ImageProvider, ImageResponse } from "@/types/domain";

export const createMockImageProvider = (): ImageProvider => ({
  name: "mock",
  async generate() {
    const response: ImageResponse = {
      imageBuffer: new ArrayBuffer(0),
      providerMeta: { mock: true },
    };
    return ok(response);
  },
});
