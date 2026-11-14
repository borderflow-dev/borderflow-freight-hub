const BASE = "https://supabase.co";
const API_KEY = "sb_publishable_AmXkFCBMzNI96gloQZKMEw_irbyDCtB";
const HEADERS = { "apikey": API_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };
const MS = ["1. Created","2. At Border","3. Docs Checked","4. Declaration","5. Assessment","6. Duty Paid","7. Inspection","8. Released","9. Cleared to Go","10. Delivered"];

let list = [], page = "overview", isSignup = false, filterBorder = "ALL";
let currentUser = JSON.parse(localStorage.getItem("bf_user") || "null");
let docs = JSON.parse(localStorage.getItem("bf_docs") || '[{"id":"DOC-101","ref":"BF-101","name":"ZIMRA Bill of Entry (SAD 500)","border":"Beitbridge","status":"Verified"},{"id":"DOC-102","ref":"BF-101","name":"SADC Certificate of Origin","border":"Beitbridge","status":"Pending"}]');
let delays = JSON.parse(localStorage.getItem("bf_delays") || '[{"ref":"BF-101","border":"Beitbridge","reason":"ZIMRA Scanner Queue","hours":"2.5 hrs","status":"Delayed"}]');
let expenses = JSON.parse(localStorage.getItem("bf_exp") || '[{"ref":"BF-101","item":"ZIMRA Import Duty & VAT","border":"Beitbridge","amount":1450,"paid":true},{"ref":"BF-101","item":"Road Access & Carbon Tax","border":"Beitbridge","amount":320,"paid":false}]');
let messages = JSON.parse(localStorage.getItem("bf_msgs") || '[{"from":"Company Owner","text":"Beitbridge Southbound clearance lane active. Submit manifests early.","time":"Today"}]');

const saveStore = () => {
  localStorage.setItem("bf_docs", JSON.stringify(docs));
  localStorage.setItem("bf_delays", JSON.stringify(delays));
  localStorage.setItem("bf_exp", JSON.stringify(expenses));
  localStorage.setItem("bf_msgs", JSON.stringify(messages));
};
const bdg = s => (s === "Cleared" || s === "Verified" || s === "Paid" || s === "Resolved") ? `<span class="b bg">${s}</span>` : (s === "Delayed" || s === "Unpaid") ? `<span class="b br">${s}</span>` : `<span class="b ba">${s}</span>`;

window.showAuth = function(signup) {
  if (currentUser) return window.enterApp();
  isSignup = !!signup;
  document.getElementById("signupFields").style.display = isSignup ? "block" : "none";
  document.getElementById("authHeading").innerText = isSignup ? "Register Clearing Company" : "Sign In to BorderFlow";
  document.getElementById("authSubmitBtn").innerText = isSignup ? "Create Company Account" : "Sign In";
  document.getElementById("authScreen").style.display = "flex";
};
window.toggleMode = () => window.showAuth(!isSignup);
window.doLogin = function() {
  const email = document.getElementById("aEmail").value.trim() || "owner@beitbridgehub.co.zw";
  const company = document.getElementById("aCompany").value.trim() || "Beitbridge Customs Hub";
  const role = document.getElementById("aRole").value || "Company Owner";
  currentUser = { email, company, role };
  localStorage.setItem("bf_user", JSON.stringify(currentUser));
  window.enterApp();
};
window.doLogout = function() {
  localStorage.removeItem("bf_user");
  currentUser = null;
  document.getElementById("appShell").classList.remove("active");
  document.getElementById("landingPage").style.display = "flex";
};
window.enterApp = function() {
  document.getElementById("landingPage").style.display = "none";
  document.getElementById("authScreen").style.display = "none";
  document.getElementById("appShell").classList.add("active");
  document.getElementById("companyBadge").innerText = currentUser.company;
  document.getElementById("userLabel").innerText = currentUser.role.toUpperCase() + " • " + currentUser.email;
  window.loadShipments();
};
window.go = function(p, btn) {
  page = p;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  window.draw();
};
window.setFilter = b => { filterBorder = b; window.draw(); };

window.loadShipments = async function() {
  try {
    const res = await fetch(BASE + "/rest/v1/shipments?select=*&order=created_at.desc", { headers: HEADERS });
    const data = await res.json();
    if (Array.isArray(data)) list = data;
  } catch (e) {}
  window.draw();
};

window.saveShipment = async function() {
  const newShip = { ref: "BF-" + (101 + list.length), client: document.getElementById("c1").value || "SADC Mining Corp", cargo: document.getElementById("c2").value, route: (document.getElementById("c3").value || "Johannesburg") + " → " + (document.getElementById("c4").value || "Harare"), border: document.getElementById("c5").value, truck: document.getElementById("c6").value || "AFZ 9012", milestone_step: 0, status: "Pending", fee: 1200 };
  list.unshift(newShip);
  document.getElementById("m").classList.remove("open");
  window.draw();
  await fetch(BASE + "/rest/v1/shipments", { method: "POST", headers: HEADERS, body: JSON.stringify([newShip]) });
  window.loadShipments();
};

window.nextStep = async function(id, step) {
  if (step < 9) {
    const next = step + 1, item = list.find(x => String(x.id) === String(id));
    if (item) { item.milestone_step = next; if (next >= 8) item.status = "Cleared"; window.draw(); }
    await fetch(BASE + "/rest/v1/shipments?id=eq." + id, { method: "PATCH", headers: HEADERS, body: JSON.stringify({ milestone_step: next, status: next >= 8 ? "Cleared" : "Pending" }) });
  }
};

window.verifyDoc = i => { docs[i].status = "Verified"; saveStore(); window.draw(); };
window.addDoc = () => { const ref = prompt("Shipment Ref:", "BF-101"), name = prompt("Document Name:", "Commercial Invoice"); if (ref && name) { docs.unshift({ id: "DOC-" + (101 + docs.length), ref, name, border: "Beitbridge", status: "Pending" }); saveStore(); window.draw(); } };
window.resolveDelay = i => { delays[i].status = "Resolved"; saveStore(); window.draw(); };
window.addDelay = () => { const ref = prompt("Shipment Ref:", "BF-101"), border = prompt("Border Post:", "Beitbridge"), reason = prompt("Delay Reason:", "ASYCUDA System Hold"); if (ref && reason) { delays.unshift({ ref, border: border || "Beitbridge", reason, hours: "1.5 hrs", status: "Delayed" }); saveStore(); window.draw(); } };
window.markPaid = i => { expenses[i].paid = true; saveStore(); window.draw(); };
window.addExpense = () => { const ref = prompt("Shipment Ref:", "BF-101"), item = prompt("Expense Item:", "ZIMRA Customs Duty"), amount = Number(prompt("Amount (USD):", "950")); if (ref && item && amount) { expenses.unshift({ ref, item, border: "Beitbridge", amount, paid: false }); saveStore(); window.draw(); } };
window.sendMsg = () => { const inp = document.getElementById("msgInput"); if (inp && inp.value.trim()) { messages.unshift({ from: `${currentUser.role} (${currentUser.email})`, text: inp.value.trim(), time: new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) }); saveStore(); window.draw(); } };
window.updateCompany = () => { const val = document.getElementById("setComp").value.trim(); if (val) { currentUser.company = val; localStorage.setItem("bf_user", JSON.stringify(currentUser)); document.getElementById("companyBadge").innerText = val; alert("Workspace updated!"); window.draw(); } };

window.draw = function() {
  const el = document.getElementById("app"), t = document.getElementById("title");
  const filtered = filterBorder === "ALL" ? list : list.filter(x => x.border === filterBorder);
  const c = list.filter(x => x.status === "Cleared").length, p = list.filter(x => x.status === "Pending").length, d = delays.filter(x => x.status === "Delayed").length;
  const totalExp = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);

  if (page === "overview" || page === "shipments") {
    t.innerText = page === "overview" ? "1. Executive Dashboard (LIVE CLOUD DB)" : "2. Shipment Management (LIVE)";
    el.innerHTML = `<div class="kpi-grid"><div class="kpi"><small>Total Shipments</small><div>${list.length}</div></div><div class="kpi g"><small>Cleared</small><div style="color:#059669">${c}</div></div><div class="kpi a"><small>In Clearance</small><div style="color:#D97706">${p}</div></div><div class="kpi r"><small>Active Delays</small><div style="color:#DC2626">${d}</div></div></div>
      <div class="card"><div class="card-h"><span>Live PostgreSQL Consignments (${filtered.length})</span>
      <select style="width:180px;padding:4px 8px;" onchange="setFilter(this.value)"><option value="ALL" ${filterBorder==="ALL"?"selected":""}>All Border Posts</option><option ${filterBorder==="Beitbridge"?"selected":""}>Beitbridge</option><option ${filterBorder==="Chirundu"?"selected":""}>Chirundu</option><option ${filterBorder==="Forbes"?"selected":""}>Forbes</option><option ${filterBorder==="Plumtree"?"selected":""}>Plumtree</option><option ${filterBorder==="Kazungula"?"selected":""}>Kazungula</option></select></div>
      <table><thead><tr><th>Ref</th><th>Client</th><th>Route</th><th>Border</th><th>Truck</th><th>Milestone</th><th>Status</th></tr></thead>
      <tbody>${filtered.map(x => `<tr><td><strong>${x.ref}</strong></td><td>${x.client}</td><td>${x.route}</td><td><strong>${x.border}</strong></td><td>${x.truck}</td><td>${MS[x.milestone_step || 0]}</td><td>${bdg(x.status)}</td></tr>`).join("")}</tbody></table></div>`;
  } else if (page === "documents") {
    t.innerText = "3. Customs Documents Vault";
    el.innerHTML = `<div class="card"><div class="card-h"><span>Customs Paperwork & Declarations</span><button class="btn-gold" onclick="addDoc()">+ Log Document</button></div>
      <table><thead><tr><th>Doc ID</th><th>Shipment</th><th>Document Type</th><th>Border</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${docs.map((doc, i) => `<tr><td><strong>${doc.id}</strong></td><td>${doc.ref}</td><td>${doc.name}</td><td>${doc.border}</td><td>${bdg(doc.status)}</td><td>${doc.status !== "Verified" ? `<button class="btn-gold" onclick="verifyDoc(${i})">Verify ✓</button>` : "Verified"}</td></tr>`).join("")}</tbody></table></div>`;
  } else if (page === "clearance") {
    t.innerText = "4. Customs Clearance (10 Milestones)";
