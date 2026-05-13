const app = document.querySelector("#app");
const demoParams = new URLSearchParams(window.location.search);
const isDemoMode = window.location.pathname.replace(/\/$/, "") === "/demo" || demoParams.get("demo") === "1";
const renderDemoUrl = "https://inbolla.onrender.com/";

const state = {
  user: null,
  route: "overview",
  selectedProjectId: null,
  uploadRequestId: null,
  adminModal: "",
  selectedTaskId: "",
  selectedHistoryType: "",
  selectedHistoryId: "",
  hideCompletedTasks: false,
  adminScheduleView: "timeline",
  pendingScrollTarget: "",
  calendarView: "list",
  documentFilters: {
    search: "",
    clientId: "",
    projectId: "",
    folderId: "",
    status: "",
  },
  data: {
    clients: [],
    projects: [],
    documents: [],
    documentFolders: [],
    timeline: [],
    events: [],
    checklist: [],
    requests: [],
    notifications: [],
  },
};

function statusClass(status) {
  if (status === "Completato" || status === "Definitivo" || status === "Done") return "done";
  if (status === "Bloccato") return "blocked";
  if (status === "In attesa" || status === "Bozza" || status === "Todo") return "waiting";
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

function formatEuro(value) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function demoUrl(route = "") {
  const isLocalPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  if (!isLocalPreview) return renderDemoUrl;
  const suffix = route ? `?view=${encodeURIComponent(route)}` : "";
  return `/demo${suffix}`;
}

function renderLanding() {
  app.className = "landing-shell";
  app.innerHTML = `
    <header class="site-header">
      <a class="site-logo" href="/">
        <img src="./assets/brand/inbolla-logo-full.png" alt="InBolla" />
      </a>
      <nav class="site-nav" aria-label="Navigazione principale">
        <a href="#come-funziona">Come funziona</a>
        <a href="#funzioni">Funzioni</a>
        <a href="#faq">FAQ</a>
        <a href="#contatti">Contatti</a>
      </nav>
      <div class="site-actions">
        <a class="button secondary" href="#contatti">Contattaci</a>
        <a class="button" href="${demoUrl()}">Demo</a>
      </div>
    </header>

    <section class="hero">
      <div class="hero-copy">
        <span class="eyebrow">Portale cliente per studi tecnici</span>
        <h1>Il cliente vede tutto chiaro. Il geometra lavora meglio.</h1>
        <p>
          InBolla trasforma la gestione della pratica in un’esperienza ordinata:
          documenti, scadenze e aggiornamenti sempre a portata di cliente.
        </p>
        <div class="hero-actions">
          <a class="button large" href="#contatti">Contattaci</a>
          <a class="button large secondary" href="${demoUrl()}">Guarda la demo</a>
        </div>
      </div>
      <div class="hero-product" aria-label="Anteprima piattaforma InBolla">
        <img class="mascot" src="./assets/brand/inbolla-mascot.png" alt="" />
        <div class="product-window">
          <div class="window-bar"><span></span><span></span><span></span></div>
          <div class="product-grid">
            <div>
              <small>Prossima azione</small>
              <strong>Attesa protocollo comunale</strong>
              <p>Scadenza: 07 Mag 2026</p>
            </div>
            <div>
              <small>Documenti condivisi</small>
              <strong>12</strong>
              <p>Versioni e allegati ordinati</p>
            </div>
            <div>
              <small>Stato pratica</small>
              <strong>Work in progress</strong>
              <p>Fase: pratica edilizia</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="statement-band">
      <article>
        <span>Per lo studio</span>
        <h2>Pratiche ordinate. Informazioni sempre aggiornate.</h2>
      </article>
      <article>
        <span>Per il cliente</span>
        <h2>Tutto è chiaro: date, documenti, richieste e prossimi passi.</h2>
      </article>
    </section>

    <section class="steps-section" id="come-funziona">
      <div class="section-title centered">
        <span class="eyebrow">Come funziona</span>
        <h2>Tre passaggi semplici.</h2>
      </div>
      <div class="steps-grid">
        <article>
          <span>1</span>
          <h3>Organizzi la pratica</h3>
          <p>Stato, fase, documenti e scadenze sono raccolti in un unico spazio.</p>
        </article>
        <article>
          <span>2</span>
          <h3>Condividi ciò che serve</h3>
          <p>Il cliente vede solo le informazioni utili, sempre ordinate e aggiornate.</p>
        </article>
        <article>
          <span>3</span>
          <h3>Riduci la confusione</h3>
          <p>Meno telefonate ripetitive, meno documenti dispersi, più fiducia.</p>
        </article>
      </div>
    </section>

    <section class="screens-section" id="funzioni">
      <div class="section-title centered">
        <span class="eyebrow">Funzioni principali</span>
        <h2>Prima chiarezza per il cliente. Poi controllo per lo studio.</h2>
      </div>
      <div class="feature-showcase">
        <article class="showcase-row">
          <img src="./assets/screenshots/demo-cliente.png" alt="Area cliente InBolla" />
          <div>
            <span class="eyebrow">Valore cliente</span>
            <h3>Il cliente entra e capisce subito.</h3>
            <p>Vede cosa è successo, cosa manca, quali documenti sono disponibili e quali scadenze deve ricordare.</p>
          </div>
        </article>
        <article class="showcase-row reverse">
          <img src="./assets/screenshots/demo-cruscotto.png" alt="Cruscotto studio InBolla" />
          <div>
            <span class="eyebrow">Back office</span>
            <h3>Lo studio mantiene tutto allineato.</h3>
            <p>Il geometra aggiorna pratiche, documenti e scadenze da un punto unico, senza disperdere informazioni.</p>
          </div>
        </article>
        <article class="showcase-row">
          <img src="./assets/screenshots/demo-pratica.png" alt="Gestione pratica InBolla" />
          <div>
            <span class="eyebrow">Pratica</span>
            <h3>Ogni pratica ha il suo spazio.</h3>
            <p>Panoramica, checklist, richieste, documenti, timeline e calendario restano collegati alla pratica giusta.</p>
          </div>
        </article>
      </div>
    </section>

    <section class="premium-band">
      <div>
        <span class="eyebrow">Perché ti serve</span>
        <h2>InBolla fa percepire meglio il valore del tuo lavoro e alleggerisce la gestione quotidiana del cliente.</h2>
        <p>
          Meno richieste ripetitive, meno documenti da rincorrere, più chiarezza su ogni pratica.
          Il cliente trova risposte ordinate prima ancora di doverle chiedere.
        </p>
      </div>
      <a class="button large" href="${demoUrl()}">Apri demo</a>
    </section>

    <section class="faq-section" id="faq">
      <div class="section-title centered">
        <span class="eyebrow">FAQ</span>
        <h2>Domande frequenti</h2>
      </div>
      <div class="faq-list">
        <details open>
          <summary>A chi serve InBolla?</summary>
          <p>A geometri e studi tecnici che vogliono dare ai clienti un accesso chiaro a pratiche, documenti, scadenze e aggiornamenti.</p>
        </details>
        <details>
          <summary>Il cliente può modificare i dati?</summary>
          <p>No. L’area cliente nasce come spazio ordinato e controllato: il cliente consulta ciò che lo studio decide di condividere.</p>
        </details>
        <details>
          <summary>Qual è il valore per lo studio?</summary>
          <p>Meno richieste ripetitive, meno documenti dispersi e una percezione più professionale del servizio offerto.</p>
        </details>
        <details>
          <summary>Serve installare qualcosa?</summary>
          <p>No. La piattaforma è pensata per essere accessibile online, sia dallo studio sia dal cliente.</p>
        </details>
      </div>
    </section>

    <section class="contact-band" id="contatti">
      <div class="contact-copy">
        <span class="eyebrow">Richiedi accesso</span>
        <h2>Vuoi provare InBolla nel tuo studio?</h2>
        <p>Lascia i tuoi dati: ti ricontatteremo per una demo e per capire come adattare la piattaforma al tuo flusso di lavoro.</p>
      </div>
      <form class="contact-form" id="contactForm" action="https://formspree.io/f/mnjwbaoz" method="POST">
        <input type="hidden" name="_subject" value="Nuova richiesta demo InBolla" />
        <div class="field"><label>Nome e cognome</label><input name="name" required /></div>
        <div class="field"><label>Studio</label><input name="studio" /></div>
        <div class="field"><label>Email</label><input name="email" type="email" required /></div>
        <div class="field"><label>Messaggio</label><textarea name="message" placeholder="Vorrei vedere una demo di InBolla"></textarea></div>
        <button class="button" type="submit">Invia richiesta</button>
        <p class="contact-note">La mail di destinazione verra' collegata appena definita.</p>
      </form>
    </section>

    <footer class="site-footer">
      <span>InBolla</span>
      <a href="${demoUrl()}">Apri demo</a>
      <a href="#contatti">Contattaci</a>
    </footer>
  `;

  document.querySelector("#contactForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const submit = form.querySelector("button[type='submit']");
    const note = form.querySelector(".contact-note");
    submit.disabled = true;
    note.textContent = "Invio richiesta in corso...";
    try {
      const response = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "Invio non riuscito. Riprova tra poco.");
      }
      form.reset();
      note.textContent = "Richiesta inviata. Ti ricontatteremo per fissare una demo.";
    } catch (error) {
      note.textContent = error.message;
    } finally {
      submit.disabled = false;
    }
  });
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
        <img class="brand-logo" src="./assets/brand/inbolla-mascot.png" alt="" />
        <div><strong>InBolla</strong><span>Portale clienti</span></div>
      </div>
      <nav class="nav">
        ${nav
          .map(
            ([route, iconName, label]) => {
              const isActive = state.route === route || (isAdmin && route === "projects" && state.route === "projectDetail");
              const projectSections =
                ((!isAdmin && route === "project") || (isAdmin && route === "projects" && state.route === "projectDetail")) && isActive
                  ? `
                    <div class="subnav">
                      ${
                        isAdmin
                          ? `
                            <button data-scroll-target="admin-overview">Panoramica</button>
                            <button data-scroll-target="admin-checklist">Checklist interna</button>
                            <button data-scroll-target="admin-documents">Documenti</button>
                            <button data-scroll-target="admin-schedule">Scadenzario</button>
                            <button data-scroll-target="admin-requests">Richieste</button>
                          `
                          : `
                            <button data-scroll-target="project-details">Dettagli</button>
                            <button data-scroll-target="project-timeline">Timeline</button>
                            <button data-scroll-target="project-documents">Documenti</button>
                            <button data-scroll-target="project-requests">Richieste</button>
                          `
                      }
                    </div>
                  `
                  : "";
              return `
                <button class="${isActive ? "active" : ""}" data-route="${route}">
                  <span class="nav-icon">${icon(iconName)}</span>${label}
                </button>
                ${projectSections}
              `;
            },
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

  document.querySelectorAll("[data-scroll-target]").forEach((button) => {
    button.addEventListener("click", () => {
      state.pendingScrollTarget = button.dataset.scrollTarget;
      if (state.route !== "project") state.route = "project";
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
  bindClientActions();
  scrollToPendingSection();
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

function documentActions(doc) {
  const href = doc.storageKey ? `/api/documents/${encodeURIComponent(doc.id)}/download` : "#";
  return `
    <a class="button secondary" href="${href}" target="_blank" rel="noreferrer">Apri</a>
    <a class="button secondary" href="${href}" download>Scarica</a>
  `;
}

function studioDocuments() {
  return state.data.documents.filter((doc) => doc.source !== "Cliente");
}

function clientUploadedDocuments() {
  return state.data.documents.filter((doc) => doc.source === "Cliente");
}

function documentTableRows(documents) {
  return documents
    .map(
      (doc) => `
      <div class="doc-table-row">
        <div>
          <strong>${escapeHtml(doc.title)}</strong>
          ${doc.tags ? `<span class="tag-list">${doc.tags.split(",").map((tag) => `<span>${escapeHtml(tag.trim())}</span>`).join("")}</span>` : ""}
        </div>
        <div>${escapeHtml(doc.version)}</div>
        <div>${escapeHtml(doc.comment || "Nessun commento")}</div>
        <div>${escapeHtml(doc.date)}</div>
        <div><span class="status ${statusClass(doc.documentStatus)}">${escapeHtml(doc.documentStatus || "Provvisorio")}</span></div>
        <div class="split-actions">${documentActions(doc)}</div>
      </div>
    `,
    )
    .join("");
}

function documentRows(documents, projectId = "", options = {}) {
  let folders = options.folders || state.data.documentFolders.filter((folder) => !projectId || folder.projectId === projectId);
  const folderIdForDocument = options.folderResolver || ((doc) => doc.folderId || "");
  if (state.user?.role === "Geometra" && state.route === "documents" && state.documentFilters.folderId) {
    folders = folders.filter((folder) => folder.id === state.documentFilters.folderId);
  }
  const visibleFolders = [
    ...folders,
    ...(documents.some((doc) => !doc.folderId)
      ? [{ id: "", name: "Senza cartella", description: "Documenti non ancora assegnati" }]
      : []),
  ];
  if (!visibleFolders.length) return `<div class="empty-state">Nessuna cartella documentale disponibile.</div>`;

  return `
    <div class="document-tree">
      ${visibleFolders
        .map((folder, index) => {
          const folderDocs = documents.filter((doc) => folderIdForDocument(doc) === folder.id);
          return `
            <details class="doc-folder" ${index === 0 ? "open" : ""}>
              <summary>
                <span>
                  <strong>${escapeHtml(folder.name)}</strong>
                  <small>${escapeHtml(folder.description || `${folderDocs.length} documenti`)}</small>
                </span>
                <span>${folderDocs.length}</span>
              </summary>
              <div class="doc-table">
                <div class="doc-table-head">
                  <span>Titolo documento</span>
                  <span>Versione</span>
                  <span>Commento</span>
                  <span>Data</span>
                  <span>Stato</span>
                  <span>Azioni</span>
                </div>
                ${folderDocs.length ? documentTableRows(folderDocs) : `<div class="doc-table-empty">Cartella vuota</div>`}
              </div>
            </details>
          `;
        })
        .join("")}
    </div>
  `;
}

function documentVersionOptions(projectId, folderId = "") {
  const docs = state.data.documents.filter(
    (doc) => doc.projectId === projectId && (!folderId || doc.folderId === folderId),
  );
  return `
    <option value="">Nuovo documento</option>
    ${docs
      .map((doc) => `<option value="${escapeHtml(doc.id)}">${escapeHtml(doc.title)} (${escapeHtml(doc.version)})</option>`)
      .join("")}
  `;
}

function tagSuggestions() {
  return [
    ...new Set(
      state.data.documents
        .flatMap((doc) => String(doc.tags || "").split(","))
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

function tagDatalist() {
  return `<datalist id="tagSuggestions">${tagSuggestions()
    .map((tag) => `<option value="${escapeHtml(tag)}"></option>`)
    .join("")}</datalist>`;
}

function documentFolderOptions(projectId) {
  const folders = state.data.documentFolders.filter((folder) => folder.projectId === projectId);
  if (!folders.length) return `<option value="">Senza cartella</option>`;
  return folders
    .map((folder) => `<option value="${escapeHtml(folder.id)}">${escapeHtml(folder.name)}</option>`)
    .join("");
}

function documentFilterOptions(items, selectedValue, label, valueKey = "id", labelKey = "name") {
  return `
    <option value="">${label}</option>
    ${items
      .map(
        (item) =>
          `<option value="${escapeHtml(item[valueKey])}" ${item[valueKey] === selectedValue ? "selected" : ""}>${escapeHtml(item[labelKey])}</option>`,
      )
      .join("")}
  `;
}

function documentFilterFolderOptions() {
  const projectId = state.documentFilters.projectId;
  const folders = state.data.documentFolders.filter((folder) => !projectId || folder.projectId === projectId);
  return documentFilterOptions(folders, state.documentFilters.folderId, "Tutte le cartelle");
}

function filteredDocuments() {
  const filters = state.documentFilters;
  const search = filters.search.trim().toLowerCase();
  return studioDocuments().filter((doc) => {
    const project = state.data.projects.find((item) => item.id === doc.projectId);
    const folder = state.data.documentFolders.find((item) => item.id === doc.folderId);
    const client = state.data.clients.find((item) => item.id === project?.clientId);
    const searchable = [doc.title, doc.comment, doc.tags, project?.title, client?.name, folder?.name]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return (
      (!search || searchable.includes(search)) &&
      (!filters.clientId || project?.clientId === filters.clientId) &&
      (!filters.projectId || doc.projectId === filters.projectId) &&
      (!filters.folderId || doc.folderId === filters.folderId) &&
      (!filters.status || doc.documentStatus === filters.status)
    );
  });
}

function documentExplorer() {
  const docs = filteredDocuments();
  const filteredProjects = state.data.projects.filter((project) => docs.some((doc) => doc.projectId === project.id));
  if (!docs.length) return `<div class="empty-state">Nessun documento trovato con questi filtri.</div>`;

  return state.data.clients
    .filter((client) => filteredProjects.some((project) => project.clientId === client.id))
    .map((client) => {
      const clientProjects = filteredProjects.filter((project) => project.clientId === client.id);
      return `
        <details class="client-document-group" open>
          <summary>
            <strong>${escapeHtml(client.name)}</strong>
            <span>${clientProjects.length} progetti</span>
          </summary>
          <div class="client-document-projects">
            ${clientProjects
              .map((project) => {
                const projectDocs = docs.filter((doc) => doc.projectId === project.id);
                return `
                  <section class="project-document-group">
                    <div class="project-document-heading">
                      <div>
                        <strong>${escapeHtml(project.title)}</strong>
                        <span>${escapeHtml(project.phase)} · ${escapeHtml(project.status)}</span>
                      </div>
                      <button class="button secondary" data-project="${escapeHtml(project.id)}">Apri progetto</button>
                    </div>
                    ${documentRows(projectDocs, project.id)}
                  </section>
                `;
              })
              .join("")}
          </div>
        </details>
      `;
    })
    .join("");
}

function uploadedByClientExplorer() {
  const docs = clientUploadedDocuments();
  if (!docs.length) return `<div class="empty-state">Nessun documento caricato dai clienti.</div>`;
  return state.data.clients
    .filter((client) =>
      state.data.projects.some(
        (project) => project.clientId === client.id && docs.some((doc) => doc.projectId === project.id),
      ),
    )
    .map((client) => {
      const projects = state.data.projects.filter(
        (project) => project.clientId === client.id && docs.some((doc) => doc.projectId === project.id),
      );
      return `
        <details class="client-document-group uploaded-group" open>
          <summary>
            <strong>${escapeHtml(client.name)}</strong>
            <span>${projects.length} progetti con invii</span>
          </summary>
          <div class="client-document-projects">
            ${projects
              .map((project) => {
                const projectDocs = docs.filter((doc) => doc.projectId === project.id);
                return `
                  <section class="project-document-group">
                    <div class="project-document-heading">
                      <div>
                        <strong>${escapeHtml(project.title)}</strong>
                        <span>Documenti caricati dal cliente</span>
                      </div>
                      <span class="status waiting">${projectDocs.length} file</span>
                    </div>
                    ${documentRows(projectDocs, project.id, { folders: [{ id: "client-uploads", name: "Documenti caricati dal cliente", description: "File inviati dal portale cliente" }], folderResolver: () => "client-uploads" })}
                  </section>
                `;
              })
              .join("")}
          </div>
        </details>
      `;
    })
    .join("");
}

function clientDocumentDashboard(projects = accessibleProjects()) {
  if (!projects.length) return `<div class="empty-state">Nessun progetto disponibile.</div>`;
  return `
    <div class="client-doc-dashboard">
      ${projects
        .map((project) => {
          const docs = state.data.documents.filter((doc) => doc.projectId === project.id && doc.visibility === "Cliente");
          return `
            <section class="project-document-group client-facing-docs">
              <div class="project-document-heading">
                <div>
                  <strong>${escapeHtml(project.title)}</strong>
                  <span>${escapeHtml(project.phase)} · ${escapeHtml(project.status)}</span>
                </div>
                <span class="readonly-pill">Sola lettura</span>
              </div>
              ${documentRows(docs, project.id)}
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

function projectPhotoGallery(project) {
  const photos = project.projectPhotos || [];
  return `
    <section class="panel">
      <div class="panel-header"><h2>Foto progetto</h2><span class="readonly-pill">Anteprima</span></div>
      <div class="panel-body">
        <div class="photo-grid" data-photo-gallery>
          ${
            photos.length
              ? photos
                  .map(
                    (photo) => `
                      <figure>
                        <img src="${escapeHtml(photo.url)}" alt="${escapeHtml(photo.caption || project.title)}" />
                        <figcaption>${escapeHtml(photo.caption || "Foto progetto")}</figcaption>
                      </figure>
                    `,
                  )
                  .join("")
              : `<div class="empty-state">Nessuna foto caricata per questo progetto.</div>`
          }
        </div>
      </div>
    </section>
  `;
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

function eventDetailList(projectId) {
  const events = state.data.events.filter((event) => event.projectId === projectId);
  if (!events.length) return `<div class="empty-state">Nessuna scadenza disponibile.</div>`;
  return `
    <div class="event-detail-list">
      ${events
        .map(
          (event) => `
            <article class="event-detail-card">
              <div class="date-badge">${escapeHtml(event.day)}<small>${escapeHtml(event.month)}</small></div>
              <div>
                <strong>${escapeHtml(event.title)}</strong>
                <p>${escapeHtml(event.note)}</p>
                <span class="readonly-pill">Evento progetto</span>
              </div>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
}

function calendarGrid(projectId, isAdminView = false) {
  const events = state.data.events.filter((event) => event.projectId === projectId);
  const days = Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0"));
  return `
    <div class="calendar-grid">
      ${days
        .map((day) => {
          const dayEvents = events.filter((event) => event.day === day);
          return `
            <div class="calendar-cell ${dayEvents.length ? "has-event" : ""}">
              <strong>${day}</strong>
              ${dayEvents
                .map((event) =>
                  isAdminView
                    ? `<button data-history-type="event" data-history-id="${escapeHtml(event.id)}" style="--item-color: ${escapeHtml(event.color || "#c78734")}">${escapeHtml(event.title)}</button>`
                    : `<span>${escapeHtml(event.title)}</span>`,
                )
                .join("")}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function projectHistoryItems(projectId) {
  const updates = state.data.timeline
    .filter((entry) => entry.projectId === projectId)
    .map((entry) => ({
      id: entry.id,
      type: "timeline",
      date: entry.date,
      title: entry.title,
      body: entry.body,
      kind: "Aggiornamento",
      color: entry.color || "#2f6f6d",
      visibility: entry.visibility || "Cliente",
    }));
  const events = state.data.events
    .filter((event) => event.projectId === projectId)
    .map((event) => ({
      id: event.id,
      type: "event",
      date: `${event.day} ${event.month} 2026`,
      title: event.title,
      body: event.note,
      kind: "Evento",
      day: event.day,
      month: event.month,
      color: event.color || "#c78734",
      visibility: event.visibility || "Cliente",
    }));
  return [...updates, ...events];
}

function adminSchedulePanel(projectId) {
  const items = projectHistoryItems(projectId);
  if (!items.length) return `<div class="empty-state">Nessun aggiornamento o evento disponibile.</div>`;
  if (state.adminScheduleView === "calendar") return calendarGrid(projectId, true);
  return `
    <div class="admin-schedule">
      <div class="horizontal-timeline admin-history-timeline">
        ${items
          .map(
            (item) => `
              <button class="timeline-card history-card" data-history-type="${escapeHtml(item.type)}" data-history-id="${escapeHtml(item.id)}" style="--item-color: ${escapeHtml(item.color)}">
                <span class="timeline-dot"></span>
                <time>${escapeHtml(item.date)}</time>
                <strong>${escapeHtml(item.title)}</strong>
                <p>${escapeHtml(item.body)}</p>
                <span class="timeline-kind">${escapeHtml(item.kind)}</span>
                <span class="visibility-pill ${item.visibility === "Cliente" ? "visible" : "hidden"}">${item.visibility === "Cliente" ? "Visibile al cliente" : "Interno"}</span>
              </button>
            `,
          )
          .join("")}
      </div>
    </div>
  `;
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

function timelineHorizontalRows(projectId) {
  const entries = projectHistoryItems(projectId);
  if (!entries.length) return `<div class="empty-state">Nessun aggiornamento pubblicato.</div>`;
  return entries
    .map(
      (entry) => `
        <article class="timeline-card">
          <span class="timeline-dot"></span>
          <time>${escapeHtml(entry.date)}</time>
          <strong>${escapeHtml(entry.title)}</strong>
          <p>${escapeHtml(entry.body)}</p>
          <span class="timeline-kind">${escapeHtml(entry.kind)}</span>
        </article>
      `,
    )
    .join("");
}

function clientProgressPanel(project) {
  return `
    <section class="panel client-progress-panel" id="project-timeline">
      <div class="panel-header"><h2>Prossimo step e timeline</h2><span class="readonly-pill">Sola lettura</span></div>
      <div class="panel-body">
        <div class="next-action client-next-action">
          <span class="eyebrow">Cosa succede adesso</span>
          <strong>${escapeHtml(project.nextAction || "Prossima azione da definire.")}</strong>
          <div class="next-action-meta">
            <span>A carico di: ${escapeHtml(project.nextActionOwner || "Studio")}</span>
            <span>Scadenza: ${escapeHtml(project.nextActionDue || "Da definire")}</span>
          </div>
        </div>
        <div class="horizontal-timeline">${timelineHorizontalRows(project.id)}</div>
      </div>
    </section>
  `;
}

function checklistRows(projectId) {
  const items = state.data.checklist.filter(
    (item) => item.projectId === projectId && (!state.hideCompletedTasks || item.status !== "Completato"),
  );
  if (!items.length) return `<div class="empty-state">Checklist non ancora compilata.</div>`;
  return items
    .map(
      (item) => `
      <div class="check-item task-row" data-task-detail="${escapeHtml(item.id)}">
        <span class="check-dot ${statusClass(item.status)}"></span>
        <span><strong>${escapeHtml(item.label)}</strong><br /><span class="muted">${escapeHtml(item.status)}</span></span>
        ${
          state.user.role === "Geometra"
            ? `
              <div class="task-actions">
                <select data-task-status="${escapeHtml(item.id)}" aria-label="Stato task">
                  ${["Da fare", "In corso", "Completato"].map((status) => `<option ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select>
                <button class="button secondary" data-task-open="${escapeHtml(item.id)}" type="button">Modifica</button>
                <button class="button secondary danger-button" data-delete-record="checklist:${escapeHtml(item.id)}" type="button">Elimina</button>
              </div>
            `
            : ""
        }
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
        <div class="request-actions">
          <span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span>
          ${
            state.user.role !== "Geometra" && item.uploadRequired && item.status !== "Caricato dal cliente"
              ? `<button class="button secondary" data-upload-request="${escapeHtml(item.id)}">Gestione</button>`
              : state.user.role !== "Geometra" && item.uploadRequired
                ? `<span class="readonly-pill">Documento inviato</span>`
              : ""
          }
        </div>
      </div>
    `,
    )
    .join("");
}

function uploadRequestModal() {
  if (!state.uploadRequestId) return "";
  const request = state.data.requests.find((item) => item.id === state.uploadRequestId);
  const project = request ? state.data.projects.find((item) => item.id === request.projectId) : null;
  if (!request || !project) return "";
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <section class="modal-panel">
        <div class="panel-header">
          <h2>Caricamento documenti personali</h2>
          <button class="button secondary" data-close-modal type="button">Chiudi</button>
        </div>
        <form class="panel-body form-grid" data-form="clientUpload" data-request-id="${escapeHtml(request.id)}">
          <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
          <input type="hidden" name="requestId" value="${escapeHtml(request.id)}" />
          <div class="field wide">
            <label>Richiesta</label>
            <input value="${escapeHtml(request.title)}" disabled />
          </div>
          <div class="field wide">
            <label>File richiesto</label>
            <input name="file" type="file" required />
          </div>
          <div class="field wide">
            <label>Nota per lo studio</label>
            <textarea name="comment" placeholder="Aggiungi una nota se serve"></textarea>
          </div>
          <button class="button wide" type="submit">Invia documento allo studio</button>
        </form>
      </section>
    </div>
  `;
}

function notificationRows() {
  const items = state.data.notifications || [];
  if (!items.length) return `<div class="empty-state">Nessuna notifica in coda.</div>`;
  return items
    .slice(0, 6)
    .map((item) => {
      const channel = item.channel || "Email";
      const recipient = channel === "WhatsApp/SMS" ? item.recipientPhone || item.recipientEmail : item.recipientEmail;
      return `
      <div class="row-item">
        <span>
          <strong>${escapeHtml(item.subject)}</strong>
          <span>${escapeHtml(recipient)} · ${escapeHtml(item.notificationType)} · ${escapeHtml(item.status)}</span>
        </span>
        <span class="status waiting">${escapeHtml(channel)}</span>
      </div>
    `;
    })
    .join("");
}

function adminModalShell(title, body) {
  if (!state.adminModal) return "";
  return `
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <section class="modal-panel admin-modal-panel">
        <div class="panel-header">
          <h2>${escapeHtml(title)}</h2>
          <button class="button secondary" data-close-admin-modal type="button">Chiudi</button>
        </div>
        ${body}
      </section>
    </div>
  `;
}

function projectCreateForm() {
  return `
    <form class="panel-body form-grid" data-form="project">
      <div class="field wide"><label>Titolo</label><input name="title" required /></div>
      <div class="field"><label>Cliente</label><select name="clientId" required>${clientOptions()}</select></div>
      <div class="field"><label>Stato</label><select name="status"><option>Todo</option><option>Work in progress</option><option>In attesa</option><option>Bloccato</option><option>Completato</option></select></div>
      <div class="field wide"><label>Indirizzo</label><input name="address" /></div>
      <div class="field"><label>Fase</label><input name="phase" value="Avvio incarico" /></div>
      <div class="field"><label>Importo lavori</label><input name="workAmount" type="number" min="0" value="0" /></div>
      <div class="field"><label>Compenso tecnico</label><input name="technicalFee" type="number" min="0" value="0" /></div>
      <div class="field wide"><label>Prossima azione</label><textarea name="nextAction">Definire la prossima azione operativa.</textarea></div>
      <div class="field"><label>A carico di</label><select name="nextActionOwner"><option>Studio</option><option>Cliente</option><option>Nessuno</option></select></div>
      <div class="field"><label>Scadenza prossima azione</label><input name="nextActionDue" value="Da definire" /></div>
      <div class="field wide"><label>Descrizione</label><textarea name="description"></textarea></div>
      <button class="button wide" type="submit">Crea progetto</button>
    </form>
  `;
}

function projectUpdateForm(project) {
  return `
    <form class="panel-body form-grid" data-form="projectUpdate" data-project-id="${escapeHtml(project.id)}">
      <div class="field wide"><label>Titolo</label><input name="title" value="${escapeHtml(project.title)}" required /></div>
      <div class="field wide"><label>Indirizzo</label><input name="address" value="${escapeHtml(project.address)}" /></div>
      <div class="field"><label>Stato</label><select name="status">
        ${["Todo", "Work in progress", "In attesa", "Bloccato", "Completato"].map((status) => `<option ${project.status === status ? "selected" : ""}>${status}</option>`).join("")}
      </select></div>
      <div class="field"><label>Importo lavori</label><input name="workAmount" type="number" min="0" value="${escapeHtml(project.workAmount || 0)}" /></div>
      <div class="field"><label>Compenso tecnico</label><input name="technicalFee" type="number" min="0" value="${escapeHtml(project.technicalFee || 0)}" /></div>
      <div class="field wide"><label>Fase</label><input name="phase" value="${escapeHtml(project.phase)}" /></div>
      <div class="field wide"><label>Prossima azione</label><textarea name="nextAction">${escapeHtml(project.nextAction || "")}</textarea></div>
      <div class="field"><label>A carico di</label><select name="nextActionOwner">
        ${["Studio", "Cliente", "Nessuno"].map((owner) => `<option ${project.nextActionOwner === owner ? "selected" : ""}>${owner}</option>`).join("")}
      </select></div>
      <div class="field"><label>Scadenza</label><input name="nextActionDue" value="${escapeHtml(project.nextActionDue || "")}" /></div>
      <div class="field wide"><label>Descrizione</label><textarea name="description">${escapeHtml(project.description)}</textarea></div>
      <div class="field wide"><label>Foto progetto</label><input name="projectPhotosPreview" type="file" accept="image/*" multiple data-photo-input /></div>
      <div class="field wide"><div class="photo-grid compact" data-photo-preview></div></div>
      <button class="button wide" type="submit">Salva panoramica</button>
    </form>
  `;
}

function checklistForm(project) {
  return `
    <form class="panel-body form-grid" data-form="checklist">
      <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
      <div class="field wide"><label>Voce</label><input name="label" required /></div>
      <div class="field wide"><label>Stato</label><select name="status"><option>Da fare</option><option>In corso</option><option>Completato</option></select></div>
      <button class="button wide" type="submit">Aggiungi alla checklist</button>
    </form>
  `;
}

function requestForm(project) {
  return `
    <form class="panel-body form-grid" data-form="request">
      <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
      <div class="field wide"><label>Titolo</label><input name="title" required /></div>
      <div class="field wide"><label>Testo richiesta</label><textarea name="body" required></textarea></div>
      <div class="field"><label>Stato</label><select name="status"><option>Aperta</option><option>In attesa cliente</option><option>Completata</option></select></div>
      <div class="field"><label>Scadenza</label><input name="dueDate" value="Da definire" /></div>
      <div class="field wide checkbox-field"><label><input name="uploadRequired" type="checkbox" value="true" /> Richiedi caricamento documento</label></div>
      <div class="field wide"><label>Documento richiesto</label><input name="requestedDocumentTitle" placeholder="es. Documento di identita', visura, delega firmata" /></div>
      <button class="button wide" type="submit">Pubblica richiesta</button>
    </form>
  `;
}

function documentFolderForm(projectId = state.selectedProjectId) {
  return `
    <form class="panel-body form-grid" data-form="documentFolder">
      <input type="hidden" name="projectId" value="${escapeHtml(projectId)}" />
      <div class="field wide"><label>Nome cartella</label><input name="name" placeholder="es. Planimetrie" required /></div>
      <div class="field wide"><label>Descrizione</label><input name="description" placeholder="Breve nota per questa categoria" /></div>
      <button class="button wide" type="submit">Crea cartella</button>
    </form>
  `;
}

function documentForm(project) {
  const firstFolder = state.data.documentFolders.find((folder) => folder.projectId === project.id)?.id || "";
  return `
    <form class="panel-body form-grid" data-form="document">
      <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
      <div class="field wide"><label>Cartella</label><select name="folderId">${documentFolderOptions(project.id)}</select></div>
      <div class="field wide"><label>Aggiorna documento esistente</label><select name="parentDocumentId">${documentVersionOptions(project.id, firstFolder)}</select></div>
      <div class="field wide"><label>Nome documento</label><input name="title" required /></div>
      <div class="field wide"><label>File</label><input name="file" type="file" /></div>
      <div class="field"><label>Versione</label><input name="version" value="v1.0" /></div>
      <div class="field"><label>Stato</label><select name="documentStatus"><option>Provvisorio</option><option>Bozza</option><option>Definitivo</option></select></div>
      <div class="field wide"><label>Commento breve</label><input name="comment" placeholder="Nota sintetica sul documento" /></div>
      <div class="field wide"><label>Tag</label><input name="tags" list="tagSuggestions" placeholder="es. comune, antincendio, definitivo" /></div>
      <div class="field wide"><label>Visibilita'</label><select name="visibility"><option>Cliente</option><option>Interno</option></select></div>
      <button class="button wide" type="submit">Registra documento</button>
    </form>
  `;
}

function timelineForm(project) {
  return `
    <form class="panel-body form-grid" data-form="timeline">
      <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
      <div class="field wide"><label>Titolo</label><input name="title" required /></div>
      <div class="field wide"><label>Testo</label><textarea name="body" required></textarea></div>
      <div class="field"><label>Colore</label><input name="color" type="color" value="#2f6f6d" /></div>
      <div class="field"><label>Visibilita'</label><select name="visibility"><option>Cliente</option><option>Interno</option></select></div>
      <button class="button wide" type="submit">Pubblica aggiornamento</button>
    </form>
  `;
}

function eventForm(project) {
  return `
    <form class="panel-body form-grid" data-form="event">
      <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
      <div class="field"><label>Giorno</label><input name="day" maxlength="2" placeholder="07" required /></div>
      <div class="field"><label>Mese</label><input name="month" maxlength="3" placeholder="MAG" required /></div>
      <div class="field wide"><label>Titolo</label><input name="title" required /></div>
      <div class="field wide"><label>Nota</label><textarea name="note"></textarea></div>
      <div class="field"><label>Colore</label><input name="color" type="color" value="#c78734" /></div>
      <div class="field"><label>Visibilita'</label><select name="visibility"><option>Cliente</option><option>Interno</option></select></div>
      <button class="button wide" type="submit">Aggiungi scadenza</button>
    </form>
  `;
}

function taskDetailForm() {
  const task = state.data.checklist.find((item) => item.id === state.selectedTaskId);
  if (!task) return `<div class="panel-body empty-state">Task non trovato.</div>`;
  return `
    <form class="panel-body form-grid" data-form="checklistUpdate" data-record-id="${escapeHtml(task.id)}">
      <div class="field wide"><label>Voce</label><input name="label" value="${escapeHtml(task.label)}" required /></div>
      <div class="field wide"><label>Stato</label><select name="status">
        ${["Da fare", "In corso", "Completato"].map((status) => `<option ${task.status === status ? "selected" : ""}>${status}</option>`).join("")}
      </select></div>
      <div class="field wide"><label>Note interne</label><textarea name="notes" placeholder="Appunti interni non visibili al cliente">${escapeHtml(task.notes || "")}</textarea></div>
      <button class="button" type="submit">Salva task</button>
      <button class="button secondary danger-button" data-delete-record="checklist:${escapeHtml(task.id)}" type="button">Elimina task</button>
    </form>
  `;
}

function historyDetailForm() {
  const collection = state.selectedHistoryType === "event" ? state.data.events : state.data.timeline;
  const item = collection.find((entry) => entry.id === state.selectedHistoryId);
  if (!item) return `<div class="panel-body empty-state">Elemento non trovato.</div>`;
  const isEvent = state.selectedHistoryType === "event";
  return `
    <form class="panel-body form-grid" data-form="${isEvent ? "eventUpdate" : "timelineUpdate"}" data-record-id="${escapeHtml(item.id)}">
      ${isEvent ? `<div class="field"><label>Giorno</label><input name="day" value="${escapeHtml(item.day)}" maxlength="2" required /></div><div class="field"><label>Mese</label><input name="month" value="${escapeHtml(item.month)}" maxlength="3" required /></div>` : `<div class="field wide"><label>Data</label><input name="date" value="${escapeHtml(item.date)}" /></div>`}
      <div class="field wide"><label>Titolo</label><input name="title" value="${escapeHtml(item.title)}" required /></div>
      <div class="field wide"><label>Testo</label><textarea name="${isEvent ? "note" : "body"}">${escapeHtml(isEvent ? item.note : item.body)}</textarea></div>
      <div class="field"><label>Colore</label><input name="color" type="color" value="${escapeHtml(item.color || (isEvent ? "#c78734" : "#2f6f6d"))}" /></div>
      <div class="field"><label>Visibilita'</label><select name="visibility"><option ${item.visibility !== "Interno" ? "selected" : ""}>Cliente</option><option ${item.visibility === "Interno" ? "selected" : ""}>Interno</option></select></div>
      <button class="button" type="submit">Salva voce</button>
      <button class="button secondary danger-button" data-delete-record="${isEvent ? "events" : "timeline"}:${escapeHtml(item.id)}" type="button">Elimina voce</button>
    </form>
  `;
}

function adminModalContent(project = currentProject()) {
  const modalMap = {
    projectCreate: ["Crea progetto", projectCreateForm()],
    projectUpdate: ["Modifica panoramica", project ? projectUpdateForm(project) : ""],
    checklist: ["Aggiungi voce checklist", project ? checklistForm(project) : ""],
    request: ["Nuova richiesta al cliente", project ? requestForm(project) : ""],
    folder: ["Crea cartella documentale", project ? documentFolderForm(project.id) : ""],
    document: ["Carica documento", project ? documentForm(project) : ""],
    timeline: ["Nuovo aggiornamento", project ? timelineForm(project) : ""],
    event: ["Nuova scadenza", project ? eventForm(project) : ""],
    taskDetail: ["Vista avanzata task", taskDetailForm()],
    historyDetail: ["Modifica voce scadenzario", historyDetailForm()],
  };
  const [title, body] = modalMap[state.adminModal] || ["", ""];
  return title ? adminModalShell(title, body) : "";
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
    <br />
    <section class="panel">
      <div class="panel-header"><h2>Notifiche email in coda</h2></div>
      <div class="panel-body client-list">${notificationRows()}</div>
    </section>
  `;
}

function adminProjects() {
  return `
    <div class="topbar">
      <div>
        <h1>Progetti</h1>
        <p>Crea pratiche, assegna il cliente e aggiorna lo stato visibile nel portale cliente.</p>
      </div>
      <button class="button" data-admin-modal="projectCreate">Crea progetto</button>
    </div>
    <section class="panel">
      <div class="panel-header"><h2>Archivio progetti</h2></div>
      <div class="panel-body project-list">${projectRows(state.data.projects)}</div>
    </section>
    ${adminModalContent()}
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
    <div class="project-console modal-managed">
      <section class="project-section overview-section" id="admin-overview">
        <div class="section-heading">
          <span>◈</span>
          <div><h2>Panoramica</h2><p>Informazioni che descrivono lo stato generale del progetto.</p></div>
          <div class="section-actions"><button class="button secondary" data-admin-modal="projectUpdate">Modifica</button></div>
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
                  <dt>Stato</dt><dd><span class="status ${statusClass(project.status)}">${escapeHtml(project.status)}</span></dd>
                  <dt>Importo lavori</dt><dd>${formatEuro(project.workAmount)}</dd>
                  <dt>Compenso tecnico</dt><dd>${formatEuro(project.technicalFee)}</dd>
                  <dt>Aggiornato</dt><dd>${escapeHtml(project.updatedAt)}</dd>
                </dl>
              </div>
            </section>
            ${projectPhotoGallery(project)}
          </div>
          <div class="write-zone">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Modifica panoramica</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="projectUpdate" data-project-id="${escapeHtml(project.id)}">
                <div class="field wide"><label>Titolo</label><input name="title" value="${escapeHtml(project.title)}" required /></div>
                <div class="field wide"><label>Indirizzo</label><input name="address" value="${escapeHtml(project.address)}" /></div>
                <div class="field"><label>Stato</label><select name="status">
                  ${["Todo", "Work in progress", "In attesa", "Bloccato", "Completato"].map((status) => `<option ${project.status === status ? "selected" : ""}>${status}</option>`).join("")}
                </select></div>
                <div class="field"><label>Importo lavori</label><input name="workAmount" type="number" min="0" value="${escapeHtml(project.workAmount || 0)}" /></div>
                <div class="field"><label>Compenso tecnico</label><input name="technicalFee" type="number" min="0" value="${escapeHtml(project.technicalFee || 0)}" /></div>
                <div class="field wide"><label>Fase</label><input name="phase" value="${escapeHtml(project.phase)}" /></div>
                <div class="field wide"><label>Prossima azione</label><textarea name="nextAction">${escapeHtml(project.nextAction || "")}</textarea></div>
                <div class="field"><label>A carico di</label><select name="nextActionOwner">
                  ${["Studio", "Cliente", "Nessuno"].map((owner) => `<option ${project.nextActionOwner === owner ? "selected" : ""}>${owner}</option>`).join("")}
                </select></div>
                <div class="field"><label>Scadenza</label><input name="nextActionDue" value="${escapeHtml(project.nextActionDue || "")}" /></div>
                <div class="field wide"><label>Descrizione</label><textarea name="description">${escapeHtml(project.description)}</textarea></div>
                <div class="field wide"><label>Foto progetto</label><input name="projectPhotosPreview" type="file" accept="image/*" multiple data-photo-input /></div>
                <div class="field wide"><div class="photo-grid compact" data-photo-preview></div></div>
                <button class="button wide" type="submit">Salva panoramica</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section checklist-section" id="admin-checklist">
        <div class="section-heading">
          <span>✓</span>
          <div><h2>Checklist operativa</h2><p>Uso interno dello studio: questa sezione non e' visibile al cliente.</p></div>
          <div class="section-actions">
            <button class="button secondary" data-toggle-completed-tasks>${state.hideCompletedTasks ? "Mostra completate" : "Nascondi completate"}</button>
            <button class="button secondary" data-admin-modal="checklist">Aggiungi voce</button>
          </div>
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

      <section class="project-section requests-section" id="admin-requests">
        <div class="section-heading">
          <span>!</span>
          <div><h2>Richieste al cliente</h2><p>Richieste pubblicate al cliente e modulo per crearne una nuova.</p></div>
          <div class="section-actions"><button class="button secondary" data-admin-modal="request">Nuova richiesta</button></div>
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
                <div class="field wide checkbox-field"><label><input name="uploadRequired" type="checkbox" value="true" /> Richiedi caricamento documento</label></div>
                <div class="field wide"><label>Documento richiesto</label><input name="requestedDocumentTitle" placeholder="es. Documento di identita', visura, delega firmata" /></div>
                <button class="button wide" type="submit">Pubblica richiesta</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section documents-section" id="admin-documents">
        <div class="section-heading">
          <span>▣</span>
          <div><h2>Documentazione</h2><p>Documenti collegati alla pratica e registrazione di nuovi file.</p></div>
          <div class="section-actions split-actions">
            <button class="button secondary" data-admin-modal="folder">Crea cartella</button>
            <button class="button" data-admin-modal="document">Carica documento</button>
          </div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            <section class="panel">
              <div class="panel-header"><h2>Documenti del progetto</h2><span class="readonly-pill">Vista</span></div>
              <div class="panel-body document-list">${documentRows(projectDocuments, project.id)}</div>
            </section>
          </div>
          <div class="write-zone stacked-actions">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Nuova cartella</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="documentFolder">
                <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
                <div class="field wide"><label>Nome cartella</label><input name="name" placeholder="es. Planimetrie" required /></div>
                <div class="field wide"><label>Descrizione</label><input name="description" placeholder="Breve nota per questa categoria" /></div>
                <button class="button wide" type="submit">Crea cartella</button>
              </form>
            </section>
            <section class="panel action-panel">
              <div class="panel-header"><h2>Carica documento</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="document">
                <input type="hidden" name="projectId" value="${escapeHtml(project.id)}" />
                <div class="field wide"><label>Cartella</label><select name="folderId">${documentFolderOptions(project.id)}</select></div>
                <div class="field wide"><label>Aggiorna documento esistente</label><select name="parentDocumentId">${documentVersionOptions(project.id, state.data.documentFolders.find((folder) => folder.projectId === project.id)?.id || "")}</select></div>
                <div class="field wide"><label>Nome documento</label><input name="title" required /></div>
                <div class="field wide"><label>File</label><input name="file" type="file" /></div>
                <div class="field"><label>Versione</label><input name="version" value="v1.0" /></div>
                <div class="field"><label>Stato</label><select name="documentStatus"><option>Provvisorio</option><option>Bozza</option><option>Definitivo</option></select></div>
                <div class="field wide"><label>Commento breve</label><input name="comment" placeholder="Nota sintetica sul documento" /></div>
                <div class="field wide"><label>Tag</label><input name="tags" list="tagSuggestions" placeholder="es. comune, antincendio, definitivo" /></div>
                <div class="field wide"><label>Visibilita'</label><select name="visibility"><option>Cliente</option><option>Interno</option></select></div>
                <div class="field wide checkbox-field"><label><input name="notifyChat" type="checkbox" value="true" /> Notifica al cliente via chat WhatsApp/SMS</label></div>
                <div class="field wide checkbox-field"><label><input name="notifyEmail" type="checkbox" value="true" checked /> Notifica al cliente via mail</label></div>
                <button class="button wide" type="submit">Registra documento</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section schedule-section" id="admin-schedule">
        <div class="section-heading">
          <span>↗</span>
          <div><h2>Scadenzario e aggiornamenti</h2><p>Timeline, eventi e visibilita' cliente gestiti in un unico punto.</p></div>
          <div class="section-actions split-actions">
            <button class="button secondary" data-admin-schedule-view="timeline">Timeline</button>
            <button class="button secondary" data-admin-schedule-view="calendar">Calendario</button>
            <button class="button secondary" data-admin-modal="timeline">Nuovo aggiornamento</button>
            <button class="button" data-admin-modal="event">Nuova scadenza</button>
          </div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            <section class="panel">
              <div class="panel-header"><h2>Storico e prossime scadenze</h2><span class="readonly-pill">Vista operativa</span></div>
              <div class="panel-body">${adminSchedulePanel(project.id)}</div>
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

      <section class="project-section legacy-calendar-section">
        <div class="section-heading">
          <span>□</span>
          <div><h2>Calendario</h2><p>Scadenze presenti e creazione di nuovi appuntamenti o promemoria.</p></div>
          <div class="section-actions"><button class="button secondary" data-admin-modal="event">Nuova scadenza</button></div>
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
    ${adminModalContent(project)}
    ${tagDatalist()}
  `;
}

function adminDocuments() {
  const selectedProject = state.documentFilters.projectId || state.selectedProjectId;
  const selectedFolder = state.data.documentFolders.find((folder) => folder.projectId === selectedProject)?.id || "";
  return `
    <div class="topbar">
      <div>
        <h1>Documenti</h1>
        <p>Archivio documentale organizzato per cliente, progetto e cartella, con ricerca e filtri operativi.</p>
      </div>
    </div>
    <div class="project-console">
      <section class="project-section">
        <div class="section-heading">
          <span>⌕</span>
          <div><h2>Archivio documentale</h2><p>Cerca per cliente, progetto, cartella, titolo documento o tag.</p></div>
        </div>
        <section class="panel">
          <form class="panel-body form-grid document-filters" data-document-filters>
            <div class="field wide"><label>Ricerca libera</label><input name="search" value="${escapeHtml(state.documentFilters.search)}" placeholder="Cerca documento, cliente, progetto, cartella o tag" /></div>
            <div class="field"><label>Cliente</label><select name="clientId">${documentFilterOptions(state.data.clients, state.documentFilters.clientId, "Tutti i clienti")}</select></div>
            <div class="field"><label>Progetto</label><select name="projectId">${documentFilterOptions(state.data.projects, state.documentFilters.projectId, "Tutti i progetti", "id", "title")}</select></div>
            <div class="field"><label>Cartella</label><select name="folderId">${documentFilterFolderOptions()}</select></div>
            <div class="field"><label>Stato documento</label><select name="status">
              <option value="">Tutti gli stati</option>
              ${["Provvisorio", "Bozza", "Definitivo"].map((status) => `<option ${state.documentFilters.status === status ? "selected" : ""}>${status}</option>`).join("")}
            </select></div>
          </form>
        </section>
        <section class="panel">
          <div class="panel-header"><h2>Documenti per cliente e progetto</h2><span class="readonly-pill">Vista</span></div>
          <div class="panel-body document-list">${documentExplorer()}</div>
        </section>
        <section class="panel">
          <div class="panel-header"><h2>Documenti caricati dal cliente</h2><span class="readonly-pill">Sezione separata</span></div>
          <div class="panel-body document-list">${uploadedByClientExplorer()}</div>
        </section>
      </section>

      <section class="project-section">
        <div class="section-heading">
          <span>▣</span>
          <div><h2>Caricamento documenti</h2><p>Le cartelle vuote restano visibili e i documenti aggiornabili sono filtrati dalla cartella scelta.</p></div>
        </div>
        <div class="section-grid">
          <div class="read-zone">
            <section class="panel">
              <div class="panel-header"><h2>Cartelle del progetto selezionato</h2><span class="readonly-pill">Vista</span></div>
              <div class="panel-body document-list">${documentRows(studioDocuments().filter((doc) => doc.projectId === selectedProject), selectedProject)}</div>
            </section>
          </div>
          <div class="write-zone stacked-actions">
            <section class="panel action-panel">
              <div class="panel-header"><h2>Nuova cartella</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="documentFolder">
                <div class="field wide"><label>Progetto</label><select name="projectId">${projectOptions(selectedProject)}</select></div>
                <div class="field wide"><label>Nome cartella</label><input name="name" placeholder="es. Pratiche comunali" required /></div>
                <div class="field wide"><label>Descrizione</label><input name="description" /></div>
                <button class="button wide" type="submit">Crea cartella</button>
              </form>
            </section>
            <section class="panel action-panel">
              <div class="panel-header"><h2>Nuovo documento</h2><span class="edit-pill">Gestione</span></div>
              <form class="panel-body form-grid" data-form="document">
                <div class="field wide"><label>Progetto</label><select name="projectId">${projectOptions(selectedProject)}</select></div>
                <div class="field wide"><label>Cartella</label><select name="folderId">${documentFolderOptions(selectedProject)}</select></div>
                <div class="field wide"><label>Aggiorna documento esistente</label><select name="parentDocumentId">${documentVersionOptions(selectedProject, selectedFolder)}</select></div>
                <div class="field wide"><label>Nome documento</label><input name="title" required /></div>
                <div class="field wide"><label>File</label><input name="file" type="file" /></div>
                <div class="field"><label>Versione</label><input name="version" value="v1.0" /></div>
                <div class="field"><label>Stato</label><select name="documentStatus"><option>Provvisorio</option><option>Bozza</option><option>Definitivo</option></select></div>
                <div class="field wide"><label>Commento breve</label><input name="comment" placeholder="Nota sintetica sul documento" /></div>
                <div class="field wide"><label>Tag</label><input name="tags" list="tagSuggestions" placeholder="es. comune, antincendio, definitivo" /></div>
                <div class="field wide"><label>Visibilita'</label><select name="visibility"><option>Cliente</option><option>Interno</option></select></div>
                <div class="field wide checkbox-field"><label><input name="notifyChat" type="checkbox" value="true" /> Notifica al cliente via chat WhatsApp/SMS</label></div>
                <div class="field wide checkbox-field"><label><input name="notifyEmail" type="checkbox" value="true" checked /> Notifica al cliente via mail</label></div>
                <button class="button wide" type="submit">Registra documento</button>
              </form>
            </section>
          </div>
        </div>
      </section>

      <section class="project-section">
        <div class="section-heading">
          <span>↗</span>
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
    ${tagDatalist()}
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
    <div class="client-project-main">
      <div class="grid two" id="project-details">
        <section class="panel">
          <div class="panel-header"><h2>Dettagli progetto</h2><span class="readonly-pill">Sola lettura</span></div>
          <div class="panel-body">
            <dl class="info-table">
              <dt>Cliente</dt><dd>${escapeHtml(project.client)}</dd>
              <dt>Indirizzo</dt><dd>${escapeHtml(project.address)}</dd>
              <dt>Fase</dt><dd>${escapeHtml(project.phase)}</dd>
              <dt>Stato</dt><dd><span class="status ${statusClass(project.status)}">${escapeHtml(project.status)}</span></dd>
              <dt>Aggiornato</dt><dd>${escapeHtml(project.updatedAt)}</dd>
            </dl>
          </div>
        </section>
        ${projectPhotoGallery(project)}
      </div>
      ${clientProgressPanel(project)}
      <section class="panel document-command-center" id="project-documents">
        <div class="panel-header"><h2>Documenti del progetto</h2><span class="readonly-pill">Sola lettura</span></div>
        <div class="panel-body document-list">${clientDocumentDashboard([project])}</div>
      </section>
      <section class="panel" id="project-requests">
        <div class="panel-header"><h2>Richieste al cliente</h2><span class="edit-pill">Azioni cliente</span></div>
        <div class="panel-body request-list">${requestRows(project.id)}</div>
      </section>
    </div>
    ${uploadRequestModal()}
  `;
}

function clientDocuments() {
  const projects = accessibleProjects();
  if (!projects.length) return emptyClientState();
  return `
    <div class="topbar">
      <div>
        <h1>Documenti condivisi</h1>
        <p>Cruscotto in sola lettura con progetti, cartelle e documenti pubblicati dallo studio.</p>
      </div>
    </div>
    <section class="panel document-command-center">
      <div class="panel-header"><h2>Archivio documentale cliente</h2><span class="readonly-pill">Sola lettura</span></div>
      <div class="panel-body document-list">${clientDocumentDashboard(projects)}</div>
    </section>
    <br />
    <section class="panel">
      <div class="panel-header"><h2>Richieste con caricamento</h2><span class="readonly-pill">Solo su richiesta</span></div>
      <div class="panel-body request-list">
        ${projects.map((project) => requestRows(project.id)).join("")}
      </div>
    </section>
    ${uploadRequestModal()}
  `;
}

function clientCalendar() {
  const project = currentProject();
  if (!project) return emptyClientState();
  return `
    <div class="topbar">
      <div>
        <h1>Eventi e scadenze</h1>
        <p>La stessa cronologia della pratica, consultabile come lista dettagliata o calendario operativo.</p>
      </div>
    </div>
    <section class="panel">
      <div class="panel-header">
        <h2>${escapeHtml(project.title)}</h2>
        <div class="tabbar compact-tabs">
          <button class="${state.calendarView === "list" ? "active" : ""}" data-calendar-view="list">Lista</button>
          <button class="${state.calendarView === "calendar" ? "active" : ""}" data-calendar-view="calendar">Calendario</button>
        </div>
      </div>
      <div class="panel-body">
        ${state.calendarView === "calendar" ? calendarGrid(project.id) : eventDetailList(project.id)}
      </div>
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

  document.querySelectorAll("[data-admin-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminModal = button.dataset.adminModal;
      renderWorkspace();
    });
  });

  document.querySelector("[data-close-admin-modal]")?.addEventListener("click", () => {
    state.adminModal = "";
    state.selectedTaskId = "";
    state.selectedHistoryId = "";
    state.selectedHistoryType = "";
    renderWorkspace();
  });

  document.querySelector("[data-toggle-completed-tasks]")?.addEventListener("click", () => {
    state.hideCompletedTasks = !state.hideCompletedTasks;
    renderWorkspace();
  });

  document.querySelectorAll("[data-task-detail]").forEach((element) => {
    element.addEventListener("click", (event) => {
      if (event.target.closest("select, button")) return;
      state.selectedTaskId = element.dataset.taskDetail;
      state.adminModal = "taskDetail";
      renderWorkspace();
    });
  });

  document.querySelectorAll("[data-task-open]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTaskId = button.dataset.taskOpen;
      state.adminModal = "taskDetail";
      renderWorkspace();
    });
  });

  document.querySelectorAll("[data-task-status]").forEach((select) => {
    select.addEventListener("change", async () => {
      await api(`/api/checklist/${encodeURIComponent(select.dataset.taskStatus)}`, {
        method: "PATCH",
        body: JSON.stringify({ status: select.value }),
      });
      await loadBootstrap();
      renderWorkspace();
    });
  });

  document.querySelectorAll("[data-history-id]").forEach((element) => {
    element.addEventListener("click", () => {
      state.selectedHistoryType = element.dataset.historyType;
      state.selectedHistoryId = element.dataset.historyId;
      state.adminModal = "historyDetail";
      renderWorkspace();
    });
  });

  document.querySelectorAll("[data-admin-schedule-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.adminScheduleView = button.dataset.adminScheduleView;
      renderWorkspace();
    });
  });

  document.querySelectorAll("[data-delete-record]").forEach((button) => {
    button.addEventListener("click", async () => {
      const [table, id] = button.dataset.deleteRecord.split(":");
      await api(`/api/${table}/${encodeURIComponent(id)}`, { method: "DELETE", body: "{}" });
      state.adminModal = "";
      state.selectedTaskId = "";
      state.selectedHistoryId = "";
      state.selectedHistoryType = "";
      await loadBootstrap();
      renderWorkspace();
    });
  });

  const filterForm = document.querySelector("[data-document-filters]");
  if (filterForm) {
    filterForm.addEventListener("input", () => {
      state.documentFilters = { ...state.documentFilters, ...formValues(filterForm) };
      renderWorkspace();
    });
    filterForm.addEventListener("change", () => {
      const values = formValues(filterForm);
      if (values.projectId !== state.documentFilters.projectId) values.folderId = "";
      state.documentFilters = { ...state.documentFilters, ...values };
      renderWorkspace();
    });
  }
}

function formValues(form) {
  return Object.fromEntries([...new FormData(form).entries()].filter(([, value]) => !(value instanceof File)));
}

function refreshDocumentFormOptions(form) {
  const projectSelect = form.querySelector("[name='projectId']");
  const folderSelect = form.querySelector("[name='folderId']");
  const versionSelect = form.querySelector("[name='parentDocumentId']");
  const projectId = projectSelect?.value || state.selectedProjectId || "";
  if (!projectId) return;

  if (folderSelect && projectSelect) {
    const currentFolder = folderSelect.value;
    folderSelect.innerHTML = documentFolderOptions(projectId);
    if ([...folderSelect.options].some((option) => option.value === currentFolder)) {
      folderSelect.value = currentFolder;
    }
  }

  if (versionSelect) {
    versionSelect.innerHTML = documentVersionOptions(projectId, folderSelect?.value || "");
  }
}

function bindDocumentFormControls(form) {
  refreshDocumentFormOptions(form);
  form.querySelector("[name='projectId']")?.addEventListener("change", () => refreshDocumentFormOptions(form));
  form.querySelector("[name='folderId']")?.addEventListener("change", () => refreshDocumentFormOptions(form));
}

function bindPhotoPreviews() {
  document.querySelectorAll("[data-photo-input]").forEach((input) => {
    input.addEventListener("change", () => {
      const preview = input.closest("form")?.querySelector("[data-photo-preview]");
      if (!preview) return;
      const files = [...input.files].filter((file) => file.type.startsWith("image/"));
      preview.innerHTML = files
        .map((file) => {
          const url = URL.createObjectURL(file);
          return `
            <figure>
              <img src="${url}" alt="${escapeHtml(file.name)}" />
              <figcaption>${escapeHtml(file.name)}</figcaption>
            </figure>
          `;
        })
        .join("");
    });
  });
}

function bindClientActions() {
  document.querySelectorAll("[data-upload-request]").forEach((button) => {
    button.addEventListener("click", () => {
      state.uploadRequestId = button.dataset.uploadRequest;
      renderWorkspace();
    });
  });

  document.querySelector("[data-close-modal]")?.addEventListener("click", () => {
    state.uploadRequestId = null;
    renderWorkspace();
  });

  document.querySelector("[data-form='clientUpload']")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await api("/api/client-documents", {
        method: "POST",
        body: new FormData(event.currentTarget),
      });
      state.uploadRequestId = null;
      await loadBootstrap();
      renderWorkspace();
    } catch (error) {
      alert(error.message);
    }
  });

  document.querySelectorAll("[data-calendar-view]").forEach((button) => {
    button.addEventListener("click", () => {
      state.calendarView = button.dataset.calendarView;
      renderWorkspace();
    });
  });
}

function scrollToPendingSection() {
  if (!state.pendingScrollTarget) return;
  const target = document.getElementById(state.pendingScrollTarget);
  state.pendingScrollTarget = "";
  target?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    documentFolder: "/api/document-folders",
  };
  document.querySelectorAll("[data-form='document']").forEach(bindDocumentFormControls);
  bindPhotoPreviews();
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
        } else if (type === "checklistUpdate") {
          await api(`/api/checklist/${encodeURIComponent(form.dataset.recordId)}`, {
            method: "PATCH",
            body: JSON.stringify(formValues(form)),
          });
        } else if (type === "timelineUpdate") {
          await api(`/api/timeline/${encodeURIComponent(form.dataset.recordId)}`, {
            method: "PATCH",
            body: JSON.stringify(formValues(form)),
          });
        } else if (type === "eventUpdate") {
          await api(`/api/events/${encodeURIComponent(form.dataset.recordId)}`, {
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
        state.adminModal = "";
        await loadBootstrap();
        renderWorkspace();
      } catch (error) {
        alert(error.message);
      }
    });
  });
}

async function start() {
  if (!isDemoMode) {
    renderLanding();
    return;
  }
  try {
    const autologin = demoParams.get("autologin");
    if (autologin === "geometra" || autologin === "cliente") {
      await api("/api/login", {
        method: "POST",
        body: JSON.stringify(
          autologin === "geometra"
            ? { username: "clementi", password: "studio" }
            : { username: "bianchi", password: "cliente" },
        ),
      });
    }
    await loadBootstrap();
    const requestedRoute = demoParams.get("view");
    if (requestedRoute) state.route = requestedRoute;
    renderWorkspace();
  } catch {
    renderLogin();
  }
}

start();
