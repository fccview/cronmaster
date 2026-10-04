"use server";

import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import path from "path";
import { createLogger } from "@/app/_utils/logger";

const log = createLogger("host");

export const isDocker = async (): Promise<boolean> => {
  try {
    if (existsSync("/.dockerenv")) {
      return true;
    }

    if (existsSync("/proc/1/cgroup")) {
      const cgroupContent = readFileSync("/proc/1/cgroup", "utf8");
      return cgroupContent.includes("/docker/");
    }

    return false;
  } catch (error) {
    return false;
  }
};

export const getContainerIdentifier = async (): Promise<string | null> => {
  try {
    const docker = await isDocker();
    if (!docker) {
      return null;
    }

    const containerId = execSync("hostname").toString().trim();
    return containerId;
  } catch (error) {
    console.error("Failed to get container identifier:", error);
    return null;
  }
};

const readHostPathEnv = (name: string): string | null => {
  const value = process.env[name]?.trim();
  if (!value) {
    return null;
  }

  if (!path.posix.isAbsolute(value)) {
    log.warn(`Ignoring ${name}, it must be an absolute host path`, { value });
    return null;
  }

  return path.posix.normalize(value).replace(/(.)\/+$/, "$1");
};

const inspectMountSource = async (
  destination: string
): Promise<string | null> => {
  try {
    const containerId = await getContainerIdentifier();
    if (!containerId) {
      return null;
    }

    const stdout = execSync(
      `docker inspect --format '{{range .Mounts}}{{if eq .Destination "${destination}"}}{{.Source}}{{end}}{{end}}' ${containerId}`,
      { encoding: "utf8" }
    );

    return stdout.trim() || null;
  } catch (error) {
    log.error(`Failed to inspect the host path mounted at ${destination}`, error);
    return null;
  }
};

const resolveHostPath = async (
  overrideEnv: string,
  destination: string,
  projectSubdir: string
): Promise<string | null> => {
  const docker = await isDocker();
  if (!docker) {
    return null;
  }

  const override = readHostPathEnv(overrideEnv);
  if (override) {
    return override;
  }

  const inspected = await inspectMountSource(destination);
  if (inspected) {
    return inspected;
  }

  const projectDir = readHostPathEnv("HOST_PROJECT_DIR");
  if (projectDir) {
    return path.posix.join(projectDir, projectSubdir);
  }

  return null;
};

export const getHostDataPath = async (): Promise<string | null> => {
  return await resolveHostPath("HOST_DATA_DIR", "/app/data", "data");
};

export const getHostScriptsPath = async (): Promise<string | null> => {
  return await resolveHostPath("HOST_SCRIPTS_DIR", "/app/scripts", "scripts");
};
