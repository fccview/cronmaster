export interface JobError {
  id: string;
  title: string;
  message: string;
  details?: string;
  command?: string;
  output?: string;
  stderr?: string;
  timestamp: string;
  jobId: string;
}

const STORAGE_KEY = "cronmaster-job-errors";
const MAX_LOG_AGE_DAYS = parseInt(
  process.env.NEXT_PUBLIC_MAX_LOG_AGE_DAYS || "30",
  10
);

/**
 * Clean up old errors from localStorage based on MAX_LOG_AGE_DAYS.
 * This is called automatically when getting errors.
 */
const cleanupOldErrors = (errors: JobError[]): JobError[] => {
  const maxAgeMs = MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  return errors.filter((error) => {
    try {
      const errorTime = new Date(error.timestamp).getTime();
      const age = now - errorTime;
      return age < maxAgeMs;
    } catch {
      return true;
    }
  });
};

export const getJobErrors = (): JobError[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const errors = stored ? JSON.parse(stored) : [];

    const cleanedErrors = cleanupOldErrors(errors);

    if (cleanedErrors.length !== errors.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedErrors));
    }

    return cleanedErrors;
  } catch {
    return [];
  }
};

export const setJobError = (error: JobError) => {
  if (typeof window === "undefined") return;

  try {
    const errors = getJobErrors();
    const existingIndex = errors.findIndex((e) => e.id === error.id);

    if (existingIndex >= 0) {
      errors[existingIndex] = error;
    } else {
      errors.push(error);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(errors));
  } catch {}
};

export const removeJobError = (errorId: string) => {
  if (typeof window === "undefined") return;

  try {
    const errors = getJobErrors();
    const filtered = errors.filter((e) => e.id !== errorId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch {}
};

export const getJobErrorsByJobId = (jobId: string): JobError[] => {
  return getJobErrors().filter((error) => error.jobId === jobId);
};

export const clearAllJobErrors = () => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
};
