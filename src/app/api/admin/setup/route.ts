import { NextResponse } from "next/server";
import { checkSetupHealth } from "@/lib/setup/health";
import { execSync } from "child_process";

export async function GET() {
  const health = await checkSetupHealth();

  try {
    const branch = execSync("git branch --show-current", { encoding: "utf-8" }).trim();
    health.gitBranch = branch;
    const remote = execSync("git remote -v", { encoding: "utf-8" }).trim();
    health.gitRemoteConfigured = remote.length > 0;
    if (!health.gitRemoteConfigured) {
      health.gitRemoteInstructions = "git remote add origin <repo-url>\ngit push -u origin main";
    } else {
      health.gitRemoteInstructions = null;
    }
  } catch {
    // git not available
  }

  return NextResponse.json(health);
}
