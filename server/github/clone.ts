import simpleGit from "simple-git";
import fs from "fs/promises";

const git = simpleGit();

export async function cloneRepository(
  repoUrl: string,
  localPath: string,
): Promise<string> {
  try {
    await fs.rm(localPath, { recursive: true, force: true });
    await fs.mkdir(localPath, { recursive: true });
    await git.clone(repoUrl, localPath);
    return localPath;
  } catch (error) {
    console.error(`Failed to clone repository: ${repoUrl}`, error);
    throw error;
  }
}
