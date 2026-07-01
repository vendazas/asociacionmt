const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const roots = ["src", "prisma", "scripts"];
const files = [];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      collect(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(fullPath);
    }
  }
}

for (const root of roots) {
  const fullRoot = path.join(process.cwd(), root);
  if (fs.existsSync(fullRoot)) {
    collect(fullRoot);
  }
}

let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { stdio: "inherit" });
  if (result.status !== 0) {
    failed = true;
  }
}

process.exit(failed ? 1 : 0);
