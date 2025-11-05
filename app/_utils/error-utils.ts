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

export const getJobErrors = (): JobError[] => {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
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
  } catch { }
};

export const removeJobError = (errorId: string) => {
  if (typeof window === "undefined") return;

  try {
    const errors = getJobErrors();
    const filtered = errors.filter((e) => e.id !== errorId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch { }
};

export const getJobErrorsByJobId = (jobId: string): JobError[] => {
  return getJobErrors().filter((error) => error.jobId === jobId);
};

export const clearAllJobErrors = () => {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { }
};
