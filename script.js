const BASE = "https://supabase.co";
const API_KEY = "sb_publishable_AmXkFCBMzNI96gloQZKMEw_irbyDCtB";
const HEADERS = { "apikey": API_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };
const MS = ["1. Created","2. At Border","3. Docs Checked","4. Declaration","5. Assessment","6. Duty Paid","7. Inspection","8. Released","9. Cleared to Go","10. Delivered"];

let list = [];
let docs = JSON.parse(localStorage.getItem("bf_docs") || '[{"id":"DOC-101","ref":"BF-101","name":"ZIMRA Bill of Entry (SAD 500)","border":"Beitbridge","status":"Verified"}]');
let delays = JSON.parse(localStorage.getItem("bf_delays") || '[{"ref":"BF-101","border":"Beitbridge","reason":"ZIMRA Scanner Queue","hours":"3 hrs","status":"Delayed"}]');
let expenses = JSON.parse(localStorage.getItem("bf_exp") || '[{"ref":"BF-101","item":"ZIMRA Import Duty & VAT","border":"Beitbridge","amount":1450,"paid":true}]');
let messages = JSON.parse(localStorage.getItem("bf_msgs") || '[{"from":"Transport Manager","text":"Beitbridge Southbound lane moving smoothly.","time":"Today"}]');
let page = "overview", isSignup = false;
let currentUser = JSON.parse(localStorage.getItem("bf_user") || "null");

const saveLocal = () => {
  localStorage.setItem("bf_docs", JSON.stringify(docs));
  localStorage.setItem("bf_delays", JSON.stringify(delays));
  localStorage.setItem("bf_exp", JSON.stringify(expenses));
  localStorage.setItem("bf_msgs", JSON.stringify(messages));
};
const bdg = s => (s === "Cleared" || s === "Verified" || s === "Paid") ? `<span class="b bg">${s}</span>` : (s === "Delayed" || s === "Unpaid") ? `<span class="b br">${s}</span>` : `<span class="b ba">${s}</span>`;

function checkAuth() {
  if (currentUser) {
    document.getElementById("landingPage").style.display = "none";
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("appShell").classList.add("active");
    document.getElementById("companyBadge").innerText = currentUser.company;
    document.getElementById("userLabel").innerText = `${currentUser.role.toUpperCase()} • ${currentUser.email}`;
    loadShipments();
  } else {
    document.getElementById("landingPage").style.display = "flex";
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("appShell").classList.remove("active");
  }
}

document.getElementById("toggleAuthBtn").onclick = () => {
  isSignup = !isSignup;
  document.getElementById("signupFields").style.display = isSignup ? "block" : "none";
  document.getElementById("authHeading").innerText = isSignup ? "Register Clearing Company" : "Sign In to BorderFlow";
  document.getElementById("authSubmitBtn").innerText = isSignup ? "Create Company Account" : "Sign In";
  document.getElementById("authPrompt").innerText = isSignup ? "Already have an account?" : "New clearing company?";
  document.getElementById("toggleAuthBtn").innerText = isSignup ? "Sign In" : "Create Account";
};

document.getElementById("authSubmitBtn").onclick = async () => {
  const email = document.getElementById("aEmail").value.trim() || "owner@beitbridgehub.co.zw";
  const password = document.getElementById("aPass").value.trim() || "Border2026";
  const company = document.getElementById("aCompany").value.trim() || "Beitbridge Customs Hub";
  const role = document.getElementById("aRole").value || "Company Owner";
  try {
    const ep = isSignup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
    await fetch(BASE + ep, { method: "POST", headers: HEADERS, body: JSON.stringify(isSignup ? { email, password, data: { company, role } } : { email, password }) });
  } catch (e) {}
  currentUser = { email, company, role };
  localStorage.setItem("bf_user", JSON.stringify(currentUser));
  checkAuth();
};

document.getElementById("logoutBtn").onclick = () => { localStorage.removeItem("bf_user"); currentUser = null; checkAuth(); };

async function loadShipments() {
  try {
    const res = await fetch(BASE + "/rest/v1/shipments?select=*&order=created_at.desc", { headers: HEADERS });
    const data = await res.json();
    if (Array.isArray(data)) list = data;
  } catch (e) {}
  draw();
}

window.nextStep = async (id, step) => {
  if (step < 9) {
    const next = step + 1, item = list.find(x => String(x.id) === String(id));
    if (item) { item.milestone_step = next; if (next >= 8) item.status = "Cleared"; draw(); }
    await fetch(BASE + "/rest/v1/shipments?id=eq." + id, { method: "PATCH", headers: HEADERS, body: JSON.stringify({ milestone_step: next, status: next >= 8 ? "Cleared" : "Pending" }) });
  }
};

window.verifyDoc = i => { docs[i].status = "Verified"; saveLocal(); draw(); };
window.addDoc = () => { const ref = prompt("Shipment Ref:", "BF-101"), name = prompt("Document:", "SADC Certificate"); if (ref && name) { docs.unshift({ id: "DOC-" + (101 + docs.length), ref, name, border: "Beitbridge", status: "Pending" }); saveLocal(); draw(); } };
window.addDelay = () => { const ref = prompt("Shipment Ref:", "BF-101"), reason = prompt("Delay Reason:", "ZIMRA Queue"); if (ref && reason) { delays.unshift({ ref, border: "Beitbridge", reason, hours: "2 hrs", status: "Delayed" }); saveLocal(); draw(); } };
window.markPaid = i => { expenses[i].paid = true; saveLocal(); draw(); };
window.addExpense = () => { const ref = prompt("Shipment Ref:", "BF-101"), item = prompt("Expense:", "Customs Duty"), amount = Number(prompt("USD:", "850")); if (ref && item && amount) { expenses.unshift({ ref, item, border: "Beitbridge", amount, paid: false }); saveLocal(); draw(); } };
window.sendMsg = () => { const inp = document.getElementById("msgInput"); if (inp?.value.trim()) { messages.unshift({ from: currentUser.role, text: inp.value.trim(), time: "Just now" }); saveLocal(); draw(); } };

function draw() {
  const el = document.getElementById("app"), t = document.getElementById("title");
  const c = list.filter(x => x.status === "Cleared").length, p = list.filter(x => x.status === "Pending").length, d = list.filter(x => x.status === "Delayed").length;
  const totalExp = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);

  if (page === "overview" || page === "shipments") {
    t.innerText = page === "overview" ? "1. Executive Dashboard (LIVE CLOUD DB)" : "2. Shipment Management (LIVE)";
    el.innerHTML = `<div class="kpi-grid"><div class="kpi"><small>Total Shipments</small><div>${list.length}</div></div><div class="kpi g"><small>Cleared</small><div style="color:#059669">${c}</div></div><div class="kpi a"><small>Pending</small><div style="color:#D97706">${p}</div></div><div class="kpi r"><small>Delayed</small><div style="color:#DC2626">${d}</div></div></div>
      <div class="card"><div class="card-h"><span>Live PostgreSQL Consignments</span><span>Expenses: $${totalExp.toLocaleString()} USD</span></div>
      <table><thead><tr><th>Ref</th><th>Client</th><th>Route</th><th>Border</th><th>Truck</th><th>Milestone</th><th>Status</th></tr></thead>
      <tbody>${list.map(x => `<tr><td><strong>${x.ref}</strong></td><td>${x.client}</td><td>${x.route}</td><td><strong>${x.border}</strong></td><td>${x.truck}</td><td>${MS[x.milestone_step || 0]}</td><td>${bdg(x.status)}</td></tr>`).join("")}</tbody></table></div>`;
  } else if (page === "documents") {
    t.innerText = "3. Customs Documents Vault";
    el.innerHTML = `<div class="card"><div class="card-h"><span>Customs Paperwork</span><button class="btn-gold" onclick="addDoc()">+ Log Document</button></div><table><thead><tr><th>ID</th><th>Ref</th><th>Document</th><th>Border</th><th>Status</th><th>Action</th></tr></thead><tbody>${docs.map((doc, i) => `<tr><td><strong>${doc.id}</strong></td><td>${doc.ref}</td><td>${doc.name}</td><td>${doc.border}</td><td>${bdg(doc.status)}</td><td>${doc.status !== "Verified" ? `<button class="btn-gold" onclick="verifyDoc(${i})">Verify ✓</button>` : "Verified"}</td></tr>`).join("")}</tbody></table></div>`;
  } else if (page === "clearance") {
    t.innerText = "4. Customs Clearance (10 Milestones)";
    el.innerHTML = list.map(x => `<div class="card" style="padding:18px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><strong>${x.ref} — ${x.client}</strong> (${x.border})</div><div>${bdg(x.status)} <button class="btn-gold" style="margin-left:8px;" onclick="nextStep('${x.id}', ${x.milestone_step || 0})">Advance →</button></div></div><div class="steps">${MS.map((m, idx) => `<div class="st ${idx <= (x.milestone_step || 0) ? "ok" : ""}">${idx <= (x.milestone_step || 0) ? "✓ " : ""}${m}</div>`).join("")}</div></div>`).join("");
  } else if (page === "borders") {
    t.innerText = "5. Southern African Border Network";
    el.innerHTML = `<div class="kpi-grid">${["Beitbridge","Chirundu","Forbes","Plumtree","Kazungula"].map(b => `<div class="kpi" style="border-left-color:#D6A84F"><strong>${b} Border</strong><div>${list.filter(x => x.border === b).length} <small>Trucks</small></div></div>`).join("")}</div>`;
  } else if (page === "fleet") {
    t.innerText = "6. Vehicles & Drivers";
    el.innerHTML = `<div class="card"><div class="card-h"><span>Cross-Border Fleet</span></div><table><thead><tr><th>Truck</th><th>Ref</th><th>Client</th><th>Border</th><th>Status</th></tr></thead><tbody>${list.map(x => `<tr><td><strong>${x.truck}</strong></td><td>${x.ref}</td><td>${x.client}</td><td>${x.border}</td><td>${bdg(x.status)}</td></tr>`).join("")}</tbody></table></div>`;
  } else if (page === "delays") {
    t.innerText = "7. Border Delay Management";
    el.innerHTML = `<div class="card"><div class="card-h"><span>Hold-Ups</span><button class="btn-gold" onclick="addDelay()">+ Report Delay</button></div><table><thead><tr><th>Ref</th><th>Border</th><th>Reason</th><th>Hours</th><th>Status</th></tr></thead><tbody>${delays.map(dl => `<tr><td><strong>${dl.ref}</strong></td><td>${dl.border}</td><td>${dl.reason}</td><td>${dl.hours}</td><td>${bdg(dl.status)}</td></tr>`).join("")}</tbody></table></div>`;
