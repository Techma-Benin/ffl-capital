const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const FIRST_NAMES = ["Jane", "Marcus", "Sarah", "Robert", "Emily", "David", "Lisa", "James"];
const LAST_NAMES = ["Doe", "Johnson", "Williams", "Davis", "Martinez", "Brown", "Wilson", "Taylor"];

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function defaultApiUrl() {
  if (window.location.origin && window.location.origin !== "null") {
    return `${window.location.origin}/api/leads/intake`;
  }
  return "http://localhost:3000/api/leads/intake";
}

function getApiUrl() {
  const stored = localStorage.getItem("ffl_feed_api_url");
  return stored || defaultApiUrl();
}

function isFileProtocol() {
  return window.location.protocol === "file:";
}

function formatFetchError(err, apiUrl) {
  if (!(err instanceof Error)) return "Network error";
  if (err.message === "Failed to fetch") {
    if (isFileProtocol()) {
      return `Cannot reach ${apiUrl}. Use http://localhost:3000/feeding-platform while npm run dev is running.`;
    }
    return `Cannot reach ${apiUrl}. Ensure npm run dev is running and the intake API URL is correct.`;
  }
  return err.message;
}

async function checkApiConnection(apiUrl) {
  try {
    const res = await fetch(apiUrl, { method: "OPTIONS" });
    return res.ok || res.status === 204;
  } catch {
    return false;
  }
}

function saveApiUrl(url) {
  localStorage.setItem("ffl_feed_api_url", url);
}

function setConnectionStatus(ok, apiUrl) {
  const el = $("#api-status");
  if (!el) return;
  if (ok) {
    el.textContent = "API reachable";
    el.className = "api-status ok";
    return;
  }
  el.textContent = isFileProtocol()
    ? "API unreachable — open http://localhost:3000/feeding-platform instead of this file"
    : `API unreachable — check ${apiUrl} and npm run dev`;
  el.className = "api-status fail";
}

function buildPayload(lead) {
  const id = lead.id || `feed-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const state = lead.state.toUpperCase();
  return {
    Lead_Type: "37",
    SRC: lead.source || "feeding_platform",
    Landing_Page: lead.landingPage || "https://example.com/iul-landing",
    Sub_ID: lead.subId || `feed-sub-${id}`,
    Pub_ID: lead.pubId || `feed-pub-${id}`,
    Unique_Identifier: id,
    First_Name: lead.firstName.trim(),
    Last_Name: lead.lastName.trim(),
    Address: lead.address || "123 Main St",
    City: lead.city || "Austin",
    State: state,
    Zip: lead.zip || "78701",
    Primary_Phone: lead.phone.trim(),
    Email: lead.email.trim(),
    DOB: lead.dob || "1985-06-15",
    Age: lead.age || "41",
    Have_IUL: lead.haveIul || "No",
    State_You_Currently_Live_In: state,
    Primary_Goal: lead.primaryGoal || "Retirement income",
    Intent: lead.intent || "High Intent",
    TCPA_Consent: lead.tcpaConsent || "Yes",
    TCPA_Language: lead.tcpaLanguage || "I agree to be contacted by phone or text.",
    Trusted_Form_URL:
      lead.trustedform?.trim() ||
      `https://cert.trustedform.com/feed-${id}`,
    LeadiD_Token: lead.leadidToken || "",
    IP_Address: lead.ipAddress || "203.0.113.10",
    User_Agent: lead.userAgent || "Mozilla/5.0 (feeding-platform)",
  };
}

async function submitLead(apiUrl, lead) {
  const payload = buildPayload(lead);
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data.outcome === "success";
  return {
    ok,
    status: res.status,
    data,
    label: `${payload.First_Name} ${payload.Last_Name} (${payload.State})`,
  };
}

function stateOptions(selected = "TX") {
  return US_STATES.map(
    (s) => `<option value="${s}"${s === selected ? " selected" : ""}>${s}</option>`,
  ).join("");
}

function intentOptions(selected = "High Intent") {
  const opts = ["High Intent", "Traditional"];
  return opts
    .map((o) => `<option value="${o}"${o === selected ? " selected" : ""}>${o}</option>`)
    .join("");
}

function randomLead(index = 0) {
  const fn = FIRST_NAMES[index % FIRST_NAMES.length];
  const ln = LAST_NAMES[(index * 3) % LAST_NAMES.length];
  const state = US_STATES[(index * 7) % US_STATES.length];
  const n = String(1000 + index).padStart(4, "0");
  return {
    firstName: fn,
    lastName: ln,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${n}@feed.test`,
    phone: `512555${n}`,
    state,
    intent: index % 2 === 0 ? "High Intent" : "Traditional",
    address: `${100 + index} Main St`,
    city: "Austin",
    zip: "78701",
    haveIul: index % 3 === 0 ? "Yes" : "No",
    primaryGoal: index % 2 === 0 ? "Retirement income" : "College funding",
  };
}

function emptyLead() {
  return {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    state: "TX",
    intent: "High Intent",
  };
}

function readRow(tr) {
  return {
    firstName: $(".row-first", tr)?.value ?? "",
    lastName: $(".row-last", tr)?.value ?? "",
    email: $(".row-email", tr)?.value ?? "",
    phone: $(".row-phone", tr)?.value ?? "",
    state: $(".row-state", tr)?.value ?? "TX",
    intent: $(".row-intent", tr)?.value ?? "High Intent",
  };
}

function isRowFilled(lead) {
  return !!(lead.firstName && lead.lastName && lead.email && lead.phone && lead.state);
}

function createBulkRow(lead = emptyLead()) {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td><input class="row-first" type="text" placeholder="Jane" value="${escapeAttr(lead.firstName)}" /></td>
    <td><input class="row-last" type="text" placeholder="Doe" value="${escapeAttr(lead.lastName)}" /></td>
    <td><input class="row-email" type="email" placeholder="jane@example.com" value="${escapeAttr(lead.email)}" /></td>
    <td><input class="row-phone" type="tel" placeholder="5125550100" value="${escapeAttr(lead.phone)}" /></td>
    <td><select class="row-state">${stateOptions(lead.state)}</select></td>
    <td><select class="row-intent">${intentOptions(lead.intent)}</select></td>
    <td class="col-actions"><button type="button" class="btn btn-ghost row-remove" title="Remove row">×</button></td>
  `;
  $(".row-remove", tr).addEventListener("click", () => {
    tr.remove();
    ensureMinRows();
  });
  return tr;
}

function escapeAttr(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function ensureMinRows() {
  const tbody = $("#bulk-tbody");
  if (tbody.children.length === 0) {
    tbody.appendChild(createBulkRow());
  }
}

function parseCsv(text) {
  const lines = text
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes("\t") ? "\t" : ",";
  const headers = lines[0].split(delimiter).map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));

  const hasHeader = headers.some((h) =>
    ["first_name", "firstname", "email", "phone", "state"].includes(h),
  );

  const start = hasHeader ? 1 : 0;
  const leads = [];

  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""));
    const row = {};

    if (hasHeader) {
      headers.forEach((h, idx) => {
        row[h] = cols[idx] ?? "";
      });
    } else if (cols.length >= 5) {
      row.first_name = cols[0];
      row.last_name = cols[1];
      row.email = cols[2];
      row.phone = cols[3];
      row.state = cols[4];
      row.intent = cols[5] ?? "High Intent";
    } else {
      continue;
    }

    const lead = {
      firstName: row.first_name || row.firstname || "",
      lastName: row.last_name || row.lastname || "",
      email: row.email || "",
      phone: row.phone || row.primary_phone || "",
      state: (row.state || "TX").toUpperCase().slice(0, 2),
      intent: row.intent || "High Intent",
    };

    if (isRowFilled(lead)) leads.push(lead);
  }

  return leads;
}

function renderResults(container, results) {
  const ok = results.filter((r) => r.ok).length;
  const fail = results.length - ok;
  const summary = $(".results-summary", container);
  const list = $(".result-list", container);

  summary.textContent = `${ok} succeeded, ${fail} failed (${results.length} total)`;
  summary.className = "results-summary";
  if (fail === 0 && ok > 0) summary.classList.add("ok");
  else if (ok === 0 && fail > 0) summary.classList.add("fail");
  else summary.classList.add("mixed");

  if (results.length === 0) {
    list.innerHTML = `<div class="empty-results">No submissions yet</div>`;
    return;
  }

  list.innerHTML = results
    .map(
      (r) => `
    <div class="result-item ${r.ok ? "success" : "error"}">
      <span class="result-icon">${r.ok ? "✓" : "✗"}</span>
      <div class="result-body">
        <strong>${escapeHtml(r.label)}</strong>
        <span>${r.ok ? "Accepted by intake API" : r.data?.reason || `HTTP ${r.status}`}</span>
      </div>
    </div>`,
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function setLoading(btn, loading, idleText, loadingText) {
  btn.disabled = loading;
  btn.innerHTML = loading
    ? `<span class="spinner"></span> ${loadingText}`
    : idleText;
}

function initTabs() {
  $$(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.tab;
      $$(".tab").forEach((t) => t.classList.toggle("active", t === tab));
      $$(".panel").forEach((p) => p.classList.toggle("active", p.id === `panel-${name}`));
    });
  });
}

function initConfig() {
  const input = $("#api-url");
  input.value = getApiUrl();
  $("#save-api").addEventListener("click", async () => {
    saveApiUrl(input.value.trim() || defaultApiUrl());
    input.value = getApiUrl();
    setConnectionStatus(await checkApiConnection(getApiUrl()), getApiUrl());
  });
  checkApiConnection(getApiUrl()).then((ok) => setConnectionStatus(ok, getApiUrl()));
}

function initSingle() {
  const form = $("#single-form");
  const btn = $("#single-submit");
  const resultsCard = $("#single-results");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const lead = {
      firstName: String(fd.get("firstName") ?? ""),
      lastName: String(fd.get("lastName") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      state: String(fd.get("state") ?? "TX"),
      intent: String(fd.get("intent") ?? "High Intent"),
      trustedform: String(fd.get("trustedform") ?? ""),
    };

    setLoading(btn, true, "Submit lead", "Submitting…");
    try {
      const result = await submitLead(getApiUrl(), lead);
      renderResults(resultsCard, [result]);
    } catch (err) {
      renderResults(resultsCard, [
        {
          ok: false,
          label: `${lead.firstName} ${lead.lastName}`,
          data: { reason: formatFetchError(err, getApiUrl()) },
          status: 0,
        },
      ]);
    } finally {
      setLoading(btn, false, "Submit lead", "Submitting…");
    }
  });

  $("#single-fill-sample").addEventListener("click", () => {
    const s = randomLead(0);
    form.firstName.value = s.firstName;
    form.lastName.value = s.lastName;
    form.email.value = s.email;
    form.phone.value = s.phone;
    form.state.value = s.state;
    form.intent.value = s.intent;
  });
}

function initBulk() {
  const tbody = $("#bulk-tbody");
  const submitBtn = $("#bulk-submit");
  const resultsCard = $("#bulk-results");

  for (let i = 0; i < 3; i++) {
    tbody.appendChild(createBulkRow());
  }

  $("#bulk-add-row").addEventListener("click", () => {
    tbody.appendChild(createBulkRow());
  });

  $("#bulk-add-random").addEventListener("click", () => {
    const count = Math.min(20, Math.max(1, Number($("#bulk-random-count").value) || 5));
    for (let i = 0; i < count; i++) {
      tbody.appendChild(createBulkRow(randomLead(Date.now() % 1000 + i)));
    }
  });

  $("#bulk-import-csv").addEventListener("click", () => {
    const text = $("#csv-paste").value;
    const leads = parseCsv(text);
    if (leads.length === 0) {
      alert("No valid rows found. Use columns: first_name, last_name, email, phone, state, intent");
      return;
    }
    tbody.innerHTML = "";
    leads.forEach((lead) => tbody.appendChild(createBulkRow(lead)));
  });

  $("#bulk-clear").addEventListener("click", () => {
    tbody.innerHTML = "";
    ensureMinRows();
  });

  submitBtn.addEventListener("click", async () => {
    const rows = $$("#bulk-tbody tr");
    const leads = rows.map(readRow).filter(isRowFilled);

    if (leads.length === 0) {
      alert("Add at least one complete row before submitting.");
      return;
    }

    setLoading(submitBtn, true, `Submit ${leads.length} lead(s)`, "Submitting…");
    const results = [];

    for (const lead of leads) {
      try {
        const result = await submitLead(getApiUrl(), lead);
        results.push(result);
      } catch (err) {
        results.push({
          ok: false,
          label: `${lead.firstName} ${lead.lastName} (${lead.state})`,
          data: { reason: formatFetchError(err, getApiUrl()) },
          status: 0,
        });
      }
    }

    renderResults(resultsCard, results);
    setLoading(
      submitBtn,
      false,
      `Submit ${leads.length} lead(s)`,
      "Submitting…",
    );
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  initConfig();
  initSingle();
  initBulk();
});
