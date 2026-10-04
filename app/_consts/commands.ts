import { shellQuote } from "@/app/_utils/shell-utils";

export const WRITE_CRONTAB = (content: string, user: string) => {
  return `crontab -u ${shellQuote(user)} - << 'EOF'\n${content}\nEOF`;
};

export const READ_CRONTAB = (user: string) =>
  `crontab -l -u ${shellQuote(user)} 2>/dev/null || echo ""`;

export const READ_CRON_FILE = () => 'crontab -l 2>/dev/null || echo ""';

export const WRITE_CRON_FILE = (content: string) => {
  return `crontab - << 'EOF'\n${content}\nEOF`;
};

export const WRITE_HOST_CRONTAB = (base64Content: string, user: string) => {
  return `echo ${shellQuote(base64Content)} | base64 -d | crontab -u ${shellQuote(user)} -`;
};

export const ID_U = (username: string) => `id -u ${shellQuote(username)}`;

export const GET_USER_SHELL = (username: string) =>
  `getent passwd ${shellQuote(username)} | cut -d: -f7`;

export const ID_G = (username: string) => `id -g ${shellQuote(username)}`;

export const MAKE_SCRIPT_EXECUTABLE = (scriptPath: string) =>
  `chmod +x "${scriptPath}"`;

export const RUN_SCRIPT = (scriptPath: string) => `bash "${scriptPath}"`;

export const GET_TARGET_USER = `getent passwd | grep ":/home/" | head -1 | cut -d: -f1`;

export const GET_DOCKER_SOCKET_OWNER = 'stat -c "%U" /var/run/docker.sock';

export const READ_CRONTABS_DIRECTORY = `ls /var/spool/cron/crontabs/ 2>/dev/null || echo ''`;
