import { NextRequest } from "next/server";
import { sseBroadcaster } from "@/app/_utils/sse-broadcaster";
import { createHeartbeatEvent } from "@/app/_utils/sse-events";
import { startLogWatcher } from "@/app/_utils/log-watcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

let watcherStarted = false;

export const GET = async (request: NextRequest) => {
  const liveUpdatesEnabled = process.env.LIVE_UPDATES !== "false";

  if (!liveUpdatesEnabled) {
    return new Response(
      JSON.stringify({ error: "Live updates are disabled" }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!watcherStarted) {
    startLogWatcher();
    watcherStarted = true;
  }

  const clientId = `client-${Date.now()}-${Math.random()
    .toString(36)
    .substring(7)}`;

  const stream = new ReadableStream({
    start(controller) {
      sseBroadcaster.addClient(clientId, controller);

      const encoder = new TextEncoder();
      const welcome = encoder.encode(
        `: Connected to Cronmaster SSE\nretry: 5000\n\n`
      );
      controller.enqueue(welcome);

      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = createHeartbeatEvent();
          sseBroadcaster.sendToClient(clientId, heartbeat);
        } catch (error) {
          console.error("[SSE] Heartbeat error:", error);
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeatInterval);
        sseBroadcaster.removeClient(clientId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
};
