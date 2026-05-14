const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const root = __dirname;
const dataPath = path.join(root, "data", "db.json");
const localUploadRoot = path.join(root, "data", "uploads");
const sessions = new Map();

const supabaseUrl = (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const storageBucket = process.env.SUPABASE_STORAGE_BUCKET || "project-documents";
const useSupabase = Boolean(supabaseUrl && supabaseKey);
const demoOnly = process.env.DEMO_ONLY === "true";

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

function localStoragePath(storageKey) {
  const normalized = path.normalize(storageKey).replace(/^(\.\.[/\\])+/, "");
  const fullPath = path.join(localUploadRoot, normalized);
  if (!fullPath.startsWith(localUploadRoot)) throw new Error("Percorso file non valido");
  return fullPath;
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
  const clients = db.clients
    .filter((client) => client.id === user.clientId)
    .map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
    }));
  return {
    users: [],
    clients,
    projects,
    documents: db.documents.filter(
      (document) => ids.has(document.projectId) && document.visibility === "Cliente",
    ),
    documentFolders: (db.documentFolders || []).filter((folder) => ids.has(folder.projectId)),
    timeline: db.timeline.filter((entry) => ids.has(entry.projectId) && entry.visibility !== "Interno"),
    events: db.events.filter((event) => ids.has(event.projectId) && event.visibility !== "Interno"),
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
  const channel = payload.channel || "Email";
  if (channel === "Email" && !client?.email) return null;
  if (channel === "WhatsApp/SMS" && !client?.phone) return null;
  return store.insert("notifications", {
    id: `note-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    projectId: payload.projectId,
    channel,
    recipientEmail: client.email,
    recipientPhone: client.phone || "",
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
    companyName: row.company_name,
    clientType: row.client_type,
    taxCode: row.tax_code,
    vatNumber: row.vat_number,
    pec: row.pec,
    billingCode: row.billing_code,
    city: row.city,
    province: row.province,
    zip: row.zip,
    leadSource: row.lead_source,
    crmStatus: row.crm_status,
    internalOwner: row.internal_owner,
    privacyStatus: row.privacy_status,
    internalNotes: row.internal_notes,
    publicNotes: row.public_notes,
    clientId: row.client_id,
    projectId: row.project_id,
    folderId: row.folder_id,
    title: row.title,
    client: row.client,
    address: row.address,
    status: row.status,
    phase: row.phase,
    updatedAt: row.updated_at,
    description: row.description,
    progress: row.progress,
    workAmount: row.work_amount,
    technicalFee: row.technical_fee,
    projectPhotos: row.project_photos,
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
    comment: row.comment,
    parentDocumentId: row.parent_document_id,
    versionNumber: row.version_number,
    source: row.source,
    requestId: row.request_id,
    uploadedDocumentId: row.uploaded_document_id,
    uploadRequired: row.upload_required,
    requestedDocumentTitle: row.requested_document_title,
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
    recipientPhone: row.recipient_phone,
    channel: row.channel,
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
  const rows = await supabaseFetch(`/rest/v1/${table === "documentFolders" ? "document_folders" : table}`, {
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
  const rows = await supabaseFetch(`/rest/v1/${table === "documentFolders" ? "document_folders" : table}?id=eq.${encodeURIComponent(id)}`, {
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
  const [users, clients, projects, documents, documentFolders, timeline, events, checklist, requests, notifications] =
    await Promise.all([
      tableGet("users", "select=*"),
      tableGet("clients", "select=*"),
      tableGet("projects", "select=*&order=updated_at.desc"),
      tableGet("documents", "select=*&order=date.desc,version_number.desc"),
      optionalTableGet("document_folders", "select=*&order=name.asc"),
      tableGet("timeline", "select=*&order=date.desc"),
      tableGet("events", "select=*"),
      tableGet("checklist", "select=*"),
      tableGet("requests", "select=*"),
      optionalTableGet("notifications", "select=*&order=created_at.desc"),
    ]);
  return { users, clients, projects, documents, documentFolders, timeline, events, checklist, requests, notifications };
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
      Object.assign(record, Object.fromEntries(Object.entries(row).filter(([, value]) => value !== undefined)));
      writeJsonDb(db);
      return record;
    },
    async delete(table, id) {
      const index = db[table].findIndex((item) => item.id === id);
      if (index === -1) return false;
      db[table].splice(index, 1);
      writeJsonDb(db);
      return true;
    },
    async upload(storageKey, file) {
      const destination = localStoragePath(storageKey);
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, file.buffer);
      return storageKey;
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
    async delete(table, id) {
      await supabaseFetch(`/rest/v1/${table === "documentFolders" ? "document_folders" : table}?id=eq.${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });
      return true;
    },
    upload: storageUpload,
    signedUrl: storageSignedUrl,
  };
}

function canAccessDocument(user, db, document) {
  if (!document) return false;
  if (isAdmin(user)) return true;
  if (document.source === "Cliente") {
    return db.projects.some(
      (project) => project.id === document.projectId && project.clientId === user.clientId,
    );
  }
  if (document.visibility !== "Cliente") return false;
  return db.projects.some(
    (project) => project.id === document.projectId && project.clientId === user.clientId,
  );
}

function fileExtension(file, fallback = "PDF") {
  const extension = file?.filename?.split(".").pop();
  return extension ? extension.toUpperCase() : fallback;
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
    if (!useSupabase) {
      const filePath = localStoragePath(document.storageKey);
      if (!fs.existsSync(filePath)) {
        sendJson(res, 404, { error: "File locale non trovato" });
        return;
      }
      res.writeHead(200, {
        "Content-Type": document.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${encodeURIComponent(document.fileName || document.title)}"`,
      });
      fs.createReadStream(filePath).pipe(res);
      return;
    }
    const signedUrl = await store.signedUrl(document.storageKey);
    res.writeHead(302, { Location: signedUrl });
    res.end();
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/client-documents") {
    const { fields, file } = await documentPayload(req);
    const project = db.projects.find((item) => item.id === fields.projectId);
    const request = db.requests.find((item) => item.id === fields.requestId && item.projectId === fields.projectId);
    if (!project || project.clientId !== user.clientId || !request?.uploadRequired) {
      sendJson(res, 403, { error: "Caricamento non autorizzato" });
      return;
    }
    if (!file?.filename) {
      sendJson(res, 400, { error: "Seleziona un file da caricare" });
      return;
    }

    const documentId = `client-doc-${Date.now()}`;
    const safeFilename = `${Date.now()}-${slug(file.filename)}${path.extname(file.filename)}`;
    const storageKey = file ? `client-uploads/${fields.projectId}/${documentId}/${safeFilename}` : "";
    if (file) await store.upload(storageKey, file);

    await store.insert("documents", {
      id: documentId,
      projectId: fields.projectId,
      folderId: "",
      title: request.requestedDocumentTitle || request.title,
      type: fileExtension(file),
      version: "v1.0",
      versionNumber: 1,
      date: todayLabel(),
      visibility: "Studio",
      category: "Documento cliente",
      tags: "caricato dal cliente",
      documentStatus: "Da verificare",
      comment: fields.comment || `Documento inviato dal cliente per la richiesta: ${request.title}`,
      parentDocumentId: "",
      requestId: request.id,
      source: "Cliente",
      storageKey,
      fileName: file.filename,
      mimeType: file.contentType,
      fileSize: file.buffer.length,
    });

    await store.update("requests", request.id, {
      status: "Caricato dal cliente",
      uploadedDocumentId: documentId,
    });

    await queueNotification(store, db, {
      projectId: fields.projectId,
      notificationType: "Documento caricato dal cliente",
      relatedType: "document",
      relatedId: documentId,
      subject: "Documento caricato dal cliente",
      message: `${user.name} ha caricato un documento per la richiesta: ${request.title}.`,
    });

    sendJson(res, 201, { ok: true });
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
      workAmount: Number(payload.workAmount || 0),
      technicalFee: Number(payload.technicalFee || 0),
      projectPhotos: [],
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
      workAmount: Number(payload.workAmount ?? project.workAmount ?? 0),
      technicalFee: Number(payload.technicalFee ?? project.technicalFee ?? 0),
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
    if (!fields.projectId || (!fields.title && !fields.parentDocumentId)) {
      sendJson(res, 400, { error: "Progetto e nome documento sono obbligatori" });
      return;
    }
    const existingDocument = fields.parentDocumentId
      ? db.documents.find((document) => document.id === fields.parentDocumentId)
      : null;
    const documentId = existingDocument?.id || `doc-${Date.now()}`;
    const versionNumber = existingDocument
      ? Number(existingDocument.versionNumber || 1) + 1
      : Number(fields.versionNumber || 1);
    const safeFilename = file?.filename ? `${Date.now()}-${slug(file.filename)}${path.extname(file.filename)}` : "";
    const storageKey = file ? `projects/${fields.projectId}/${documentId}/${safeFilename}` : "";
    if (file) await store.upload(storageKey, file);
    const documentRecord = {
      id: documentId,
      projectId: fields.projectId,
      folderId: fields.folderId || existingDocument?.folderId || "",
      title: fields.title || existingDocument?.title,
      type: fileExtension(file, existingDocument?.type || "PDF"),
      version: fields.version || `v${versionNumber}.0`,
      versionNumber,
      date: todayLabel(),
      visibility: fields.visibility || "Cliente",
      category: fields.category || existingDocument?.category || "Altro",
      tags: fields.tags || "",
      documentStatus: fields.documentStatus || "Provvisorio",
      comment: fields.comment || "",
      parentDocumentId: "",
      storageKey: storageKey || existingDocument?.storageKey || "",
      fileName: file?.filename || existingDocument?.fileName || "",
      mimeType: file?.contentType || existingDocument?.mimeType || "",
      fileSize: file?.buffer?.length || existingDocument?.fileSize || 0,
    };
    if (existingDocument) {
      await store.update("documents", documentId, documentRecord);
    } else {
      await store.insert("documents", documentRecord);
    }
    const visibility = fields.visibility || "Cliente";
    const shouldNotifyByEmail = fields.notifyEmail === "true";
    const shouldNotifyByChat = fields.notifyChat === "true";
    if (visibility === "Cliente" && (shouldNotifyByEmail || shouldNotifyByChat)) {
      const notificationBase = {
        projectId: fields.projectId,
        notificationType: existingDocument ? "Nuova versione documento" : "Nuovo documento",
        relatedType: "document",
        relatedId: documentId,
        subject: existingDocument ? "Nuova versione documento disponibile" : "Nuovo documento disponibile",
        message: `${documentRecord.title} e' disponibile nel portale clienti.`,
      };
      if (shouldNotifyByEmail) await queueNotification(store, db, { ...notificationBase, channel: "Email" });
      if (shouldNotifyByChat) await queueNotification(store, db, { ...notificationBase, channel: "WhatsApp/SMS" });
    }
    sendJson(res, 201, { ok: true });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/document-folders") {
    const payload = await bodyJson(req);
    if (!payload.projectId || !payload.name) {
      sendJson(res, 400, { error: "Progetto e nome cartella sono obbligatori" });
      return;
    }
    const folder = {
      id: `folder-${Date.now()}`,
      projectId: payload.projectId,
      name: payload.name,
      description: payload.description || "",
    };
    await store.insert("documentFolders", folder);
    sendJson(res, 201, { ok: true, id: folder.id });
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
      date: payload.date || todayLabel(),
      title: payload.title,
      body: payload.body,
      color: payload.color || "#2f6f6d",
      visibility: payload.visibility || "Cliente",
    });
    sendJson(res, 201, { ok: true });
    return;
  }

  if ((req.method === "PATCH" || req.method === "DELETE") && url.pathname.startsWith("/api/timeline/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/timeline/", ""));
    if (req.method === "DELETE") {
      await store.delete("timeline", id);
      sendJson(res, 200, { ok: true });
      return;
    }
    const payload = await bodyJson(req);
    await store.update("timeline", id, {
      date: payload.date,
      title: payload.title,
      body: payload.body,
      color: payload.color,
      visibility: payload.visibility,
    });
    sendJson(res, 200, { ok: true });
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
      color: payload.color || "#c78734",
      visibility: payload.visibility || "Cliente",
    });
    sendJson(res, 201, { ok: true });
    return;
  }

  if ((req.method === "PATCH" || req.method === "DELETE") && url.pathname.startsWith("/api/events/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/events/", ""));
    if (req.method === "DELETE") {
      await store.delete("events", id);
      sendJson(res, 200, { ok: true });
      return;
    }
    const payload = await bodyJson(req);
    await store.update("events", id, {
      day: payload.day,
      month: payload.month?.toUpperCase(),
      title: payload.title,
      note: payload.note || "",
      color: payload.color,
      visibility: payload.visibility,
    });
    sendJson(res, 200, { ok: true });
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
      notes: payload.notes || "",
    });
    sendJson(res, 201, { ok: true });
    return;
  }

  if ((req.method === "PATCH" || req.method === "DELETE") && url.pathname.startsWith("/api/checklist/")) {
    const id = decodeURIComponent(url.pathname.replace("/api/checklist/", ""));
    if (req.method === "DELETE") {
      await store.delete("checklist", id);
      sendJson(res, 200, { ok: true });
      return;
    }
    const payload = await bodyJson(req);
    await store.update("checklist", id, {
      label: payload.label,
      status: payload.status,
      notes: payload.notes,
    });
    sendJson(res, 200, { ok: true });
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
      uploadRequired: payload.uploadRequired === "true" || payload.uploadRequired === true,
      requestedDocumentTitle: payload.requestedDocumentTitle || "",
    });
    const shouldNotifyByEmail = payload.notifyEmail === "true" || payload.notifyEmail === true;
    const shouldNotifyByChat = payload.notifyChat === "true" || payload.notifyChat === true;
    if (shouldNotifyByEmail || shouldNotifyByChat) {
      const notificationBase = {
        projectId: payload.projectId,
        notificationType: "Nuova richiesta cliente",
        relatedType: "request",
        relatedId: requestId,
        subject: "Nuova richiesta dallo studio",
        message: `${payload.title}: ${payload.body}`,
      };
      if (shouldNotifyByEmail) await queueNotification(store, db, { ...notificationBase, channel: "Email" });
      if (shouldNotifyByChat) await queueNotification(store, db, { ...notificationBase, channel: "WhatsApp/SMS" });
    }
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
      companyName: payload.companyName || "",
      clientType: payload.clientType || "Privato",
      taxCode: payload.taxCode || "",
      vatNumber: payload.vatNumber || "",
      pec: payload.pec || "",
      billingCode: payload.billingCode || "",
      address: payload.address || "",
      city: payload.city || "",
      province: payload.province || "",
      zip: payload.zip || "",
      leadSource: payload.leadSource || "",
      crmStatus: payload.crmStatus || "Attivo",
      internalOwner: payload.internalOwner || "Studio",
      privacyStatus: payload.privacyStatus || "Da verificare",
      internalNotes: payload.internalNotes || "",
      publicNotes: payload.publicNotes || "",
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
  if (demoOnly && urlPath === "/") {
    res.writeHead(302, { Location: "/demo" });
    res.end();
    return;
  }
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
    `InBolla Portal: http://${visibleHost}:${port} (${useSupabase ? "Supabase" : "JSON locale"}${demoOnly ? ", demo only" : ""})`,
  );
});
