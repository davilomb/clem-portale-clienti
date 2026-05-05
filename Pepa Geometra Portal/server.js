const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const dataPath = path.join(root, "data", "db.json");
const sessions = new Map();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
};

function readDb() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeDb(db) {
  fs.writeFileSync(dataPath, `${JSON.stringify(db, null, 2)}\n`);
}

function sendJson(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function parseCookies(req) {
  return Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

function publicUser(user) {
  if (!user) return null;
  const { password, ...safe } = user;
  return safe;
}

function currentUser(req) {
  const sid = parseCookies(req).sid;
  if (!sid) return null;
  return sessions.get(sid) || null;
}

function isAdmin(user) {
  return user?.role === "Geometra";
}

function bodyJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        req.destroy();
        reject(new Error("Payload troppo grande"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function todayLabel() {
  return "05 Mag 2026";
}

function clientVisibleDb(db, user) {
  if (isAdmin(user)) return db;

  const projects = db.projects.filter((project) => project.clientId === user.clientId);
  const ids = new Set(projects.map((project) => project.id));
  return {
    users: [],
    clients: db.clients.filter((client) => client.id === user.clientId),
    projects,
    documents: db.documents.filter(
      (document) => ids.has(document.projectId) && document.visibility === "Cliente",
    ),
    timeline: db.timeline.filter((entry) => ids.has(entry.projectId)),
    events: db.events.filter((event) => ids.has(event.projectId)),
  };
}

async function handleApi(req, res) {
  const db = readDb();
  const user = currentUser(req);
  const url = new URL(req.url, "http://localhost");

  if (req.method === "POST" && url.pathname === "/api/login") {
    const payload = await bodyJson(req);
    const found = db.users.find(
      (candidate) =>
        candidate.username === payload.username && candidate.password === payload.password,
    );
    if (!found) {
      sendJson(res, 401, { error: "Credenziali non valide" });
      return;
    }
    const sid = crypto.randomBytes(24).toString("hex");
    sessions.set(sid, found);
    sendJson(res, 200, { user: publicUser(found) }, {
      "Set-Cookie": `sid=${sid}; HttpOnly; Path=/; SameSite=Lax`,
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/logout") {
    const sid = parseCookies(req).sid;
    if (sid) sessions.delete(sid);
    sendJson(res, 200, { ok: true }, {
      "Set-Cookie": "sid=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax",
    });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (!user) {
    sendJson(res, 401, { error: "Accesso richiesto" });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/session") {
    sendJson(res, 200, { user: publicUser(user) });
    return;
  }

  if (req.method === "GET" && url.pathname === "/api/bootstrap") {
    sendJson(res, 200, { user: publicUser(user), data: clientVisibleDb(db, user) });
    return;
  }

  if (!isAdmin(user)) {
    sendJson(res, 403, { error: "Il cliente ha accesso in sola lettura" });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/projects") {
    const payload = await bodyJson(req);
    const client = db.clients.find((item) => item.id === payload.clientId);
    if (!client || !payload.title) {
      sendJson(res, 400, { error: "Cliente e titolo sono obbligatori" });
      return;
    }
    const idBase = slug(payload.title);
    const id = db.projects.some((project) => project.id === idBase)
      ? `${idBase}-${Date.now()}`
      : idBase;
    db.projects.unshift({
      id,
      clientId: client.id,
      title: payload.title,
      client: client.name,
      address: payload.address || "Indirizzo da compilare",
      status: payload.status || "In corso",
      phase: payload.phase || "Avvio incarico",
      updatedAt: todayLabel(),
      description: payload.description || "Nuovo progetto creato dal gestionale.",
      progress: Number(payload.progress || 5),
    });
    writeDb(db);
    sendJson(res, 201, { ok: true, id });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/documents") {
    const payload = await bodyJson(req);
    if (!payload.projectId || !payload.title) {
      sendJson(res, 400, { error: "Progetto e nome documento sono obbligatori" });
      return;
    }
    db.documents.unshift({
      id: `doc-${Date.now()}`,
      projectId: payload.projectId,
      title: payload.title,
      type: payload.type || "PDF",
      version: payload.version || "v1.0",
      date: todayLabel(),
      visibility: payload.visibility || "Cliente",
    });
    writeDb(db);
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/timeline") {
    const payload = await bodyJson(req);
    if (!payload.projectId || !payload.title || !payload.body) {
      sendJson(res, 400, { error: "Progetto, titolo e testo sono obbligatori" });
      return;
    }
    db.timeline.unshift({
      id: `time-${Date.now()}`,
      projectId: payload.projectId,
      date: todayLabel(),
      title: payload.title,
      body: payload.body,
    });
    writeDb(db);
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/events") {
    const payload = await bodyJson(req);
    if (!payload.projectId || !payload.title || !payload.day || !payload.month) {
      sendJson(res, 400, { error: "Progetto, giorno, mese e titolo sono obbligatori" });
      return;
    }
    db.events.unshift({
      id: `event-${Date.now()}`,
      projectId: payload.projectId,
      day: payload.day,
      month: payload.month.toUpperCase(),
      title: payload.title,
      note: payload.note || "",
    });
    writeDb(db);
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/clients") {
    const payload = await bodyJson(req);
    if (!payload.name || !payload.email || !payload.username || !payload.password) {
      sendJson(res, 400, { error: "Nome, email, username e password sono obbligatori" });
      return;
    }
    const id = `cliente-${slug(payload.name)}-${Date.now()}`;
    db.clients.unshift({
      id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || "",
    });
    db.users.push({
      id: `user-${slug(payload.username)}-${Date.now()}`,
      username: payload.username,
      password: payload.password,
      name: payload.name,
      role: "Cliente",
      email: payload.email,
      clientId: id,
    });
    writeDb(db);
    sendJson(res, 201, { ok: true, id });
    return;
  }

  sendJson(res, 404, { error: "API non trovata" });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const requested = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.normalize(path.join(root, requested));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith("/api/")) {
    handleApi(req, res).catch((error) => {
      sendJson(res, 500, { error: error.message || "Errore interno" });
    });
    return;
  }
  serveStatic(req, res);
});

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
server.listen(port, host, () => {
  const visibleHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`Pepa Portal: http://${visibleHost}:${port}`);
});
