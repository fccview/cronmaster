export const WRITE_CRONTAB = (content: string, user: string) => {
  return `crontab -u ${user} - << 'EOF'\n${content}\nEOF`;
};

export const READ_CRONTAB = (user: string) =>
  `crontab -l -u ${user} 2>/dev/null || echo ""`;

export const READ_CRON_FILE = () => 'crontab -l 2>/dev/null || echo ""';

export const WRITE_CRON_FILE = (content: string) => {
  return `crontab - << 'EOF'\n${content}\nEOF`;
};

export const WRITE_HOST_CRONTAB = (base64Content: string, user: string) => {
  const escapedContent = base64Content.replace(/'/g, "'\\''");
  return `echo '${escapedContent}' | base64 -d | crontab -u ${user} -`;
};

export const ID_U = (username: string) => `id -u ${username}`;

export const ID_G = (username: string) => `id -g ${username}`;

export const MAKE_SCRIPT_EXECUTABLE = (scriptPath: string) =>
  `chmod +x "${scriptPath}"`;

export const RUN_SCRIPT = (scriptPath: string) => `bash "${scriptPath}"`;

export const GET_TARGET_USER = `getent passwd | grep ":/home/" | head -1 | cut -d: -f1`;

export const GET_DOCKER_SOCKET_OWNER = 'stat -c "%U" /var/run/docker.sock';

export const READ_CRONTABS_DIRECTORY = `ls /var/spool/cron/crontabs/ 2>/dev/null || echo ''`;
