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
const appPublicUrl = (process.env.APP_PUBLIC_URL || "").replace(/\/$/, "");
const emailProvider = (process.env.EMAIL_PROVIDER || "").toLowerCase();
const emailFrom = process.env.EMAIL_FROM || "inbolla.web@gmail.com";
const emailFromName = process.env.EMAIL_FROM_NAME || "InBolla";

const defaultNotificationSettings = {
  emailEnabled: true,
  messageEnabled: false,
  defaultEmail: true,
  defaultMessage: false,
  emailProvider: "Brevo",
  messageProvider: "WhatsApp Cloud API",
  emailFromName,
  emailFrom,
  replyToEmail: emailFrom,
  studioNotificationEmail: emailFrom,
  whatsappSender: "InBolla",
  whatsappPhone: "",
  whatsappBusinessAccountId: "",
  whatsappStatus: "Futura integrazione",
};

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

function publicUsers(users) {
  return (users || []).map(publicUser);
}

function currentUser(req) {
  const sid = parseCookies(req).sid;
  if (!sid) return null;
  return sessions.get(sid) || null;
}

function isAdmin(user) {
  return user?.role === "Geometra";
}

function boolValue(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return value === "true" || value === "on" || value === "1";
}

function notificationSettings(db) {
  const row = (db.appSettings || []).find((item) => item.id === "notifications");
  const value = row?.value && typeof row.value === "object" ? row.value : {};
  return { ...defaultNotificationSettings, ...value };
}

function normalizeNotificationSettings(payload = {}, current = defaultNotificationSettings) {
  return {
    emailEnabled: boolValue(payload.emailEnabled, current.emailEnabled),
    messageEnabled: boolValue(payload.messageEnabled, current.messageEnabled),
    defaultEmail: boolValue(payload.defaultEmail, current.defaultEmail),
    defaultMessage: boolValue(payload.defaultMessage, current.defaultMessage),
    emailProvider: payload.emailProvider || current.emailProvider || "Brevo",
    messageProvider: payload.messageProvider || current.messageProvider || "WhatsApp Cloud API",
    emailFromName: payload.emailFromName || payload.senderName || current.emailFromName || emailFromName,
    emailFrom: payload.emailFrom || payload.senderEmail || current.emailFrom || emailFrom,
    replyToEmail: payload.replyToEmail || current.replyToEmail || emailFrom,
    studioNotificationEmail: payload.studioNotificationEmail || current.studioNotificationEmail || current.replyToEmail || emailFrom,
    whatsappSender: payload.whatsappSender || payload.messageSender || current.whatsappSender || "InBolla",
    whatsappPhone: payload.whatsappPhone || current.whatsappPhone || "",
    whatsappBusinessAccountId: payload.whatsappBusinessAccountId || current.whatsappBusinessAccountId || "",
    whatsappStatus: payload.whatsappStatus || current.whatsappStatus || "Futura integrazione",
  };
}

async function saveNotificationSettings(store, db, payload) {
  const current = notificationSettings(db);
  const value = normalizeNotificationSettings(payload, current);
  const row = {
    id: "notifications",
    value,
    updatedAt: todayLabel(),
  };
  const exists = (db.appSettings || []).some((item) => item.id === row.id);
  return exists ? store.update("appSettings", row.id, row) : store.insert("appSettings", row);
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
  if (isAdmin(user)) return { ...db, users: publicUsers(db.users) };

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

function studioRecipient(db) {
  const settings = notificationSettings(db);
  if (settings.studioNotificationEmail) {
    return { email: settings.studioNotificationEmail, phone: settings.whatsappPhone || "", name: settings.emailFromName || "Studio" };
  }
  const admin = db.users.find((user) => isAdmin(user) && user.email);
  return admin ? { email: admin.email, phone: admin.phone || "", name: admin.name } : null;
}

function notificationRecipient(db, payload) {
  if (payload.recipientEmail || payload.recipientPhone) {
    return {
      email: payload.recipientEmail || "",
      phone: payload.recipientPhone || "",
      name: payload.recipientName || "",
    };
  }
  if (payload.recipientType === "Studio") return studioRecipient(db);
  const client = clientForProject(db, payload.projectId);
  return client ? { email: client.email, phone: client.phone || "", name: client.name } : null;
}

function emailProviderKey(label = "") {
  if (emailProvider === "console") return "console";
  const normalized = String(label || "").toLowerCase();
  if (normalized.includes("brevo")) return "brevo";
  if (normalized.includes("resend")) return "resend";
  if (normalized.includes("sendgrid")) return "sendgrid";
  if (normalized.includes("console")) return "console";
  return emailProvider;
}

function emailConfigured(provider = emailProviderKey()) {
  if (provider === "brevo") return Boolean(process.env.BREVO_API_KEY);
  if (provider === "resend") return Boolean(process.env.RESEND_API_KEY);
  if (provider === "sendgrid") return Boolean(process.env.SENDGRID_API_KEY);
  if (provider === "console") return true;
  return false;
}

function portalLink(projectId) {
  if (!appPublicUrl) return "";
  const basePath = demoOnly ? "/demo" : "";
  if (!projectId) return `${appPublicUrl}${basePath}`;
  return `${appPublicUrl}${basePath}?project=${encodeURIComponent(projectId)}`;
}

function escapeEmail(value) {
  return String(value || "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char]);
}

function emailLayout({ eyebrow = "Portale clienti", title, intro, details = [], ctaLabel = "Apri il portale", link = "" }) {
  const rows = details
    .filter((item) => item?.value !== undefined && item?.value !== null && String(item.value).trim() !== "")
    .map(
      (item) => `
        <tr>
          <td style="padding:9px 0;color:#64748b;border-bottom:1px solid #e5edf0;width:38%">${escapeEmail(item.label)}</td>
          <td style="padding:9px 0;color:#111827;border-bottom:1px solid #e5edf0;font-weight:600">${escapeEmail(item.value)}</td>
        </tr>
      `,
    )
    .join("");
  const detailTable = rows
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0;border-collapse:collapse">${rows}</table>`
    : "";
  const cta = link
    ? `<p style="margin:24px 0 10px"><a href="${escapeEmail(link)}" style="display:inline-block;padding:12px 16px;border-radius:7px;background:#1f6f68;color:#ffffff;text-decoration:none;font-weight:700">${escapeEmail(ctaLabel)}</a></p>`
    : "";
  return `
    <div style="margin:0;padding:0;background:#f4f7f8">
      <div style="max-width:640px;margin:0 auto;padding:28px 18px;font-family:Arial,sans-serif;color:#1f2937;line-height:1.5">
        <div style="background:#ffffff;border:1px solid #dde8ea;border-radius:10px;padding:26px">
          <p style="margin:0 0 8px;color:#1f6f68;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.04em">${escapeEmail(eyebrow)}</p>
          <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;color:#111827">${escapeEmail(title)}</h1>
          <p style="margin:0;color:#334155">${escapeEmail(intro)}</p>
          ${detailTable}
          ${cta}
          <p style="margin:22px 0 0;color:#64748b;font-size:13px">Messaggio automatico dal portale clienti InBolla.</p>
        </div>
      </div>
    </div>
  `;
}

function emailText({ title, intro, details = [], ctaLabel = "Apri il portale", link = "" }) {
  const detailLines = details
    .filter((item) => item?.value !== undefined && item?.value !== null && String(item.value).trim() !== "")
    .map((item) => `${item.label}: ${item.value}`)
    .join("\n");
  return [title, "", intro, detailLines ? `\n${detailLines}` : "", link ? `\n${ctaLabel}: ${link}` : "", "\nMessaggio automatico dal portale clienti InBolla."]
    .filter(Boolean)
    .join("\n");
}

function fallbackEmailContent(notification) {
  const link = portalLink(notification.projectId);
  return {
    textContent: link ? `${notification.message}\n\nApri il portale: ${link}` : notification.message,
    htmlContent: emailLayout({
      title: notification.subject,
      intro: notification.message,
      link,
    }),
  };
}

function accessEmailTemplate({ clientName, username, password }) {
  const link = portalLink("");
  const payload = {
    eyebrow: "Nuovo accesso cliente",
    title: "Il tuo accesso al portale InBolla e' pronto",
    intro: `Ciao ${clientName}, Studio Clementi ha creato il tuo accesso personale al portale clienti. Da qui potrai consultare progetti, documenti, richieste e aggiornamenti pubblicati dallo studio.`,
    details: [
      { label: "Cliente", value: clientName },
      { label: "Username", value: username },
      { label: "Password temporanea", value: password },
      { label: "Nota sicurezza", value: "Conserva queste credenziali e non inoltrarle a terzi." },
    ],
    ctaLabel: "Accedi al portale",
    link,
  };
  return {
    subject: "Il tuo accesso al portale InBolla",
    message: `Accesso cliente creato per ${clientName}. Username: ${username}.`,
    htmlContent: emailLayout(payload),
    textContent: emailText(payload),
  };
}

function documentEmailTemplate({ db, documentRecord, existingDocument }) {
  const project = db.projects.find((item) => item.id === documentRecord.projectId);
  const folder = (db.documentFolders || []).find((item) => item.id === documentRecord.folderId);
  const link = portalLink(documentRecord.projectId);
  const payload = {
    eyebrow: existingDocument ? "Nuova versione documento" : "Nuovo documento",
    title: existingDocument ? "Nuova versione documento disponibile" : "Nuovo documento disponibile",
    intro: `Studio Clementi ha ${existingDocument ? "pubblicato una nuova versione di un documento" : "pubblicato un nuovo documento"} nel portale clienti.`,
    details: [
      { label: "Progetto", value: project?.title || documentRecord.projectId },
      { label: "Cliente", value: project?.client || "" },
      { label: "Cartella", value: folder?.name || documentRecord.category || "Documenti del progetto" },
      { label: "Documento", value: documentRecord.title },
      { label: "Versione", value: documentRecord.version },
      { label: "Stato", value: documentRecord.documentStatus },
      { label: "Commento", value: documentRecord.comment || "Nessun commento aggiuntivo" },
      { label: "Data", value: documentRecord.date },
    ],
    ctaLabel: "Apri il documento nel portale",
    link,
  };
  return {
    subject: existingDocument ? "Nuova versione documento disponibile" : "Nuovo documento disponibile",
    message: `${documentRecord.title} (${documentRecord.version}) e' disponibile nel portale clienti per il progetto ${project?.title || documentRecord.projectId}.`,
    htmlContent: emailLayout(payload),
    textContent: emailText(payload),
  };
}

function clientUploadEmailTemplate({ user, project, request, documentRecord, comment }) {
  const link = portalLink(project.id);
  const payload = {
    eyebrow: "Documento caricato dal cliente",
    title: "Un cliente ha caricato un documento",
    intro: `${user.name} ha caricato un documento richiesto nel portale clienti.`,
    details: [
      { label: "Cliente", value: user.name },
      { label: "Progetto", value: project.title },
      { label: "Richiesta", value: request.title },
      { label: "Documento", value: documentRecord.title },
      { label: "File", value: documentRecord.fileName },
      { label: "Commento cliente", value: comment || "Nessun commento aggiuntivo" },
      { label: "Data", value: documentRecord.date },
    ],
    ctaLabel: "Apri il progetto",
    link,
  };
  return {
    subject: "Documento caricato dal cliente",
    message: `${user.name} ha caricato ${documentRecord.title} per il progetto ${project.title}.`,
    htmlContent: emailLayout(payload),
    textContent: emailText(payload),
  };
}

async function sendEmailNotification(notification, settings = defaultNotificationSettings) {
  const provider = emailProviderKey(settings.emailProvider);
  if (!emailConfigured(provider)) {
    throw new Error("Provider email non configurato");
  }

  const fallback = fallbackEmailContent(notification);
  const text = notification.textContent || fallback.textContent;
  const html = notification.htmlContent || fallback.htmlContent;
  const senderEmail = settings.emailFrom || emailFrom;
  const senderName = settings.emailFromName || emailFromName;
  const replyToEmail = settings.replyToEmail || senderEmail;

  if (provider === "console") {
    console.log(`[email:console] ${notification.recipientEmail} | ${notification.subject}\n${text}`);
    return;
  }

  let response;
  if (provider === "brevo") {
    response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: notification.recipientEmail, name: notification.recipientName || undefined }],
        replyTo: replyToEmail ? { email: replyToEmail, name: senderName } : undefined,
        subject: notification.subject,
        htmlContent: html,
        textContent: text,
      }),
    });
  } else if (provider === "resend") {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${senderName} <${senderEmail}>`,
        to: [notification.recipientEmail],
        reply_to: replyToEmail,
        subject: notification.subject,
        html,
        text,
      }),
    });
  } else if (provider === "sendgrid") {
    response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: notification.recipientEmail, name: notification.recipientName || undefined }] }],
        from: { email: senderEmail, name: senderName },
        reply_to: replyToEmail ? { email: replyToEmail, name: senderName } : undefined,
        subject: notification.subject,
        content: [
          { type: "text/plain", value: text },
          { type: "text/html", value: html },
        ],
      }),
    });
  } else {
    throw new Error("EMAIL_PROVIDER non supportato");
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Invio email non riuscito");
  }
}

async function queueNotification(store, db, payload) {
  const settings = notificationSettings(db);
  const recipient = notificationRecipient(db, payload);
  const channel = payload.channel || "Email";
  if (channel === "Email" && !recipient?.email) return null;
  if (channel === "WhatsApp/SMS" && !recipient?.phone) return null;
  const notification = await store.insert("notifications", {
    id: `note-${Date.now()}-${Math.round(Math.random() * 1000)}`,
    projectId: payload.projectId || null,
    channel,
    recipientEmail: recipient.email,
    recipientPhone: recipient.phone || "",
    notificationType: payload.notificationType,
    relatedType: payload.relatedType,
    relatedId: payload.relatedId,
    subject: payload.subject,
    message: payload.message,
    status: channel === "Email" ? (settings.emailEnabled ? "Da inviare" : "Email disabilitata") : "Solo grafica",
    createdAt: todayLabel(),
    sentAt: "",
  });

  if (channel !== "Email" || !settings.emailEnabled) return notification;

  try {
    await sendEmailNotification({
      ...notification,
      recipientName: recipient.name || "",
      htmlContent: payload.htmlContent,
      textContent: payload.textContent,
    }, settings);
    return store.update("notifications", notification.id, {
      status: "Inviata",
      sentAt: todayLabel(),
    });
  } catch (error) {
    return store.update("notifications", notification.id, {
      status: `Errore: ${String(error.message || error).slice(0, 160)}`,
    });
  }
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
    value: row.value,
  };
}

function tableName(table) {
  const names = {
    appSettings: "app_settings",
    documentFolders: "document_folders",
  };
  return names[table] || table;
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
  const rows = await supabaseFetch(`/rest/v1/${tableName(table)}`, {
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
  const rows = await supabaseFetch(`/rest/v1/${tableName(table)}?id=eq.${encodeURIComponent(id)}`, {
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
  const [users, clients, projects, documents, documentFolders, timeline, events, checklist, requests, notifications, appSettings] =
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
      optionalTableGet("app_settings", "select=*"),
    ]);
  return { users, clients, projects, documents, documentFolders, timeline, events, checklist, requests, notifications, appSettings };
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
      await supabaseFetch(`/rest/v1/${tableName(table)}?id=eq.${encodeURIComponent(id)}`, {
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

    const documentRecord = {
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
    };

    await store.insert("documents", documentRecord);

    await store.update("requests", request.id, {
      status: "Caricato dal cliente",
      uploadedDocumentId: documentId,
    });

    const emailContent = clientUploadEmailTemplate({
      user,
      project,
      request,
      documentRecord,
      comment: fields.comment || "",
    });

    await queueNotification(store, db, {
      projectId: fields.projectId,
      recipientType: "Studio",
      notificationType: "Documento caricato dal cliente",
      relatedType: "document",
      relatedId: documentId,
      subject: emailContent.subject,
      message: emailContent.message,
      htmlContent: emailContent.htmlContent,
      textContent: emailContent.textContent,
    });

    sendJson(res, 201, { ok: true });
    return;
  }

  if (!isAdmin(user)) {
    sendJson(res, 403, { error: "Il cliente ha accesso in sola lettura" });
    return;
  }

  if (req.method === "PATCH" && url.pathname === "/api/settings/notifications") {
    const payload = await bodyJson(req);
    const row = await saveNotificationSettings(store, db, payload);
    sendJson(res, 200, { ok: true, settings: row.value });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/settings/test-email") {
    const payload = await bodyJson(req);
    const recipientEmail = String(payload.email || user.email || "").trim();
    if (!recipientEmail) {
      sendJson(res, 400, { error: "Inserisci una email destinatario per il test" });
      return;
    }
    const link = portalLink(null);
    const emailPayload = {
      eyebrow: "Test notifiche",
      title: "Email di test InBolla",
      intro: "Questa email conferma che il canale notifiche del portale e' collegato correttamente.",
      details: [
        { label: "Destinatario", value: recipientEmail },
        { label: "Mittente configurato", value: notificationSettings(db).emailFrom },
        { label: "Provider", value: notificationSettings(db).emailProvider },
        { label: "Data test", value: todayLabel() },
      ],
      ctaLabel: "Apri il portale",
      link,
    };
    const notification = await queueNotification(store, db, {
      projectId: null,
      recipientEmail,
      recipientName: payload.name || user.name,
      notificationType: "Test email",
      relatedType: "settings",
      relatedId: "notifications",
      subject: "Test notifiche InBolla",
      message: `Email test inviata a ${recipientEmail}.`,
      htmlContent: emailLayout(emailPayload),
      textContent: emailText(emailPayload),
      channel: "Email",
    });
    sendJson(res, 200, { ok: true, notification });
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/users") {
    const payload = await bodyJson(req);
    const username = String(payload.username || "").trim();
    const email = String(payload.email || "").trim();
    const name = String(payload.name || "").trim();
    if (!name || !username || !email || !payload.password) {
      sendJson(res, 400, { error: "Nome, email, username e password sono obbligatori" });
      return;
    }
    if (db.users.some((item) => item.username === username)) {
      sendJson(res, 409, { error: "Username gia' presente" });
      return;
    }
    const idBase = `user-${slug(username)}`;
    const id = db.users.some((item) => item.id === idBase) ? `${idBase}-${Date.now()}` : idBase;
    const created = await store.insert("users", {
      id,
      username,
      password: payload.password,
      name,
      role: payload.role === "Cliente" ? "Cliente" : "Geometra",
      email,
      clientId: payload.clientId || null,
    });
    sendJson(res, 201, { ok: true, user: publicUser(created) });
    return;
  }

  if (req.method === "PATCH" && url.pathname.startsWith("/api/users/")) {
    const userId = decodeURIComponent(url.pathname.replace("/api/users/", ""));
    const target = db.users.find((item) => item.id === userId);
    if (!target) {
      sendJson(res, 404, { error: "Utente non trovato" });
      return;
    }
    const payload = await bodyJson(req);
    const username = String(payload.username || target.username).trim();
    const email = String(payload.email || target.email).trim();
    const name = String(payload.name || target.name).trim();
    if (!name || !username || !email) {
      sendJson(res, 400, { error: "Nome, email e username sono obbligatori" });
      return;
    }
    if (db.users.some((item) => item.id !== userId && item.username === username)) {
      sendJson(res, 409, { error: "Username gia' presente" });
      return;
    }
    const updated = await store.update("users", userId, {
      username,
      email,
      name,
      role: target.role,
      password: payload.password ? payload.password : target.password,
      clientId: target.clientId || null,
    });
    sendJson(res, 200, { ok: true, user: publicUser(updated) });
    return;
  }

  if (req.method === "DELETE" && url.pathname.startsWith("/api/users/")) {
    const userId = decodeURIComponent(url.pathname.replace("/api/users/", ""));
    const target = db.users.find((item) => item.id === userId);
    if (!target) {
      sendJson(res, 404, { error: "Utente non trovato" });
      return;
    }
    if (target.id === user.id) {
      sendJson(res, 400, { error: "Non puoi eliminare l'utente con cui sei collegato" });
      return;
    }
    if (isAdmin(target) && db.users.filter((item) => isAdmin(item)).length <= 1) {
      sendJson(res, 400, { error: "Deve restare almeno un utente backend" });
      return;
    }
    await store.delete("users", userId);
    sendJson(res, 200, { ok: true });
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
      const emailContent = documentEmailTemplate({ db, documentRecord, existingDocument });
      const notificationBase = {
        projectId: fields.projectId,
        notificationType: existingDocument ? "Nuova versione documento" : "Nuovo documento",
        relatedType: "document",
        relatedId: documentId,
        subject: emailContent.subject,
        message: emailContent.message,
        htmlContent: emailContent.htmlContent,
        textContent: emailContent.textContent,
      };
      if (shouldNotifyByEmail) await queueNotification(store, db, { ...notificationBase, channel: "Email" });
      if (shouldNotifyByChat) await queueNotification(store, db, { ...notificationBase, channel: "WhatsApp/SMS" });
    }
    sendJson(res, 201, { ok: true });
    return;
  }

  if ((req.method === "PATCH" || req.method === "DELETE") && url.pathname.startsWith("/api/documents/")) {
    const documentId = decodeURIComponent(url.pathname.replace("/api/documents/", ""));
    const document = db.documents.find((item) => item.id === documentId);
    if (!document) {
      sendJson(res, 404, { error: "Documento non trovato" });
      return;
    }
    if (req.method === "DELETE") {
      const linkedRequest = db.requests.find((item) => item.uploadedDocumentId === documentId || item.id === document.requestId);
      await store.delete("documents", documentId);
      if (linkedRequest) {
        await store.update("requests", linkedRequest.id, {
          status: linkedRequest.uploadRequired ? "In attesa cliente" : linkedRequest.status,
          uploadedDocumentId: "",
        });
      }
      sendJson(res, 200, { ok: true });
      return;
    }
    const payload = await bodyJson(req);
    await store.update("documents", documentId, {
      title: payload.title || document.title,
      documentStatus: payload.documentStatus || document.documentStatus,
      comment: payload.comment ?? document.comment,
      tags: payload.tags ?? document.tags,
      visibility: payload.visibility || document.visibility,
      category: payload.category || document.category,
    });
    sendJson(res, 200, { ok: true });
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

  if ((req.method === "PATCH" || req.method === "DELETE") && url.pathname.startsWith("/api/requests/")) {
    const requestId = decodeURIComponent(url.pathname.replace("/api/requests/", ""));
    const request = db.requests.find((item) => item.id === requestId);
    if (!request) {
      sendJson(res, 404, { error: "Richiesta non trovata" });
      return;
    }
    if (req.method === "DELETE") {
      await store.delete("requests", requestId);
      sendJson(res, 200, { ok: true });
      return;
    }
    const payload = await bodyJson(req);
    await store.update("requests", requestId, {
      title: payload.title || request.title,
      body: payload.body || request.body,
      status: payload.status || request.status,
      dueDate: payload.dueDate || request.dueDate,
      uploadRequired: payload.uploadRequired === "true" || payload.uploadRequired === true,
      requestedDocumentTitle: payload.requestedDocumentTitle ?? request.requestedDocumentTitle,
      uploadedDocumentId: request.uploadedDocumentId || "",
    });
    sendJson(res, 200, { ok: true });
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
    const emailContent = accessEmailTemplate({
      clientName: payload.name,
      username: payload.username,
      password: payload.password,
    });
    await queueNotification(store, db, {
      projectId: null,
      recipientEmail: payload.email,
      recipientName: payload.name,
      notificationType: "Accesso cliente creato",
      relatedType: "client",
      relatedId: id,
      subject: emailContent.subject,
      message: emailContent.message,
      htmlContent: emailContent.htmlContent,
      textContent: emailContent.textContent,
      channel: "Email",
    });
    sendJson(res, 201, { ok: true, id });
    return;
  }

  if ((req.method === "PATCH" || req.method === "DELETE") && url.pathname.startsWith("/api/clients/")) {
    const clientId = decodeURIComponent(url.pathname.replace("/api/clients/", ""));
    const client = db.clients.find((item) => item.id === clientId);
    if (!client) {
      sendJson(res, 404, { error: "Cliente non trovato" });
      return;
    }
    if (req.method === "DELETE") {
      const projectIds = db.projects.filter((project) => project.clientId === clientId).map((project) => project.id);
      for (const notification of db.notifications.filter((item) => projectIds.includes(item.projectId))) await store.delete("notifications", notification.id);
      for (const notification of db.notifications.filter((item) => item.relatedType === "client" && item.relatedId === clientId)) await store.delete("notifications", notification.id);
      for (const request of db.requests.filter((item) => projectIds.includes(item.projectId))) await store.delete("requests", request.id);
      for (const item of db.checklist.filter((entry) => projectIds.includes(entry.projectId))) await store.delete("checklist", item.id);
      for (const event of db.events.filter((item) => projectIds.includes(item.projectId))) await store.delete("events", event.id);
      for (const entry of db.timeline.filter((item) => projectIds.includes(item.projectId))) await store.delete("timeline", entry.id);
      for (const folder of (db.documentFolders || []).filter((item) => projectIds.includes(item.projectId))) await store.delete("documentFolders", folder.id);
      for (const document of db.documents.filter((item) => projectIds.includes(item.projectId))) await store.delete("documents", document.id);
      for (const project of db.projects.filter((item) => item.clientId === clientId)) await store.delete("projects", project.id);
      for (const linkedUser of db.users.filter((item) => item.clientId === clientId)) await store.delete("users", linkedUser.id);
      await store.delete("clients", clientId);
      sendJson(res, 200, { ok: true });
      return;
    }
    const payload = await bodyJson(req);
    if (!payload.name || !payload.email) {
      sendJson(res, 400, { error: "Nome cliente ed email sono obbligatori" });
      return;
    }
    const linkedUser = db.users.find((item) => item.clientId === clientId);
    const username = String(payload.username || linkedUser?.username || "").trim();
    if (linkedUser && username && db.users.some((item) => item.id !== linkedUser.id && item.username === username)) {
      sendJson(res, 409, { error: "Username gia' presente" });
      return;
    }
    await store.update("clients", clientId, {
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
    for (const project of db.projects.filter((item) => item.clientId === clientId)) {
      await store.update("projects", project.id, { client: payload.name });
    }
    if (linkedUser) {
      await store.update("users", linkedUser.id, {
        username: username || linkedUser.username,
        email: payload.email,
        name: payload.name,
        role: "Cliente",
        password: payload.password ? payload.password : linkedUser.password,
        clientId,
      });
    }
    sendJson(res, 200, { ok: true });
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
