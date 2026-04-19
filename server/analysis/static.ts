import { ESLint } from "eslint";

export async function analyzeCode(
  localPath: string,
): Promise<ESLint.LintResult[]> {
  const eslint = new ESLint({
    cwd: localPath,
  });

  const results = await eslint.lintFiles(["."]);
  return results;
}
