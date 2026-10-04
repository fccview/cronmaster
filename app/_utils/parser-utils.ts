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
    id: "commonIntervals",
    category: "Common Intervals",
    patterns: [
      {
        id: "everyMinute",
        label: "Every Minute",
        value: "* * * * *",
        description: "Runs every minute of every hour",
      },
      {
        id: "every5Minutes",
        label: "Every 5 Minutes",
        value: "*/5 * * * *",
        description: "Runs every 5 minutes",
      },
      {
        id: "every15Minutes",
        label: "Every 15 Minutes",
        value: "*/15 * * * *",
        description: "Runs every 15 minutes",
      },
      {
        id: "every30Minutes",
        label: "Every 30 Minutes",
        value: "*/30 * * * *",
        description: "Runs every 30 minutes",
      },
      {
        id: "everyHour",
        label: "Every Hour",
        value: "0 * * * *",
        description: "Runs at the start of every hour",
      },
      {
        id: "every2Hours",
        label: "Every 2 Hours",
        value: "0 */2 * * *",
        description: "Runs every 2 hours",
      },
      {
        id: "every6Hours",
        label: "Every 6 Hours",
        value: "0 */6 * * *",
        description: "Runs every 6 hours",
      },
      {
        id: "every12Hours",
        label: "Every 12 Hours",
        value: "0 */12 * * *",
        description: "Runs every 12 hours",
      },
    ],
  },
  {
    id: "dailySchedules",
    category: "Daily Schedules",
    patterns: [
      {
        id: "dailyMidnight",
        label: "Daily at Midnight",
        value: "0 0 * * *",
        description: "Runs once per day at 12:00 AM",
      },
      {
        id: "daily6am",
        label: "Daily at 6 AM",
        value: "0 6 * * *",
        description: "Runs once per day at 6:00 AM",
      },
      {
        id: "daily9am",
        label: "Daily at 9 AM",
        value: "0 9 * * *",
        description: "Runs once per day at 9:00 AM",
      },
      {
        id: "daily3pm",
        label: "Daily at 3 PM",
        value: "0 15 * * *",
        description: "Runs once per day at 3:00 PM",
      },
      {
        id: "daily6pm",
        label: "Daily at 6 PM",
        value: "0 18 * * *",
        description: "Runs once per day at 6:00 PM",
      },
      {
        id: "daily11pm",
        label: "Daily at 11 PM",
        value: "0 23 * * *",
        description: "Runs once per day at 11:00 PM",
      },
    ],
  },
  {
    id: "weeklySchedules",
    category: "Weekly Schedules",
    patterns: [
      {
        id: "weeklySunday",
        label: "Weekly on Sunday",
        value: "0 0 * * 0",
        description: "Runs once per week on Sunday at 12:00 AM",
      },
      {
        id: "weeklyMonday",
        label: "Weekly on Monday",
        value: "0 0 * * 1",
        description: "Runs once per week on Monday at 12:00 AM",
      },
      {
        id: "weekdays",
        label: "Weekdays Only",
        value: "0 9 * * 1-5",
        description: "Runs weekdays at 9:00 AM",
      },
      {
        id: "weekends",
        label: "Weekends Only",
        value: "0 9 * * 0,6",
        description: "Runs weekends at 9:00 AM",
      },
      {
        id: "everyMonday",
        label: "Every Monday",
        value: "0 9 * * 1",
        description: "Runs every Monday at 9:00 AM",
      },
      {
        id: "everyFriday",
        label: "Every Friday",
        value: "0 17 * * 5",
        description: "Runs every Friday at 5:00 PM",
      },
    ],
  },
  {
    id: "monthlySchedules",
    category: "Monthly Schedules",
    patterns: [
      {
        id: "monthly1st",
        label: "Monthly on 1st",
        value: "0 0 1 * *",
        description: "Runs once per month on the 1st at 12:00 AM",
      },
      {
        id: "monthly15th",
        label: "Monthly on 15th",
        value: "0 0 15 * *",
        description: "Runs once per month on the 15th at 12:00 AM",
      },
      {
        id: "monthlyLastDay",
        label: "Monthly on Last Day",
        value: "0 0 L * *",
        description: "Runs once per month on the last day at 12:00 AM",
      },
      {
        id: "monthly1stAnd15th",
        label: "Monthly on 1st & 15th",
        value: "0 0 1,15 * *",
        description: "Runs twice per month on 1st and 15th at 12:00 AM",
      },
    ],
  },
  {
    id: "advancedPatterns",
    category: "Advanced Patterns",
    patterns: [
      {
        id: "every2Minutes",
        label: "Every 2 Minutes",
        value: "*/2 * * * *",
        description: "Runs every 2 minutes",
      },
      {
        id: "every10Minutes",
        label: "Every 10 Minutes",
        value: "*/10 * * * *",
        description: "Runs every 10 minutes",
      },
      {
        id: "every3Hours",
        label: "Every 3 Hours",
        value: "0 */3 * * *",
        description: "Runs every 3 hours",
      },
      {
        id: "every4Hours",
        label: "Every 4 Hours",
        value: "0 */4 * * *",
        description: "Runs every 4 hours",
      },
      {
        id: "every8Hours",
        label: "Every 8 Hours",
        value: "0 */8 * * *",
        description: "Runs every 8 hours",
      },
      {
        id: "twiceDaily",
        label: "Twice Daily",
        value: "0 9,18 * * *",
        description: "Runs twice per day at 9 AM and 6 PM",
      },
      {
        id: "businessHours",
        label: "Business Hours",
        value: "0 9-17 * * 1-5",
        description: "Runs every hour during business hours on weekdays",
      },
      {
        id: "quarterly",
        label: "Quarterly",
        value: "0 0 1 */3 *",
        description: "Runs once per quarter on the 1st at 12:00 AM",
      },
    ],
  },
];
