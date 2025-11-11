import { readFile, writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_DIR = path.join(DATA_DIR, "sessions");
const SESSIONS_FILE = path.join(SESSIONS_DIR, "sessions.json");

let fileLock: Promise<void> | null = null;

async function withLock<T>(fn: () => Promise<T>): Promise<T> {
  while (fileLock) {
    await fileLock;
  }

  let resolve: () => void;
  fileLock = new Promise((r) => {
    resolve = r;
  });

  try {
    return await fn();
  } finally {
    resolve!();
    fileLock = null;
  }
}

export type AuthType = "password" | "oidc";

export interface Session {
  authType: AuthType;
  createdAt: string;
  expiresAt: string;
}

interface SessionStore {
  [sessionId: string]: Session;
}

export function generateSessionId(): string {
  return crypto.randomBytes(32).toString("base64url");
}

export function getSessionCookieName(): string {
  return process.env.NODE_ENV === "production" && process.env.HTTPS === "true"
    ? "__Host-cronmaster-session"
    : "cronmaster-session";
}

async function ensureSessionsDir() {
  await mkdir(SESSIONS_DIR, { recursive: true });
}

async function loadSessions(): Promise<SessionStore> {
  await ensureSessionsDir();

  if (!existsSync(SESSIONS_FILE)) {
    return {};
  }

  try {
    const content = await readFile(SESSIONS_FILE, "utf-8");
    return content ? JSON.parse(content) : {};
  } catch (error) {
    console.error("Error loading sessions:", error);
    return {};
  }
}

async function saveSessions(sessions: SessionStore): Promise<void> {
  await ensureSessionsDir();
  await writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2), "utf-8");
}

export async function createSession(authType: AuthType): Promise<string> {
  await ensureSessionsDir();

  return withLock(async () => {
    const sessionId = generateSessionId();
    const sessions = await loadSessions();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    sessions[sessionId] = {
      authType,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    await saveSessions(sessions);

    if (process.env.DEBUGGER) {
      console.log("[Session] Created session:", {
        sessionId: sessionId.substring(0, 10) + "...",
        authType,
        expiresAt: expiresAt.toISOString(),
      });
    }

    return sessionId;
  });
}

export async function validateSession(sessionId: string): Promise<boolean> {
  if (!sessionId) {
    return false;
  }

  await ensureSessionsDir();

  if (!existsSync(SESSIONS_FILE)) {
    return false;
  }

  return withLock(async () => {
    const sessions = await loadSessions();
    const session = sessions[sessionId];

    if (!session) {
      return false;
    }

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (now > expiresAt) {
      delete sessions[sessionId];
      await saveSessions(sessions);
      return false;
    }

    return true;
  });
}

export async function getSession(sessionId: string): Promise<Session | null> {
  if (!sessionId) {
    return null;
  }

  await ensureSessionsDir();

  if (!existsSync(SESSIONS_FILE)) {
    return null;
  }

  const sessions = await loadSessions();
  return sessions[sessionId] || null;
}

export async function deleteSession(sessionId: string): Promise<void> {
  if (!sessionId) {
    return;
  }

  await ensureSessionsDir();

  if (!existsSync(SESSIONS_FILE)) {
    return;
  }

  return withLock(async () => {
    const sessions = await loadSessions();
    delete sessions[sessionId];
    await saveSessions(sessions);

    if (process.env.DEBUGGER) {
      console.log("[Session] Deleted session:", {
        sessionId: sessionId.substring(0, 10) + "...",
      });
    }
  });
}

export async function cleanExpiredSessions(): Promise<void> {
  await ensureSessionsDir();

  if (!existsSync(SESSIONS_FILE)) {
    return;
  }

  return withLock(async () => {
    const sessions = await loadSessions();
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, session] of Object.entries(sessions)) {
      const expiresAt = new Date(session.expiresAt);
      if (now > expiresAt) {
        delete sessions[sessionId];
        cleaned++;
      }
    }

    if (cleaned > 0) {
      await saveSessions(sessions);
      if (process.env.DEBUGGER) {
        console.log(`[Session] Cleaned ${cleaned} expired sessions`);
      }
    }
  });
}
