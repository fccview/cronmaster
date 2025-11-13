"use server";

import { existsSync, readFileSync } from "fs";
import { execSync } from "child_process";

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

export const getHostDataPath = async (): Promise<string | null> => {
  try {
    const docker = await isDocker();
    if (!docker) {
      return null;
    }

    const containerId = await getContainerIdentifier();
    if (!containerId) {
      return null;
    }

    const stdout = execSync(
      `docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/data"}}{{.Source}}{{end}}{{end}}' ${containerId}`,
      { encoding: "utf8" }
    );

    const hostPath = stdout.trim();
    return hostPath || null;
  } catch (error) {
    console.error("Failed to get host data path:", error);
    return null;
  }
};

export const getHostScriptsPath = async (): Promise<string | null> => {
  try {
    const docker = await isDocker();
    if (!docker) {
      return null;
    }

    const containerId = await getContainerIdentifier();
    if (!containerId) {
      return null;
    }

    const stdout = execSync(
      `docker inspect --format '{{range .Mounts}}{{if eq .Destination "/app/scripts"}}{{.Source}}{{end}}{{end}}' ${containerId}`,
      { encoding: "utf8" }
    );

    const hostPath = stdout.trim();
    return hostPath || null;
  } catch (error) {
    console.error("Failed to get host scripts path:", error);
    return null;
  }
};
