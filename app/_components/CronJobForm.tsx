"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Plus, Clock, Terminal, MessageSquare, Sparkles } from "lucide-react";
import { createCronJob } from "@/app/_server/actions/cronjobs";
import { useState } from "react";
import { showToast } from "./ui/Toast";

const schedulePresets = [
  {
    label: "Every Minute",
    value: "* * * * *",
    description: "Runs every minute",
  },
  {
    label: "Every Hour",
    value: "0 * * * *",
    description: "Runs at the start of every hour",
  },
  {
    label: "Daily at Midnight",
    value: "0 0 * * *",
    description: "Runs once per day at 12:00 AM",
  },
  {
    label: "Weekly on Sunday",
    value: "0 0 * * 0",
    description: "Runs once per week on Sunday at 12:00 AM",
  },
  {
    label: "Monthly",
    value: "0 0 1 * *",
    description: "Runs once per month on the 1st at 12:00 AM",
  },
  {
    label: "Every 5 Minutes",
    value: "*/5 * * * *",
    description: "Runs every 5 minutes",
  },
  {
    label: "Every 30 Minutes",
    value: "*/30 * * * *",
    description: "Runs every 30 minutes",
  },
  {
    label: "Weekdays Only",
    value: "0 9 * * 1-5",
    description: "Runs weekdays at 9:00 AM",
  },
];

export function CronJobForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    schedule: "",
    command: "",
    comment: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const form = new FormData();
      form.append("schedule", formData.schedule);
      form.append("command", formData.command);
      form.append("comment", formData.comment);

      const result = await createCronJob(form);
      if (result.success) {
        showToast("success", "Cron job created successfully!");
        setFormData({ schedule: "", command: "", comment: "" });
      } else {
        showToast("error", "Failed to create cron job", result.message);
      }
    } catch (error) {
      showToast(
        "error",
        "Failed to create cron job",
        "Please try again later."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePresetClick = (preset: string) => {
    setFormData((prev) => ({ ...prev, schedule: preset }));
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 gradient-text">
          <Plus className="h-5 w-5" />
          Create New Cron Job
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Schedule Presets */}
          <div>
            <label className="block text-sm font-medium mb-3">
              Quick Schedule Presets
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {schedulePresets.map((preset) => (
                <Button
                  key={preset.value}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(preset.value)}
                  className="text-left h-auto p-3 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200"
                >
                  <div className="w-full">
                    <div className="font-medium text-sm">{preset.label}</div>
                    <div className="text-xs text-muted-foreground font-mono break-all">
                      {preset.value}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {preset.description}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Schedule */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              Schedule (Cron Expression)
            </label>
            <Input
              value={formData.schedule}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, schedule: e.target.value }))
              }
              placeholder="* * * * *"
              className="font-mono"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Format: minute hour day month weekday (e.g., "0 9 * * 1-5" for
              weekdays at 9 AM)
            </p>
          </div>

          {/* Command */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <Terminal className="h-4 w-4 inline mr-2" />
              Command
            </label>
            <Input
              value={formData.command}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, command: e.target.value }))
              }
              placeholder="/usr/bin/your-command"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              The command to execute (use absolute paths for best results)
            </p>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium mb-2">
              <MessageSquare className="h-4 w-4 inline mr-2" />
              Comment (Optional)
            </label>
            <Input
              value={formData.comment}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, comment: e.target.value }))
              }
              placeholder="What does this job do? (e.g., 'Backup database')"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Add a description to help you remember what this job does
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="glow-primary min-w-[140px]"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Create Job
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
