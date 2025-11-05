export const WRITE_CRONTAB = (content: string, user: string) => `echo '${content}' | crontab -u ${user} -`;

export const READ_CRONTAB = (user: string) => `crontab -l -u ${user} 2>/dev/null || echo ""`;

export const READ_CRON_FILE = () => 'crontab -l 2>/dev/null || echo ""'

export const WRITE_CRON_FILE = (content: string) => `echo "${content}" | crontab -`;

export const WRITE_HOST_CRONTAB = (base64Content: string, user: string) => `echo '${base64Content}' | base64 -d | crontab -u ${user} -`;

export const ID_U = (username: string) => `id -u ${username}`;

export const ID_G = (username: string) => `id -g ${username}`;

export const MAKE_SCRIPT_EXECUTABLE = (scriptPath: string) => `chmod +x "${scriptPath}"`;

export const RUN_SCRIPT = (scriptPath: string) => `bash "${scriptPath}"`;