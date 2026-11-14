const BASE = "https://supabase.co";
const API_KEY = "sb_publishable_AmXkFCBMzNI96gloQZKMEw_irbyDCtB";
const HEADERS = { "apikey": API_KEY, "Content-Type": "application/json", "Prefer": "return=representation" };
const MS = ["1. Created","2. At Border","3. Docs Checked","4. Declaration","5. Assessment","6. Duty Paid","7. Inspection","8. Released","9. Cleared to Go","10. Delivered"];

let list = [
  { id: 1, ref: "BF-101", client: "Zimplats Mining", cargo: "Mining Equipment", route: "Johannesburg → Harare", border: "Beitbridge", truck: "AGH 4821", milestone_step: 5, status: "Pending", fee: 1450 },
  { id: 2, ref: "BF-102", client: "Delta Beverages", cargo: "FMCG / Groceries", route: "Durban → Lusaka", border: "Chirundu", truck: "AFZ 9012", milestone_step: 9, status: "Cleared", fee: 1200 }
];
let page = "overview", isSignup = false, filterBorder = "ALL";
let currentUser = JSON.parse(localStorage.getItem("bf_user") || "null");
let docs = JSON.parse(localStorage.getItem("bf_docs") || '[{"id":"DOC-101","ref":"BF-101","name":"ZIMRA Bill of Entry (SAD 500)","border":"Beitbridge","status":"Verified"},{"id":"DOC-102","ref":"BF-101","name":"SADC Certificate of Origin","border":"Beitbridge","status":"Pending"}]');
let delays = JSON.parse(localStorage.getItem("bf_delays") || '[{"ref":"BF-101","border":"Beitbridge","reason":"ZIMRA Scanner Queue","hours":"2.5 hrs","status":"Delayed"}]');
let expenses = JSON.parse(localStorage.getItem("bf_exp") || '[{"ref":"BF-101","item":"ZIMRA Import Duty & VAT","border":"Beitbridge","amount":1450,"paid":true},{"ref":"BF-101","item":"Road Access & Carbon Tax","border":"Beitbridge","amount":320,"paid":false}]');
let messages = JSON.parse(localStorage.getItem("bf_msgs") || '[{"from":"Company Owner","text":"Beitbridge Southbound lane active. Submit manifests early.","time":"Today"}]');

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
  document.getElementById("authPrompt").innerText = isSignup ? "Already registered?" : "New clearing company?";
  document.getElementById("toggleAuthBtn").innerText = isSignup ? "Sign In" : "Create Account";
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
  window.draw();
};
window.go = function(p, btn) {
  page = p;
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  window.draw();
};
window.setFilter = b => { filterBorder = b; window.draw(); };

window.saveShipment = function() {
  list.unshift({
    id: Date.now(), ref: "BF-" + (101 + list.length),
    client: document.getElementById("c1").value || "SADC Mining Corp",
    cargo: document.getElementById("c2").value,
    route: (document.getElementById("c3").value || "Johannesburg") + " → " + (document.getElementById("c4").value || "Harare"),
    border: document.getElementById("c5").value, truck: document.getElementById("c6").value || "AFZ 9012",
    milestone_step: 0, status: "Pending", fee: 1200
  });
  document.getElementById("m").classList.remove("open");
  window.draw();
};

window.nextStep = function(id, step) {
  if (step < 9) {
    const item = list.find(x => String(x.id) === String(id));
    if (item) { item.milestone_step = step + 1; if (item.milestone_step >= 8) item.status = "Cleared"; window.draw(); }
  }
};

window.verifyDoc = i => { docs[i].status = "Verified"; saveStore(); window.draw(); };
window.addDoc = () => { const ref = prompt("Ref:", "BF-101"), name = prompt("Doc:", "Invoice"); if (ref && name) { docs.unshift({ id: "DOC-" + (101 + docs.length), ref, name, border: "Beitbridge", status: "Pending" }); saveStore(); window.draw(); } };
window.resolveDelay = i => { delays[i].status = "Resolved"; saveStore(); window.draw(); };
window.addDelay = () => { const ref = prompt("Ref:", "BF-101"), reason = prompt("Reason:", "Scanner Queue"); if (ref && reason) { delays.unshift({ ref, border: "Beitbridge", reason, hours: "1.5 hrs", status: "Delayed" }); saveStore(); window.draw(); } };
window.markPaid = i => { expenses[i].paid = true; saveStore(); window.draw(); };
window.addExpense = () => { const ref = prompt("Ref:", "BF-101"), item = prompt("Item:", "Duty"), amount = Number(prompt("USD:", "950")); if (ref && item && amount) { expenses.unshift({ ref, item, border: "Beitbridge", amount, paid: false }); saveStore(); window.draw(); } };
window.sendMsg = () => { const inp = document.getElementById("msgInput"); if (inp && inp.value.trim()) { messages.unshift({ from: currentUser.role, text: inp.value.trim(), time: "Now" }); saveStore(); window.draw(); } };
window.updateCompany = () => { const val = document.getElementById("setComp").value.trim(); if (val) { currentUser.company = val; localStorage.setItem("bf_user", JSON.stringify(currentUser)); document.getElementById("companyBadge").innerText = val; alert("Saved!"); } };

window.draw = function() {
  const el = document.getElementById("app"), t = document.getElementById("title");
  const filtered = filterBorder === "ALL" ? list : list.filter(x => x.border === filterBorder);
  const c = list.filter(x => x.status === "Cleared").length, p = list.filter(x => x.status === "Pending").length, d = delays.filter(x => x.status === "Delayed").length;
  const totalExp = expenses.reduce((a, b) => a + Number(b.amount || 0), 0);

  if (page === "overview" || page === "shipments") {
    t.innerText = page === "overview" ? "1. Executive Dashboard" : "2. Shipment Management";
    el.innerHTML = `<div class="kpi-grid"><div class="kpi"><small>Total Shipments</small><div>${list.length}</div></div><div class="kpi g"><small>Cleared</small><div style="color:#059669">${c}</div></div><div class="kpi a"><small>In Clearance</small><div style="color:#D97706">${p}</div></div><div class="kpi r"><small>Active Delays</small><div style="color:#DC2626">${d}</div></div></div>
      <div class="card"><div class="card-h"><span>Consignments (${filtered.length})</span><select style="width:150px" onchange="setFilter(this.value)"><option value="ALL">All Borders</option><option value="Beitbridge">Beitbridge</option><option value="Chirundu">Chirundu</option><option value="Forbes">Forbes</option><option value="Kazungula">Kazungula</option></select></div>
      <table><thead><tr><th>Ref</th><th>Client</th><th>Route</th><th>Border</th><th>Truck</th><th>Stage</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${filtered.map(s => `<tr><td><strong>${s.ref}</strong></td><td>${s.client}</td><td>${s.route}</td><td>${s.border}</td><td>${s.truck}</td><td>${MS[s.milestone_step || 0]}</td><td>${bdg(s.status)}</td><td><button class="btn-gold" onclick="nextStep('${s.id}',${s.milestone_step || 0})">Advance →</button></td></tr>`).join("")}</tbody></table></div>`;
  } else if (page === "documents") {
    t.innerText = "3. Customs Documents";
    el.innerHTML = `<div class="card"><div class="card-h"><span>Documents</span><button class="btn-gold" onclick="addDoc()">+ Add Doc</button></div><table><thead><tr><th>ID</th><th>Ref</th><th>Document</th><th>Status</th><th>Action</th></tr></thead><tbody>${docs.map((x,i)=>`<tr><td>${x.id}</td><td>${x.ref}</td><td>${x.name}</td><td>${bdg(x.status)}</td><td>${x.status!=="Verified"?`<button class="btn-gold" onclick="verifyDoc(${i})">Verify</button>`:"✓"}</td></tr>`).join("")}</tbody></table></div>`;
  } else if (page === "clearance") {
    t.innerText = "4. 10-Stage Clearance";
    el.innerHTML = list.map(s=>`<div class="card" style="padding:16px"><div style="display:flex;justify-content:space-between"><strong>${s.ref} • ${s.client}</strong><button class="btn-gold" onclick="nextStep('${s.id}',${s.milestone_step||0})">Next →</button></div><div class="steps">${MS.map((m,idx)=>`<div class="st ${idx<=(s.milestone_step||0)?"ok":""}">${m}</div>`).join("")}</div></div>`).join("");
  } else if (page === "borders") {
    t.innerText = "5. Border Network";
