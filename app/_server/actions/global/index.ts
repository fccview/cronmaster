"use server";

import { existsSync, readFileSync } from "fs";

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