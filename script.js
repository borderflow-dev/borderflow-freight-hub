const BASE = "https://supabase.co";
const API_KEY = "sb_publishable_AmXkFCBMzNI96gloQZKMEw_irbyDCtB";
const HEADERS = { "apikey": API_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };

const MS = ["1. Created","2. At Border","3. Docs Checked","4. Declaration","5. Assessment","6. Duty Paid","7. Inspection","8. Released","9. Cleared to Go","10. Delivered"];
let list = [];
let docs = JSON.parse(localStorage.getItem("bf_docs") || '[{"id":"DOC-101","ref":"BF-101","name":"ZIMRA Bill of Entry (SAD 500)","border":"Beitbridge","status":"Verified"},{"id":"DOC-102","ref":"BF-102","name":"Commercial Invoice & Packing List","border":"Chirundu","status":"Pending"}]');
let delays = JSON.parse(localStorage.getItem("bf_delays") || '[{"ref":"BF-101","border":"Beitbridge","reason":"ZIMRA Scanner Queue","hours":"3 hrs","status":"Delayed"}]');
let expenses = JSON.parse(localStorage.getItem("bf_exp") || '[{"ref":"BF-101","item":"ZIMRA Import Duty & VAT","border":"Beitbridge","amount":1450,"paid":true},{"ref":"BF-102","item":"Road Access & Carbon Tax","border":"Chirundu","amount":650,"paid":false}]');
let messages = JSON.parse(localStorage.getItem("bf_msgs") || '[{"from":"Transport Manager","text":"All Beitbridge drivers reminded to submit manifests 2 hours before arrival.","time":"Today"}]');

let page = "overview";
let isSignup = false;
let currentUser = JSON.parse(localStorage.getItem("bf_user") || "null");

function saveLocal() {
  localStorage.setItem("bf_docs", JSON.stringify(docs));
  localStorage.setItem("bf_delays", JSON.stringify(delays));
  localStorage.setItem("bf_exp", JSON.stringify(expenses));
  localStorage.setItem("bf_msgs", JSON.stringify(messages));
}

function bdg(s) {
  if (s === "Cleared" || s === "Verified" || s === "Paid") return `<span class="b bg">${s}</span>`;
  if (s === "Delayed" || s === "Unpaid") return `<span class="b br">${s}</span>`;
  return `<span class="b ba">${s}</span>`;
}

function checkAuth() {
  if (currentUser) {
    document.getElementById("landingPage").style.display = "none";
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("appShell").classList.add("active");
    document.getElementById("companyBadge").innerText = currentUser.company || "BorderFlow Workspace";
    document.getElementById("userLabel").innerText = `${currentUser.role.toUpperCase()} • ${currentUser.email}`;
    loadShipments();
  } else {
    document.getElementById("landingPage").style.display = "flex";
    document.getElementById("authScreen").style.display = "none";
    document.getElementById("appShell").classList.remove("active");
  }
}

document.getElementById("toggleAuthBtn").addEventListener("click", () => {
  isSignup = !isSignup;
  document.getElementById("signupFields").style.display = isSignup ? "block" : "none";
  document.getElementById("authHeading").innerText = isSignup ? "Register Clearing Company" : "Sign In to BorderFlow";
  document.getElementById("authSubmitBtn").innerText = isSignup ? "Create Company Account" : "Sign In";
  document.getElementById("authPrompt").innerText = isSignup ? "Already have an account?" : "New clearing company?";
  document.getElementById("toggleAuthBtn").innerText = isSignup ? "Sign In" : "Create Account";
});

document.getElementById("authSubmitBtn").addEventListener("click", async () => {
  const btn = document.getElementById("authSubmitBtn");
  const email = document.getElementById("aEmail").value.trim();
  const password = document.getElementById("aPass").value.trim();
  if (!email || !email.includes("@")) return alert("Please enter a valid email address.");
  if (password.length < 6) return alert("Password must be at least 6 characters.");

  btn.innerText = "Connecting...";
  const company = document.getElementById("aCompany").value.trim() || "Beitbridge Customs Hub";
  const role = document.getElementById("aRole").value || "Company Owner";

  try {
    const endpoint = isSignup ? "/auth/v1/signup" : "/auth/v1/token?grant_type=password";
    const body = isSignup ? { email, password, data: { company, role } } : { email, password };
    const res = await fetch(BASE + endpoint, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
    const data = await res.json();
    if (!res.ok && !isSignup) {
      btn.innerText = "Sign In";
      return alert(data.msg || data.error_description || "Invalid email or password.");
    }
  } catch (err) {}

  currentUser = { email, company, role };
  localStorage.setItem("bf_user", JSON.stringify(currentUser));
  btn.innerText = isSignup ? "Create Company Account" : "Sign In";
  checkAuth();
});

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("bf_user");
  currentUser = null;
  checkAuth();
});

async function loadShipments() {
  try {
    const res = await fetch(BASE + "/rest/v1/shipments?select=*&order=created_at.desc", { headers: HEADERS });
    const data = await res.json();
    if (Array.isArray(data)) list = data;
  } catch (e) {}
  draw();
}

window.nextStep = async function(id, step) {
  if (step < 9) {
    const next = step + 1;
    const item = list.find(x => String(x.id) === String(id));
    if (item) { item.milestone_step = next; if (next >= 8) item.status = "Cleared"; draw(); }
    await fetch(BASE + "/rest/v1/shipments?id=eq." + id, { method: "PATCH", headers: HEADERS, body: JSON.stringify({ milestone_step: next, status: next >= 8 ? "Cleared" : "Pending" }) });
  }
};

window.verifyDoc = function(i) { docs[i].status = "Verified"; saveLocal(); draw(); };
window.addDoc = function() {
  const defaultRef = list.length ? list[0].ref : "BF-101";
  const defaultBorder = list.length ? list[0].border : "Beitbridge";
  const ref = prompt("Shipment Ref (e.g. BF-101):", defaultRef);
  const name = prompt("Document Name (e.g. SADC Certificate of Origin):", "SADC Certificate of Origin");
  if (ref && name) { docs.unshift({ id: "DOC-" + (101 + docs.length), ref, name, border: defaultBorder, status: "Pending" }); saveLocal(); draw(); }
};

window.addDelay = function() {
  const defaultRef = list.length ? list[0].ref : "BF-101";
  const ref = prompt("Shipment Ref (e.g. BF-101):", defaultRef);
  const border = prompt("Border Post:", "Beitbridge");
  const reason = prompt("Delay Reason (e.g. ZIMRA ASYCUDA Offline):", "ZIMRA System Delay");
  if (ref && reason) { delays.unshift({ ref, border: border || "Beitbridge", reason, hours: "2 hrs", status: "Delayed" }); saveLocal(); draw(); }
};

window.markPaid = function(i) { expenses[i].paid = true; saveLocal(); draw(); };
window.addExpense = function() {
  const defaultRef = list.length ? list[0].ref : "BF-101";
  const ref = prompt("Shipment Ref:", defaultRef);
  const item = prompt("Expense Item (e.g. Customs Duty / Road Toll):", "ZIMRA Customs Duty");
  const amount = Number(prompt("Amount in USD:", "850"));
  if (ref && item && amount) { expenses.unshift({ ref, item, border: "Beitbridge", amount, paid: false }); saveLocal(); draw(); }
};

window.sendMsg = function() {
  const inp = document.getElementById("msgInput");
  if (inp && inp.value.trim()) {
    messages.unshift({ from: `${currentUser.role} (${currentUser.email})`, text: inp.value.trim(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) });
    saveLocal();
    draw();
  }
};

function draw() {
  const el = document.getElementById("app");
  const t = document.getElementById("title");
  const c = list.filter(x => x.status === "Cleared").length;
  const p = list.filter(x => x.status === "Pending").length;
  const d = list.filter(x => x.status === "Delayed").length;
  const totalExp = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);

  if (page === "overview" || page === "shipments") {
    t.innerText = page === "overview" ? "1. Executive Dashboard (LIVE CLOUD DB)" : "2. Shipment Management (LIVE)";
    el.innerHTML = `<div class="kpi-grid"><div class="kpi"><small>Total Shipments</small><div>${list.length}</div></div><div class="kpi g"><small>Cleared</small><div style="color:#059669">${c}</div></div><div class="kpi a"><small>Pending</small><div style="color:#D97706">${p}</div></div><div class="kpi r"><small>Delayed</small><div style="color:#DC2626">${d}</div></div></div>
      <div class="card"><div class="card-h"><span>Live PostgreSQL Consignments</span><span>Total Recorded Expenses: $${totalExp.toLocaleString()} USD</span></div>
      <table><thead><tr><th>Ref</th><th>Client</th><th>Route</th><th>Border</th><th>Truck</th><th>Milestone</th><th>Status</th></tr></thead>
      <tbody>${list.length ? list.map(x => `<tr><td><strong>${x.ref}</strong></td><td>${x.client}</td><td>${x.route}</td><td><strong>${x.border}</strong></td><td>${x.truck}</td><td>${MS[x.milestone_step || 0]}</td><td>${bdg(x.status)}</td></tr>`).join("") : '<tr><td colspan="7" style="text-align:center;color:#64748B;">No shipments yet. Click <strong>+ Create Shipment</strong> above to add your first consignment.</td></tr>'}</tbody></table></div>`;
  } else if (page === "documents") {
    t.innerText = "3. Customs Documents Vault";
    el.innerHTML = `<div class="card"><div class="card-h"><span>Customs Clearance Paperwork</span><button class="btn-gold" onclick="addDoc()">+ Log Document</button></div>
      <table><thead><tr><th>Doc ID</th><th>Shipment</th><th>Document Type</th><th>Border</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${docs.map((doc, i) => `<tr><td><strong>${doc.id}</strong></td><td>${doc.ref}</td><td>${doc.name}</td><td>${doc.border}</td><td>${bdg(doc.status)}</td><td>${doc.status !== "Verified" ? `<button class="btn-gold" onclick="verifyDoc(${i})">Verify ✓</button>` : "Verified"}</td></tr>`).join("")}</tbody></table></div>`;
  } else if (page === "clearance") {
    t.innerText = "4. Customs Clearance Management (10 Milestones)";
