import cronstrue from 'cronstrue/i18n';

export interface CronExplanation {
  humanReadable: string;
  nextRuns: string[];
  isValid: boolean;
  error?: string;
}

export const parseCronExpression = (expression: string, locale?: string): CronExplanation => {
  try {
    const cleanExpression = expression.trim();

    if (!cleanExpression) {
      return {
        humanReadable: "No expression provided",
        nextRuns: [],
        isValid: false,
        error: "Please enter a cron expression",
      };
    }

    const humanReadable = cronstrue.toString(cleanExpression, {
      verbose: true,
      throwExceptionOnParseError: false,
      locale: locale || "en",
    });

    return {
      humanReadable,
      nextRuns: [],
      isValid: true,
    };
  } catch (error) {
    return {
      humanReadable: "Invalid cron expression",
      nextRuns: [],
      isValid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export const cronPatterns = [
  {
    category: "Common Intervals",
    patterns: [
      {
        label: "Every Minute",
        value: "* * * * *",
        description: "Runs every minute of every hour",
      },
      {
        label: "Every 5 Minutes",
        value: "*/5 * * * *",
        description: "Runs every 5 minutes",
      },
      {
        label: "Every 15 Minutes",
        value: "*/15 * * * *",
        description: "Runs every 15 minutes",
      },
      {
        label: "Every 30 Minutes",
        value: "*/30 * * * *",
        description: "Runs every 30 minutes",
      },
      {
        label: "Every Hour",
        value: "0 * * * *",
        description: "Runs at the start of every hour",
      },
      {
        label: "Every 2 Hours",
        value: "0 */2 * * *",
        description: "Runs every 2 hours",
      },
      {
        label: "Every 6 Hours",
        value: "0 */6 * * *",
        description: "Runs every 6 hours",
      },
      {
        label: "Every 12 Hours",
        value: "0 */12 * * *",
        description: "Runs every 12 hours",
      },
    ],
  },
  {
    category: "Daily Schedules",
    patterns: [
      {
        label: "Daily at Midnight",
        value: "0 0 * * *",
        description: "Runs once per day at 12:00 AM",
      },
      {
        label: "Daily at 6 AM",
        value: "0 6 * * *",
        description: "Runs once per day at 6:00 AM",
      },
      {
        label: "Daily at 9 AM",
        value: "0 9 * * *",
        description: "Runs once per day at 9:00 AM",
      },
      {
        label: "Daily at 3 PM",
        value: "0 15 * * *",
        description: "Runs once per day at 3:00 PM",
      },
      {
        label: "Daily at 6 PM",
        value: "0 18 * * *",
        description: "Runs once per day at 6:00 PM",
      },
      {
        label: "Daily at 11 PM",
        value: "0 23 * * *",
        description: "Runs once per day at 11:00 PM",
      },
    ],
  },
  {
    category: "Weekly Schedules",
    patterns: [
      {
        label: "Weekly on Sunday",
        value: "0 0 * * 0",
        description: "Runs once per week on Sunday at 12:00 AM",
      },
      {
        label: "Weekly on Monday",
        value: "0 0 * * 1",
        description: "Runs once per week on Monday at 12:00 AM",
      },
      {
        label: "Weekdays Only",
        value: "0 9 * * 1-5",
        description: "Runs weekdays at 9:00 AM",
      },
      {
        label: "Weekends Only",
        value: "0 9 * * 0,6",
        description: "Runs weekends at 9:00 AM",
      },
      {
        label: "Every Monday",
        value: "0 9 * * 1",
        description: "Runs every Monday at 9:00 AM",
      },
      {
        label: "Every Friday",
        value: "0 17 * * 5",
        description: "Runs every Friday at 5:00 PM",
      },
    ],
  },
  {
    category: "Monthly Schedules",
    patterns: [
      {
        label: "Monthly on 1st",
        value: "0 0 1 * *",
        description: "Runs once per month on the 1st at 12:00 AM",
      },
      {
        label: "Monthly on 15th",
        value: "0 0 15 * *",
        description: "Runs once per month on the 15th at 12:00 AM",
      },
      {
        label: "Monthly on Last Day",
        value: "0 0 L * *",
        description: "Runs once per month on the last day at 12:00 AM",
      },
      {
        label: "Monthly on 1st & 15th",
        value: "0 0 1,15 * *",
        description: "Runs twice per month on 1st and 15th at 12:00 AM",
      },
    ],
  },
  {
    category: "Advanced Patterns",
    patterns: [
      {
        label: "Every 2 Minutes",
        value: "*/2 * * * *",
        description: "Runs every 2 minutes",
      },
      {
        label: "Every 10 Minutes",
        value: "*/10 * * * *",
        description: "Runs every 10 minutes",
      },
      {
        label: "Every 3 Hours",
        value: "0 */3 * * *",
        description: "Runs every 3 hours",
      },
      {
        label: "Every 4 Hours",
        value: "0 */4 * * *",
        description: "Runs every 4 hours",
      },
      {
        label: "Every 8 Hours",
        value: "0 */8 * * *",
        description: "Runs every 8 hours",
      },
      {
        label: "Twice Daily",
        value: "0 9,18 * * *",
        description: "Runs twice per day at 9 AM and 6 PM",
      },
      {
        label: "Business Hours",
        value: "0 9-17 * * 1-5",
        description: "Runs every hour during business hours on weekdays",
      },
      {
        label: "Quarterly",
        value: "0 0 1 */3 *",
        description: "Runs once per quarter on the 1st at 12:00 AM",
      },
    ],
  },
];
