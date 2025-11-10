import { describe, it, expect } from "bun:test";
import { runtime } from "@/app/api/cron/route";

describe("/api/cron route", () => {
  it("uses Edge runtime", () => {
    expect(runtime).toBe("edge");
  });
});
