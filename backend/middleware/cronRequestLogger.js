import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, "..", "logs");
const LOG_FILE = path.join(LOG_DIR, "cron_requests.log");

const LOG_MAX_BYTES = Number(process.env.CRON_LOG_MAX_BYTES || 5 * 1024 * 1024);
const LOG_RETENTION_FILES = Number(process.env.CRON_LOG_RETENTION_FILES || 7);

const maskSecret = (value) => {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 8) return `${text[0] || ""}***${text[text.length - 1] || ""}`;
  return `${text.slice(0, 4)}...${text.slice(-4)}`;
};

const bodyInfo = (body) => {
  if (!body) return { bodyLength: 0 };
  try {
    const serialized = JSON.stringify(body);
    return {
      bodyLength: Buffer.byteLength(serialized, "utf8"),
      body,
    };
  } catch (_err) {
    return { bodyLength: -1 };
  }
};

const rotateIfNeeded = async () => {
  try {
    const stat = await fs.stat(LOG_FILE);
    if (stat.size < LOG_MAX_BYTES) return;

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const rotated = path.join(LOG_DIR, `cron_requests.${stamp}.log`);
    await fs.rename(LOG_FILE, rotated);

    const files = await fs.readdir(LOG_DIR);
    const rotatedFiles = files
      .filter((name) => /^cron_requests\.\d{4}-\d{2}-\d{2}T/.test(name))
      .map((name) => path.join(LOG_DIR, name));

    const withStats = await Promise.all(
      rotatedFiles.map(async (filePath) => {
        try {
          const fileStat = await fs.stat(filePath);
          return { filePath, mtimeMs: fileStat.mtimeMs };
        } catch (_err) {
          return null;
        }
      })
    );

    const sorted = withStats
      .filter(Boolean)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    const toDelete = sorted.slice(LOG_RETENTION_FILES);
    await Promise.all(
      toDelete.map(async (entry) => {
        try {
          await fs.unlink(entry.filePath);
        } catch (_err) {
          // fail-safe
        }
      })
    );
  } catch (_err) {
    // fail-safe
  }
};

const appendLogLine = async (entry) => {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
    await rotateIfNeeded();
    await fs.appendFile(LOG_FILE, `${JSON.stringify(entry)}\n`, "utf8");
  } catch (_err) {
    // fail-safe
  }
};

export const cronRequestLogger = (req, res, next) => {
  const startedAt = new Date();
  const requestMeta = {
    timestamp: startedAt.toISOString(),
    method: req.method,
    path: req.originalUrl || req.path,
    ip: req.ip || null,
    forwardedFor: req.headers["x-forwarded-for"] || null,
    userAgent: req.get("user-agent") || null,
    cronSecretMasked: maskSecret(req.headers["x-cron-secret"]),
    ...bodyInfo(req.body),
  };

  res.on("finish", () => {
    const finalEntry = {
      ...requestMeta,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt.getTime(),
    };

    console.info("[cron-request]", finalEntry);
    void appendLogLine(finalEntry);
  });

  next();
};
