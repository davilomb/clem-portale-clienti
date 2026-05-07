const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const dataPath = path.join(root, "data", "db.json");
const sessions = new Map();

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "project-documents";
const useSupabase = Boolean(supabaseUrl && supabaseKey);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function readJsonDb() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function writeJsonDb(db) {
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
      if (body.length > 2_000_000) {
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

function readBodyBuffer(req, limit = 30_000_000) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        req.destroy();
        reject(new Error("File troppo grande per questa beta"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function splitBuffer(buffer, separator) {
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(separator, start);
  while (index !== -1) {
    parts.push(buffer.subarray(start, index));
    start = index + separator.length;
    index = buffer.indexOf(separator, start);
  }
  parts.push(buffer.subarray(start));
  return parts;
}

async function bodyMultipart(req) {
  const contentType = req.headers["content-type"] || "";
  const match = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!match) throw new Error("Formato upload non valido");

  const boundary = Buffer.from(`--${match[1] || match[2]}`);
  const raw = await readBodyBuffer(req);
  const result = { fields: {}, file: null };

  for (const chunk of splitBuffer(raw, boundary)) {
    let part = chunk;
    if (part.subarray(0, 2).toString() === "\r\n") part = part.subarray(2);
    if (part.subarray(0, 2).toString() === "--") continue;
    if (!part.length) continue;

    const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
    if (headerEnd === -1) continue;
    const headerText = part.subarray(0, headerEnd).toString("utf8");
    let content = part.subarray(headerEnd + 4);
    if (content.subarray(content.length - 2).toString() === "\r\n") {
      content = content.subarray(0, content.length - 2);
    }

    const name = headerText.match(/name="([^"]+)"/)?.[1];
    const filename = headerText.match(/filename="([^"]*)"/)?.[1];
    const partType = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1] || "application/octet-stream";
    if (!name) continue;

    if (filename) {
      result.file = {
        fieldName: name,
        filename,
        contentType: partType,
        buffer: content,
      };
    } else {
      result.fields[name] = content.toString("utf8");
    }
  }

  return result;
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
  return new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Rome",
  })
    .format(new Date())
    .replace(".", "")
    .replace(/^\w/, (letter) => letter.toUpperCase());
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
    checklist: db.checklist.filter((item) => ids.has(item.projectId)),
    requests: db.requests.filter((item) => ids.has(item.projectId)),
    notifications: [],
  };
}

function clientForProject(db, projectId) {
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) return null;
  return db.clients.find((client) => client.id === project.clientId) || null;
}

async function queueNotification(store, db, payload) {
  const client = clientForProject(db, payload.projectId);
  if (!client?.email) return null;
  return store.insert("notifications", {
    id: `note-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    projectId: payload.projectId,
    recipientEmail: client.email,
    notificationType: payload.notificationType,
    relatedType: payload.relatedType,
    relatedId: payload.relatedId,
    subject: payload.subject,
    message: payload.message,
    status: "Da inviare",
    createdAt: todayLabel(),
    sentAt: "",
  });
}

function toSnake(value) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, fieldValue]) => fieldValue !== undefined)
      .map(([key, fieldValue]) => [
        key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
        fieldValue,
      ]),
  );
}

function fromSnake(row) {
  if (!row) return row;
  return {
    id: row.id,
    username: row.username,
    password: row.password,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    clientId: row.client_id,
    projectId: row.project_id,
    title: row.title,
    client: row.client,
    address: row.address,
    status: row.status,
    phase: row.phase,
    updatedAt: row.updated_at,
    description: row.description,
    progress: row.progress,
    nextAction: row.next_action,
    nextActionOwner: row.next_action_owner,
    nextActionDue: row.next_action_due,
    type: row.type,
    version: row.version,
    date: row.date,
    visibility: row.visibility,
    category: row.category,
    tags: row.tags,
    documentStatus: row.document_status,
    parentDocumentId: row.parent_document_id,
    versionNumber: row.version_number,
    storageKey: row.storage_key,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    body: row.body,
    day: row.day,
    month: row.month,
    note: row.note,
    label: row.label,
    dueDate: row.due_date,
    recipientEmail: row.recipient_email,
    notificationType: row.notification_type,
    relatedType: row.related_type,
    relatedId: row.related_id,
    subject: row.subject,
    message: row.message,
    sentAt: row.sent_at,
  };
}

async function supabaseFetch(pathname, options = {}) {
  const response = await fetch(`${supabaseUrl}${pathname}`, {
    ...options,
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Errore Supabase");
  }
  return payload;
}

async function tableGet(table, query = "select=*") {
  const rows = await supabaseFetch(`/rest/v1/${table}?${query}`, {
    headers: { Accept: "application/json" },
  });
  return rows.map(fromSnake);
}

async function optionalTableGet(table, query = "select=*") {
  try {
    return await tableGet(table, query);
  } catch (error) {
    return [];
  }
}

async function tableInsert(table, row) {
  const rows = await supabaseFetch(`/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(toSnake(row)),
  });
  return fromSnake(rows[0]);
}

async function tableUpdate(table, id, row) {
  const rows = await supabaseFetch(`/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(toSnake(row)),
  });
  return fromSnake(rows[0]);
}

async function storageUpload(storageKey, file) {
  if (!file || !file.buffer?.length) return null;
  await supabaseFetch(
    `/storage/v1/object/${encodeURIComponent(storageBucket)}/${storageKey
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "POST",
      headers: {
        "Content-Type": file.contentType,
        "Cache-Control": "3600",
        "x-upsert": "false",
      },
      body: file.buffer,
    },
  );
  return storageKey;
}

async function storageSignedUrl(storageKey) {
  const payload = await supabaseFetch(
    `/storage/v1/object/sign/${encodeURIComponent(storageBucket)}/${storageKey
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 120 }),
    },
  );
  if (!payload?.signedURL) throw new Error("Link documento non disponibile");
  if (payload.signedURL.startsWith("http")) return payload.signedURL;
  if (payload.signedURL.startsWith("/storage/v1/")) return `${supabaseUrl}${payload.signedURL}`;
  if (payload.signedURL.startsWith("/object/")) return `${supabaseUrl}/storage/v1${payload.signedURL}`;
  return `${supabaseUrl}/storage/v1/${payload.signedURL.replace(/^\/+/, "")}`;
}

async function readDb() {
  if (!useSupabase) return readJsonDb();
  const [users, clients, projects, documents, timeline, events, checklist, requests, notifications] =
    await Promise.all([
      tableGet("users", "select=*"),
      tableGet("clients", "select=*"),
      tableGet("projects", "select=*&order=updated_at.desc"),
      tableGet("documents", "select=*&order=date.desc,version_number.desc"),
      tableGet("timeline", "select=*&order=date.desc"),
      tableGet("events", "select=*"),
      tableGet("checklist", "select=*"),
      tableGet("requests", "select=*"),
      optionalTableGet("notifications", "select=*&order=created_at.desc"),
    ]);
  return { users, clients, projects, documents, timeline, events, checklist, requests, notifications };
}

function createLocalStore(db) {
  return {
    async insert(table, row) {
      if (!db[table]) db[table] = [];
      db[table].unshift(row);
      writeJsonDb(db);
      return row;
    },
    async update(table, id, row) {
      const record = db[table].find((item) => item.id === id);
      if (!record) return null;
      Object.assign(record, row);
      writeJsonDb(db);
      return record;
    },
    async upload() {
      return null;
    },
    async signedUrl() {
      return null;
    },
  };
}

function createStore(db) {
  if (!useSupabase) return createLocalStore(db);
  return {
    insert: tableInsert,
    update: tableUpdate,
    upload: storageUpload,
    signedUrl: storageSignedUrl,
  };
}

function canAccessDocument(user, db, document) {
  if (!document) return false;
  if (isAdmin(user)) return true;
  if (document.visibility !== "Cliente") return false;
  return db.projects.some(
    (project) => project.id === document.projectId && project.clientId === user.clientId,
  );
}

async function documentPayload(req) {
  const type = req.headers["content-type"] || "";
  if (!type.startsWith("multipart/form-data")) return { fields: await bodyJson(req), file: null };
  return bodyMultipart(req);
}

async function handleApi(req, res) {
  const db = await readDb();
  const store = createStore(db);
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
    sendJson(res, 200, { ok: true, storage: useSupabase ? "supabase" : "json" });
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

  if (req.method === "GET" && url.pathname.startsWith("/api/documents/")) {
    const documentId = decodeURIComponent(url.pathname.replace("/api/documents/", "").replace("/download", ""));
    const document = db.documents.find((item) => item.id === documentId);
    if (!canAccessDocument(user, db, document)) {
      sendJson(res, 404, { error: "Documento non disponibile" });
      return;
    }
    if (!document.storageKey) {
      sendJson(res, 404, { error: "File non ancora caricato per questo documento" });
      return;
    }
    const signedUrl = await store.signedUrl(document.storageKey);
    res.writeHead(302, { Location: signedUrl });
    res.end();
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
    await store.insert("projects", {
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
      nextAction: payload.nextAction || "Definire la prossima azione operativa.",
      nextActionOwner: payload.nextActionOwner || "Studio",
      nextActionDue: payload.nextActionDue || "Da definire",
    });
    sendJson(res, 201, { ok: true, id });
    return;
  }

  if (req.method === "PATCH" && url.pathname.startsWith("/api/projects/")) {
    const projectId = decodeURIComponent(url.pathname.replace("/api/projects/", ""));
    const project = db.projects.find((item) => item.id === projectId);
    if (!project) {
      sendJson(res, 404, { error: "Progetto non trovato" });
      return;
    }
    const payload = await bodyJson(req);
    await store.update("projects", projectId, {
      title: payload.title || project.title,
      address: payload.address || project.address,
      status: payload.status || project.status,
      phase: payload.phase || project.phase,
      description: payload.description || project.description,
      progress: Number(payload.progress ?? project.progress),
      nextAction: payload.nextAction || project.nextAction,
      nextActionOwner: payload.nextActionOwner || project.nextActionOwner,
      nextActionDue: payload.nextActionDue || project.nextActionDue,
      updatedAt: todayLabel(),
    });
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/documents") {
    const { fields, file } = await documentPayload(req);
    if (!fields.projectId || !fields.title) {
      sendJson(res, 400, { error: "Progetto e nome documento sono obbligatori" });
      return;
    }
    const documentId = `doc-${Date.now()}`;
    const parentDocumentId = fields.parentDocumentId || "";
    const siblingVersions = db.documents.filter(
      (document) =>
        document.id === parentDocumentId ||
        document.parentDocumentId === parentDocumentId ||
        (!parentDocumentId && document.title === fields.title && document.projectId === fields.projectId),
    );
    const versionNumber = parentDocumentId
      ? Math.max(1, ...siblingVersions.map((document) => Number(document.versionNumber || 1))) + 1
      : Number(fields.versionNumber || 1);
    const safeFilename = file?.filename ? `${Date.now()}-${slug(file.filename)}${path.extname(file.filename)}` : "";
    const storageKey = file && useSupabase ? `projects/${fields.projectId}/${documentId}/${safeFilename}` : "";
    if (file && useSupabase) await store.upload(storageKey, file);
    await store.insert("documents", {
      id: documentId,
      projectId: fields.projectId,
      title: fields.title,
      type: fields.type || file?.filename?.split(".").pop()?.toUpperCase() || "PDF",
      version: fields.version || `v${versionNumber}.0`,
      versionNumber,
      date: todayLabel(),
      visibility: fields.visibility || "Cliente",
      category: fields.category || "Altro",
      tags: fields.tags || "",
      documentStatus: fields.documentStatus || "Pubblicato",
      parentDocumentId,
      storageKey,
      fileName: file?.filename || "",
      mimeType: file?.contentType || "",
      fileSize: file?.buffer?.length || 0,
    });
    if ((fields.visibility || "Cliente") === "Cliente") {
      await queueNotification(store, db, {
        projectId: fields.projectId,
        notificationType: parentDocumentId ? "Nuova versione documento" : "Nuovo documento",
        relatedType: "document",
        relatedId: documentId,
        subject: parentDocumentId ? "Nuova versione documento disponibile" : "Nuovo documento disponibile",
        message: `${fields.title} e' disponibile nel portale clienti.`,
      });
    }
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/timeline") {
    const payload = await bodyJson(req);
    if (!payload.projectId || !payload.title || !payload.body) {
      sendJson(res, 400, { error: "Progetto, titolo e testo sono obbligatori" });
      return;
    }
    await store.insert("timeline", {
      id: `time-${Date.now()}`,
      projectId: payload.projectId,
      date: todayLabel(),
      title: payload.title,
      body: payload.body,
    });
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/events") {
    const payload = await bodyJson(req);
    if (!payload.projectId || !payload.title || !payload.day || !payload.month) {
      sendJson(res, 400, { error: "Progetto, giorno, mese e titolo sono obbligatori" });
      return;
    }
    await store.insert("events", {
      id: `event-${Date.now()}`,
      projectId: payload.projectId,
      day: payload.day,
      month: payload.month.toUpperCase(),
      title: payload.title,
      note: payload.note || "",
    });
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/checklist") {
    const payload = await bodyJson(req);
    if (!payload.projectId || !payload.label) {
      sendJson(res, 400, { error: "Progetto e voce checklist sono obbligatori" });
      return;
    }
    await store.insert("checklist", {
      id: `check-${Date.now()}`,
      projectId: payload.projectId,
      label: payload.label,
      status: payload.status || "Da fare",
    });
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/requests") {
    const payload = await bodyJson(req);
    if (!payload.projectId || !payload.title || !payload.body) {
      sendJson(res, 400, { error: "Progetto, titolo e testo richiesta sono obbligatori" });
      return;
    }
    const requestId = `req-${Date.now()}`;
    await store.insert("requests", {
      id: requestId,
      projectId: payload.projectId,
      title: payload.title,
      body: payload.body,
      status: payload.status || "Aperta",
      dueDate: payload.dueDate || "Da definire",
    });
    await queueNotification(store, db, {
      projectId: payload.projectId,
      notificationType: "Nuova richiesta cliente",
      relatedType: "request",
      relatedId: requestId,
      subject: "Nuova richiesta dallo studio",
      message: `${payload.title}: ${payload.body}`,
    });
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
    await store.insert("clients", {
      id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone || "",
    });
    await store.insert("users", {
      id: `user-${slug(payload.username)}-${Date.now()}`,
      username: payload.username,
      password: payload.password,
      name: payload.name,
      role: "Cliente",
      email: payload.email,
      clientId: id,
    });
    sendJson(res, 201, { ok: true, id });
    return;
  }

  sendJson(res, 404, { error: "API non trovata" });
}

function serveStatic(req, res) {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const requested = urlPath === "/" || urlPath === "/demo" || urlPath === "/demo/" ? "/index.html" : urlPath;
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
  console.log(
    `Studio Clementi Portal: http://${visibleHost}:${port} (${useSupabase ? "Supabase" : "JSON locale"})`,
  );
});
