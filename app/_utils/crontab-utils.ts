import {
  GET_DOCKER_SOCKET_OWNER,
  GET_TARGET_USER,
  GET_USER_SHELL,
  ID_G,
  ID_U,
  READ_CRONTAB,
  READ_CRONTABS_DIRECTORY,
  WRITE_HOST_CRONTAB,
} from "@/app/_consts/commands";
import { NSENTER_HOST_CRONTAB } from "@/app/_consts/nsenter";
import { assertSafeUsername } from "@/app/_utils/security-utils";
import { exec } from "child_process";
import { promisify } from "util";
import { commandFailure, createLogger } from "@/app/_utils/logger";

const log = createLogger("crontab");

const execAsync = promisify(exec);

export interface UserInfo {
  username: string;
  uid: number;
  gid: number;
}

const execHostCrontab = async (command: string): Promise<string> => {
  try {
    const { stdout } = await execAsync(NSENTER_HOST_CRONTAB(command?.trim()));
    return stdout;
  } catch (error: unknown) {
    log.error("Error executing host crontab command", commandFailure(error));
    log.debug("Host crontab command failure details", error);
    throw error;
  }
};

const getTargetUser = async (): Promise<string> => {
  try {
    if (process.env.HOST_CRONTAB_USER) {
      log.debug("Target user from HOST_CRONTAB_USER", {
        user: process.env.HOST_CRONTAB_USER,
      });
      return process.env.HOST_CRONTAB_USER;
    }

    const { stdout } = await execAsync(GET_DOCKER_SOCKET_OWNER);
    const dockerSocketOwner = stdout.trim();

    if (dockerSocketOwner === "root") {
      try {
        const targetUser = await execHostCrontab(GET_TARGET_USER);
        if (targetUser) {
          log.debug("Target user detected from host passwd", {
            user: targetUser.trim(),
          });
          return targetUser.trim();
        }
      } catch (error) {
        log.warn("Could not detect user from passwd", error);
      }

      return "root";
    }

    log.debug("Target user from docker socket owner", { user: dockerSocketOwner });
    return dockerSocketOwner;
  } catch (error) {
    log.error("Error detecting target user", error);
    return "root";
  }
};

export const getAllTargetUsers = async (): Promise<string[]> => {
  try {
    if (process.env.HOST_CRONTAB_USER) {
      return process.env.HOST_CRONTAB_USER.split(",").map((u) => u.trim());
    }

    try {
      const stdout = await execHostCrontab(READ_CRONTABS_DIRECTORY);

      const users = stdout
        .trim()
        .split("\n")
        .filter((user) => user.trim());

      log.debug("Detected crontab users", { users });
      return users.length > 0 ? users : ["root"];
    } catch (error) {
      log.error("Error detecting users from crontabs directory", error);
      return ["root"];
    }
  } catch (error) {
    log.error("Error getting all target users", error);
    return ["root"];
  }
};

export const readHostCrontab = async (): Promise<string> => {
  try {
    const user = await getTargetUser();
    log.debug("Reading host crontab", { user });
    return await execHostCrontab(READ_CRONTAB(user));
  } catch (error) {
    log.error("Error reading host crontab", error);
    return "";
  }
};

export const readAllHostCrontabs = async (): Promise<
  { user: string; content: string }[]
> => {
  try {
    const users = await getAllTargetUsers();
    const results: { user: string; content: string }[] = [];

    for (const user of users) {
      try {
        const content = await execHostCrontab(READ_CRONTAB(user));
        log.debug("Read crontab", { user, bytes: content.length });
        results.push({ user, content });
      } catch (error) {
        log.warn(`Error reading crontab for user ${user}`, error);
        results.push({ user, content: "" });
      }
    }

    return results;
  } catch (error) {
    log.error("Error reading all host crontabs", error);
    return [];
  }
};

export const writeHostCrontab = async (content: string): Promise<boolean> => {
  try {
    const user = await getTargetUser();
    let finalContent = content;
    if (!finalContent.endsWith("\n")) {
      finalContent += "\n";
    }

    const base64Content = Buffer.from(finalContent).toString("base64");
    await execHostCrontab(WRITE_HOST_CRONTAB(base64Content, user));
    log.debug("Wrote host crontab", { user, bytes: finalContent.length });
    return true;
  } catch (error) {
    log.error("Error writing host crontab", error);
    return false;
  }
};

export const writeHostCrontabForUser = async (
  user: string,
  content: string
): Promise<boolean> => {
  try {
    assertSafeUsername(user);
    let finalContent = content;
    if (!finalContent.endsWith("\n")) {
      finalContent += "\n";
    }

    const base64Content = Buffer.from(finalContent).toString("base64");
    await execHostCrontab(WRITE_HOST_CRONTAB(base64Content, user));
    log.debug("Wrote host crontab", { user, bytes: finalContent.length });
    return true;
  } catch (error) {
    log.error(`Error writing host crontab for user ${user}`, error);
    return false;
  }
};

export const getUserInfo = async (
  username: string
): Promise<UserInfo | null> => {
  try {
    assertSafeUsername(username);
    const uidResult = await execHostCrontab(ID_U(username));
    const gidResult = await execHostCrontab(ID_G(username));

    const uid = parseInt(uidResult.trim());
    const gid = parseInt(gidResult.trim());

    if (isNaN(uid) || isNaN(gid)) {
      log.error(`Invalid UID/GID for user ${username}`);
      return null;
    }

    return { username, uid, gid };
  } catch (error) {
    log.error(`Error getting user info for ${username}`, error);
    return null;
  }
};

export const getUserShell = async (username: string): Promise<string | null> => {
  try {
    const shell = (await execHostCrontab(GET_USER_SHELL(username))).trim();
    return shell || null;
  } catch {
    return null;
  }
};
