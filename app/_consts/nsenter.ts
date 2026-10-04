import { shellQuote } from "@/app/_utils/shell-utils";

export const NSENTER_RUN_JOB = (
  executionUser: string,
  command: string,
  shell?: string
) =>
  `nsenter -t 1 -m -u -i -n -p su${
    shell ? ` -s ${shellQuote(shell)}` : ""
  } - ${shellQuote(executionUser)} -c ${shellQuote(command)}`;

export const NSENTER_HOST_CRONTAB = (command: string) =>
  `nsenter -t 1 -m -u -i -n -p sh -c ${shellQuote(command)}`;
