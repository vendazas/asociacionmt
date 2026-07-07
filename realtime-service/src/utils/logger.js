function serializeContext(context) {
  if (!context) {
    return "";
  }

  if (typeof context === "string") {
    return context;
  }

  try {
    return JSON.stringify(context);
  } catch (_error) {
    return String(context);
  }
}

function write(level, message, context) {
  const timestamp = new Date().toISOString();
  const suffix = serializeContext(context);
  const line = suffix ? `[${timestamp}] ${level} ${message} ${suffix}` : `[${timestamp}] ${level} ${message}`;

  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info: (message, context) => write("INFO", message, context),
  warn: (message, context) => write("WARN", message, context),
  error: (message, context) => write("ERROR", message, context)
};
