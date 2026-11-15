const BASE = "https://" + "ngkmbpbdaachqymnfffe" + ".supabase.co";
const API_KEY = "sb_publishable_AmXkFCBMzNI96gloQZKMEw_irbyDCtB";
const HEADERS = {
  "apikey": API_KEY,
  "Authorization": "Bearer " + API_KEY,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

const MS = [
  "1. Created", "2. At Border", "3. Docs Checked", "4. Declaration",
  "5. Assessment", "6. Duty Paid", "7. Inspection", "8. Released",
  "9. Cleared to Go", "10. Delivered"
];

let companyId = null;
let list = [];
let docs = [];
let delays = [];
let expenses = [];
let clients = [];
let vehicles = [];
let drivers = [];
let messages = [];

let page = "overview", isSignup = false, filterBorder = "ALL";
let currentUser = JSON.parse(localStorage.getItem("bf_user") || "null");

const bdg = s => (s === "Cleared" || s === "Verified" || s === "Paid" || s === "Resolved" || s === "Active" || s === "Available")
  ? `<span class="b bg">${s}</span>`
  : (s === "Delayed" || s === "Unpaid" || s === "Flagged" || s === "Maintenance")
    ? `<span class="b br">${s}</span>`
    : `<span class="b ba">${s}</span>`;

async function sb(path, opts = {}) {
  const res = await fetch(BASE + "/rest/v1/" + path, {
    ...opts,
    headers: { ...HEADERS, ...(opts.headers || {}) }
  });
  if (!res.ok) {
    console.error("Supabase error:", path, await res.text());
    return null;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : [];
}

async function resolveCompany() {
  const name = (currentUser && currentUser.company) ? currentUser.company : "Beitbridge Customs Hub";
  const found = await sb(`companies?name=eq.${encodeURIComponent(name)}&limit=1`);
  if (found && found.length > 0) {
    companyId = found[0].id;
  } else {
    const created = await sb("companies", {
      method: "POST",
      body: JSON.stringify({ name, country: "Zimbabwe", currency: "USD" })
    });
    if (created && created.length > 0) companyId = created[0].id;
  }
}

async function loadAllData() {
  if (!companyId) await resolveCompany();
  const q = companyId ? `?company_id=eq.${companyId}&order=created_at.desc` : `?order=created_at.desc`;
  const [sRes, dRes, dlRes, eRes, cRes, vRes, drRes, mRes] = await Promise.all([
    sb("shipments" + q),
    sb("documents" + q),
    sb("delays" + q),
    sb("expenses" + q),
    sb("clients" + q),
    sb("vehicles" + q),
    sb("drivers" + q),
    sb("messages" + q)
  ]);

  list = (sRes || []).map((r, idx) => ({
    id: r.id,
    ref: r.reference_no || ("BF-" + (101 + idx)),
    client: r.cargo_description || "Zimplats Mining",
    cargo: r.cargo_description || "General Freight",
    route: (r.origin || "Johannesburg") + " → " + (r.destination || "Harare"),
    border: r.corridor || "Beitbridge",
    truck: r.truck_registration || "AGH 4821",
    milestone_step: MS.indexOf(r.stage) >= 0 ? MS.indexOf(r.stage) : 0,
    status: r.status || "Pending",
    fee: Number(r.declared_value || 1200)
  }));

  docs = dRes || [];
  delays = dlRes || [];
  expenses = eRes || [];
  clients = cRes || [];
  vehicles = vRes || [];
  drivers = drRes || [];
  messages = mRes || [];
  window.draw();
}

window.showAuth = function(signup) {
  if (currentUser) return window.enterApp();
  isSignup = !!signup;
  document.getElementById("signupFields").style.display = isSignup ? "block" : "none";
  document.getElementById("authHeading").innerText = isSignup ? "Register Clearing Company" : "Sign In to BorderFlow";
  document.getElementById("authSubmitBtn").innerText = isSignup ? "Create Company Account" : "Sign In";
  document.getElementById("authPrompt").innerText = isSignup ? "Already registered?" : "New clearing company?";
  document.getElementById("toggleAuthBtn").innerText = isSignup ? "Sign In" : "Create Account";
  document.getElementById("authScreen").style.display = "flex";
};

window.toggleMode = () => window.showAuth(!isSignup);

window.doLogin = async function() {
  const email = document.getElementById("aEmail").value.trim() || "owner@beitbridgehub.co.zw";
  const company = document.getElementById("aCompany").value.trim() || "Beitbridge Customs Hub";
  const role = document.getElementById("aRole").value || "Company Owner";
  currentUser = { email, company, role };
  localStorage.setItem("bf_user", JSON.stringify(currentUser));
  companyId = null;
  await window.enterApp();
};

window.doLogout = function() {
  localStorage.removeItem("bf_user");
  currentUser = null;
  companyId = null;
  document.getElementById("appShell").classList.remove("active");
  document.getElementById("landingPage").style.display = "flex";
};

window.enterApp = async function() {
  document.getElementById("landingPage").style.display = "none";
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("appShell").classList.add("active");
  document.getElementById("companyBadge").innerText = currentUser.company;
  document.getElementById("userLabel").innerText = currentUser.role.toUpperCase() + " • " + currentUser.email;
  await loadAllData();
};

window.go = function(p, btn) {
  page = p;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  window.draw();
};

window.setFilter = b => { filterBorder = b; window.draw(); };

window.saveShipment = async function() {
  if (!companyId) await resolveCompany();
  const ref = "BF-" + Math.floor(100 + Math.random() * 900);
  const clientName = document.getElementById("c1")?.value || "SADC Mining Corp";
  const cargo = document.getElementById("c2")?.value || "Mining Equipment";
  const origin = document.getElementById("c3")?.value || "Johannesburg";
  const dest = document.getElementById("c4")?.value || "Harare";
  const border = document.getElementById("c5")?.value || "Beitbridge";
  const truck = document.getElementById("c6")?.value || "AFZ 9012";

  await sb("shipments", {
    method: "POST",
    body: JSON.stringify({
      company_id: companyId,
      reference_no: ref,
      origin,
      destination: dest,
      corridor: border,
      cargo_description: clientName + " — " + cargo,
      truck_registration: truck,
      stage: MS[0],
      status: "Pending",
      declared_value: 1200
    })
  });

  const modal = document.getElementById("m");
  if (modal) modal.classList.remove("open");
  await loadAllData();
};

window.nextStep = async function(id, step) {
  if (step < 9) {
    const next = step + 1;
    const status = next >= 8 ? "Cleared" : "Pending";
    await sb(`shipments?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ stage: MS[next], status })
    });
    const item = list.find(x => String(x.id) === String(id));
    if (item) { item.milestone_step = next; item.status = status; }
    window.draw();
  }
};

window.verifyDoc = async (id) => {
  await sb(`documents?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "Verified" }) });
  await loadAllData();
};

window.addDoc = async () => {
  const ref = prompt("Shipment Ref:", list[0]?.ref || "BF-101");
  const name = prompt("Document Type:", "ZIMRA Bill of Entry (SAD 500)");
  if (ref && name) {
    await sb("documents", {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, shipment_ref: ref, doc_type: name, border: "Beitbridge", status: "Pending" })
    });
    await loadAllData();
  }
};

window.resolveDelay = async (id) => {
  await sb(`delays?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ status: "Resolved" }) });
  await loadAllData();
};

window.addDelay = async () => {
  const ref = prompt("Shipment Ref:", list[0]?.ref || "BF-101");
  const reason = prompt("Delay Reason:", "ZIMRA Scanner Queue");
  const hours = prompt("Hours Lost:", "2.0 hrs") || "2.0 hrs";
  if (ref && reason) {
    await sb("delays", {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, shipment_ref: ref, border: "Beitbridge", reason, hours_lost: hours, status: "Delayed" })
    });
    await loadAllData();
  }
};

window.markPaid = async (id) => {
  await sb(`expenses?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ paid: true }) });
  await loadAllData();
};

window.addExpense = async () => {
  const ref = prompt("Shipment Ref:", list[0]?.ref || "BF-101");
  const item = prompt("Expense Item:", "ZIMRA Import Duty & VAT");
  const amount = Number(prompt("Amount (USD):", "950"));
  if (ref && item && amount) {
    await sb("expenses", {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, shipment_ref: ref, item, border: "Beitbridge", amount, paid: false })
    });
    await loadAllData();
  }
};

window.addClient = async () => {
  const name = prompt("Client Company Name:", "Zimplats Mining");
  const country = prompt("Country:", "Zimbabwe") || "Zimbabwe";
  const contact_phone = prompt("Phone / WhatsApp:", "+263 77 123 4567") || "";
  if (name) {
    await sb("clients", {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, name, category: "Importer", country, contact_phone, status: "Active" })
    });
    await loadAllData();
  }
};

window.addVehicle = async () => {
  const registration = prompt("Truck Registration:", "AGH 4821");
  const driverName = prompt("Assigned Driver Name:", "Tatenda Moyo");
  const phone = prompt("Driver WhatsApp:", "+263 77 987 6543");
  if (registration) {
    await sb("vehicles", {
      method: "POST",
      body: JSON.stringify({ company_id: companyId, registration, type: "Heavy truck", capacity_tonnes: 34, status: "Available" })
    });
    if (driverName) {
      await sb("drivers", {
        method: "POST",
        body: JSON.stringify({ company_id: companyId, full_name: driverName, phone, status: "Available" })
      });
    }
    await loadAllData();
  }
};

window.sendMsg = async () => {
  const inp = document.getElementById("msgInput");
  if (inp && inp.value.trim()) {
    await sb("messages", {
      method: "POST",
