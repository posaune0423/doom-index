import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { logger } from "@/utils/logger";
import { createViewerService } from "@/services/viewer";
import { isBotUserAgent } from "@/utils/user-agent";
import { getErrorMessage } from "@/utils/error";

interface ViewerRequest {
  sessionId: string;
  userAgent?: string;
  bye?: boolean;
}

export async function POST(request: Request) {
  try {
    // Check user agent from request headers
    const requestUserAgent = request.headers.get("user-agent");
    if (isBotUserAgent(requestUserAgent)) {
      // Ignore bot/crawler requests
      logger.debug("viewer.api.bot-ignored", { userAgent: requestUserAgent });
      return NextResponse.json({ success: false, error: "Bot requests are ignored" }, { status: 403 });
    }

    // get KV Namespace from Cloudflare environment
    const { env } = await getCloudflareContext({ async: true });
    const kvNamespace = (env as Cloudflare.Env).VIEWER_KV;

    if (!kvNamespace) {
      logger.error("viewer.api.error", {
        message: "VIEWER_KV binding is not configured",
      });
      return NextResponse.json({ success: false, error: "KV not configured" }, { status: 500 });
    }

    // parse request body
    const body: ViewerRequest = await request.json();

    if (!body.sessionId) {
      return NextResponse.json({ success: false, error: "sessionId is required" }, { status: 400 });
    }

    // Also check user agent from request body (sent by worker)
    if (body.userAgent && isBotUserAgent(body.userAgent)) {
      logger.debug("viewer.api.bot-ignored", { userAgent: body.userAgent, sessionId: body.sessionId });
      return NextResponse.json({ success: false, error: "Bot requests are ignored" }, { status: 403 });
    }

    // create ViewerService
    const viewerService = createViewerService({ kvNamespace });

    // if bye=true, remove viewer, otherwise register or update
    if (body.bye) {
      const result = await viewerService.removeViewer(body.sessionId);
      if (result.isErr()) {
        logger.error("viewer.api.remove.error", {
          error: result.error,
          sessionId: body.sessionId,
        });
        return NextResponse.json({ success: false, error: "Failed to remove viewer" }, { status: 500 });
      }
      logger.info("viewer.api.remove", { sessionId: body.sessionId });
    } else {
      // first registration or heartbeat update
      const result = await viewerService.registerViewer(body.sessionId);
      if (result.isErr()) {
        logger.error("viewer.api.register.error", {
          error: result.error,
          sessionId: body.sessionId,
        });
        return NextResponse.json({ success: false, error: "Failed to register viewer" }, { status: 500 });
      }
      logger.debug("viewer.api.register", { sessionId: body.sessionId });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error("viewer.api.error", { error: getErrorMessage(error) });
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
