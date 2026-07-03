import { validateMockData } from "../src/lib/categories/validate-data";

const issues = validateMockData();

if (issues.length === 0) {
  console.log("validate-data: OK — no issues found");
  process.exit(0);
}

console.error(`validate-data: ${issues.length} issue(s) found:\n`);
for (const issue of issues) {
  console.error(`  [${issue.code}] ${issue.slug}: ${issue.message}`);
}
process.exit(1);
