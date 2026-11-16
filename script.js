const SUPABASE_URL = 'https://supabase.co';
const SUPABASE_KEY = 'sb_publishable_UEfSKMjLkzWn1L61-OIjJg_h7A5cLTW';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let isSignupMode = false;
let currentUser = null;
let activeCompany = null;
let allShipments = [];
let currentQuickType = '';
let mapInstance = null;

function openAuth(signup) {
  isSignupMode = signup;
  updateAuthUI();
  document.getElementById('authScreen').style.display = 'flex';
}

function closeAuth() {
  document.getElementById('authScreen').style.display = 'none';
}

function toggleAuthMode() {
  isSignupMode = !isSignupMode;
  updateAuthUI();
}

function updateAuthUI() {
  document.getElementById('signupFields').style.display = isSignupMode ? 'block' : 'none';
  document.getElementById('authHeading').textContent = isSignupMode ? 'Create Company Workspace' : 'Sign In to BorderFlow';
  document.getElementById('authSubmitBtn').textContent = isSignupMode ? 'Create Account & Launch' : 'Sign In';
  document.getElementById('authPrompt').textContent = isSignupMode ? 'Already registered?' : 'New logistics company?';
  document.getElementById('toggleAuthBtn').textContent = isSignupMode ? 'Sign In' : 'Create Account';
  document.getElementById('authMsg').textContent = '';
}

async function handleAuth() {
  const email = document.getElementById('aEmail').value.trim();
  const password = document.getElementById('aPass').value;
  const fullName = document.getElementById('aName').value.trim();
  const companyName = document.getElementById('aCompany').value.trim();
  const msgEl = document.getElementById('authMsg');

  if (!email || !password) {
    msgEl.textContent = 'Please enter your work email and password.';
    return;
  }

  msgEl.textContent = 'Connecting to BorderFlow cloud...';

  if (isSignupMode) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || email.split('@')[0],
          company_name: companyName || 'BorderFlow Logistics Ltd'
        }
      }
    });
    if (error) {
      msgEl.textContent = error.message;
      return;
    }
    if (data.session) {
      closeAuth();
      await initWorkspace();
    } else {
      msgEl.style.color = '#22C58B';
      msgEl.textContent = 'Account created! Check your email to confirm, or sign in if confirmation is disabled.';
    }
  } else {
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      msgEl.textContent = error.message;
      return;
    }
    closeAuth();
    await initWorkspace();
  }
}

async function signOutUser() {
  await sb.auth.signOut();
  location.reload();
}

async function initWorkspace() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return;
  currentUser = user;

  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('appShell').style.display = 'flex';

  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single();
  const { data: members } = await sb
    .from('company_members')
    .select('company_id, role, company:companies(*)')
    .eq('user_id', user.id);

  if (members && members.length > 0) {
    activeCompany = members[0].company;
  }

  const displayName = profile?.full_name || user.email.split('@')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  document.getElementById('welcomeGreeting').textContent = `${greeting}, ${displayName}.`;
  document.getElementById('welcomeCompany').textContent = `Here is ${activeCompany?.name || 'your company'}'s cross-border operations overview.`;
  document.getElementById('headerUserBadge').textContent = `${displayName} • ${activeCompany?.name || ''}`;

  startClock();
  await loadOverviewData();
  await loadBorderMap();
}

function startClock() {
  const update = () => {
    const now = new Date();
    document.getElementById('liveClock').textContent = `${now.toDateString()} | ${now.toLocaleTimeString()}`;
  };
  update();
  setInterval(update, 1000);
}

async function loadOverviewData() {
  if (!activeCompany) return;

  const [shipRes, delayRes] = await Promise.all([
    sb.from('shipments').select('*').eq('company_id', activeCompany.id).order('created_at', { ascending: false }),
    sb.from('shipment_delays').select('shipment_id').eq('company_id', activeCompany.id).eq('is_resolved', false)
  ]);

  allShipments = shipRes.data || [];
  const active = allShipments.filter(s => s.status !== 'cancelled' && s.status !== 'archived');
  const cleared = active.filter(s => s.status === 'cleared' || s.status === 'delivered');
  const inClearance = active.filter(s => ['ready_for_clearance', 'declaration_submitted', 'under_assessment', 'inspection_required', 'duties_payable'].includes(s.status));
  const uniqueDelays = new Set((delayRes.data || []).map(d => d.shipment_id));

  document.getElementById('statTotal').textContent = active.length;
  document.getElementById('statCleared').textContent = cleared.length;
  document.getElementById('statInClearance').textContent = inClearance.length;
  document.getElementById('statDelays').textContent = uniqueDelays.size;

  renderShipments(allShipments);
}

function renderShipments(list) {
  const tbody = document.getElementById('shipmentsTableBody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--bf-muted);">No shipments recorded yet. Click "+ Create Shipment" above!</td></tr>';
    return;
  }
  tbody.innerHTML = list.slice(0, 10).map(s => `
    <tr>
      <td><strong>${s.shipment_ref}</strong></td>
      <td>${s.origin_city} → ${s.destination_city}</td>
      <td>${s.container_no || '—'}</td>
      <td><span class="pill">${s.status.replace(/_/g, ' ')}</span></td>
    </tr>
  `).join('');
}

function filterShipments() {
  const q = document.getElementById('globalSearch').value.toLowerCase();
  const filtered = allShipments.filter(s =>
    (s.shipment_ref || '').toLowerCase().includes(q) ||
    (s.container_no || '').toLowerCase().includes(q) ||
    (s.origin_city || '').toLowerCase().includes(q) ||
    (s.destination_city || '').toLowerCase().includes(q)
  );
  renderShipments(filtered);
}

async function loadBorderMap() {
  const { data: borders } = await sb.from('border_posts').select('*');
  if (!mapInstance) {
    mapInstance = L.map('borderMap').setView([-20.0, 29.5], 5);
    L.tileLayer('https://{s}://{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapInstance);
  }
  (borders || []).forEach(b => {
    L.circleMarker([b.latitude, b.longitude], {
      radius: 9,
      color: b.congestion_level === 'moderate' ? '#F3B64B' : '#22C58B',
      fillOpacity: 0.8
    }).addTo(mapInstance).bindPopup(`<strong>${b.name}</strong><br/>Status: ${b.congestion_level}`);
  });
}

function switchSection(name, isOverview, el) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (el) el.classList.add('active');
  document.getElementById('pageTitle').textContent = name;
  document.getElementById('overviewSection').style.display = isOverview ? 'flex' : 'none';
  document.getElementById('placeholderSection').style.display = isOverview ? 'none' : 'flex';
  document.getElementById('placeholderTitle').textContent = name;
}

function openQuickModal(type) {
  currentQuickType = type;
  document.getElementById('qmFeedback').textContent = '';
  const fields = document.getElementById('qmFields');
  const titles = {
    shipment: 'Create New Shipment',
    clearance: 'Submit Customs Clearance',
    vehicle: 'Add Vehicle & Driver',
    client: 'Onboard New Client',
    delay: 'Report Border Delay',
    payment: 'Record Client Payment',
    expense: 'Create Operational Expense'
  };
  document.getElementById('qmTitle').textContent = titles[type];

  if (type === 'shipment') {
    fields.innerHTML = `
      <div class="field"><label>Shipment Ref *</label><input id="f1" placeholder="BF-2026-1001" /></div>
      <div class="field"><label>Origin City *</label><input id="f2" placeholder="Durban, ZA" /></div>
      <div class="field"><label>Destination City *</label><input id="f3" placeholder="Harare, ZW" /></div>
      <div class="field"><label>Container No</label><input id="f4" placeholder="MSKU882910" /></div>`;
  } else if (type === 'clearance') {
    fields.innerHTML = `
      <div class="field"><label>Existing Shipment Ref *</label><input id="f1" placeholder="BF-2026-1001" /></div>
      <div class="field"><label>Customs Declaration Ref *</label><input id="f2" placeholder="ZIMRA-SAD500-441" /></div>`;
  } else if (type === 'vehicle') {
    fields.innerHTML = `
      <div class="field"><label>Truck Registration *</label><input id="f1" placeholder="AFZ 4821" /></div>
      <div class="field"><label>Driver Full Name *</label><input id="f2" placeholder="Tendai Moyo" /></div>`;
  } else if (type === 'client') {
    fields.innerHTML = `
      <div class="field"><label>Client Company Name *</label><input id="f1" placeholder="Zambezi Mining Ltd" /></div>
      <div class="field"><label>Email</label><input id="f2" placeholder="ops@client.co.zw" /></div>`;
  } else if (type === 'delay') {
    fields.innerHTML = `
      <div class="field"><label>Shipment Ref *</label><input id="f1" placeholder="BF-2026-1001" /></div>
      <div class="field"><label>Reason *</label><input id="f2" placeholder="Beitbridge Scanner Queue" /></div>`;
  } else {
    fields.innerHTML = `
      <div class="field"><label>Category *</label><input id="f1" placeholder="Customs Duty / Freight Fee" /></div>
      <div class="field"><label>Amount (USD) *</label><input id="f2" type="number" placeholder="1500" /></div>`;
  }
  document.getElementById('quickModal').style.display = 'flex';
}

async function submitQuickAction() {
  if (!activeCompany) return;
