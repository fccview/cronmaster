import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import path from "path";
import { DATA_DIR } from "@/app/_consts/file";

export async function GET(request: NextRequest) {
  try {
    const officialScriptPath = path.join(
      process.cwd(),
      "app",
      "_scripts",
      "cron-log-wrapper.sh"
    );

    const dataScriptPath = path.join(
      process.cwd(),
      DATA_DIR,
      "cron-log-wrapper.sh"
    );

    if (!existsSync(dataScriptPath)) {
      return NextResponse.json({ modified: false });
    }

    const officialScript = readFileSync(officialScriptPath, "utf-8");
    const dataScript = readFileSync(dataScriptPath, "utf-8");

    const modified = officialScript !== dataScript;

    return NextResponse.json({ modified });
  } catch (error) {
    console.error("Error checking wrapper script:", error);
    return NextResponse.json(
      { error: "Failed to check wrapper script" },
      { status: 500 }
    );
  }
}
