// Local-only Neon SQL-over-HTTP proxy for development.
//
// The Pokermon app talks to Postgres through @neondatabase/serverless
// (drizzle-orm/neon-http). That driver POSTs queries to an HTTPS "/sql"
// endpoint instead of using a TCP Postgres connection. In production that
// endpoint is Neon's cloud; for local development this tiny proxy implements
// the same HTTP contract and forwards the queries to a plain local Postgres.
//
// The app is used unmodified: the driver's default fetch endpoint rewrites the
// first label of the DATABASE_URL host to "api." (e.g. pg.pokermon.local ->
// api.pokermon.local) and always uses https://<host>/sql. We map that host to
// 127.0.0.1 (via /etc/hosts) and serve TLS here on port 443.

import https from "node:https";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import pg from "pg";
import { WebSocketServer } from "ws";

const { Pool } = pg;

const PORT = Number(process.env.NEON_PROXY_PORT || 443);
const PG_URL =
  process.env.NEON_PROXY_PG_URL ||
  "postgres://pokermon:pokermon@127.0.0.1:5432/pokermon";

const CERT_DIR =
  process.env.NEON_PROXY_CERT_DIR ||
  path.join(os.homedir(), ".config", "pokermon-neon-proxy");
const CERT_FILE = path.join(CERT_DIR, "proxy.crt");
const KEY_FILE = path.join(CERT_DIR, "proxy.key");

// Postgres OIDs that arrive as JSON/array/etc. text; we forward the raw text
// exactly as Postgres emits it and let the neon driver parse client-side
// (it always requests Neon-Raw-Text-Output).
const IDENTITY_TYPES = { getTypeParser: () => (value) => value };

function ensureCerts() {
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) return;
  fs.mkdirSync(CERT_DIR, { recursive: true });
  // Self-signed cert covering the hostnames the driver may connect to.
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      KEY_FILE,
      "-out",
      CERT_FILE,
      "-days",
      "3650",
      "-subj",
      "/CN=api.pokermon.local",
      "-addext",
      "subjectAltName=DNS:api.pokermon.local,DNS:pg.pokermon.local,DNS:localhost,IP:127.0.0.1",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
    ],
    { stdio: "inherit" },
  );
  console.log(`[neon-proxy] generated self-signed cert at ${CERT_FILE}`);
}

const pool = new Pool({ connectionString: PG_URL, max: 20 });

// Local Postgres host/port used by the WebSocket tunnel when no ?address is
// supplied (drizzle-kit push / studio and the neon-serverless WS driver).
const LOCAL_PG = (() => {
  try {
    const u = new URL(PG_URL);
    return { host: u.hostname || "127.0.0.1", port: Number(u.port || 5432) };
  } catch {
    return { host: "127.0.0.1", port: 5432 };
  }
})();

function serialize(result, arrayMode) {
  return {
    command: result.command,
    rowCount: result.rowCount,
    rows: result.rows,
    fields: (result.fields || []).map((f) => ({
      name: f.name,
      tableID: f.tableID,
      columnID: f.columnID,
      dataTypeID: f.dataTypeID,
      dataTypeSize: f.dataTypeSize,
      dataTypeModifier: f.dataTypeModifier,
      format: f.format,
    })),
    rowAsArray: arrayMode,
  };
}

async function runSingle(client, q, arrayMode) {
  const result = await client.query({
    text: q.query,
    values: q.params ?? [],
    rowMode: arrayMode ? "array" : undefined,
    types: IDENTITY_TYPES,
  });
  return serialize(result, arrayMode);
}

function pgErrorBody(err) {
  return {
    message: err.message,
    code: err.code,
    detail: err.detail,
    hint: err.hint,
    position: err.position,
    internalPosition: err.internalPosition,
    internalQuery: err.internalQuery,
    where: err.where,
    schema: err.schema,
    table: err.table,
    column: err.column,
    dataType: err.dataType,
    constraint: err.constraint,
    file: err.file,
    line: err.line,
    routine: err.routine,
    severity: err.severity,
  };
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

async function handleSql(req, res) {
  const arrayMode = req.headers["neon-array-mode"] === "true";
  let body;
  try {
    body = await readJson(req);
  } catch {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ message: "Invalid JSON body" }));
    return;
  }

  try {
    if (Array.isArray(body.queries)) {
      // Batched queries run inside a single transaction, mirroring Neon.
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const results = [];
        for (const q of body.queries) {
          results.push(await runSingle(client, q, arrayMode));
        }
        await client.query("COMMIT");
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ results }));
      } catch (err) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* ignore */
        }
        throw err;
      } finally {
        client.release();
      }
    } else {
      const result = await runSingle(pool, body, arrayMode);
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(result));
    }
  } catch (err) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify(pgErrorBody(err)));
  }
}

async function main() {
  ensureCerts();
  await pool.query("select 1");

  const server = https.createServer(
    { cert: fs.readFileSync(CERT_FILE), key: fs.readFileSync(KEY_FILE) },
    (req, res) => {
      if (req.method === "POST" && req.url.startsWith("/sql")) {
        handleSql(req, res);
        return;
      }
      if (req.method === "GET" && req.url === "/health") {
        res.writeHead(200, { "content-type": "text/plain" });
        res.end("ok");
        return;
      }
      res.writeHead(404);
      res.end();
    },
  );

  // WebSocket tunnel for the neon-serverless (WS) transport, used by
  // drizzle-kit push/studio and any Pool/Client usage. It pipes the raw
  // Postgres wire protocol between the WebSocket and a local TCP connection.
  const wss = new WebSocketServer({ server, path: "/v2" });
  wss.on("connection", (ws, req) => {
    let target = { ...LOCAL_PG };
    try {
      const addr = new URL(req.url, "http://x").searchParams.get("address");
      if (addr) {
        const [h, p] = addr.split(":");
        target = { host: h || LOCAL_PG.host, port: Number(p) || LOCAL_PG.port };
      }
    } catch {
      /* use default target */
    }

    const tcp = net.connect(target.port, target.host);
    const pending = [];
    let tcpReady = false;

    tcp.on("connect", () => {
      tcpReady = true;
      for (const chunk of pending) tcp.write(chunk);
      pending.length = 0;
    });
    tcp.on("data", (data) => {
      if (ws.readyState === ws.OPEN) ws.send(data);
    });
    tcp.on("close", () => ws.close());
    tcp.on("error", () => ws.close());

    ws.on("message", (data) => {
      const buf = Buffer.isBuffer(data) ? data : Buffer.from(data);
      if (tcpReady) tcp.write(buf);
      else pending.push(buf);
    });
    ws.on("close", () => tcp.destroy());
    ws.on("error", () => tcp.destroy());
  });

  server.listen(PORT, () => {
    console.log(
      `[neon-proxy] listening on https://api.pokermon.local:${PORT} ` +
        `(HTTP /sql + WS /v2) -> ${PG_URL}`,
    );
  });
}

const isMain = process.argv[1] === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((err) => {
    console.error("[neon-proxy] failed to start:", err);
    process.exit(1);
  });
}
