const app = document.querySelector("#app");

const state = {
  user: null,
  route: "overview",
  selectedProjectId: null,
  data: {
    clients: [],
    projects: [],
    documents: [],
    timeline: [],
    events: [],
    checklist: [],
    requests: [],
  },
};

function statusClass(status) {
  if (status === "Completato") return "done";
  if (status === "In attesa") return "waiting";
  return "progress";
}

function icon(name) {
  const icons = {
    home: "⌂",
    folder: "▣",
    calendar: "□",
    docs: "≡",
    users: "◉",
  };
  return icons[name] || "•";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(path, options = {}, retries = 2) {
  const isFormData = options.body instanceof FormData;
  const response = await fetch(path, {
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    },
    credentials: "same-origin",
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok && retries > 0 && path.startsWith("/api/") && [404, 502, 503].includes(response.status)) {
    await wait(900);
    return api(path, options, retries - 1);
  }
  if (!response.ok) throw new Error(payload.error || "Operazione non riuscita");
  return payload;
}

async function loadBootstrap() {
  const payload = await api("/api/bootstrap");
  state.user = payload.user;
  state.data = payload.data;
  if (!state.selectedProjectId || !state.data.projects.some((item) => item.id === state.selectedProjectId)) {
    state.selectedProjectId = state.data.projects[0]?.id || null;
  }
}

function accessibleProjects() {
  return state.data.projects;
}

function currentProject() {
  return accessibleProjects().find((project) => project.id === state.selectedProjectId) || accessibleProjects()[0];
}

function projectOptions(selectedId = state.selectedProjectId) {
  return state.data.projects
    .map(
      (project) =>
        `<option value="${escapeHtml(project.id)}" ${project.id === selectedId ? "selected" : ""}>${escapeHtml(project.title)}</option>`,
    )
    .join("");
}

function clientOptions() {
  return state.data.clients
    .map((client) => `<option value="${escapeHtml(client.id)}">${escapeHtml(client.name)}</option>`)
    .join("");
}

function renderLogin(message = "") {
  app.className = "app-shell";
  app.innerHTML = `
    <section class="login-view">
      <div class="login-panel">
        <h1>Studio Clementi</h1>
        <p>Portale operativo per condividere avanzamenti, documenti e scadenze con i clienti dello studio tecnico.</p>
      </div>
      <div class="login-form-wrap">
        <form class="login-form" id="loginForm">
          <h2>Accesso riservato</h2>
          <p class="hint">Il geometra gestisce le pratiche. Il cliente entra in sola lettura sui propri progetti.</p>
          ${message ? `<p class="form-error">${escapeHtml(message)}</p>` : ""}
          <div class="field">
            <label for="username">Nome utente</label>
            <input id="username" autocomplete="username" value="clementi" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" autocomplete="current-password" value="studio" />
          </div>
          <button class="button" type="submit">Entra nel portale</button>
          <div class="demo-accounts">
            <button type="button" data-demo-user="clementi" data-demo-pass="studio"><strong>Geometra</strong><br /><span>clementi / studio</span></button>
            <button type="button" data-demo-user="bianchi" data-demo-pass="cliente"><strong>Cliente</strong><br /><span>bianchi / cliente</span></button>
          </div>
        </form>
      </div>
    </section>
  `;

  document.querySelector("#loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
          username: document.querySelector("#username").value.trim(),
          password: document.querySelector("#password").value.trim(),
        }),
      });
      state.route = "overview";
      state.selectedProjectId = null;
      await loadBootstrap();
      renderWorkspace();
    } catch (error) {
      renderLogin(error.message);
    }
  });

  document.querySelectorAll("[data-demo-user]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector("#username").value = button.dataset.demoUser;
      document.querySelector("#password").value = button.dataset.demoPass;
    });
  });
}

function shell(content) {
  const isAdmin = state.user.role === "Geometra";
  const nav = isAdmin
    ? [
        ["overview", "home", "Cruscotto"],
        ["projects", "folder", "Progetti"],
        ["documents", "docs", "Documenti"],
        ["clients", "users", "Clienti"],
      ]
    : [
        ["overview", "home", "Home"],
        ["project", "folder", "Il progetto"],
        ["documents", "docs", "Documenti"],
        ["calendar", "calendar", "Calendario"],
      ];

  app.className = "workspace";
  app.innerHTML = `
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">P</div>
        <div><strong>Studio Clementi</strong><span>Portale clienti</span></div>
      </div>
      <nav class="nav">
        ${nav
          .map(
            ([route, iconName, label]) => `
              <button class="${state.route === route ? "active" : ""}" data-route="${route}">
                <span class="nav-icon">${icon(iconName)}</span>${label}
              </button>
            `,
          )
          .join("")}
      </nav>
      <div class="sidebar-footer">
        <div class="user-chip">
          <strong>${escapeHtml(state.user.name)}</strong>
          <span>${escapeHtml(state.user.role)}</span>
        </div>
        <button class="button secondary" id="logout">Esci</button>
      </div>
    </aside>
    <section class="main">${content}</section>
  `;

  document.querySelectorAll("[data-route]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.route;
      renderWorkspace();
    });
  });

  document.querySelector("#logout").addEventListener("click", async () => {
    await api("/api/logout", { method: "POST", body: "{}" });
    state.user = null;
    renderLogin();
  });
}

function renderWorkspace() {
  if (state.user.role === "Geometra") renderAdmin();
  else renderClient();
}

function renderAdmin() {
  const views = {
    overview: adminOverview,
    projects: adminProjects,
    projectDetail: adminProjectDetail,
    documents: adminDocuments,
    clients: adminClients,
  };
  shell(views[state.route]());
  bindWorkspaceActions();
  bindAdminForms();
}

function renderClient() {
  const views = {
    overview: clientOverview,
    project: clientProject,
    documents: clientDocuments,
    calendar: clientCalendar,
  };
  shell(views[state.route]());
  bindWorkspaceActions();
}

function projectRows(projects) {
  if (!projects.length) return `<div class="empty-state">Nessun progetto disponibile.</div>`;
  return projects
    .map(
      (project) => `
      <button class="row-item" data-project="${escapeHtml(project.id)}">
        <span>
          <strong>${escapeHtml(project.title)}</strong>
          <span>${escapeHtml(project.client)} · ${escapeHtml(project.phase)} · aggiornato ${escapeHtml(project.updatedAt)}</span>
        </span>
        <span class="split-actions">
          <span class="status ${statusClass(project.status)}">${escapeHtml(project.status)}</span>
          <span class="button secondary row-action">Apri</span>
        </span>
      </button>
    `,
    )
    .join("");
}

function documentRows(documents) {
  if (!documents.length) return `<div class="empty-state">Nessun documento disponibile.</div>`;
  return documents
    .map(
      (doc) => `
      <div class="row-item">
        <span>
          <span class="doc-type">${escapeHtml(doc.type)}</span>
          <strong>${escapeHtml(doc.title)}</strong>
          <span class="doc-meta">${escapeHtml(doc.version)} · ${escapeHtml(doc.date)} · visibilita': ${escapeHtml(doc.visibility)}${doc.fileName ? ` · file: ${escapeHtml(doc.fileName)}` : ""}</span>
        </span>
        ${
          doc.storageKey
            ? `<a class="button secondary" href="/api/documents/${encodeURIComponent(doc.id)}/download" target="_blank" rel="noreferrer">Apri</a>`
            : `<span class="button secondary disabled">Solo scheda</span>`
        }
      </div>
    `,
    )
    .join("");
}

function timelineRows(projectId) {
  const entries = state.data.timeline.filter((entry) => entry.projectId === projectId);
  if (!entries.length) return `<div class="empty-state">Nessun aggiornamento pubblicato.</div>`;
  return entries
    .map(
      (entry) => `
      <div class="timeline-entry">
        <time>${escapeHtml(entry.date)}</time>
        <strong>${escapeHtml(entry.title)}</strong>
        <p class="muted">${escapeHtml(entry.body)}</p>
      </div>
    `,
    )
    .join("");
}

function eventRows(projectId) {
  const events = state.data.events.filter((event) => !projectId || event.projectId === projectId);
  if (!events.length) return `<div class="empty-state">Nessuna scadenza disponibile.</div>`;
  return events
    .map(
      (event) => `
      <div class="calendar-day">
        <div class="date-badge">${escapeHtml(event.day)}<small>${escapeHtml(event.month)}</small></div>
        <div><strong>${escapeHtml(event.title)}</strong><br /><span class="muted">${escapeHtml(event.note)}</span></div>
      </div>
    `,
    )
    .join("");
}

function nextActionPanel(project) {
  return `
    <section class="panel">
      <div class="panel-header"><h2>Cosa succede adesso</h2></div>
      <div class="panel-body next-action">
        <strong>${escapeHtml(project.nextAction || "Prossima azione da definire.")}</strong>
        <div class="next-action-meta">
          <span>A carico di: ${escapeHtml(project.nextActionOwner || "Studio")}</span>
          <span>Scadenza: ${escapeHtml(project.nextActionDue || "Da definire")}</span>
        </div>
      </div>
    </section>
  `;
}

function checklistRows(projectId) {
  const items = state.data.checklist.filter((item) => item.projectId === projectId);
  if (!items.length) return `<div class="empty-state">Checklist non ancora compilata.</div>`;
  return items
    .map(
      (item) => `
      <div class="check-item">
        <span class="check-dot ${statusClass(item.status)}"></span>
        <span><strong>${escapeHtml(item.label)}</strong><br /><span class="muted">${escapeHtml(item.status)}</span></span>
      </div>
    `,
    )
    .join("");
}

function requestRows(projectId) {
  const items = state.data.requests.filter((item) => item.projectId === projectId);
  if (!items.length) return `<div class="empty-state">Nessuna richiesta aperta per il cliente.</div>`;
  return items
    .map(
      (item) => `
      <div class="request-item">
        <div>
          <strong>${escapeHtml(item.title)}</strong>
          <p class="muted">${escapeHtml(item.body)}</p>
          <span class="doc-meta">Scadenza: ${escapeHtml(item.dueDate)}</span>
        </div>
        <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
      </div>
    `,
    )
    .join("");
}

function adminOverview() {
  const openProjects = state.data.projects.filter((project) => project.status !== "Completato").length;
  const visibleDocs = state.data.documents.filter((doc) => doc.visibility === "Cliente").length;
  return `
    <div class="topbar">
      <div>
        <h1>Cruscotto studio</h1>
        <p>Vista operativa del backend: da qui il geometra aggiorna pratiche, documenti, timeline e scadenze.</p>
      </div>
    </div>
    <div class="grid three">
      <section class="panel"><div class="panel-body metric"><span>Progetti aperti</span><strong>${openProjects}</strong></div></section>
      <section class="panel"><div class="panel-body metric"><span>Clienti attivi</span><strong>${state.data.clients.length}</strong></div></section>
      <section class="panel"><div class="panel-body metric"><span>Documenti condivisi</span><strong>${visibleDocs}</strong></div></section>
    </div>
    <br />
    <div class="grid two">
      <section class="panel">
        <div class="panel-header"><h2>Progetti recenti</h2></div>
        <div class="panel-body project-list">${projectRows(state.data.projects)}</div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Scadenze</h2></div>
        <div class="panel-body event-list">${eventRows()}</div>
      </section>
    </div>
  `;
}

function adminProjects() {
  return `
    <div class="topbar">
      <div>
        <h1>Progetti</h1>
        <p>Crea pratiche, assegna il cliente e aggiorna lo stato visibile nel portale cliente.</p>
      </div>
    </div>
    <div class="grid two">
      <section class="panel">
        <div class="panel-header"><h2>Archivio progetti</h2></div>
        <div class="panel-body project-list">${projectRows(state.data.projects)}</div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Nuovo progetto</h2></div>
        <form class="panel-body form-grid" data-form="project">
          <div class="field wide"><label>Titolo</label><input name="title" required /></div>
          <div class="field"><label>Cliente</label><select name="clientId" required>${clientOptions()}</select></div>
          <div class="field"><label>Stato</label><select name="status"><option>In corso</option><option>In attesa</option><option>Completato</option></select></div>
          <div class="field wide"><label>Indirizzo</label><input name="address" /></div>
          <div class="field"><label>Fase</label><input name="phase" value="Avvio incarico" /></div>
          <div class="field"><label>Avanzamento %</label><input name="progress" type="number" min="0" max="100" value="5" /></div>
          <div class="field wide"><label>Prossima azione</label><textarea name="nextAction">Definire la prossima azione operativa.</textarea></div>
          <div class="field"><label>A carico di</label><select name="nextActionOwner"><option>Studio</option><option>Cliente</option><option>Nessuno</option></select></div>
          <div class="field"><label>Scadenza prossima azione</label><input name="nextActionDue" value="Da definire" /></div>
          <div class="field wide"><label>Descrizione</label><textarea name="description"></textarea></div>
          <button class="button wide" type="submit">Crea progetto</button>
        </form>
      </section>
    </div>
  `;
}

function adminProjectDetail() {
  const project = currentProject();
  if (!project) {
    return `
      <div class="topbar">
        <div>
          <h1>Nessun progetto selezionato</h1>
          <p>Torna all'archivio progetti e apri una pratica.</p>
        </div>
        <button class="button secondary" data-route-inline="projects">Torna ai progetti</button>
      </div>
    `;
  }
  const projectDocuments = state.data.documents.filter((doc) => doc.projectId === project.id);
  return `
    <div class="topbar project-topbar">
      <div>
        <h1>${escapeHtml(project.title)}</h1>
        <p>${escapeHtml(project.description)}</p>
      </div>
      <div class="toolbar">
        <button class="button secondary" data-route-inline="projects">Archivio progetti</button>
        <span class="status ${statusClass(project.status)}">${escapeHtml(project.status)}</span>
      </div>
    </div>
    <div class="project-console">
      <section class="project-section">
        <div class="section-heading">
          <span>01</span>
          <div><h2>Panoramica</h2><p>Informazioni che descrivono lo stato generale del progetto.</p></div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            ${nextActionPanel(project)}
            <section class="panel">
              <div class="panel-header"><h2>Dati progetto</h2><span class="readonly-pill">Vista</span></div>
              <div class="panel-body">
                <dl class="info-table">
                  <dt>Cliente</dt><dd>${escapeHtml(project.client)}</dd>
                  <dt>Indirizzo</dt><dd>${escapeHtml(project.address)}</dd>
                  <dt>Fase</dt><dd>${escapeHtml(project.phase)}</dd>
                  <dt>Avanzamento</dt><dd>${escapeHtml(project.progress)}%</dd>
                  <dt>Aggiornato</dt><dd>${escapeHtml(project.updatedAt)}</dd>
                </dl>
              </div>
            </section>
          </div>
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Modifica panoramica</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="projectUpdate" data-project-id="${escapeHtml(project.id)}">
                <div class="field wide"><label>Titolo</label><input name="title" value="${escapeHtml(project.title)}" required /></div>
                <div class="field wide"><label>Indirizzo</label><input name="address" value="${escapeHtml(project.address)}" /></div>
                <div class="field"><label>Stato</label><select name="status">
                  ${["In corso", "In attesa", "Completato"].map((status) => `<option ${project.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select></div>
                <div class="field"><label>Avanzamento %</label><input name="progress" type="number" min="0" max="100" value="${escapeHtml(project.progress)}" /></div>
                <div class="field wide"><label>Fase</label><input name="phase" value="${escapeHtml(project.phase)}" /></div>
                <div class="field wide"><label>Prossima azione</label><textarea name="nextAction">${escapeHtml(project.nextAction || "")}</textarea></div>
                <div class="field"><label>A carico di</label><select name="nextActionOwner">
                  ${["Studio", "Cliente", "Nessuno"].map((owner) => `<option ${project.nextActionOwner === owner ? "selected" : ""}>${owner}</option>`).join("")}
                </select></div>
                <div class="field"><label>Scadenza</label><input name="nextActionDue" value="${escapeHtml(project.nextActionDue || "")}" /></div>
                <div class="field wide"><label>Descrizione</label><textarea name="description">${escapeHtml(project.description)}</textarea></div>
                <button class="button wide" type="submit">Salva panoramica</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section">
        <div class="section-heading">
          <span>02</span>
          <div><h2>Checklist operativa</h2><p>Punti di avanzamento e nuove attivita' nello stesso blocco.</p></div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            <section class="panel">
              <div class="panel-header"><h2>Checklist progetto</h2><span class="readonly-pill">Vista</span></div>
              <div class="panel-body checklist">${checklistRows(project.id)}</div>
            </section>
          </div>
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Aggiungi voce</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="checklist">
                <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
                <div class="field wide"><label>Voce</label><input name="label" required /></div>
                <div class="field wide"><label>Stato</label><select name="status"><option>Da fare</option><option>In corso</option><option>Completato</option></select></div>
                <button class="button wide" type="submit">Aggiungi alla checklist</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section">
        <div class="section-heading">
          <span>03</span>
          <div><h2>Richieste al cliente</h2><p>Richieste pubblicate al cliente e modulo per crearne una nuova.</p></div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            <section class="panel">
              <div class="panel-header"><h2>Richieste pubblicate</h2><span class="readonly-pill">Vista</span></div>
              <div class="panel-body request-list">${requestRows(project.id)}</div>
            </section>
          </div>
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Nuova richiesta</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="request">
                <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
                <div class="field wide"><label>Titolo</label><input name="title" required /></div>
                <div class="field wide"><label>Testo richiesta</label><textarea name="body" required></textarea></div>
                <div class="field"><label>Stato</label><select name="status"><option>Aperta</option><option>In attesa cliente</option><option>Completata</option></select></div>
                <div class="field"><label>Scadenza</label><input name="dueDate" value="Da definire" /></div>
                <button class="button wide" type="submit">Pubblica richiesta</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section">
        <div class="section-heading">
          <span>04</span>
          <div><h2>Documentazione</h2><p>Documenti collegati alla pratica e registrazione di nuovi file.</p></div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            <section class="panel">
              <div class="panel-header"><h2>Documenti del progetto</h2><span class="readonly-pill">Vista</span></div>
              <div class="panel-body document-list">${documentRows(projectDocuments)}</div>
            </section>
          </div>
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Aggiungi documento</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="document">
                <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
                <div class="field wide"><label>Nome documento</label><input name="title" required /></div>
                <div class="field wide"><label>File</label><input name="file" type="file" /></div>
                <div class="field"><label>Tipo</label><input name="type" value="PDF" /></div>
                <div class="field"><label>Versione</label><input name="version" value="v1.0" /></div>
                <div class="field wide"><label>Visibilita'</label><select name="visibility"><option>Cliente</option><option>Interno</option></select></div>
                <button class="button wide" type="submit">Registra documento</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section">
        <div class="section-heading">
          <span>05</span>
          <div><h2>Aggiornamenti</h2><p>Timeline visibile al cliente e nuovo aggiornamento da pubblicare.</p></div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            <section class="panel">
              <div class="panel-header"><h2>Timeline pubblicata</h2><span class="readonly-pill">Vista</span></div>
              <div class="panel-body timeline">${timelineRows(project.id)}</div>
            </section>
          </div>
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Nuovo aggiornamento</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="timeline">
                <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
                <div class="field wide"><label>Titolo</label><input name="title" required /></div>
                <div class="field wide"><label>Testo</label><textarea name="body" required></textarea></div>
                <button class="button wide" type="submit">Pubblica aggiornamento</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section">
        <div class="section-heading">
          <span>06</span>
          <div><h2>Calendario</h2><p>Scadenze presenti e creazione di nuovi appuntamenti o promemoria.</p></div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            <section class="panel">
              <div class="panel-header"><h2>Scadenze progetto</h2><span class="readonly-pill">Vista</span></div>
              <div class="panel-body event-list">${eventRows(project.id)}</div>
            </section>
          </div>
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Nuova scadenza</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="event">
                <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
                <div class="field"><label>Giorno</label><input name="day" maxlength="2" placeholder="07" required /></div>
                <div class="field"><label>Mese</label><input name="month" maxlength="3" placeholder="MAG" required /></div>
                <div class="field wide"><label>Titolo</label><input name="title" required /></div>
                <div class="field wide"><label>Nota</label><textarea name="note"></textarea></div>
                <button class="button wide" type="submit">Aggiungi scadenza</button>
              </form>
            </section>
          </div>
        </div>
      </section>
    </div>
  `;
}

function adminDocuments() {
  return `
    <div class="topbar">
      <div>
        <h1>Documenti</h1>
        <p>Console generale per pubblicare documenti, aggiornamenti e scadenze senza entrare nel singolo progetto.</p>
      </div>
    </div>
    <div class="project-console">
      <section class="project-section">
        <div class="section-heading">
          <span>01</span>
          <div><h2>Documenti</h2><p>Archivio e caricamento documento sono nella stessa area.</p></div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            <section class="panel">
              <div class="panel-header"><h2>Documenti recenti</h2><span class="readonly-pill">Vista</span></div>
              <div class="panel-body document-list">${documentRows(state.data.documents)}</div>
            </section>
          </div>
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Nuovo documento</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="document">
                <div class="field wide"><label>Progetto</label><select name="projectId">${projectOptions()}</select></div>
                <div class="field wide"><label>Nome documento</label><input name="title" required /></div>
                <div class="field wide"><label>File</label><input name="file" type="file" /></div>
                <div class="field"><label>Tipo</label><input name="type" value="PDF" /></div>
                <div class="field"><label>Versione</label><input name="version" value="v1.0" /></div>
                <div class="field wide"><label>Visibilita'</label><select name="visibility"><option>Cliente</option><option>Interno</option></select></div>
                <button class="button wide" type="submit">Registra documento</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section">
        <div class="section-heading">
          <span>02</span>
          <div><h2>Aggiornamenti e scadenze</h2><p>Pubblicazioni rapide per il progetto selezionato.</p></div>
        </div>
        <div class="section-grid even">
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Nuovo aggiornamento timeline</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="timeline">
                <div class="field wide"><label>Progetto</label><select name="projectId">${projectOptions()}</select></div>
                <div class="field wide"><label>Titolo</label><input name="title" required /></div>
                <div class="field wide"><label>Testo</label><textarea name="body" required></textarea></div>
                <button class="button wide" type="submit">Pubblica aggiornamento</button>
              </form>
            </section>
          </div>
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Nuova scadenza</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="event">
                <div class="field wide"><label>Progetto</label><select name="projectId">${projectOptions()}</select></div>
                <div class="field"><label>Giorno</label><input name="day" maxlength="2" placeholder="07" required /></div>
                <div class="field"><label>Mese</label><input name="month" maxlength="3" placeholder="MAG" required /></div>
                <div class="field wide"><label>Titolo</label><input name="title" required /></div>
                <div class="field wide"><label>Nota</label><textarea name="note"></textarea></div>
                <button class="button wide" type="submit">Aggiungi scadenza</button>
              </form>
            </section>
          </div>
        </div>
      </section>
    </div>
  `;
}

function adminClients() {
  return `
    <div class="topbar">
      <div>
        <h1>Clienti e accessi</h1>
        <p>Crea accessi personali e collega ogni cliente ai propri progetti.</p>
      </div>
    </div>
    <div class="grid two">
      <section class="panel">
        <div class="panel-header"><h2>Rubrica clienti</h2></div>
        <div class="panel-body client-list">
          ${state.data.clients
            .map(
              (client) => `
            <div class="row-item">
              <span><strong>${escapeHtml(client.name)}</strong><span>${escapeHtml(client.email)} · ${escapeHtml(client.phone)}</span></span>
              <span class="status progress">Accesso cliente</span>
            </div>
          `,
            )
            .join("")}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Nuovo cliente</h2></div>
        <form class="panel-body form-grid" data-form="client">
          <div class="field wide"><label>Nome cliente</label><input name="name" required /></div>
          <div class="field"><label>Email</label><input name="email" type="email" required /></div>
          <div class="field"><label>Telefono</label><input name="phone" /></div>
          <div class="field"><label>Username</label><input name="username" required /></div>
          <div class="field"><label>Password temporanea</label><input name="password" required /></div>
          <button class="button wide" type="submit">Crea cliente e accesso</button>
        </form>
      </section>
    </div>
  `;
}

function clientOverview() {
  const project = currentProject();
  return `
    <div class="topbar">
      <div>
        <h1>Buongiorno, ${escapeHtml(state.user.name)}</h1>
        <p>Area in sola lettura: qui trovi solo le informazioni pubblicate dallo studio sui tuoi progetti.</p>
      </div>
    </div>
    <div class="grid two">
      <section class="panel">
        <div class="panel-header"><h2>I tuoi progetti</h2><span class="readonly-pill">Sola lettura</span></div>
        <div class="panel-body project-list">${projectRows(accessibleProjects())}</div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Prossime scadenze</h2></div>
        <div class="panel-body event-list">${project ? eventRows(project.id) : ""}</div>
      </section>
    </div>
    <br />
    <section class="panel">
      <div class="panel-header"><h2>Ultimi aggiornamenti</h2></div>
      <div class="panel-body timeline">${project ? timelineRows(project.id) : ""}</div>
    </section>
  `;
}

function clientProject() {
  const project = currentProject();
  if (!project) return emptyClientState();
  return `
    <div class="topbar">
      <div>
        <h1>${escapeHtml(project.title)}</h1>
        <p>${escapeHtml(project.description)}</p>
      </div>
      <span class="status ${statusClass(project.status)}">${escapeHtml(project.status)}</span>
    </div>
    <div class="project-layout">
      <div class="grid">
        ${nextActionPanel(project)}
        <section class="panel">
          <div class="panel-header"><h2>Timeline progetto</h2></div>
          <div class="panel-body timeline">${timelineRows(project.id)}</div>
        </section>
      </div>
      <aside class="grid">
        <section class="panel">
          <div class="panel-header"><h2>Informazioni</h2><span class="readonly-pill">Sola lettura</span></div>
          <div class="panel-body">
            <dl class="info-table">
              <dt>Cliente</dt><dd>${escapeHtml(project.client)}</dd>
              <dt>Indirizzo</dt><dd>${escapeHtml(project.address)}</dd>
              <dt>Fase</dt><dd>${escapeHtml(project.phase)}</dd>
              <dt>Avanzamento</dt><dd>${escapeHtml(project.progress)}%</dd>
              <dt>Aggiornato</dt><dd>${escapeHtml(project.updatedAt)}</dd>
            </dl>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header"><h2>Documenti progetto</h2></div>
          <div class="panel-body document-list">${documentRows(state.data.documents.filter((doc) => doc.projectId === project.id))}</div>
        </section>
      </aside>
    </div>
    <br />
    <div class="grid two">
      <section class="panel">
        <div class="panel-header"><h2>Checklist progetto</h2><span class="readonly-pill">Sola lettura</span></div>
        <div class="panel-body checklist">${checklistRows(project.id)}</div>
      </section>
      <section class="panel">
        <div class="panel-header"><h2>Richieste al cliente</h2><span class="readonly-pill">Sola lettura</span></div>
        <div class="panel-body request-list">${requestRows(project.id)}</div>
      </section>
    </div>
  `;
}

function clientDocuments() {
  const project = currentProject();
  if (!project) return emptyClientState();
  return `
    <div class="topbar">
      <div>
        <h1>Documenti condivisi</h1>
        <p>Documenti messi a disposizione dallo studio per il progetto selezionato.</p>
      </div>
    </div>
    <section class="panel">
      <div class="panel-header"><h2>${escapeHtml(project.title)}</h2><span class="readonly-pill">Sola lettura</span></div>
      <div class="panel-body document-list">${documentRows(state.data.documents.filter((doc) => doc.projectId === project.id))}</div>
    </section>
  `;
}

function clientCalendar() {
  const project = currentProject();
  if (!project) return emptyClientState();
  return `
    <div class="topbar">
      <div>
        <h1>Calendario</h1>
        <p>Scadenze, appuntamenti e controlli condivisi con lo studio.</p>
      </div>
    </div>
    <section class="panel">
      <div class="panel-header"><h2>Prossimi eventi</h2><span class="readonly-pill">Sola lettura</span></div>
      <div class="panel-body event-list">${eventRows(project.id)}</div>
    </section>
  `;
}

function emptyClientState() {
  return `
    <div class="topbar">
      <div>
        <h1>Nessun progetto disponibile</h1>
        <p>Lo studio non ha ancora pubblicato progetti per questo accesso.</p>
      </div>
    </div>
  `;
}

function bindWorkspaceActions() {
  document.querySelectorAll("[data-project]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedProjectId = button.dataset.project;
      state.route = state.user.role === "Geometra" ? "projectDetail" : "project";
      renderWorkspace();
    });
  });

  document.querySelectorAll("[data-route-inline]").forEach((button) => {
    button.addEventListener("click", () => {
      state.route = button.dataset.routeInline;
      renderWorkspace();
    });
  });
}

function formValues(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function bindAdminForms() {
  const endpoints = {
    project: "/api/projects",
    document: "/api/documents",
    timeline: "/api/timeline",
    event: "/api/events",
    client: "/api/clients",
    checklist: "/api/checklist",
    request: "/api/requests",
  };
  document.querySelectorAll("[data-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const type = form.dataset.form;
      try {
        if (type === "projectUpdate") {
          await api(`/api/projects/${encodeURIComponent(form.dataset.projectId)}`, {
            method: "PATCH",
            body: JSON.stringify(formValues(form)),
          });
        } else if (type === "document") {
          await api(endpoints[type], {
            method: "POST",
            body: new FormData(form),
          });
        } else {
          await api(endpoints[type], {
            method: "POST",
            body: JSON.stringify(formValues(form)),
          });
        }
        await loadBootstrap();
        renderWorkspace();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

async function start() {
  try {
    await loadBootstrap();
    renderWorkspace();
  } catch {
    renderLogin();
  }
}

start();
