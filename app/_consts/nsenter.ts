export const NSENTER_RUN_JOB = (executionUser: string, escapedCommand: string) => `nsenter -t 1 -m -u -i -n -p su - ${executionUser} -c '${escapedCommand}'`;

export const NSENTER_HOST_CRONTAB = (command: string) => `nsenter -t 1 -m -u -i -n -p sh -c "${command}"`;