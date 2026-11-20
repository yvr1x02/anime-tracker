// Looks for the AniList client secret of .env.local in the repository: files git tracks or would
// add, and the whole history. Prints only where it was found, never the value (ADR-0004, point 7).
// Usage: npm run check:secret
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

let env;
try {
  env = readFileSync(".env.local", "utf8");
} catch {
  console.error("Manca .env.local: niente da controllare.");
  process.exit(2);
}

const line = env.split(/\r?\n/).find((entry) => entry.startsWith("ANILIST_CLIENT_SECRET="));
const secret = line
  ?.slice("ANILIST_CLIENT_SECRET=".length)
  .trim()
  .replace(/^(["'])(.*)\1$/, "$2");
if (!secret) {
  console.error("ANILIST_CLIENT_SECRET non è impostato in .env.local.");
  process.exit(2);
}

const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });

// Tracked files plus untracked ones that .gitignore would not stop.
const files = git("ls-files", "-z", "--cached", "--others", "--exclude-standard").split("\0").filter(Boolean);
const inFiles = files.filter((file) => {
  try {
    return readFileSync(file, "utf8").includes(secret);
  } catch {
    return false; // deleted but still in the index
  }
});

// Every commit on every branch: patches and messages.
const inHistory = git("log", "--all", "-p", "--no-color", "--no-textconv", "--format=%H%n%B").includes(secret);

if (inFiles.length === 0 && !inHistory) {
  console.log("Il client secret non compare nei file del repository né nella cronologia.");
} else {
  for (const file of inFiles) console.error(`Il client secret compare in: ${file}`);
  if (inHistory) console.error("Il client secret compare nella cronologia di git.");
  process.exit(1);
}
