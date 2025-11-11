import { SSEEvent, formatSSEEvent } from "./sse-events";

type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
  connectedAt: Date;
};

class SSEBroadcaster {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, controller: ReadableStreamDefaultController): void {
    this.clients.set(id, {
      id,
      controller,
      connectedAt: new Date(),
    });
    if (process.env.DEBUGGER) {
      console.log(
        `[SSE] Client ${id} connected. Total clients: ${this.clients.size}`
      );
    }
  }

  removeClient(id: string): void {
    this.clients.delete(id);
    if (process.env.DEBUGGER) {
      console.log(
        `[SSE] Client ${id} disconnected. Total clients: ${this.clients.size}`
      );
    }
  }

  broadcast(event: SSEEvent): void {
    const formattedEvent = formatSSEEvent(event);
    const encoder = new TextEncoder();
    const encoded = encoder.encode(formattedEvent);

    let successCount = 0;
    let failCount = 0;

    this.clients.forEach((client, id) => {
      try {
        client.controller.enqueue(encoded);
        successCount++;
      } catch (error) {
        if (process.env.DEBUGGER) {
          console.error(`[SSE] Failed to send to client ${id}:`, error);
        }
        this.removeClient(id);
        failCount++;
      }
    });

    if (this.clients.size > 0) {
      if (process.env.DEBUGGER) {
        console.log(
          `[SSE] Broadcast ${event.type} to ${successCount} clients (${failCount} failed)`
        );
      }
    }
  }

  sendToClient(clientId: string, event: SSEEvent): void {
    const client = this.clients.get(clientId);
    if (!client) {
      if (process.env.DEBUGGER) {
        console.warn(`[SSE] Client ${clientId} not found`);
      }
      return;
    }

    try {
      const formattedEvent = formatSSEEvent(event);
      const encoder = new TextEncoder();
      client.controller.enqueue(encoder.encode(formattedEvent));
    } catch (error) {
      if (process.env.DEBUGGER) {
        console.error(`[SSE] Failed to send to client ${clientId}:`, error);
      }
      this.removeClient(clientId);
    }
  }

  getClientCount(): number {
    return this.clients.size;
  }

  hasClients(): boolean {
    return this.clients.size > 0;
  }
}

export const sseBroadcaster = new SSEBroadcaster();
