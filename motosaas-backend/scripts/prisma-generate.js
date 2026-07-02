const { spawnSync } = require("child_process");
const path = require("path");

const BLOCKED_PROXY_PATTERNS = [
  "127.0.0.1:9",
  "localhost:9"
];

const proxyVars = [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "ALL_PROXY",
  "http_proxy",
  "https_proxy",
  "all_proxy",
  "GIT_HTTP_PROXY",
  "GIT_HTTPS_PROXY"
];

const env = { ...process.env };
const clearedVars = [];

for (const key of proxyVars) {
  const value = env[key];
  if (!value) {
    continue;
  }

  if (BLOCKED_PROXY_PATTERNS.some((pattern) => value.includes(pattern))) {
    delete env[key];
    clearedVars.push(key);
  }
}

if (clearedVars.length > 0) {
  console.log(
    `[prisma-generate] Ignorando proxies locales invalidos para generar Prisma: ${clearedVars.join(", ")}`
  );
}

const prismaCli = require.resolve("prisma/build/index.js");
const result = spawnSync(process.execPath, [prismaCli, "generate"], {
  cwd: path.resolve(__dirname, ".."),
  env,
  stdio: "inherit"
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
