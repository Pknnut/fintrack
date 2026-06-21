const INCOME_CATS = [{e:"💼",n:"Salary"},{e:"💰",n:"Freelance"},{e:"📈",n:"Trading / Investing"},{e:"🏠",n:"Rental Income"},{e:"🎁",n:"Bonus"},{e:"💵",n:"Other Income"}];
const EXPENSE_CATS = [{e:"🏠",n:"Rent / Mortgage"},{e:"🍜",n:"Food & Dining"},{e:"🚇",n:"BTS / MRT"},{e:"🚗",n:"Grab / Transport"},{e:"⛽",n:"Gasoline"},{e:"⚡",n:"Electricity"},{e:"💧",n:"Water"},{e:"📱",n:"Phone / Internet"},{e:"🛒",n:"Groceries"},{e:"🏥",n:"Health / Medical"},{e:"👕",n:"Shopping"},{e:"🎬",n:"Entertainment"},{e:"✈️",n:"Travel"},{e:"📚",n:"Education"},{e:"💳",n:"Credit Card"},{e:"🏦",n:"Loan Repayment"},{e:"💊",n:"Pharmacy"},{e:"🛡️",n:"Insurance"},{e:"📦",n:"Other Expense"}];
// Shared edit-button icon (matches the recurring page's edit button) — used for every edit button.
const EDIT_PENCIL    = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const EDIT_PENCIL_SM = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
const SIM_BOLT = '<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>';
let GOALS = [];
let INSTALLMENTS = [
  {icon:"📚",name:"Jeducations",cat:"💳 Credit Card",total:7711.50,monthly:771.15,paid:9,total_mo:10,color:"var(--indigo)"},
  {icon:"🏍️",name:"Bike (1)",cat:"💳 Credit Card",total:3218.80,monthly:321.88,paid:4,total_mo:10,color:"var(--teal)"},
  {icon:"🏍️",name:"Bike (2)",cat:"💳 Credit Card",total:9556.50,monthly:955.65,paid:4,total_mo:10,color:"var(--amber)"},
  {icon:"🏍️",name:"Bike (3)",cat:"💳 Credit Card",total:2772.90,monthly:462.15,paid:3,total_mo:6,color:"var(--green)"},
  {icon:"🛡️",name:"AIA Insurance",cat:"🛡️ Insurance",total:30681.70,monthly:3068.17,paid:4,total_mo:10,color:"#8b5cf6"},
];
const MO = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const CAT_COLORS = ["#6366f1","#0d9488","#f59e0b","#ef4444","#22c55e","#8b5cf6","#ec4899","#f97316"];
// Soft background tints for category icons (calendar detail + search).
// Built FROM the category arrays above by position, not a hand-maintained name
// lookup — so renaming a category in EXPENSE_CATS/INCOME_CATS can't desync this
// the way the old hardcoded-name-keyed map could.
const EXPENSE_TINTS = [
  "var(--tint-green-bg)", "var(--tint-amber-bg)", "var(--tint-blue-bg)", "var(--tint-blue-bg)",
  "var(--tint-blue-bg)", "var(--tint-cyan-bg)", "var(--tint-cyan-bg)", "var(--tint-cyan-bg)",
  "var(--tint-amber-bg)", "var(--tint-rose-bg)", "var(--tint-orange-bg)", "var(--tint-purple-bg)",
  "var(--tint-purple-bg)", "var(--tint-purple-bg)", "var(--slate-100)", "var(--slate-100)",
  "var(--tint-rose-bg)", "var(--tint-rose-bg)", "var(--slate-100)"
];
const INCOME_TINTS = Array(INCOME_CATS.length).fill("var(--tint-green-bg)");
const CAT_BG = {};
EXPENSE_CATS.forEach((c, i) => { CAT_BG[c.n] = EXPENSE_TINTS[i] || "var(--slate-100)"; });
INCOME_CATS.forEach((c, i) => { CAT_BG[c.n] = INCOME_TINTS[i] || "var(--tint-green-bg)"; });

let txs = JSON.parse(localStorage.getItem("ft_txs") || "[]");
// Data integrity: strip fromGoal:true when there's no goalName (legacy bad data).
// Names that don't match a real goal are validated later in isGoalSpend() at render time.
txs = txs.map(t => t.fromGoal && !t.goalName ? {...t, fromGoal: false} : t);
let settings = JSON.parse(localStorage.getItem("ft_settings") || "{}");
const _savedGoals = JSON.parse(localStorage.getItem("ft_goals") || "null");
const _savedInsts = JSON.parse(localStorage.getItem("ft_insts") || "null");
if (_savedGoals) GOALS.push(..._savedGoals);
if (_savedInsts) { INSTALLMENTS.length = 0; INSTALLMENTS.push(..._savedInsts); }
// One-time migration: backfill goalId onto legacy goal-spends (matched by current name),
// so the link survives future goal renames. Runs cheaply on every load; no-op once done.
(function backfillGoalIds() {
  let changed = false;
  txs.forEach(t => {
    if (t.fromGoal === true && t.type === "Expense" && t.goalId == null && t.goalName) {
      const g = GOALS.find(g => g.name === t.goalName);
      if (g) { t.goalId = g.id; changed = true; }
    }
  });
  if (changed) saveTxs();
})();
// One-time migration: backfill a stable id onto existing instalments — needed so
// confirmMarkPaid can link a transaction back to the instalment that created it.
(function backfillInstIds() {
  let changed = false;
  INSTALLMENTS.forEach((p, i) => {
    if (p.id == null) { p.id = Date.now() + i; changed = true; }
  });
  if (changed) saveInsts();
})();
let pinBuffer = "", pinMode = "enter", pinSetupFirst = "";
let unsyncedIds = JSON.parse(localStorage.getItem("ft_unsynced") || "[]");
let RECURRING = JSON.parse(localStorage.getItem("ft_recurring") || "[]");
let isRecurring = false;
function saveRecurring() {
  localStorage.setItem("ft_recurring", JSON.stringify(RECURRING));
  if (settings.sheetsUrl) syncRecurringToSheets();
}
async function syncRecurringToSheets() {
  await Promise.race([
    postToSheets("save_recurring", { recurring: RECURRING }),
    new Promise(r => setTimeout(() => r(false), 6000))
  ]);
}
async function fetchRecurringFromSheets(silent = false) {
  if (!settings.sheetsUrl) return false;
  try {
    const res  = await fetch(settings.sheetsUrl + "?action=get_recurring");
    const data = await res.json();
    if (data.recurring && Array.isArray(data.recurring) && data.recurring.length) {
      RECURRING = data.recurring;
      localStorage.setItem("ft_recurring", JSON.stringify(RECURRING));
      return true;
    }
    return false;
  } catch { return false; }
}

// ══ ESTIMATED BILLS ══════════════════════════════════════════
// Bills you know are coming but whose exact amount varies month to month
// (electric, credit card, internet, mobile...). Unlike Recurring, this never
// auto-logs a transaction — it's a pure forecast, kept local-only (no Sheets sync).
// Matched against this month's real transactions by description, exactly like
// Recurring, so a bill drops out of the pending total the moment you log the real
// payment — it's never subtracted twice.
let ESTIMATED_BILLS = JSON.parse(localStorage.getItem("ft_estbills") || "[]");
function saveEstBills() { localStorage.setItem("ft_estbills", JSON.stringify(ESTIMATED_BILLS)); }
function getPendingEstBills() {
  const now = new Date();
  const currentMo = now.getMonth(), currentYr = now.getFullYear();
  const thisMonthDescs = new Set(
    txs.filter(t => { const d = parseDate(t.date); return d.getMonth()===currentMo && d.getFullYear()===currentYr && t.type==="Expense"; })
       .map(t => (t.desc||t.description||"").toLowerCase())
  );
  return ESTIMATED_BILLS.filter(b => !thisMonthDescs.has((b.desc||"").toLowerCase()));
}
function estBillsPendingTotal() { return getPendingEstBills().reduce((s,b)=>s+(b.amount||0), 0); }

if (!settings.pin || settings.pin.length !== 6) settings.pin = "123456";
if (settings.pinEnabled === undefined) settings.pinEnabled = true;
if (settings.autosync   === undefined) settings.autosync   = true;
if (!settings.notif)        settings.notif        = false;
if (!settings.notifBudget)  settings.notifBudget  = true;
if (!settings.notifLog)     settings.notifLog     = true;
if (!settings.notifGoal)    settings.notifGoal    = false;
if (!settings.sheetsUrl) settings.sheetsUrl = "";
saveSettings();

function saveTxs()      { localStorage.setItem("ft_txs",      JSON.stringify(txs)); }
function saveGoals()    { localStorage.setItem("ft_goals",    JSON.stringify(GOALS)); }
function saveInsts()    { localStorage.setItem("ft_insts",    JSON.stringify(INSTALLMENTS)); }
function saveSettings() { localStorage.setItem("ft_settings", JSON.stringify(settings)); }
function fmt(n, dp) {
  const d = dp === undefined ? 2 : dp;
  const formatted = Number(n).toLocaleString("th-TH", {minimumFractionDigits:d, maximumFractionDigits:d});
  if (window._privacyMode) return "฿ " + formatted.replace(/[0-9]/g, "*");
  return "฿" + formatted;
}
function togglePrivacy() {
  window._privacyMode = !window._privacyMode;
  const btn = document.getElementById("privacy-btn"), icon = document.getElementById("privacy-icon");
  if (window._privacyMode) { btn.classList.add("active"); icon.className = "ti ti-eye-off"; icon.style.fontSize = "17px"; }
  else { btn.classList.remove("active"); icon.className = "ti ti-eye"; icon.style.fontSize = "17px"; icon.style.color = "var(--slate-500)"; }
  renderHome();
  const activePage = document.querySelector(".page.active");
  if (activePage) {
    const id = activePage.id;
    if (id==="page-goals")        renderGoals();
    if (id==="page-analytics")    renderAnalytics();
    if (id==="page-installments") renderInstallments();
    if (id==="page-history")      renderHistory();
    if (id==="page-budget")       renderBudget();
  }
}
function safeDate(raw) {
  if (!raw) return "—";
  const parts = raw.split("-");
  if (parts.length !== 3) return "—";
  const y = parseInt(parts[0],10), m = parseInt(parts[1],10);
  if (isNaN(y)||isNaN(m)||m<1||m>12) return "—";
  return MO[m-1] + " " + y;
}
function showToast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ══ MODALS ════════════════════════════════════════════════════
let modalGoalIdx = -1, modalInstIdx = -1;

function openGoalModal(idx) {
  modalGoalIdx = idx;
  const g = GOALS[idx];
  document.getElementById("modal-goal-title").textContent = "Add savings — " + g.name;
  document.getElementById("modal-goal-sub").textContent = "Currently saved: " + fmt(g.saved) + " of " + fmt(g.target);
  document.getElementById("modal-goal-amount").value = "";
  document.getElementById("modal-goal-note").value = "";
  const today = new Date();
  buildDaySelect("mg-date-d", today.getDate());
  buildMonthSelect("mg-date-m", today.getMonth()+1);
  buildYearSelect("mg-date-y", today.getFullYear(), 2, 1);
  sddEnhance("mg-date-d",{flex:"1",up:true}); sddEnhance("mg-date-m",{flex:"1.4",up:true}); sddEnhance("mg-date-y",{flex:"1.2",up:true});
  document.getElementById("modal-goal").classList.remove("hidden");
  nkpBind();
  /* keypad field: no autofocus (avoids auto-opening keypad over the form) */
}
function openInstModal(idx) {
  modalInstIdx = idx;
  const p = INSTALLMENTS[idx], newPaid = p.paid + 1;
  document.getElementById("modal-inst-title").textContent = "Mark as paid — " + p.name;
  document.getElementById("modal-inst-sub").textContent = "Payment " + newPaid + " of " + p.total_mo;
  document.getElementById("modal-inst-detail").innerHTML =
    '<div class="modal-detail-row"><span>Amount</span><strong>' + fmt(p.monthly) + '</strong></div>' +
    '<div class="modal-detail-row"><span>Months left after</span><strong>' + Math.max(p.total_mo-newPaid,0) + '</strong></div>' +
    '<div class="modal-detail-row"><span>Balance after</span><strong style="color:var(--red)">' + fmt(Math.max(p.total-p.monthly*newPaid,0)) + '</strong></div>';
  const linkNote = document.getElementById("modal-inst-link-note");
  if (linkNote) linkNote.innerHTML =
    '<i class="ti ti-link" style="font-size:15px;color:var(--green-text);margin-top:1px" aria-hidden="true"></i>' +
    '<div><p style="font-size:11px;font-weight:600;color:var(--green-text);margin:0 0 2px">Also logs an expense transaction</p>' +
    '<p style="font-size:10px;color:var(--green-text);margin:0">' + fmt(p.monthly) + ' · ' + p.cat.replace(/^\S+\s/,"") + ' · today — shows up in History, Analytics and Budget automatically.</p></div>';
  document.getElementById("modal-inst").classList.remove("hidden");
}
function openModal(type) {
  const el = document.getElementById("modal-" + type);
  if (el) el.classList.remove("hidden");
}
function closeModal(type) {
  document.getElementById("modal-" + type).classList.add("hidden");
  nkpClose();
  if (typeof tkbClose === "function") tkbClose();
  if (type==="goal")      modalGoalIdx = -1;
  if (type==="spend-goal")   spendGoalIdx = -1;
  if (type==="edit-contrib") { editContribGoalIdx=-1; editContribIdx=-1; }
  if (type==="inst")      modalInstIdx = -1;
  if (type==="budget")    editBudgetIdx = -1;
  if (type==="edit-tx")   editTxId = null;
  if (type==="edit-goal") editGoalIdx = -1;
  if (type==="edit-inst") editInstIdx = -1;
  if (type==="add-recurring") _recAddEditIdx = -1;
  if (type==="add-estbill") _estAddEditIdx = -1;
}

async function confirmAddSavings() {
  if (modalGoalIdx < 0) return;
  const amount = parseFloat(document.getElementById("modal-goal-amount").value) || 0;
  if (amount <= 0) { showToast("Enter an amount"); return; }
  const note = document.getElementById("modal-goal-note").value.trim();
  const date = getDateVal("mg-date-d","mg-date-m","mg-date-y") || toDateStr(new Date());
  const g = GOALS[modalGoalIdx];
  // Save to contributions log
  if (!g.contributions) g.contributions = [];
  g.contributions.push({ id: Date.now(), amount, note, date });
  const newSaved = g.saved + amount;
  GOALS[modalGoalIdx].saved = newSaved;
  saveGoals(); closeModal("goal"); renderGoals();
  showToast("+" + fmt(amount) + " saved!");
  if (settings.sheetsUrl && settings.autosync) {
    setSyncStatus("syncing");
    const ok = await Promise.race([postToSheets("update_goal_saved",{data:{name:g.name,newSaved,target:g.target}}),new Promise(r=>setTimeout(()=>r(false),6000))]);
    if (ok) { setSyncStatus("ok"); showToast("Savings synced to Sheets ✓"); }
    else    { setSyncStatus("error"); showToast("Saved locally — sync failed"); }
  }
}
async function confirmMarkPaid() {
  if (modalInstIdx < 0) return;
  const p = INSTALLMENTS[modalInstIdx];
  if (p.paid >= p.total_mo) { showToast("Already fully paid off"); closeModal("inst"); return; }
  const newPaid = p.paid + 1;
  const now = new Date();
  INSTALLMENTS[modalInstIdx].paid = newPaid;
  INSTALLMENTS[modalInstIdx].lastPaidYM = ymOf(now);
  saveInsts();
  // One real payment = one transaction, created here instead of a separate manual
  // entry — this is what lets Safe to Spend stop double-counting this instalment.
  const tx = { id: Date.now(), date: toDateStr(now), type: "Expense", category: p.cat,
    desc: (p.icon ? p.icon + " " : "") + p.name + " instalment", amount: p.monthly,
    notes: "", fromInst: true, instId: p.id };
  txs.push(tx); saveTxs();
  closeModal("inst"); renderInstallments(); renderHome();
  showToast(p.name + " — payment " + newPaid + "/" + p.total_mo + " marked + logged ✓");
  if (settings.sheetsUrl && settings.autosync) {
    setSyncStatus("syncing");
    const [instOk, txOk] = await Promise.all([
      Promise.race([postToSheets("update_installment_paid",{planName:p.name,monthsPaid:newPaid}),new Promise(r=>setTimeout(()=>r(false),6000))]),
      Promise.race([postToSheets("add_transaction",{data:{...tx}}),new Promise(r=>setTimeout(()=>r(false),6000))])
    ]);
    if (instOk && txOk) { setSyncStatus("ok"); }
    else {
      setSyncStatus("error");
      if (!txOk) { unsyncedIds.push(tx.id); localStorage.setItem("ft_unsynced", JSON.stringify(unsyncedIds)); }
      showToast("Synced partially — check connection");
    }
  }
}

// ══ STARTUP ═══════════════════════════════════════════════════
async function rebuildAnalyticsSheet() {
  if (!settings.sheetsUrl) { showToast("Add Sheets URL in Settings first"); return; }
  const yr = analyticsYear || new Date().getFullYear();
  showToast("Rebuilding " + yr + " Analytics sheet…"); setSyncStatus("syncing");
  try {
    const res = await fetch(settings.sheetsUrl + "?action=rebuild_analytics&year=" + yr);
    const data = await res.json();
    if (data.success) { setSyncStatus("ok"); showToast(yr + " Analytics sheet rebuilt ✓"); }
    else { setSyncStatus("error"); showToast("Rebuild failed: " + (data.error || "unknown")); }
  } catch(e) { setSyncStatus("error"); showToast("Rebuild failed — check connection"); }
}

async function startup() {
  setLoading("Starting up…", 10);
  if (settings.sheetsUrl) {
    setLoading("Fetching data from Google Sheets…", 25);
    const [txOk, budgetOk] = await Promise.all([fetchFromSheets(true), fetchBudgetsFromSheets(true), fetchRecurringFromSheets(true)]);
    if (txOk || budgetOk) { setLoading("Data loaded ✓", 90); await delay(600); }
    else { setLoading("Working offline", 90); await delay(600); }
  } else { setLoading("Loading…", 80); await delay(300); }
  setLoading("Ready", 100); await delay(300);
  applyDarkMode();
  checkRecurringSuggestions();
  checkInAppNotifications();
  document.getElementById("loading-screen").classList.add("hidden");
  if (settings.pinEnabled) {
    document.getElementById("pin-screen").classList.remove("hidden");
    pinMode = "enter"; document.getElementById("pin-sub").textContent = "Enter your PIN"; updatePinDots();
  } else { unlockApp(); }
}
function setLoading(msg, pct) {
  document.getElementById("loading-msg").textContent = msg;
  document.getElementById("loading-bar").style.width = pct + "%";
}

async function fetchFromSheets(silent = false) {
  if (!settings.sheetsUrl) { if (!silent) { showToast("Add Sheets URL in Settings first"); goTo("settings"); } return false; }
  if (!silent) { setSyncStatus("syncing"); showToast("Pulling from Google Sheets…"); }
  try {
    const res = await fetch(settings.sheetsUrl + "?action=get_transactions");
    const data = await res.json();
    if (data.transactions && Array.isArray(data.transactions)) {
      // Dedup: remove from unsyncedIds any tx that Sheets already has (matched by date+amount+desc)
      const sheetsKeys = new Set(data.transactions.map(t => t.date + '|' + t.amount + '|' + (t.description||"")));
      unsyncedIds = unsyncedIds.filter(uid => {
        const local = txs.find(t => t.id === uid);
        if (!local) return false;
        const key = (local.date||"") + '|' + local.amount + '|' + (local.desc||local.description||"");
        return !sheetsKeys.has(key); // keep in unsynced only if NOT already in Sheets
      });
      localStorage.setItem("ft_unsynced", JSON.stringify(unsyncedIds));
      const localOnly = txs.filter(t => !t.rowId && unsyncedIds.includes(t.id));
      txs = [...data.transactions.map(t => ({id:t.rowId,rowId:t.rowId,date:normalizeDate(t.date),type:t.type,category:t.category,desc:t.description,amount:t.amount,notes:t.notes||"",fromGoal:t.fromGoal===true||t.fromGoal==="true"||t.fromGoal===1,goalName:t.goalName||"",splitId:t.splitId||""})),...localOnly];
      saveTxs(); settings.lastPull = new Date().toISOString(); saveSettings();
      if (!silent) { setSyncStatus("ok"); showToast(data.transactions.length + " transactions pulled ✓"); document.getElementById("last-pull-label").textContent = "Last pulled: just now"; }
      renderHome(); renderAnalytics(); return true;
    }
    return false;
  } catch(e) { if (!silent) { setSyncStatus("error"); showToast("Pull failed — check connection"); } return false; }
}

function pinPress(digit) { if (pinBuffer.length >= 6) return; pinBuffer += digit; updatePinDots(); if (pinBuffer.length === 6) setTimeout(() => checkPin(), 120); }
function pinDel() { pinBuffer = pinBuffer.slice(0,-1); updatePinDots(); document.getElementById("pin-error").textContent = ""; }
function updatePinDots() { for (let i=0;i<6;i++) document.getElementById("d"+i).classList.toggle("filled", i<pinBuffer.length); }
function checkPin() {
  if (pinMode === "enter") {
    if (pinBuffer === settings.pin) { unlockApp(); }
    else { document.getElementById("pin-error").textContent = "Incorrect PIN. Try again."; pinBuffer = ""; updatePinDots(); }
  } else if (pinMode === "setup") {
    pinSetupFirst = pinBuffer; pinBuffer = ""; pinMode = "confirm";
    document.getElementById("pin-sub").textContent = "Confirm your new PIN";
    document.getElementById("pin-setup-hint").textContent = "Enter the same PIN again"; updatePinDots();
  } else if (pinMode === "confirm") {
    if (pinBuffer === pinSetupFirst) {
      settings.pin = pinBuffer; saveSettings(); pinBuffer = ""; pinMode = "enter"; unlockApp(); showToast("PIN updated ✓");
    } else {
      document.getElementById("pin-error").textContent = "PINs don't match. Try again.";
      pinBuffer = ""; pinMode = "setup"; pinSetupFirst = "";
      document.getElementById("pin-sub").textContent = "Set a new PIN"; updatePinDots();
    }
  }
}
function unlockApp() { document.getElementById("pin-screen").classList.add("hidden"); updateSyncBar(); renderHome(); }
function changePin() {
  document.getElementById("pin-screen").classList.remove("hidden");
  pinBuffer = ""; pinMode = "setup"; pinSetupFirst = "";
  document.getElementById("pin-sub").textContent = "Set a new PIN";
  document.getElementById("pin-setup-hint").textContent = "Choose a 6-digit PIN";
  document.getElementById("pin-error").textContent = ""; updatePinDots();
}

function goTo(page) {
  const currentPage = document.querySelector(".page.active");
  if (currentPage) _prevPage = currentPage.id.replace("page-", "");
  if (currentPage && currentPage.id === "page-history" && page !== "history") {
    histFilter = "all";
    ["hist-filter-type","hist-filter-year","hist-filter-month","hist-filter-cat","hist-search"].forEach(id => { const el = document.getElementById(id); if (el) el.value = id === "hist-filter-type" ? "all" : ""; });
    const panel = document.getElementById("hist-adv-panel"), btn = document.getElementById("hist-adv-btn");
    if (panel) panel.classList.remove("open"); if (btn) btn.classList.remove("active");
    const tagsEl = document.getElementById("hist-active-filters"), advLabel = document.getElementById("hist-adv-btn-label"), heading = document.getElementById("hist-type-label");
    if (tagsEl) tagsEl.innerHTML = ""; if (advLabel) advLabel.textContent = "Filter"; if (heading) heading.textContent = "All transactions";
  }
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  document.getElementById("page-" + page).classList.add("active");
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  const nb = document.getElementById("nav-" + page); if (nb) nb.classList.add("active");
  if (page==="home")         renderHome();
  if (page==="goals")        { const gPanel=document.getElementById("goals-filter-panel"),gBtn=document.getElementById("goals-filter-btn"); if(gPanel)gPanel.classList.remove("open"); if(document.getElementById("goals-filter-status"))document.getElementById("goals-filter-status").value="all"; if(document.getElementById("goals-filter-year"))document.getElementById("goals-filter-year").value=""; buildGoalsYearDropdown(); sddEnhance("goals-filter-status"); sddEnhance("goals-filter-year"); renderGoals(); }
  if (page==="analytics")    { closeAnalyticsDropdown(); renderAnalytics(); }
  if (page==="installments") { sddEnhance("inst-filter-status",{flex:"1"}); sddEnhance("inst-filter-sort",{flex:"1"}); renderInstallments(); }
  if (page==="add")          setupAdd();
  if (page==="settings")     renderSettings();
  if (page==="recurring")    { _recEditIdx = null; renderRecurringPage(); }
  if (page==="estbills")     { _estEditIdx = null; renderEstBillsPage(); }
  if (page==="calendar")     { const cs=document.getElementById("cal-search"); if(cs)cs.value=""; const cr=document.getElementById("cal-search-results"); if(cr)cr.style.display="none"; const cm=document.getElementById("cal-main-content"); if(cm)cm.style.display="block"; renderCalendarPage(); }
  if (page==="history")      { histFilter="all"; document.getElementById("hist-search").value=""; document.getElementById("hist-adv-panel").classList.remove("open"); document.getElementById("hist-adv-btn").classList.remove("active"); if(document.getElementById("hist-filter-type"))document.getElementById("hist-filter-type").value="all"; buildHistFilterDropdowns(); ["hist-filter-type","hist-filter-year","hist-filter-month","hist-filter-cat"].forEach(id=>sddEnhance(id)); sddEnhance("hist-sort",{inline:true}); renderHistory(); }
  if (page==="budget")       { closeBudgetDropdown(); renderBudget(); }
}

let histFilter = "all";
let _prevPage = "home";
function onHistTypeChange() { histFilter = document.getElementById("hist-filter-type").value; document.getElementById("hist-filter-cat").value = ""; buildHistCategoryDropdown(); if(SDD_ENHANCED.has("hist-filter-type"))sddSync("hist-filter-type"); if(SDD_ENHANCED.has("hist-filter-cat"))sddSync("hist-filter-cat"); renderHistory(); }
function toggleHistAdv() { const panel=document.getElementById("hist-adv-panel"),btn=document.getElementById("hist-adv-btn"); const isOpen=panel.classList.toggle("open"); btn.classList.toggle("active",isOpen); if(isOpen)buildHistFilterDropdowns(); }
function buildHistFilterDropdowns() { buildHistYearDropdown(); buildHistCategoryDropdown(); }
function buildHistYearDropdown() {
  const years=[...new Set(txs.map(t=>parseDate(t.date).getFullYear()))].sort((a,b)=>b-a);
  const ySel=document.getElementById("hist-filter-year"),curY=ySel.value;
  ySel.innerHTML='<option value="">All years</option>'+years.map(y=>'<option value="'+y+'"'+(y==curY?' selected':'')+'>'+y+'</option>').join("");
  if (typeof sddSync==="function" && SDD_ENHANCED.has("hist-filter-year")) sddSync("hist-filter-year");
}
function buildHistCategoryDropdown() {
  const cats=[...new Set(txs.filter(t=>histFilter==="all"||t.type===histFilter).map(t=>t.category).filter(Boolean))].sort();
  const cSel=document.getElementById("hist-filter-cat"),curC=cSel.value;
  cSel.innerHTML='<option value="">All categories</option>'+cats.map(c=>'<option value="'+c+'"'+(c===curC?' selected':'')+'>'+c+'</option>').join("");
  if (typeof sddSync==="function" && SDD_ENHANCED.has("hist-filter-cat")) sddSync("hist-filter-cat");
}
function clearHistFilters() {
  histFilter="all"; document.getElementById("hist-filter-type").value="all"; document.getElementById("hist-filter-year").value=""; document.getElementById("hist-filter-month").value=""; document.getElementById("hist-filter-cat").value=""; document.getElementById("hist-search").value="";
  buildHistCategoryDropdown();
  ["hist-filter-type","hist-filter-year","hist-filter-month","hist-filter-cat"].forEach(id=>{ if(SDD_ENHANCED.has(id)) sddSync(id); });
  renderHistory();
}
function getHistActiveFilters() { return { year:document.getElementById("hist-filter-year")?.value||"", month:document.getElementById("hist-filter-month")?.value, cat:document.getElementById("hist-filter-cat")?.value||"" }; }
function renderHistTags(f) {
  const tags=[];
  if (histFilter!=="all") tags.push({label:histFilter,key:"type"});
  if (f.year) tags.push({label:f.year,key:"year"});
  if (f.month!==""&&f.month!==undefined&&f.month!==null) tags.push({label:MO[parseInt(f.month)],key:"month"});
  if (f.cat) tags.push({label:f.cat.replace(/^\S+\s/,""),key:"cat"});
  const heading=document.getElementById("hist-type-label");
  if (heading) { if(histFilter==="Expense")heading.textContent="Expenses"; else if(histFilter==="Income")heading.textContent="Income"; else heading.textContent="All transactions"; }
  const advLabel=document.getElementById("hist-adv-btn-label");
  if (advLabel) advLabel.textContent=tags.length>0?"Filter ("+tags.length+")":"Filter";
  const el=document.getElementById("hist-active-filters"); if(!el)return;
  el.innerHTML=tags.map(t=>'<div class="hist-filter-tag">'+t.label+'<button onclick="clearHistTag(\''+t.key+'\')" aria-label="Remove filter">×</button></div>').join("");
}
function clearHistTag(key) {
  if(key==="type"){histFilter="all";document.getElementById("hist-filter-type").value="all";buildHistCategoryDropdown();if(SDD_ENHANCED.has("hist-filter-type"))sddSync("hist-filter-type");}
  if(key==="year"){document.getElementById("hist-filter-year").value="";if(SDD_ENHANCED.has("hist-filter-year"))sddSync("hist-filter-year");}
  if(key==="month"){document.getElementById("hist-filter-month").value="";if(SDD_ENHANCED.has("hist-filter-month"))sddSync("hist-filter-month");}
  if(key==="cat"){document.getElementById("hist-filter-cat").value="";if(SDD_ENHANCED.has("hist-filter-cat"))sddSync("hist-filter-cat");}
  renderHistory();
}
function renderHistory() {
  const search=(document.getElementById("hist-search")?.value||"").toLowerCase();
  const sort=document.getElementById("hist-sort")?.value||"newest";
  const f=getHistActiveFilters();
  renderHistTags(f);
  const hasFilters=f.year||(f.month!==""&&f.month!==undefined)||f.cat;
  const advBtn=document.getElementById("hist-adv-btn"); if(advBtn)advBtn.classList.toggle("active",!!hasFilters);
  let list=txs.filter(t=>{
    if(histFilter!=="all"&&t.type!==histFilter)return false;
    if(f.year&&parseDate(t.date).getFullYear()!=f.year)return false;
    if(f.month!==""&&f.month!==undefined&&f.month!==null&&f.month!==""){if(parseDate(t.date).getMonth()!=parseInt(f.month))return false;}
    if(f.cat&&t.category!==f.cat)return false;
    if(search){const desc=(t.desc||t.description||"").toLowerCase(),cat=(t.category||"").toLowerCase();if(!desc.includes(search)&&!cat.includes(search))return false;}
    return true;
  });
  if(sort==="newest")list.sort((a,b)=>parseDate(b.date)-parseDate(a.date));
  if(sort==="oldest")list.sort((a,b)=>parseDate(a.date)-parseDate(b.date));
  if(sort==="highest")list.sort((a,b)=>b.amount-a.amount);
  if(sort==="lowest")list.sort((a,b)=>a.amount-b.amount);
  const countEl=document.getElementById("hist-count"); if(countEl)countEl.textContent=list.length+" transaction"+(list.length!==1?"s":"");
  const el=document.getElementById("hist-list"); if(!el)return;
  if(!list.length){el.innerHTML='<div class="empty-state">No transactions found</div>';return;}
  // Date grouping
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  // Build render items: group split transactions into one card (unless a category
  // filter is active — then show members individually so the filter stays accurate).
  const groupAllowed = !f.cat;
  const items = [];
  const seenSplit = new Set();
  list.forEach(t => {
    if (groupAllowed && t.splitId) {
      if (seenSplit.has(t.splitId)) return;
      seenSplit.add(t.splitId);
      items.push({ group:true, date:t.date, txs:list.filter(x=>x.splitId===t.splitId) });
    } else {
      items.push({ group:false, date:t.date, tx:t });
    }
  });
  let lastDateKey = null;
  const rows = items.map(it => {
    let hdr = "";
    if (it.date !== lastDateKey) { lastDateKey = it.date; hdr = histDateHeader(it.date, today, yesterday); }
    return hdr + (it.group ? histSplitCard(it.txs) : histSingleRow(it.tx, !!it.tx.splitId));
  });
  el.innerHTML = rows.join("");
  initSwipeToDelete();
}
function histDateHeader(dateStr, today, yesterday) {
  const d = parseDate(dateStr); d.setHours(0,0,0,0);
  let lbl;
  if (d.getTime()===today.getTime()) lbl = "Today";
  else if (d.getTime()===yesterday.getTime()) lbl = "Yesterday";
  else lbl = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()] + " " + d.getDate() + " " + MO[d.getMonth()] + " " + d.getFullYear();
  return '<div class="hist-date-group">'+lbl+'</div>';
}
function histSingleRow(t, isSplitMember) {
  const isInc=t.type==="Income", d=parseDate(t.date), desc=t.desc||t.description||"";
  return '<div class="swipe-container" data-id="'+t.id+'">' +
    '<div class="swipe-del-bg"><i class="ti ti-trash" style="font-size:20px;color:var(--red)"></i></div>' +
    '<div class="hist-tx-row" data-id="'+t.id+'"><div class="tx-icon">'+(t.category||"").split(" ")[0]+'</div><div style="flex:1;min-width:0"><div class="tx-name">'+desc+
    (isGoalSpend(t)?'<span class="goal-pill-tag">'+goalSpendName(t)+'</span>':'')+(isSplitMember?'<span class="split-pill">Split</span>':'')+
    '</div><div class="tx-sub">'+(t.category||"").replace(/^\S+\s/,"")+" · "+d.getDate()+" "+MO[d.getMonth()]+" "+d.getFullYear()+
    '</div></div><span class="tx-amt '+(isInc?'pos':'neg')+'" style="margin-right:8px">'+(isInc?"+":"-")+fmt(t.amount)+
    '</span><button class="hist-tx-edit" onclick="openEditTxModal('+t.id+')" aria-label="Edit">'+EDIT_PENCIL+'</button></div>' +
  '</div>';
}
function histSplitCard(members) {
  const m0 = members[0], isInc = m0.type==="Income", d=parseDate(m0.date), desc=m0.desc||m0.description||"";
  const total = members.reduce((s,m)=>s+m.amount,0);
  const breakdown = members.map(m =>
    '<div style="display:flex;justify-content:space-between;font-size:11px;padding:3px 0;color:var(--slate-500)">' +
      '<span>'+(m.category||"")+'</span><span>'+(isInc?"+":"-")+fmt(m.amount)+'</span></div>'
  ).join("");
  return '<div class="hist-split-card">' +
    '<div style="display:flex;align-items:center;gap:10px">' +
      '<div class="tx-icon">🧾</div>' +
      '<div style="flex:1;min-width:0"><div class="tx-name">'+desc+'<span class="split-pill">Split · '+members.length+'</span></div>' +
      '<div class="tx-sub">'+d.getDate()+" "+MO[d.getMonth()]+" "+d.getFullYear()+'</div></div>' +
      '<span class="tx-amt '+(isInc?'pos':'neg')+'" style="margin-right:6px">'+(isInc?"+":"-")+fmt(total)+'</span>' +
      '<button class="rec-edit-btn" style="margin-right:2px" onclick="openEditSplit(\''+m0.splitId+'\')" aria-label="Edit split">'+EDIT_PENCIL+'</button>' +
      '<button class="hist-split-del" onclick="deleteSplitGroup(\''+m0.splitId+'\')" aria-label="Delete split"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>' +
    '</div>' +
    '<div style="margin:8px 0 0 46px;border-top:0.5px solid var(--slate-100);padding-top:6px">'+breakdown+'</div>' +
  '</div>';
}

async function refreshApp() {
  const icon=document.querySelector("#refresh-btn i"); if(icon)icon.classList.add("spin");
  showToast("Refreshing…");
  const [txOk,budgetOk]=await Promise.all([fetchFromSheets(true),fetchBudgetsFromSheets(true),fetchRecurringFromSheets(true)]);
  if(icon)icon.classList.remove("spin"); renderHome(); renderAnalytics();
  if(txOk||budgetOk)showToast("Refreshed ✓"); else showToast("Up to date ✓");
}

let editGoalIdx = -1;
function openEditGoalModal(idx) {
  editGoalIdx=idx; const g=GOALS[idx];
  document.getElementById("eg-name").value=(g.icon&&g.icon!=="🎯"?g.icon+" ":"")+g.name;
  document.getElementById("eg-target").value=g.target||""; document.getElementById("eg-saved").value=g.saved||""; document.getElementById("eg-monthly").value=g.monthly||"";
  const now=new Date(),cy=now.getFullYear(); buildMonthSelect("eg-due-m",1); buildYearSelect("eg-due-y",cy,0,5);
  if(g.due&&g.due!=="—"){const parts=g.due.split(" ");if(parts.length===2){const mIdx=MO.indexOf(parts[0])+1,y=parseInt(parts[1]),mSel=document.getElementById("eg-due-m"),ySel=document.getElementById("eg-due-y");for(let i=0;i<mSel.options.length;i++)if(parseInt(mSel.options[i].value)===mIdx){mSel.selectedIndex=i;break;}for(let i=0;i<ySel.options.length;i++)if(parseInt(ySel.options[i].value)===y){ySel.selectedIndex=i;break;}}}
  const colorVal=g.color+","+(g.bg||"var(--slate-100)"),cSel=document.getElementById("eg-color");
  for(let i=0;i<cSel.options.length;i++)if(cSel.options[i].value===colorVal){cSel.selectedIndex=i;break;}
  const egCatSel=document.getElementById("eg-category");
  catBuildList("eg-category", EXPENSE_CATS);
  const goalCat=GOALS[editGoalIdx].category||"";
  catSetValue("eg-category", goalCat);
  sddEnhance("eg-due-m",{flex:"1.4"}); sddEnhance("eg-due-y",{flex:"1.2"});
  sddEnhance("eg-color",{swatch:true,up:true});
  nkpBind();
  document.getElementById("modal-edit-goal").classList.remove("hidden"); setTimeout(()=>document.getElementById("eg-name").focus(),150);
}
async function confirmEditGoal() {
  if(editGoalIdx<0)return;
  const egCat=document.getElementById("eg-category").value||"💰 Other";
  const name=document.getElementById("eg-name").value.trim(),target=parseFloat(document.getElementById("eg-target").value)||0,saved=parseFloat(document.getElementById("eg-saved").value)||0,monthly=parseFloat(document.getElementById("eg-monthly").value)||0,due=safeDate(getMonthVal("eg-due-m","eg-due-y")),colorVal=document.getElementById("eg-color").value.split(",");
  if(!name){showToast("Enter a goal name");return;} if(!target||target<=0){showToast("Enter a target amount");return;}
  const oldGoal={...GOALS[editGoalIdx]},icon=name.match(/^\p{Emoji}/u)?.[0]||oldGoal.icon||"🎯",cleanName=name.replace(/^\p{Emoji}\s*/u,"");
  GOALS[editGoalIdx]={...oldGoal,icon,name:cleanName,target,saved,monthly,due,color:colorVal[0],bg:colorVal[1]||"var(--slate-100)",category:egCat,spends:oldGoal.spends||[]};
  saveGoals(); closeModal("edit-goal"); renderGoals(); showToast("Goal updated ✓");
  if(settings.sheetsUrl){setSyncStatus("syncing");const ok=await Promise.race([postToSheets("update_goal",{oldName:oldGoal.name,data:{name:icon+" "+cleanName,target,saved,monthly,due,color:colorVal[0]}}),new Promise(r=>setTimeout(()=>r(false),6000))]);if(ok){setSyncStatus("ok");showToast("Goal updated + synced ✓");}else{setSyncStatus("error");showToast("Updated locally — Sheets sync failed");}}
}

let editInstIdx = -1;
function openEditInstModal(idx) {
  editInstIdx=idx; const p=INSTALLMENTS[idx];
  document.getElementById("ei-name").value=(p.icon&&p.icon!=="📦"?p.icon+" ":"")+p.name;
  catBuildList("ei-category", EXPENSE_CATS);
  catSetValue("ei-category", p.cat);
  document.getElementById("ei-total").value=p.total||""; document.getElementById("ei-monthly").value=p.monthly||""; document.getElementById("ei-total-mo").value=p.total_mo||""; document.getElementById("ei-paid").value=p.paid||0;
  const now=new Date(); let sd=p.startDate?parseDate(p.startDate):now; if(isNaN(sd))sd=now;
  buildDaySelect("ei-start-d",sd.getDate()); buildMonthSelect("ei-start-m",sd.getMonth()+1); buildYearSelect("ei-start-y",sd.getFullYear(),2,1);
  sddEnhance("ei-start-d",{flex:"1"}); sddEnhance("ei-start-m",{flex:"1.4"}); sddEnhance("ei-start-y",{flex:"1.2"});
  const colorSel=document.getElementById("ei-color"); for(let i=0;i<colorSel.options.length;i++)if(colorSel.options[i].value===p.color){colorSel.selectedIndex=i;break;}
  sddEnhance("ei-color",{swatch:true,up:true});
  nkpBind();
  document.getElementById("modal-edit-inst").classList.remove("hidden"); setTimeout(()=>document.getElementById("ei-name").focus(),150);
}
async function confirmEditInst() {
  if(editInstIdx<0)return;
  const name=document.getElementById("ei-name").value.trim(),total=parseFloat(document.getElementById("ei-total").value)||0,monthly=parseFloat(document.getElementById("ei-monthly").value)||0,totalMo=parseInt(document.getElementById("ei-total-mo").value)||0,paid=parseInt(document.getElementById("ei-paid").value)||0,cat=document.getElementById("ei-category").value,color=document.getElementById("ei-color").value;
  const startDate=getDateVal("ei-start-d","ei-start-m","ei-start-y");
  if(!name){showToast("Enter an item name");return;} if(!total||total<=0){showToast("Enter a total amount");return;} if(!monthly||monthly<=0){showToast("Enter monthly payment");return;} if(!totalMo||totalMo<=0){showToast("Enter total months");return;}
  const oldInst={...INSTALLMENTS[editInstIdx]},icon=name.match(/^\p{Emoji}/u)?.[0]||oldInst.icon||"📦",cleanName=name.replace(/^\p{Emoji}\s*/u,"");
  INSTALLMENTS[editInstIdx]={...oldInst,icon,name:cleanName,cat,total,monthly,total_mo:totalMo,paid:Math.min(paid,totalMo),color,startDate};
  saveInsts(); closeModal("edit-inst"); renderInstallments(); showToast("Instalment updated ✓");
  if(settings.sheetsUrl){setSyncStatus("syncing");const ok=await Promise.race([postToSheets("update_installment",{oldName:oldInst.name,data:{name:icon+" "+cleanName,category:cat,total,monthly,startDate,totalMonths:totalMo,monthsPaid:Math.min(paid,totalMo),color}}),new Promise(r=>setTimeout(()=>r(false),6000))]);if(ok){setSyncStatus("ok");showToast("Instalment updated + synced ✓");}else{setSyncStatus("error");showToast("Updated locally — Sheets sync failed");}}
}

let editTxId = null, editTxType = "Expense";
function setEditType(type) {
  editTxType=type; const expBtn=document.getElementById("edit-btn-expense"),incBtn=document.getElementById("edit-btn-income");
  if(type==="Expense"){expBtn.style.background="var(--white)";expBtn.style.color="var(--red)";expBtn.style.boxShadow="0 1px 4px rgba(0,0,0,0.08)";incBtn.style.background="none";incBtn.style.color="var(--slate-400)";incBtn.style.boxShadow="none";}
  else{incBtn.style.background="var(--white)";incBtn.style.color="var(--green)";incBtn.style.boxShadow="0 1px 4px rgba(0,0,0,0.08)";expBtn.style.background="none";expBtn.style.color="var(--slate-400)";expBtn.style.boxShadow="none";}
  const cats=type==="Income"?INCOME_CATS:EXPENSE_CATS; catBuildList("edit-category", cats);
}
function openEditTxModal(id) {
  const tx=txs.find(t=>t.id===id); if(!tx)return;
  editTxId=id; editTxType=tx.type||"Expense"; setEditType(editTxType);
  document.getElementById("edit-amount").value=tx.amount||"";
  catSetValue("edit-category", tx.category);
  document.getElementById("edit-desc").value=tx.desc||tx.description||""; document.getElementById("edit-notes").value=tx.notes||"";
  const now=new Date(),cy=now.getFullYear(); buildDaySelect("edit-date-d",1); buildMonthSelect("edit-date-m",1); buildYearSelect("edit-date-y",cy,3,0);
  if(tx.date){const parts=tx.date.split("-");if(parts.length===3){const y=parseInt(parts[0]),m=parseInt(parts[1]),d=parseInt(parts[2]),dSel=document.getElementById("edit-date-d"),mSel=document.getElementById("edit-date-m"),ySel=document.getElementById("edit-date-y");for(let i=0;i<dSel.options.length;i++)if(parseInt(dSel.options[i].value)===d){dSel.selectedIndex=i;break;}for(let i=0;i<mSel.options.length;i++)if(parseInt(mSel.options[i].value)===m){mSel.selectedIndex=i;break;}for(let i=0;i<ySel.options.length;i++)if(parseInt(ySel.options[i].value)===y){ySel.selectedIndex=i;break;}}}
  sddEnhance("edit-date-d",{flex:"1"}); sddEnhance("edit-date-m",{flex:"1.4"}); sddEnhance("edit-date-y",{flex:"1.2"});
  nkpBind();
  document.getElementById("modal-edit-tx").classList.remove("hidden"); /* keypad field: no autofocus (avoids auto-opening keypad over the form) */
}
async function confirmEditTx() {
  if(!editTxId)return;
  const amount=parseFloat(document.getElementById("edit-amount").value),desc=document.getElementById("edit-desc").value.trim(),cat=document.getElementById("edit-category").value,notes=document.getElementById("edit-notes").value.trim(),date=getDateVal("edit-date-d","edit-date-m","edit-date-y");
  if(!amount||amount<=0){showToast("Enter a valid amount");return;} if(!desc){showToast("Enter a description");return;}
  const idx=txs.findIndex(t=>t.id===editTxId); if(idx<0){showToast("Transaction not found");return;}
  const oldTx={...txs[idx]}; txs[idx]={...oldTx,type:editTxType,category:cat,desc,amount,notes,date};
  saveTxs(); closeModal("edit-tx"); renderHistory(); renderHome(); showToast("Transaction updated ✓");
  if(settings.sheetsUrl){setSyncStatus("syncing");const ok=await Promise.race([postToSheets("update_transaction",{rowId:oldTx.rowId,data:{oldDesc:oldTx.desc||oldTx.description||"",oldAmount:oldTx.amount,date,type:editTxType,category:cat,description:desc,amount,notes}}),new Promise(r=>setTimeout(()=>r(false),6000))]);if(ok){setSyncStatus("ok");showToast("Updated + synced to Sheets ✓");}else{setSyncStatus("error");showToast("Updated locally — Sheets sync failed");}}
}

async function deleteTx(id) {
  if(!(await appConfirm({title:"Delete this transaction?", okText:"Delete", danger:true})))return;
  await _doDeleteTx(id);
}
async function deleteTxSilent(id) {
  await _doDeleteTx(id);
}
async function _doDeleteTx(id) {
  const tx=txs.find(t=>t.id===id); txs=txs.filter(t=>t.id!==id); unsyncedIds=unsyncedIds.filter(uid=>uid!==id);
  localStorage.setItem("ft_unsynced",JSON.stringify(unsyncedIds)); saveTxs(); renderHistory(); renderHome();
  if(tx&&settings.sheetsUrl){setSyncStatus("syncing");const ok=await Promise.race([postToSheets("delete_transaction",{rowId:tx.rowId,data:{date:tx.date,desc:tx.desc||tx.description||"",amount:tx.amount}}),new Promise(r=>setTimeout(()=>r(false),6000))]);if(ok){setSyncStatus("ok");showToast("Transaction deleted + synced ✓");}else{setSyncStatus("error");showToast("Deleted locally — Sheets sync failed");}}
  else showToast("Transaction deleted");
}

function normalizeDate(raw) {
  if(!raw)return""; if(/^\d{4}-\d{2}-\d{2}$/.test(raw))return raw;
  const m=raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(m)return m[3]+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");
  const d=new Date(raw); if(!isNaN(d))return toDateStr(d); return raw;
}
// Single source of truth for turning a stored "YYYY-MM-DD" date string into a Date.
// Built from explicit Y/M/D components (not new Date(str), which parses as UTC
// midnight) so .getDate()/.getMonth()/.getFullYear() always reflect the intended
// calendar date, regardless of the viewer's timezone offset from UTC.
function parseDate(str) {
  if (!str) return new Date(NaN);
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(str);
}
// Inverse of parseDate — formats a Date using its LOCAL Y/M/D into "YYYY-MM-DD".
// Don't use date.toISOString().split("T")[0] for this: it converts through UTC,
// which silently rolls back to "yesterday" for part of the day in timezones
// ahead of UTC (e.g. Bangkok, UTC+7, for anything before ~7am local time).
function toDateStr(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// "YYYY-MM" key for a Date — used to track which calendar month an instalment's
// payment was last marked for, so Safe to Spend doesn't keep counting it as still due.
function ymOf(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
}
function monthTxs(mo,yr) { const d=new Date(),m=(mo!==undefined)?mo:d.getMonth(),y=(yr!==undefined)?yr:d.getFullYear(); return txs.filter(t=>{const td=parseDate(t.date);return td.getMonth()===m&&td.getFullYear()===y;}); }
function yearTxs(yr) { return txs.filter(t=>{const td=parseDate(t.date);return td.getFullYear()===yr;}); }
function calcSummary(arr) { const inc=arr.filter(t=>t.type==="Income").reduce((s,t)=>s+t.amount,0),exp=arr.filter(t=>t.type==="Expense").reduce((s,t)=>s+t.amount,0); return {inc,exp,net:inc-exp,rate:inc>0?(inc-exp)/inc:0}; }

// ══ DARK MODE ════════════════════════════════════════════════
function showSparkTip(tipId) {
  // Hide all other tips
  document.querySelectorAll(".spark-tip").forEach(t => t.style.display="none");
  const el = document.getElementById(tipId);
  if (!el) return;
  el.style.display = "block";
  // Auto-hide after 2 seconds
  setTimeout(() => { if(el) el.style.display="none"; }, 2000);
}
document.addEventListener("click", e => {
  if (!e.target.closest(".spark-bars")) {
    document.querySelectorAll(".spark-tip").forEach(t => t.style.display="none");
  }
});

function toggleDarkMode() {
  settings.darkMode = !settings.darkMode;
  saveSettings(); applyDarkMode(); renderSettings();
}
function applyDarkMode() {
  document.body.classList.toggle('dark', !!settings.darkMode);
  const btn = document.getElementById('toggle-dark');
  if (btn) btn.className = 'toggle' + (settings.darkMode ? ' on' : '');
}

// ══ HOME ═════════════════════════════════════════════════════
let chartPeriod = '1W';

function renderHome() {
  const arr=monthTxs();
  // Stat figures exclude goal-spends (funded from goals, not income) — matches Analytics & Budget.
  const {inc,exp}=calcSummary(arr.filter(t=>!isGoalSpend(t)));
  // "Current balance" is the running cash balance — sum of every transaction ever,
  // including goal-spends (real money that left the account, regardless of which
  // goal it was earmarked against). Goal *contributions* never touch txs[], so they
  // don't affect this figure — they're a separate savings tracker, not a cash transfer.
  const { net: allTimeBalance } = calcSummary(txs);
  document.getElementById("home-balance").textContent=fmt(allTimeBalance);
  document.getElementById("home-inc").textContent=fmt(inc);
  document.getElementById("home-exp").textContent=fmt(exp);
  renderSpendingChart();
  renderNetWorth();
  renderEstBillsHomeCard();
  renderSafeToSpend();
  // Recent list still shows every transaction (goal-spends included — they appear in History too).
  const recent=[...arr].sort((a,b)=>parseDate(b.date)-parseDate(a.date)).slice(0,5);
  const el=document.getElementById("home-tx-list");
  el.innerHTML=recent.length?recent.map(txRowHTML).join(''):'<div class="empty-state">No transactions this month</div>';
}

// ══ SAFE TO SPEND (month-end forecast) ══════════════════════
function toggleSafeCard() {
  const c = document.getElementById("home-safe-card");
  if (c) c.classList.toggle("collapsed");
}

// Projected month-end = income so far + recurring income still to come
//   − spent so far (excl. goal-spends) − (recurring bills + active instalments due).
// That projected leftover is the break-even discretionary "safe to spend".
function renderSafeToSpend() {
  const card = document.getElementById("home-safe-card");
  if (!card) return;
  const now = new Date();
  const curYM = ymOf(now);
  const mt = monthTxs();
  const incomeSoFar  = mt.filter(t => t.type === "Income").reduce((s,t)=>s+t.amount, 0);
  const spentSoFar   = mt.filter(t => t.type === "Expense" && !isGoalSpend(t)).reduce((s,t)=>s+t.amount, 0);
  // Recurring not yet logged this month, split by direction
  const pending = getPendingRecurring();
  const pendingIncome = pending.filter(r => (r.type||"Expense") === "Income").reduce((s,r)=>s+(r.amount||0), 0);
  const pendingBills  = pending.filter(r => (r.type||"Expense") === "Expense").reduce((s,r)=>s+(r.amount||0), 0);
  // Active instalment monthly burden — excludes any instalment already marked paid
  // this month, since that payment is now a real transaction already counted in
  // spentSoFar above. Without this check the same payment got subtracted twice.
  const instDue = INSTALLMENTS.filter(p => p.paid < p.total_mo && p.lastPaidYM !== curYM).reduce((s,p)=>s+(p.monthly||0), 0);
  // Estimated bills not yet logged this month — same de-dup principle as instalments
  // above: a bill drops out the moment its real transaction is logged, by description.
  const estDue = estBillsPendingTotal();

  const expectedIncome = incomeSoFar + pendingIncome;
  const recurringAndInst = pendingBills + instDue;
  const billsDue       = recurringAndInst + estDue;
  const safe           = expectedIncome - spentSoFar - billsDue;

  const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
  const daysLeft = Math.max(daysInMonth - now.getDate(), 0);
  const perDay   = daysLeft > 0 ? safe / daysLeft : safe;

  const neg = safe < 0;
  card.classList.toggle("warn", neg);

  document.getElementById("safe-days").textContent = daysLeft === 1 ? "1 day left" : daysLeft + " days left";
  document.getElementById("safe-num").textContent  = fmt(safe);

  const perdayEl = document.getElementById("safe-perday");
  if (neg) {
    perdayEl.textContent = "projected over budget";
  } else if (daysLeft > 0) {
    perdayEl.textContent = "≈ " + fmt(perDay) + "/day";
  } else {
    perdayEl.textContent = "month ended";
  }

  document.getElementById("safe-inc").textContent   = "+" + fmt(expectedIncome);
  document.getElementById("safe-spent").textContent = "−" + fmt(spentSoFar);
  document.getElementById("safe-bills").textContent = "−" + fmt(recurringAndInst);
  const estRow = document.getElementById("safe-est-row");
  if (estRow) {
    estRow.style.display = ESTIMATED_BILLS.length ? "flex" : "none";
    document.getElementById("safe-est").textContent = "−" + fmt(estDue);
  }
  const totalEl = document.getElementById("safe-total");
  totalEl.textContent = fmt(safe);
  totalEl.className = neg ? "safe-total-neg" : "safe-bd-pos";

  // Hint when there's no income basis to forecast against
  const hintEl = document.getElementById("safe-hint");
  const hasRecurringIncome = RECURRING.some(r => (r.type||"Expense") === "Income");
  if (expectedIncome <= 0 || (!hasRecurringIncome && pendingIncome === 0 && incomeSoFar === 0)) {
    hintEl.textContent = "Add your income as a recurring item for an accurate forecast.";
    hintEl.style.display = "";
  } else {
    hintEl.style.display = "none";
  }

  card.style.display = "";
}

// Estimated bills get their own card on Home — same tier as Net Worth below —
// so the feature is visible without ever opening Settings. Shows the pending
// total plus a short preview list; "Manage" opens the full page.
function renderEstBillsHomeCard() {
  const el = document.getElementById("home-estbills-card");
  if (!el) return;
  if (!ESTIMATED_BILLS.length) {
    el.innerHTML =
      '<div class="nw-card">' +
        '<div class="nw-card-hd"><span class="nw-card-title">Estimated bills</span></div>' +
        '<p style="font-size:11px;color:var(--slate-400);margin:0 0 10px;line-height:1.5">Add bills you know are coming — like electric or credit card — to forecast them before the real amount arrives.</p>' +
        '<button onclick="openAddEstBillModal()" style="width:100%;padding:9px;border:1.5px dashed var(--slate-200);border-radius:var(--radius-sm);background:none;color:var(--slate-400);font-size:11px;font-weight:600;font-family:inherit;cursor:pointer">+ Add bill</button>' +
      '</div>';
    return;
  }
  const now = new Date();
  const currentMo = now.getMonth(), currentYr = now.getFullYear();
  const thisMonthDescs = new Set(
    txs.filter(t => { const d = parseDate(t.date); return d.getMonth()===currentMo && d.getFullYear()===currentYr && t.type==="Expense"; })
       .map(t => (t.desc||t.description||"").toLowerCase())
  );
  const sorted = [...ESTIMATED_BILLS].sort((a,b) => {
    const aLogged = thisMonthDescs.has((a.desc||"").toLowerCase());
    const bLogged = thisMonthDescs.has((b.desc||"").toLowerCase());
    return aLogged === bLogged ? 0 : aLogged ? 1 : -1; // pending first
  });
  const preview = sorted.slice(0, 3);
  const extra = sorted.length - preview.length;
  const rowsHtml = preview.map(b => {
    const icon = (b.category||"").match(/^\S+/)?.[0] || "🔄";
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-top:0.5px solid var(--slate-100);font-size:12px">' +
      '<span style="color:var(--slate-700)">' + icon + ' ' + (b.desc||"") + '</span>' +
      '<span style="font-weight:600;color:var(--slate-900)">' + fmt(b.amount) + '</span>' +
    '</div>';
  }).join("") + (extra > 0 ? '<div style="font-size:10px;color:var(--slate-400);padding:5px 0 0">+' + extra + ' more</div>' : '');
  el.innerHTML =
    '<div class="nw-card">' +
      '<div class="nw-card-hd">' +
        '<span class="nw-card-title">Estimated bills</span>' +
        '<span style="font-size:11px;font-weight:600;color:var(--teal);cursor:pointer" onclick="goTo(\'estbills\')">Manage →</span>' +
      '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">' +
        '<span style="font-size:9px;color:var(--slate-400)">Pending this month</span>' +
        '<span style="font-size:18px;font-weight:700;color:var(--slate-900)">' + fmt(estBillsPendingTotal()) + '</span>' +
      '</div>' +
      rowsHtml +
      '<button onclick="openAddEstBillModal()" style="width:100%;margin-top:8px;padding:8px;border:1.5px dashed var(--slate-200);border-radius:var(--radius-sm);background:none;color:var(--slate-400);font-size:11px;font-weight:600;font-family:inherit;cursor:pointer">+ Add bill</button>' +
    '</div>';
}

function renderNetWorth() {
  const el = document.getElementById("home-nw-card");
  if (!el) return;
  const goalSavings = GOALS.reduce((s,g)=>s+(g.saved||0), 0);
  const instDebt    = INSTALLMENTS.reduce((s,p)=>s+Math.max(p.total-p.monthly*p.paid,0), 0);
  const netWorth    = goalSavings - instDebt;
  const nwColor     = netWorth >= 0 ? "var(--green-strong)" : "var(--red-strong)";
  el.innerHTML =
    '<div class="nw-card">' +
      '<div class="nw-card-hd">' +
        '<span class="nw-card-title">Net worth snapshot</span>' +
      '</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:8px">' +
        '<div style="background:#f0fdf4;border-radius:var(--radius-sm);padding:8px 10px">' +
          '<div style="font-size:9px;color:var(--green-text);margin-bottom:3px">Goal savings</div>' +
          '<div style="font-size:13px;font-weight:700;color:var(--green-strong)">+'+fmt(goalSavings)+'</div>' +
        '</div>' +
        '<div style="background:var(--red-bg);border-radius:var(--radius-sm);padding:8px 10px">' +
          '<div style="font-size:9px;color:var(--red-text);margin-bottom:3px">Instalment debt</div>' +
          '<div style="font-size:13px;font-weight:700;color:var(--red-strong)">−'+fmt(instDebt)+'</div>' +
        '</div>' +
      '</div>' +
      '<div style="height:1px;background:var(--slate-100);margin-bottom:8px"></div>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline">' +
        '<span style="font-size:11px;font-weight:600;color:var(--slate-500)">= Net worth</span>' +
        '<span style="font-size:18px;font-weight:700;color:'+nwColor+'">' + (netWorth>=0?"+":"") + fmt(netWorth) + '</span>' +
      '</div>' +
    '</div>';
}

function renderSpendingChart() {
  const today=new Date();
  let points=[], labels=[];
  if (chartPeriod==='1W') {
    points=Array(7).fill(0); labels=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    for(let i=6;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);const ds=toDateStr(d);points[6-i]=txs.filter(t=>t.date===ds&&t.type==='Expense'&&!isGoalSpend(t)).reduce((s,t)=>s+t.amount,0);}
    document.querySelector('.chart-sub').textContent='Total spent this week';
  } else if (chartPeriod==='1M') {
    points=Array(4).fill(0); labels=['Wk 1','Wk 2','Wk 3','Wk 4'];
    for(let i=29;i>=0;i--){const d=new Date(today);d.setDate(today.getDate()-i);const ds=toDateStr(d);const wi=Math.min(Math.floor((29-i)/7),3);points[wi]+=txs.filter(t=>t.date===ds&&t.type==='Expense'&&!isGoalSpend(t)).reduce((s,t)=>s+t.amount,0);}
    document.querySelector('.chart-sub').textContent='Total spent this month';
  } else {
    points=Array(3).fill(0);
    for(let i=2;i>=0;i--){const d=new Date(today.getFullYear(),today.getMonth()-i,1);labels.push(MO[d.getMonth()]);points[2-i]=txs.filter(t=>{const td=parseDate(t.date);return td.getMonth()===d.getMonth()&&td.getFullYear()===d.getFullYear()&&t.type==='Expense'&&!isGoalSpend(t);}).reduce((s,t)=>s+t.amount,0);}
    document.querySelector('.chart-sub').textContent='Spending last 3 months';
  }
  document.getElementById("chart-amount").textContent=fmt(points.reduce((a,b)=>a+b,0));
  const dayRow=document.querySelector('.chart-section .chart-wrap > div:last-child');
  if(dayRow) dayRow.innerHTML=labels.map(l=>'<span>'+l+'</span>').join('');
  const W=300,H=60,pad=4,max=Math.max(...points,1);
  const pts=points.map((v,i)=>`${(i/(points.length-1))*(W-pad*2)+pad},${pad+(1-v/max)*(H-pad*2)}`);
  document.getElementById("chart-line").setAttribute("points",pts.join(" "));
  document.getElementById("chart-area").setAttribute("points",[...pts,`${W-pad},${H}`,`${pad},${H}`].join(" "));
}
function txRowHTML(t) {
  const isInc=t.type==="Income",d=parseDate(t.date),desc=t.desc||t.description||"";
  return '<div class="tx-row"><div class="tx-icon">'+(t.category||"").split(" ")[0]+'</div><div style="flex:1;min-width:0"><div class="tx-name">'+desc+'</div><div class="tx-sub">'+(t.category||"").replace(/^\S+\s/,"")+" · "+d.getDate()+" "+MO[d.getMonth()]+'</div></div><span class="tx-amt '+(isInc?'pos':'neg')+'">'+(isInc?"+":"-")+fmt(t.amount)+'</span></div>';
}

// ══ GOALS ═════════════════════════════════════════════════════
function toggleGoalsFilter() { const panel=document.getElementById("goals-filter-panel"),btn=document.getElementById("goals-filter-btn"); const isOpen=panel.classList.toggle("open"); btn.classList.toggle("active",isOpen); if(isOpen)buildGoalsYearDropdown(); }
function buildGoalsYearDropdown() {
  const years=[...new Set(GOALS.map(g=>g.due?g.due.split(" ")[1]:null).filter(Boolean))].sort();
  const sel=document.getElementById("goals-filter-year"),cur=sel.value;
  sel.innerHTML='<option value="">Any target year</option>'+years.map(y=>'<option value="'+y+'"'+(y===cur?' selected':'')+'>'+y+'</option>').join("");
  if (typeof sddSync==="function" && SDD_ENHANCED.has("goals-filter-year")) sddSync("goals-filter-year");
}
function clearGoalsFilters() { document.getElementById("goals-filter-status").value="all"; document.getElementById("goals-filter-year").value=""; if(SDD_ENHANCED.has("goals-filter-status"))sddSync("goals-filter-status"); if(SDD_ENHANCED.has("goals-filter-year"))sddSync("goals-filter-year"); renderGoals(); }
function clearGoalsTag(key) { if(key==="status"){document.getElementById("goals-filter-status").value="all";if(SDD_ENHANCED.has("goals-filter-status"))sddSync("goals-filter-status");} if(key==="year"){document.getElementById("goals-filter-year").value="";if(SDD_ENHANCED.has("goals-filter-year"))sddSync("goals-filter-year");} renderGoals(); }
// Calculate actual avg monthly savings toward a goal from tx history
function calcActualMonthlyContrib(g) {
  const contribs = g.contributions || [];
  if (!contribs.length) return 0;
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const dates = contribs.map(c => parseDate(c.date)).filter(d => !isNaN(d));
  if (!dates.length) return 0;
  const earliest = new Date(Math.min(...dates));
  const windowStart = earliest > sixMonthsAgo ? earliest : sixMonthsAgo;
  const recent = contribs.filter(c => { const d = parseDate(c.date); return !isNaN(d) && d >= windowStart; });
  const total = recent.reduce((s,c) => s + c.amount, 0);
  const monthsSpan = Math.max(1, (now.getFullYear()-windowStart.getFullYear())*12 + (now.getMonth()-windowStart.getMonth()) + 1);
  return total / monthsSpan;
}

function renderGoalsFilterTags(status,year) {
  const tags=[]; if(status!=="all")tags.push({label:status==="active"?"Active":"Completed",key:"status"}); if(year)tags.push({label:year,key:"year"});
  const btnLabel=document.getElementById("goals-filter-btn-label"); if(btnLabel)btnLabel.textContent=tags.length>0?"Filter ("+tags.length+")":"Filter";
  const btn=document.getElementById("goals-filter-btn"); if(btn)btn.classList.toggle("active",tags.length>0||document.getElementById("goals-filter-panel").classList.contains("open"));
  const el=document.getElementById("goals-active-filters"); if(!el)return;
  el.innerHTML=tags.map(t=>'<div class="goals-filter-tag">'+t.label+'<button onclick="clearGoalsTag(\''+t.key+'\')" aria-label="Remove filter">×</button></div>').join("");
}
function renderGoals() {
  const statusFilter=document.getElementById("goals-filter-status")?.value||"all",yearFilter=document.getElementById("goals-filter-year")?.value||"";
  renderGoalsFilterTags(statusFilter,yearFilter);
  const totalSaved=GOALS.reduce((s,g)=>s+g.saved,0),activeCount=GOALS.filter(g=>g.saved<g.target).length,avgPct=GOALS.length?Math.round(GOALS.reduce((s,g)=>s+(g.saved/g.target*100),0)/GOALS.length):0;
  document.getElementById("goals-total-saved").textContent=fmt(totalSaved); document.getElementById("goals-active").textContent=activeCount; document.getElementById("goals-avg-pct").textContent=avgPct+"%";
  if(!GOALS.length){document.getElementById("goals-list").innerHTML='<div class="empty-state">No goals yet — tap + to add one</div>';return;}
  let filtered=GOALS.map((g,idx)=>({g,idx}));
  if(statusFilter==="active")filtered=filtered.filter(({g})=>g.saved<g.target);
  if(statusFilter==="completed")filtered=filtered.filter(({g})=>g.saved>=g.target);
  if(yearFilter)filtered=filtered.filter(({g})=>g.due&&g.due.includes(yearFilter));
  if(!filtered.length){document.getElementById("goals-list").innerHTML='<div class="empty-state">No goals match this filter</div>';return;}
  document.getElementById("goals-list").innerHTML=filtered.map(({g,idx})=>{
    const pct=Math.min(Math.round(g.saved/g.target*100),100),isDone=g.saved>=g.target;
    // Dynamic projected completion based on actual avg monthly contribution
    let projLabel='';
    if (!isDone) {
      const actualMonthly = calcActualMonthlyContrib(g);
      if (actualMonthly > 0) {
        const monthsLeft = Math.ceil((g.target - g.saved) / actualMonthly);
        const projDate = new Date(); projDate.setMonth(projDate.getMonth() + monthsLeft);
        projLabel = 'On track: ' + MO[projDate.getMonth()] + ' ' + projDate.getFullYear();
      } else if (g.monthly > 0) {
        const monthsLeft = Math.ceil((g.target - g.saved) / g.monthly);
        const projDate = new Date(); projDate.setMonth(projDate.getMonth() + monthsLeft);
        projLabel = 'Est: ' + MO[projDate.getMonth()] + ' ' + projDate.getFullYear();
      }
    }
        // Build spend log
    const spends = g.spends || [];
    const totalSpent = spends.reduce((s,sp)=>s+sp.amount,0);
    const spendLogHtml = spends.length ? '<div class="spend-log">' +
      '<div class="spend-log-hd"><span>Spending log</span><span class="spend-log-bal">'+fmt(totalSpent)+' spent</span></div>' +
      spends.map((sp,si)=>'<div class="spend-log-row"><div><div class="spend-log-desc">'+sp.desc+'</div><div class="spend-log-date">'+sp.date+'</div></div><div style="display:flex;align-items:center"><span class="spend-log-amt">−'+fmt(sp.amount)+'</span><button class="spend-log-del" onclick="deleteGoalSpend('+idx+','+si+')" aria-label="Delete spend">✕</button></div></div>'
      ).join('') +
      '<div class="spend-log-total"><span style="color:var(--slate-500)">Total spent</span><span style="color:var(--red-strong)">'+fmt(totalSpent)+'</span></div>' +
      '</div>' : '';
    // Build contribution log
    const contribs = g.contributions || [];
    const contribLogHtml = '<div class="contrib-log" id="contrib-log-'+idx+'" style="max-height:0">' +
      '<div style="height:1px;background:var(--slate-100);margin:10px 0"></div>' +
      '<div class="contrib-log-hd"><span>Savings contributions</span><span>'+contribs.length+' entries</span></div>' +
      (contribs.length ? contribs.slice().reverse().map((c,ci)=>{
        const realIdx = contribs.length - 1 - ci;
        return '<div class="contrib-log-row"><div><div class="contrib-log-note">'+(c.note||'—')+'</div><div class="contrib-log-date">'+c.date+'</div></div><div style="display:flex;align-items:center;gap:4px"><span class="contrib-log-amt">+'+fmt(c.amount)+'</span><button class="contrib-log-del" onclick="openEditContribModal('+idx+','+realIdx+')" aria-label="Edit contribution" style="color:var(--blue)">'+EDIT_PENCIL_SM+'</button><button class="contrib-log-del" onclick="deleteGoalContrib('+idx+','+realIdx+')" aria-label="Delete contribution"><i class="ti ti-x" style="font-size:11px"></i></button></div></div>';
      }).join('') : '<div style="font-size:11px;color:var(--slate-400);padding:8px 0;text-align:center">No contributions yet</div>') +
      (contribs.length ? '<div class="contrib-log-total"><span style="color:var(--slate-500)">Total saved</span><span style="color:var(--green-strong)">'+fmt(g.saved)+'</span></div>' : '') +
      (spendLogHtml ? '<div style="height:1px;background:var(--slate-100);margin:10px 0"></div>'+spendLogHtml.replace('<div class="spend-log">', '').replace('</div>', '') : '') +
    '</div>';
    return '<div class="goal-card"><div class="goal-top"><div style="display:flex;align-items:center;gap:8px"><div class="goal-icon-wrap" style="background:'+(g.bg||'var(--slate-100)')+'">'+(g.icon||'🎯')+'</div><div><div class="goal-name">'+g.name+'</div><div class="goal-saved">'+fmt(g.saved)+' saved of '+fmt(g.target)+(g.category?' · <span style="color:var(--slate-500)">'+g.category+'</span>':'')+( isDone?' · <span style="color:var(--green-strong);font-weight:600">Goal reached!</span>':'' )+'</div></div></div><div class="goal-pct" style="color:'+g.color+'">'+pct+'%</div></div><div class="goal-track"><div class="goal-fill" style="width:'+pct+'%;background:'+g.color+'"></div></div><div class="goal-footer"><span>'+(isDone?'🎉 Goal reached!':fmt(g.target-g.saved)+' remaining')+'</span><span style="color:'+(projLabel?'var(--teal)':'var(--slate-400)')+'">'+( isDone?'':projLabel||('Target: '+g.due) )+'</span></div><div class="goal-actions"><button class="goal-action-btn goal-save-btn" onclick="openGoalModal('+idx+')"'+(isDone?' disabled style="opacity:0.4"':'')+'>+ Add savings</button><button class="goal-action-btn goal-spend-btn" onclick="openSpendGoalModal('+idx+')"'+(isDone?'':' style="opacity:0.7"')+'>💸 Spend</button><button class="goal-action-btn goal-hist-btn" id="goal-hist-btn-'+idx+'" onclick="toggleContribLog('+idx+')">History</button><button class="goal-action-btn goal-edit-btn" onclick="openEditGoalModal('+idx+')" aria-label="Edit">'+EDIT_PENCIL+'</button><button class="goal-action-btn goal-delete-btn" onclick="deleteGoal('+idx+')">🗑️</button></div>'+contribLogHtml+'</div>';
  }).join("");
}
async function deleteGoal(idx) {
  const goal = GOALS[idx];
  if (!(await appConfirm({title:'Delete "' + goal.name + '"?', message:"This goal will be removed.", okText:"Delete", danger:true}))) return;
  // Check for linked goal-spend transactions
  const linkedTxs = txs.filter(t => t.fromGoal && t.goalName === goal.name);
  let deleteLinked = false;
  if (linkedTxs.length > 0) {
    deleteLinked = await appConfirm({
      title: "Delete linked transactions?",
      message: linkedTxs.length + ' transaction' + (linkedTxs.length > 1 ? 's' : '') +
        ' from "' + goal.name + '" exist in History (total: ' + fmt(linkedTxs.reduce((s,t)=>s+t.amount,0)) + ').',
      okText: "Delete them",
      cancelText: "Keep them",
      danger: true
    });
  }
  if (deleteLinked) {
    // Delete linked txs from local + Sheets
    for (const t of linkedTxs) {
      txs = txs.filter(x => x.id !== t.id);
      unsyncedIds = unsyncedIds.filter(uid => uid !== t.id);
      if (t.rowId && settings.sheetsUrl) {
        await Promise.race([postToSheets("delete_transaction", {rowId:t.rowId, data:{date:t.date,desc:t.desc||"",amount:t.amount}}), new Promise(r=>setTimeout(()=>r(false),4000))]);
      }
    }
    localStorage.setItem("ft_unsynced", JSON.stringify(unsyncedIds));
    saveTxs();
  }
  GOALS.splice(idx, 1); saveGoals(); renderGoals();
  if (settings.sheetsUrl) {
    setSyncStatus("syncing");
    const ok = await Promise.race([postToSheets("delete_goal", {name:goal.name}), new Promise(r=>setTimeout(()=>r(false),6000))]);
    if (ok) { setSyncStatus("ok"); showToast("Goal deleted" + (deleteLinked ? " + " + linkedTxs.length + " transaction(s) removed" : "") + " ✓"); }
    else { setSyncStatus("error"); showToast("Deleted locally — Sheets sync failed"); }
  } else {
    showToast("Goal deleted" + (deleteLinked ? " + " + linkedTxs.length + " transaction(s) removed" : ""));
  }
}

// ══ ANALYTICS ════════════════════════════════════════════════
let analyticsMonth = 5, analyticsYear = 2026, analyticsPickerOpen = false;

function buildPeriodSelects(moSelId, yrSelId, curMo, curYr) {
  // Month select — all 12
  const moSel = document.getElementById(moSelId);
  if (moSel) moSel.innerHTML = MO.map((m, i) =>
    '<option value="' + i + '"' + (i === curMo ? ' selected' : '') + '>' + m + '</option>'
  ).join("");
  // Year select — all years with data + current + next
  const allYears = [...new Set(txs.map(t => parseDate(t.date).getFullYear()))];
  const nowYr = new Date().getFullYear();
  if (!allYears.includes(nowYr))     allYears.push(nowYr);
  if (!allYears.includes(nowYr + 1)) allYears.push(nowYr + 1);
  if (!allYears.includes(curYr))     allYears.push(curYr);
  allYears.sort();
  const yrSel = document.getElementById(yrSelId);
  if (yrSel) yrSel.innerHTML = allYears.map(y =>
    '<option value="' + y + '"' + (y === curYr ? ' selected' : '') + '>' + y + '</option>'
  ).join("");
}

function toggleAnalyticsDropdown() {
  analyticsPickerOpen = !analyticsPickerOpen;
  const picker = document.getElementById("an-picker");
  const chip   = document.getElementById("an-filter-chip");
  picker.classList.toggle("hidden", !analyticsPickerOpen);
  chip.classList.toggle("open", analyticsPickerOpen);
  if (analyticsPickerOpen) { buildPeriodSelects("an-sel-month", "an-sel-year", analyticsMonth, analyticsYear); sddEnhance("an-sel-year"); sddEnhance("an-sel-month"); }
}
function closeAnalyticsDropdown() {
  analyticsPickerOpen = false;
  document.getElementById("an-picker").classList.add("hidden");
  document.getElementById("an-filter-chip").classList.remove("open");
}
function applyAnalyticsPicker() {
  analyticsYear  = parseInt(document.getElementById("an-sel-year").value);
  analyticsMonth = parseInt(document.getElementById("an-sel-month").value);
  closeAnalyticsDropdown();
  renderAnalytics();
}
function analyticsGoToday() {
  const now = new Date();
  analyticsMonth = now.getMonth();
  analyticsYear  = now.getFullYear();
  closeAnalyticsDropdown();
  renderAnalytics();
}

let _activeDonutIdx = -1;
function handleDonutSvgTap(e) {
  const sorted=window._anSorted||[]; if(!sorted.length)return;
  const svg=document.getElementById("an-donut-svg"),rect=svg.getBoundingClientRect();
  const cx=rect.left+rect.width/2,cy=rect.top+rect.height/2,dx=e.clientX-cx,dy=e.clientY-cy,dist=Math.sqrt(dx*dx+dy*dy),R=rect.width*0.38;
  if(dist<R*0.55||dist>R*1.45){if(_activeDonutIdx>=0)closeDonutDetail();return;}
  const totalExp=window._anTotalExp||0; let angle=Math.atan2(dy,dx)+Math.PI/2; if(angle<0)angle+=2*Math.PI;
  let cumAngle=0;
  for(let i=0;i<sorted.length;i++){const arcAngle=(sorted[i][1]/totalExp)*2*Math.PI;if(angle<=cumAngle+arcAngle){toggleDonutDetail(i);return;}cumAngle+=arcAngle;}
}
function toggleDonutDetail(idx) { if(_activeDonutIdx===idx&&document.getElementById("an-donut-detail").classList.contains("visible")){closeDonutDetail();return;} openDonutDetail(idx); }
function openDonutDetail(idx) {
  const sorted=window._anSorted||[],arr=window._anArr||[],totalExp=window._anTotalExp||0; if(!sorted[idx])return;
  _activeDonutIdx=idx; const [cat,amt]=sorted[idx],color=CAT_COLORS[idx%CAT_COLORS.length],pct=totalExp>0?Math.round((amt/totalExp)*100):0,catName=cat.replace(/^\S+\s/,"");
  const txs_=arr.filter(t=>t.type==="Expense"&&t.category===cat).sort((a,b)=>b.amount-a.amount);
  document.getElementById("an-detail-dot").style.background=color; document.getElementById("an-detail-name").textContent=catName; document.getElementById("an-detail-amt").textContent=fmt(amt); document.getElementById("an-detail-pct").textContent=pct+"%"; document.getElementById("an-detail-count").textContent=txs_.length;
  document.getElementById("an-detail-txlist").innerHTML=txs_.map(t=>{const d=parseDate(t.date),desc=t.desc||t.description||"";return '<div class="an-detail-tx"><span class="an-detail-tx-desc">'+desc+'</span><span class="an-detail-tx-date">'+d.getDate()+' '+MO[d.getMonth()]+'</span><span class="an-detail-tx-amt">-'+fmt(t.amount)+'</span></div>';}).join("")||'<div style="font-size:11px;color:var(--slate-400);padding:6px 0">No transactions</div>';
  document.getElementById("an-donut-center-pct").textContent=pct+"%"; document.getElementById("an-donut-center-pct").setAttribute("fill",color); document.getElementById("an-donut-center-lbl").textContent=catName.length>9?catName.slice(0,9)+"…":catName; document.getElementById("an-donut-center-lbl").setAttribute("fill","var(--slate-700)");
  const arcEls=document.getElementById("an-donut-arcs").querySelectorAll("circle"); arcEls.forEach((el,i)=>{el.style.opacity=i===idx?"1":"0.25";});
  document.querySelectorAll(".an-donut-item").forEach((el,i)=>{el.classList.toggle("selected",i===idx);el.classList.toggle("dimmed",i!==idx);});
  const seeAllLbl = document.getElementById("an-detail-see-all-lbl");
  if (seeAllLbl) seeAllLbl.textContent = "See all " + catName + " in History";
  document.getElementById("an-donut-detail").classList.add("visible");
}
function donutGoToHistory() {
  const sorted = window._anSorted || [];
  if (_activeDonutIdx < 0 || !sorted[_activeDonutIdx]) return;
  const cat = sorted[_activeDonutIdx][0];
  const mo = analyticsMonth, yr = analyticsYear;
  closeDonutDetail();
  // Set history filters: Expense type, this category, analytics month+year
  goTo("history");
  // Apply filters AFTER goTo (which resets the History page on entry)
  histFilter = "Expense";
  const typeEl = document.getElementById("hist-filter-type");
  const catEl  = document.getElementById("hist-filter-cat");
  const moEl   = document.getElementById("hist-filter-month");
  const yrEl   = document.getElementById("hist-filter-year");
  if (typeEl) typeEl.value = "Expense";
  buildHistCategoryDropdown();
  if (catEl)  catEl.value  = cat;
  if (moEl)   moEl.value   = String(mo);
  if (yrEl)   yrEl.value   = String(yr);
  ["hist-filter-type","hist-filter-cat","hist-filter-month","hist-filter-year"].forEach(id=>{ if(SDD_ENHANCED.has(id)) sddSync(id); });
  // Open the advanced filter panel so the pill is visible
  const panel = document.getElementById("hist-adv-panel");
  const btn   = document.getElementById("hist-adv-btn");
  if (panel) panel.classList.add("open");
  if (btn)   btn.classList.add("active");
  renderHistory();
}

function closeDonutDetail() {
  _activeDonutIdx=-1; document.getElementById("an-donut-detail").classList.remove("visible");
  const savedPctEl=document.getElementById("an-donut-center-pct"),savedLblEl=document.getElementById("an-donut-center-lbl");
  if(savedPctEl)savedPctEl.setAttribute("fill","var(--slate-900)"); if(savedLblEl){savedLblEl.textContent="saved";savedLblEl.setAttribute("fill","var(--slate-400)");}
  const arcEls=document.getElementById("an-donut-arcs").querySelectorAll("circle"); arcEls.forEach(el=>{el.style.opacity="1";});
  document.querySelectorAll(".an-donut-item").forEach(el=>{el.classList.remove("selected","dimmed");});
}
// A "spend from goal" is an Expense flagged fromGoal that links to a real goal.
// Prefer goalId (rename-proof); fall back to goalName for legacy rows not yet backfilled.
function isGoalSpend(t) {
  if (t.fromGoal !== true || t.type !== "Expense") return false;
  if (t.goalId != null) return GOALS.some(g => g.id === t.goalId);
  return !!t.goalName && GOALS.some(g => g.name === t.goalName);
}
// Current display name for a goal-spend — looked up by id so it never goes stale.
function goalSpendName(t) {
  if (t.goalId != null) { const g = GOALS.find(g => g.id === t.goalId); if (g) return g.name; }
  return t.goalName || "Goal";
}
function renderAnalytics() {
  const mo=analyticsMonth,yr=analyticsYear,allArr=monthTxs(mo,yr);
  // Separate goal spends from regular transactions
  const arr = allArr.filter(t => !isGoalSpend(t));
  const goalSpendArr = allArr.filter(isGoalSpend);
  const {inc,exp,net,rate}=calcSummary(arr);
  // Render goal-spend section
  const gsSec = document.getElementById("goal-spend-section");
  const gsRows = document.getElementById("goal-spend-rows");
  const gsTotal = document.getElementById("goal-spend-total-val");
  if (gsSec && gsRows && goalSpendArr.length) {
    gsSec.style.display = "block";
    const totalGoalSpend = goalSpendArr.reduce((s,t)=>s+t.amount, 0);
    gsRows.innerHTML = goalSpendArr.map(t =>
      '<div class="goal-spend-row">' +
        '<div><div style="font-size:11px;color:var(--slate-700)">' + (t.desc||"Spend") + '</div>' +
        '<div style="font-size:10px;color:var(--slate-400)">' + goalSpendName(t) + ' · ' + (t.category||"") + '</div></div>' +
        '<span style="font-size:11px;font-weight:600;color:var(--amber-strong)">' + fmt(t.amount) + '</span>' +
      '</div>'
    ).join("");
    if (gsTotal) gsTotal.textContent = fmt(totalGoalSpend);
  } else if (gsSec) { gsSec.style.display = "none"; }
  document.getElementById("an-filter-label").textContent=MO[mo]+" "+yr; document.getElementById("an-year-label").textContent="Yearly overview";
  const netEl=document.getElementById("an-net"); document.getElementById("an-inc").textContent=fmt(inc); document.getElementById("an-exp").textContent=fmt(exp); netEl.textContent=fmt(net); netEl.style.color=net>=0?"var(--green-strong)":"var(--red-strong)"; document.getElementById("an-rate").textContent=Math.round(rate*100)+"%";
  const catMap={}; arr.filter(t=>t.type==="Expense").forEach(t=>{catMap[t.category]=(catMap[t.category]||0)+t.amount;});
  const sorted=Object.entries(catMap).sort((a,b)=>b[1]-a[1]).slice(0,8),totalExp=sorted.reduce((s,[,v])=>s+v,0),savedPct=inc>0?Math.round((net/inc)*100):0;
  document.getElementById("an-donut-center-pct").textContent=savedPct+"%";
  const R=42,CX=55,CY=55,CIRCUMFERENCE=2*Math.PI*R,arcsEl=document.getElementById("an-donut-arcs");
  if(sorted.length===0){arcsEl.innerHTML='<circle cx="55" cy="55" r="42" fill="none" stroke="var(--slate-200)" stroke-width="16"/>';}
  else{let offset=-CIRCUMFERENCE/4;arcsEl.innerHTML=sorted.map(([cat,amt],i)=>{const pct=amt/totalExp,dash=pct*CIRCUMFERENCE,gap=CIRCUMFERENCE-dash,arc='<circle cx="'+CX+'" cy="'+CY+'" r="'+R+'" fill="none" stroke="'+CAT_COLORS[i%CAT_COLORS.length]+'" stroke-width="16" stroke-dasharray="'+dash.toFixed(2)+' '+gap.toFixed(2)+'" stroke-dashoffset="'+(-offset).toFixed(2)+'" style="transition:stroke-dasharray 0.4s ease"/>';offset+=dash;return arc;}).join("");}
  window._anSorted=sorted; window._anArr=arr; window._anTotalExp=totalExp;
  const legendEl=document.getElementById("an-donut-legend");
  if(sorted.length===0){legendEl.innerHTML='<div style="font-size:12px;color:var(--slate-400);padding:8px 0">No expense data for '+MO[mo]+' '+yr+'</div>';}
  else{legendEl.innerHTML=sorted.map(([cat,amt],i)=>{const pct=totalExp>0?Math.round((amt/totalExp)*100):0,name=cat.replace(/^\S+\s/,"");return '<div class="an-donut-item" onclick="toggleDonutDetail('+i+')"><div class="an-donut-dot" style="background:'+CAT_COLORS[i%CAT_COLORS.length]+'"></div><span class="an-donut-name">'+name+'</span><span class="an-donut-pct">'+pct+'%</span><span class="an-donut-arrow">›</span></div>';}).join("");}
  closeDonutDetail();
  const yearArr=yearTxs(yr).filter(t=>!isGoalSpend(t)),yInc=yearArr.filter(t=>t.type==="Income").reduce((s,t)=>s+t.amount,0),yExp=yearArr.filter(t=>t.type==="Expense").reduce((s,t)=>s+t.amount,0),yNet=yInc-yExp,yRate=yInc>0?Math.round((yNet/yInc)*100):0,netColor=yNet>=0?"var(--green-strong)":"var(--red-strong)";
  document.getElementById("an-year-summary").innerHTML='<div class="an-year-summ-box"><div class="an-year-summ-val" style="color:var(--green-strong)">'+fmt(yInc)+'</div><div class="an-year-summ-lbl">Year income</div></div><div class="an-year-summ-box"><div class="an-year-summ-val" style="color:var(--red-strong)">'+fmt(yExp)+'</div><div class="an-year-summ-lbl">Year expenses</div></div><div class="an-year-summ-box"><div class="an-year-summ-val" style="color:'+netColor+'">'+fmt(yNet)+'</div><div class="an-year-summ-lbl">Year net</div></div><div class="an-year-summ-box"><div class="an-year-summ-val">'+yRate+'%</div><div class="an-year-summ-lbl">Year rate</div></div>';
  // Month-over-month comparison (Layout 3 — delta section)
  renderMoM(mo, yr);
  // Savings rate trend
  renderSavingsRateTrend();
}

function renderSavingsRateTrend() {
  const svgEl  = document.getElementById("rate-chart-svg");
  const axisEl = document.getElementById("rate-chart-axis");
  if (!svgEl || !axisEl) return;
  const now = new Date();
  const months = [], labels = [], rates = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d);
    labels.push(MO[d.getMonth()].slice(0,3));
    const arr = txs.filter(t => {
      const td = parseDate(t.date);
      return td.getMonth()===d.getMonth() && td.getFullYear()===d.getFullYear() && !isGoalSpend(t);
    });
    const inc = arr.filter(t=>t.type==="Income").reduce((s,t)=>s+t.amount,0);
    const exp = arr.filter(t=>t.type==="Expense").reduce((s,t)=>s+t.amount,0);
    const rate = inc > 0 ? Math.max(0, Math.min(100, Math.round(((inc-exp)/inc)*100))) : null;
    rates.push(rate);
  }
  const hasData = rates.some(r => r !== null);
  if (!hasData) { svgEl.innerHTML = '<div style="font-size:11px;color:var(--slate-400);text-align:center;padding:12px 0">No data yet</div>'; return; }
  const W=300, H=64, pad=4;
  const valid = rates.map((r,i)=>r!==null?i:-1).filter(i=>i>=0);
  const nonNull = rates.filter(r=>r!==null);
  const maxR = Math.max(...nonNull, 1);
  const pts = rates.map((r,i) => {
    const x = pad + (i/(rates.length-1))*(W-pad*2);
    const y = r===null ? null : pad + (1 - r/100)*(H-pad*2);
    return {x, y, r};
  }).filter(p=>p.y!==null);
  const lineStr = pts.map((p,i)=>(i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
  const areaStr = pts.map((p,i)=>(i===0?'M':'L')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')
    + ' L'+pts[pts.length-1].x.toFixed(1)+','+(H-pad)+' L'+pts[0].x.toFixed(1)+','+(H-pad)+' Z';
  svgEl.innerHTML =
    '<svg width="100%" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="display:block">' +
      '<defs><linearGradient id="rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--teal)" stop-opacity="0.2"/><stop offset="100%" stop-color="var(--teal)" stop-opacity="0"/></linearGradient></defs>' +
      '<path d="'+areaStr+'" fill="url(#rg)"/>' +
      '<path d="'+lineStr+'" fill="none" stroke="var(--teal)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      pts.map(p=>'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3" fill="var(--teal)"/>').join('') +
      pts.map(p=>'<text x="'+p.x.toFixed(1)+'" y="'+(p.y-7).toFixed(1)+'" text-anchor="middle" font-size="8" fill="var(--teal)">'+p.r+'%</text>').join('') +
    '</svg>';
  // Show only first, middle, last labels to avoid crowding
  axisEl.innerHTML = labels.map((l,i) =>
    (i===0||i===5||i===11) ? '<span>'+l+'</span>' : '<span></span>'
  ).join('');
}

function renderMoM(mo, yr) {
  const momEl  = document.getElementById('mom-section');
  const momLbl = document.getElementById('mom-section-label');
  const momCon = document.getElementById('mom-container');
  if (!momEl) return;

  let prevMo = mo - 1, prevYr = yr;
  if (prevMo < 0) { prevMo = 11; prevYr = yr - 1; }

  const currArr = monthTxs(mo, yr).filter(t => t.type === 'Expense');
  const prevArr = monthTxs(prevMo, prevYr).filter(t => t.type === 'Expense');
  if (momLbl) momLbl.textContent = 'vs ' + MO[prevMo] + ' ' + prevYr;

  // ── Option C: previous month has zero data → show notice only ──
  if (prevArr.length === 0) {
    momEl.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 0;font-size:11px;color:var(--slate-400)">' +
        '<i class="ti ti-calendar-stats" style="font-size:15px"></i>' +
        'No data for ' + MO[prevMo] + ' ' + prevYr + ' — nothing to compare' +
      '</div>';
    return;
  }

  // ── Option E: some data exists ────────────────────────────────
  const currMap = {}, prevMap = {};
  currArr.forEach(t => { currMap[t.category] = (currMap[t.category]||0) + t.amount; });
  prevArr.forEach(t => { prevMap[t.category] = (prevMap[t.category]||0) + t.amount; });

  const allCats = [...new Set([...Object.keys(currMap), ...Object.keys(prevMap)])];

  // Categorise each
  const catsUp = [], catsDn = [], catsNew = [], catsFlat = [];
  allCats.forEach(cat => {
    const curr = currMap[cat] || 0, prev = prevMap[cat] || 0;
    if (prev === 0) { catsNew.push(cat); return; }
    const delta = curr - prev;
    if (delta > 0) catsUp.push(cat);
    else if (delta < 0) catsDn.push(cat);
    else catsFlat.push(cat);
  });
  // Sort each group by curr amount desc
  const byCurr = (a,b) => (currMap[b]||0) - (currMap[a]||0);
  catsUp.sort(byCurr); catsDn.sort(byCurr); catsNew.sort(byCurr); catsFlat.sort(byCurr);

  const totalCurr = currArr.reduce((s,t) => s+t.amount, 0);
  const totalPrev = prevArr.reduce((s,t) => s+t.amount, 0);
  const totalDelta = totalCurr - totalPrev;
  const totalPct   = totalPrev > 0 ? Math.round((totalDelta/totalPrev)*100) : 0;
  const totalCls   = totalDelta > 0 ? 'up' : totalDelta < 0 ? 'dn' : 'flat';
  const totalSign  = totalDelta > 0 ? '+' : '';

  // Is prev month sparse? (fewer than 3 categories)
  const isSparse = Object.keys(prevMap).length < 3;

  // Build cat row HTML
  function catRowHtml(cat) {
    const curr = currMap[cat] || 0, prev = prevMap[cat] || 0;
    const isNew = prev === 0;
    const delta = curr - prev;
    const pct   = prev > 0 ? Math.round((delta/prev)*100) : 0;
    const cls   = isNew ? 'new' : delta > 0 ? 'up' : delta < 0 ? 'dn' : 'flat';
    const sign  = delta > 0 ? '+' : '';
    const badge = isNew ? 'New' : delta === 0 ? '—' : sign+pct+'%';
    const prevTxt = isNew ? '' : fmt(prev) + ' → ';
    return '<div class="mom-row">' +
      '<span class="mom-cat">' + cat + '</span>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<span style="font-size:10px;color:var(--slate-400)">' + prevTxt + fmt(curr) + '</span>' +
        '<span class="mom-delta ' + cls + '">' + badge + '</span>' +
      '</div></div>';
  }

  // Build grouped expandable list
  function groupHtml(cats, label, color) {
    if (!cats.length) return '';
    return '<div class="mom-group-lbl" style="color:' + color + '">' + label + '</div>' +
      cats.map(catRowHtml).join('');
  }

  const expandedId = 'mom-expand-' + mo + '-' + yr;
  const listHtml =
    groupHtml(catsUp,   '<i class="ti ti-arrow-up" style="font-size:10px"></i> Spending up',   '#991b1b') +
    groupHtml(catsDn,   '<i class="ti ti-arrow-down" style="font-size:10px"></i> Spending down','#166534') +
    groupHtml(catsNew,  'New this month',                                                        '#3730a3') +
    groupHtml(catsFlat, 'Unchanged',                                                             '#64748b');

  // Pills
  let pillsHtml = '<div class="mom-pill-strip">';
  if (catsUp.length)   pillsHtml += '<span class="mom-pill up"><i class="ti ti-arrow-up" style="font-size:11px"></i>' + catsUp.length + ' up</span>';
  if (catsDn.length)   pillsHtml += '<span class="mom-pill dn"><i class="ti ti-arrow-down" style="font-size:11px"></i>' + catsDn.length + ' down</span>';
  if (catsNew.length)  pillsHtml += '<span class="mom-pill new">' + catsNew.length + ' new</span>';
  pillsHtml += '</div>';

  // Sparse warning
  const warnHtml = isSparse
    ? '<div class="mom-warn"><i class="ti ti-alert-triangle" style="font-size:13px;flex-shrink:0"></i>' +
      MO[prevMo] + ' had very little data — percentages may be unreliable</div>'
    : '';

  // Net row
  const netHtml =
    '<div class="mom-net-row">' +
      '<span style="font-size:12px;color:var(--slate-500)">Total expenses</span>' +
      '<div style="display:flex;align-items:center;gap:8px">' +
        '<span style="font-size:10px;color:var(--slate-400)">' + fmt(totalPrev) + ' → ' + fmt(totalCurr) + '</span>' +
        '<span class="mom-delta ' + totalCls + '">' + totalSign + totalPct + '%</span>' +
      '</div>' +
    '</div>';

  momEl.innerHTML =
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
      '<span style="font-size:11px;color:var(--slate-400)">' + MO[prevMo] + ' ' + prevYr + '</span>' +
      '<button class="mom-see-all" onclick="toggleMoMExpand(\x27' + expandedId + '\x27, this)">See all ›</button>' +
    '</div>' +
    pillsHtml +
    warnHtml +
    netHtml +
    '<div class="mom-expand-list" id="' + expandedId + '" style="max-height:0">' +
      listHtml +
    '</div>';
}

function toggleMoMExpand(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  const isOpen = el.style.maxHeight !== '0px' && el.style.maxHeight !== '';
  el.style.maxHeight = isOpen ? '0' : el.scrollHeight + 'px';
  btn.textContent = isOpen ? 'See all ›' : 'Collapse ‹';
}

// ══ INSTALLMENTS ══════════════════════════════════════════════
// ══ PAYOFF SIMULATOR ═════════════════════════════════════════
// "Extra ฿/month" → how many months sooner you're debt-free + cash freed.
// These are 0% plans (balance = monthly × months left), so no interest is modelled.
let _payoffIdx = -1;
function openPayoffSim(idx) {
  const p = INSTALLMENTS[idx]; if (!p) return;
  _payoffIdx = idx;
  document.getElementById("payoff-sub").textContent = (p.icon ? p.icon + " " : "") + p.name + " · " + fmt(p.monthly) + "/mo · 0% plan";
  const slider = document.getElementById("payoff-slider");
  slider.max = Math.max(1000, Math.ceil(p.monthly * 3 / 100) * 100);  // up to ~3× the monthly
  slider.value = 0;
  openModal("payoff");
  updatePayoffSim();
}
function updatePayoffSim() {
  const p = INSTALLMENTS[_payoffIdx]; if (!p) return;
  const rem = Math.max(p.total_mo - p.paid, 0);
  const bal = Math.max(p.total - p.monthly * p.paid, 0);
  const extra = Number(document.getElementById("payoff-slider").value) || 0;
  document.getElementById("payoff-extra-val").textContent = "฿" + extra.toLocaleString();
  const pay = p.monthly + extra;
  const newMonths = pay > 0 ? Math.min(rem, Math.max(1, Math.ceil(bal / pay))) : rem;
  const sooner = rem - newMonths;
  const now = new Date();
  const lbl = n => { const d = new Date(now.getFullYear(), now.getMonth() + n, 1); return MO[d.getMonth()] + " " + d.getFullYear(); };
  document.getElementById("payoff-current").innerHTML =
    '<div class="payoff-row"><span>Balance left</span><b>' + fmt(bal) + '</b></div>' +
    '<div class="payoff-row"><span>Current payoff</span><b>' + rem + (rem === 1 ? ' month · ' : ' months · ') + lbl(rem) + '</b></div>';
  document.getElementById("payoff-result").innerHTML =
    '<div class="payoff-result-main">' + newMonths + (newMonths === 1 ? ' month' : ' months') + '<span>debt-free ' + lbl(newMonths) + '</span></div>' +
    '<div class="payoff-pill' + (sooner > 0 ? '' : ' none') + '">' + (sooner > 0 ? (sooner + (sooner === 1 ? ' month sooner' : ' months sooner')) : 'no change yet') + '</div>' +
    (sooner > 0 ? '<div class="payoff-freed">Frees ' + fmt(p.monthly) + '/mo, ' + sooner + (sooner === 1 ? ' month' : ' months') + ' earlier</div>' : '');
}

// ══ DEBT-FREE SNOWBALL / AVALANCHE PLANNER ══════════════════
// Simulates all active plans together, month by month: extra money targets one plan at a
// time (per strategy order); once that plan finishes, its own monthly payment rolls into
// the pool for the next plan — the classic "snowball" acceleration, even with ฿0 extra.
let _snowStrategy = "snowball";

function setSnowballStrategy(s) {
  _snowStrategy = s;
  document.getElementById("snow-strat-snowball").classList.toggle("active", s === "snowball");
  document.getElementById("snow-strat-avalanche").classList.toggle("active", s === "avalanche");
  updateSnowballPlan();
}

function openSnowballPlanner() {
  const active = INSTALLMENTS.filter(p => p.paid < p.total_mo);
  if (!active.length) { showToast("No active instalments to plan"); return; }
  _snowStrategy = "snowball";
  document.getElementById("snow-strat-snowball").classList.add("active");
  document.getElementById("snow-strat-avalanche").classList.remove("active");
  const maxMonthly = Math.max(...active.map(p => p.monthly), 1000);
  document.getElementById("snow-slider").max = Math.max(2000, Math.ceil(maxMonthly * 3 / 100) * 100);
  document.getElementById("snow-slider").value = 0;
  openModal("snowball");
  updateSnowballPlan();
}

// Pure simulation — month-by-month, no UI side effects, easy to reason about / test.
function simulateSnowball(plans, strategy, extraPerMonth) {
  if (!plans.length) return { order: [] };
  const order = plans.map((p, i) => ({ ...p, idx: i, remaining: p.balance }));
  if (strategy === "snowball") order.sort((a, b) => a.remaining - b.remaining);   // smallest balance first
  else order.sort((a, b) => b.monthly - a.monthly);                               // highest monthly payment first

  let pool = extraPerMonth, month = 0, targetPtr = 0;
  const finishMonth = {};
  const MAX_MONTHS = 600; // safety cap — a few years past any realistic plan length

  while (Object.keys(finishMonth).length < order.length && month < MAX_MONTHS) {
    month++;
    while (targetPtr < order.length && order[targetPtr].remaining <= 0) targetPtr++;
    if (targetPtr >= order.length) break;
    for (let i = 0; i < order.length; i++) {
      const p = order[i];
      if (p.remaining <= 0) continue;
      const payment = (i === targetPtr) ? (p.monthly + pool) : p.monthly;
      p.remaining = Math.max(0, p.remaining - payment);
      if (p.remaining <= 0 && finishMonth[p.idx] === undefined) {
        finishMonth[p.idx] = month;
        pool += p.monthly; // freed payment rolls forward
      }
    }
  }
  order.forEach(p => { p.finishMonth = finishMonth[p.idx] !== undefined ? finishMonth[p.idx] : month; });
  return { order: [...order].sort((a, b) => a.finishMonth - b.finishMonth) };
}

function updateSnowballPlan() {
  const active = INSTALLMENTS.filter(p => p.paid < p.total_mo).map(p => ({
    name: p.name, icon: p.icon, monthly: p.monthly,
    balance: Math.max(p.total - p.monthly * p.paid, 0)
  }));
  if (!active.length) return;
  const extra = Number(document.getElementById("snow-slider").value) || 0;
  document.getElementById("snow-extra-val").textContent = "฿" + extra.toLocaleString();
  const { order } = simulateSnowball(active, _snowStrategy, extra);
  const now = new Date();
  const lbl = n => { const d = new Date(now.getFullYear(), now.getMonth() + n, 1); return MO[d.getMonth()] + " " + d.getFullYear(); };
  document.getElementById("snow-order").innerHTML =
    '<div class="snow-order">' +
      order.map((p, i) =>
        '<div class="snow-order-row"><span class="lbl"><span class="badge">' + (i + 1) + '</span>' + p.icon + ' ' + p.name + '</span><span class="date">paid off ' + lbl(p.finishMonth) + '</span></div>'
      ).join("") +
    '</div>';
  const overallMonths = Math.max(...order.map(p => p.finishMonth));
  document.getElementById("snow-result").innerHTML =
    '<div class="payoff-result-main">' + lbl(overallMonths) + '<span>all instalments paid off</span></div>';
}

function renderInstallments() {
  const active=INSTALLMENTS.filter(p=>p.paid<p.total_mo),monthly=active.reduce((s,p)=>s+p.monthly,0),balance=INSTALLMENTS.reduce((s,p)=>s+Math.max(p.total-p.monthly*p.paid,0),0);
  document.getElementById("inst-monthly").textContent=fmt(monthly); document.getElementById("inst-balance").textContent=fmt(balance); document.getElementById("inst-count").textContent=active.length;
  // Income commitment warning
  const now=new Date(), incomeThisMonth=monthTxs(now.getMonth(),now.getFullYear()).filter(t=>t.type==="Income").reduce((s,t)=>s+t.amount,0);
  const warnEl=document.getElementById("inst-income-warning");
  if (warnEl && incomeThisMonth>0 && monthly>0) {
    const pct=Math.round((monthly/incomeThisMonth)*100);
    const color=pct>=50?"var(--red-text)":pct>=30?"var(--amber-text)":"var(--green-text)";
    const bg=pct>=50?"var(--red-bg)":pct>=30?"var(--amber-bg)":"var(--green-bg)";
    warnEl.style.display="block"; warnEl.style.background=bg; warnEl.style.color=color;
    warnEl.textContent="⚠ Monthly instalments are "+pct+"% of your income ("+fmt(monthly)+" of "+fmt(incomeThisMonth)+")";
  } else if (warnEl) { warnEl.style.display="none"; }
  // ── Option B Timeline ─────────────────────────────────────────
  const tlEl = document.getElementById("inst-timeline");
  const activeForTl = INSTALLMENTS.filter(p => p.paid < p.total_mo);
  if (tlEl && activeForTl.length) {
    // Sort by months remaining ascending
    const sorted = [...activeForTl].sort((a,b)=>(a.total_mo-a.paid)-(b.total_mo-b.paid));
    const maxRem = Math.max(...sorted.map(p=>p.total_mo-p.paid), 1);
    const rows = sorted.map(p => {
      const rem = p.total_mo - p.paid;
      const pct = Math.min(Math.round((rem/maxRem)*100), 100);
      const bal = Math.max(p.total - p.monthly*p.paid, 0);
      // End date
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + rem);
      const endLbl = MO[endDate.getMonth()].slice(0,3) + " " + String(endDate.getFullYear()).slice(2);
      // Badge color based on months left
      const badgeBg = rem<=3?"#fee2e2":rem<=6?"#fef3c7":"#dcfce7";
      const badgeColor = rem<=3?"#991b1b":rem<=6?"#78350f":"#166534";
      // Bar width = percentage already PAID (progress bar style)
      const paidPct = Math.min(Math.round((p.paid / p.total_mo) * 100), 100);
      return '<div class="inst-tl-row">' +
        '<div class="inst-tl-name">' + p.icon + ' ' + p.name + '</div>' +
        '<div class="inst-tl-track">' +
          '<div class="inst-tl-bar" style="width:' + paidPct + '%;background:' + p.color + '">' +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;min-width:88px">' +
          '<div style="font-size:10px;font-weight:600;color:' + badgeColor + ';background:' + badgeBg + ';padding:2px 8px;border-radius:20px;display:inline-block;white-space:nowrap">' + rem + ' m left</div>' +
          '<div style="font-size:9px;color:var(--slate-400);margin-top:2px">' + endLbl + ' · ' + fmt(bal) + '</div>' +
        '</div>' +
      '</div>';
    }).join("");
    tlEl.innerHTML =
      '<div class="inst-tl-hd"><span>Payoff order — soonest first</span>' +
        '<div style="display:flex;align-items:center;gap:4px;font-size:9px;color:var(--slate-400)">' +
          '<div style="width:8px;height:3px;background:var(--red);border-radius:1px"></div> further right = longer remaining' +
        '</div>' +
      '</div>' + rows;
  } else if (tlEl) {
    tlEl.innerHTML = '<div style="font-size:11px;color:var(--slate-400);text-align:center;padding:8px 0">No active instalments</div>';
  }

  // Read filter + sort values
  const fStatus = document.getElementById("inst-filter-status")?.value || "active";
  const fSort   = document.getElementById("inst-filter-sort")?.value || "soonest";

  // Filter
  let filtered = INSTALLMENTS.map((p,idx)=>({p,idx})).filter(({p})=>{
    const isDone = p.paid >= p.total_mo;
    if (fStatus === "active") return !isDone;
    if (fStatus === "done")   return isDone;
    return true;
  });

  // Sort
  filtered.sort((a,b)=>{
    if (fSort === "monthly") return b.p.monthly - a.p.monthly;
    if (fSort === "balance")  return Math.max(b.p.total-b.p.monthly*b.p.paid,0) - Math.max(a.p.total-a.p.monthly*a.p.paid,0);
    if (fSort === "name")     return (a.p.icon+' '+a.p.name).localeCompare(b.p.icon+' '+b.p.name);
    // soonest: by months remaining ascending
    return (a.p.total_mo-a.p.paid) - (b.p.total_mo-b.p.paid);
  });

  // Hide timeline when showing paid off only
  const tlEl2 = document.getElementById("inst-timeline");
  if (tlEl2) tlEl2.style.display = fStatus === "done" ? "none" : "block";

  // Result count
  const rcEl = document.getElementById("inst-result-count");
  if (rcEl) {
    const label = fStatus==="done"?"paid off":fStatus==="active"?"active":"total";
    rcEl.textContent = "Showing "+filtered.length+" "+label+" plan"+(filtered.length!==1?"s":"");
  }

  document.getElementById("inst-list").innerHTML=filtered.map(({p,idx})=>{
    const pct=Math.round(p.paid/p.total_mo*100),rem=p.total_mo-p.paid,bal=Math.max(p.total-p.monthly*p.paid,0),isDone=rem<=0;
    return '<div class="inst-card"><div class="inst-top"><div><div class="inst-name">'+p.icon+' '+p.name+'</div><div class="inst-cat">'+p.cat+'</div></div><span class="inst-badge '+(isDone?'badge-done':'badge-active')+'">'+(isDone?'Paid off':'Active')+'</span></div><div style="display:flex;justify-content:space-between;font-size:10px;color:var(--slate-400);margin-bottom:4px"><span>'+p.paid+' of '+p.total_mo+' months paid</span><span style="font-weight:600;color:'+p.color+'">'+pct+'%</span></div><div class="inst-track"><div class="inst-fill" style="width:'+pct+'%;background:'+p.color+'"></div></div>'+
      (isDone
        ? '<div class="inst-stats"><div><div style="font-size:9px;color:var(--slate-400)">Monthly</div><div class="inst-stat-val">'+fmt(p.monthly)+'</div></div><div style="text-align:center"><div style="font-size:9px;color:var(--slate-400)">Months left</div><div class="inst-stat-val">'+rem+'</div></div><div style="text-align:right"><div style="font-size:9px;color:var(--slate-400)">Balance</div><div class="inst-stat-val" style="color:var(--slate-400)">'+fmt(bal)+'</div></div></div>'
        : '<div class="inst-sim-box" onclick="openPayoffSim('+idx+')"><div class="inst-stats"><div><div class="inst-sim-lbl">Monthly</div><div class="inst-sim-val">'+fmt(p.monthly)+'</div></div><div style="text-align:center"><div class="inst-sim-lbl">Months left</div><div class="inst-sim-val">'+rem+'</div></div><div style="text-align:right"><div class="inst-sim-lbl">Balance</div><div class="inst-sim-val" style="color:var(--red)">'+fmt(bal)+'</div></div></div><div class="inst-sim-hint">'+SIM_BOLT+'<span>Tap to simulate payoff</span><span>›</span></div></div>')+
      '<div class="inst-actions"><button class="inst-action-btn inst-pay-btn" onclick="openInstModal('+idx+')"'+(isDone?' disabled':'')+'>Paid This Month</button><button class="inst-action-btn" style="background:var(--green-bg);color:var(--green-text);border-color:var(--green-border);font-size:10px" onclick="confirmEarlyPayoff('+idx+')"'+(isDone?' disabled':'')+'>Pay off</button><button class="inst-action-btn inst-edit-btn" onclick="openEditInstModal('+idx+')" aria-label="Edit">'+EDIT_PENCIL+'</button><button class="inst-action-btn inst-delete-btn" onclick="deleteInst('+idx+')">🗑️</button></div></div>';
  }).join("");
}
async function confirmEarlyPayoff(idx) {
  const p = INSTALLMENTS[idx];
  if (!p) return;
  const rem = p.total_mo - p.paid;
  if (rem <= 0) { showToast("Already fully paid off"); return; }
  if (!(await appConfirm({title:'Mark "' + p.icon + ' ' + p.name + '" as paid off?', message:rem + ' payment' + (rem!==1?'s':'') + ' remaining will be marked as paid.\n\nThis also logs one expense transaction for the remaining balance.', okText:"Mark paid"}))) return;
  const bal = Math.max(p.total - p.monthly * p.paid, 0);
  const now = new Date();
  INSTALLMENTS[idx].paid = p.total_mo;
  INSTALLMENTS[idx].lastPaidYM = ymOf(now);
  saveInsts();
  // One lump-sum transaction for the remaining balance — same linking as a normal Mark as paid.
  const tx = { id: Date.now(), date: toDateStr(now), type: "Expense", category: p.cat,
    desc: (p.icon ? p.icon + " " : "") + p.name + " instalment payoff", amount: bal,
    notes: "", fromInst: true, instId: p.id };
  txs.push(tx); saveTxs();
  renderInstallments(); renderHome();
  showToast(p.name + " marked as fully paid off + logged ✓");
  if (settings.sheetsUrl) {
    setSyncStatus("syncing");
    const [instOk, txOk] = await Promise.all([
      Promise.race([postToSheets("update_installment_paid",{planName:p.name,monthsPaid:p.total_mo}), new Promise(r=>setTimeout(()=>r(false),6000))]),
      Promise.race([postToSheets("add_transaction",{data:{...tx}}), new Promise(r=>setTimeout(()=>r(false),6000))])
    ]);
    if (instOk && txOk) { setSyncStatus("ok"); }
    else {
      setSyncStatus("error");
      if (!txOk) { unsyncedIds.push(tx.id); localStorage.setItem("ft_unsynced", JSON.stringify(unsyncedIds)); }
      showToast("Synced partially — check connection");
    }
  }
}

async function deleteInst(idx) {
  const inst = INSTALLMENTS[idx];
  if(!(await appConfirm({title:'Delete "'+inst.name+'"?', okText:"Delete", danger:true})))return;
  // Check for linked Mark-as-paid transactions (fromInst, matched by instId — see confirmMarkPaid)
  const linkedTxs = txs.filter(t => t.fromInst && t.instId === inst.id);
  let deleteLinked = false;
  if (linkedTxs.length > 0) {
    deleteLinked = await appConfirm({
      title: "Delete linked transactions?",
      message: linkedTxs.length + ' transaction' + (linkedTxs.length > 1 ? 's' : '') +
        ' from "' + inst.name + '" exist in History (total: ' + fmt(linkedTxs.reduce((s,t)=>s+t.amount,0)) + ').',
      okText: "Delete them",
      cancelText: "Keep them",
      danger: true
    });
  }
  if (deleteLinked) {
    for (const t of linkedTxs) {
      txs = txs.filter(x => x.id !== t.id);
      unsyncedIds = unsyncedIds.filter(uid => uid !== t.id);
      if (t.rowId && settings.sheetsUrl) {
        await Promise.race([postToSheets("delete_transaction", {rowId:t.rowId, data:{date:t.date,desc:t.desc||"",amount:t.amount}}), new Promise(r=>setTimeout(()=>r(false),4000))]);
      }
    }
    localStorage.setItem("ft_unsynced", JSON.stringify(unsyncedIds));
    saveTxs();
  }
  INSTALLMENTS.splice(idx,1); saveInsts(); renderInstallments(); renderHome();
  const linkedNote = deleteLinked ? " + " + linkedTxs.length + " transaction(s) removed" : "";
  if(inst&&settings.sheetsUrl){setSyncStatus("syncing");const ok=await Promise.race([postToSheets("delete_installment",{name:inst.name}),new Promise(r=>setTimeout(()=>r(false),6000))]);if(ok){setSyncStatus("ok");showToast("Instalment deleted"+linkedNote+" + synced ✓");}else{setSyncStatus("error");showToast("Deleted locally — Sheets sync failed");}}
  else showToast("Instalment deleted"+linkedNote);
}

// ══ ADD FORM ══════════════════════════════════════════════════
let currentEntryType = "tx", currentType = "Expense";
function setEntryType(type) {
  currentEntryType=type;
  ["tx","goal","inst"].forEach(t=>{document.getElementById("etbtn-"+t).classList.toggle("active",t===type);document.getElementById("form-"+t).style.display=t===type?"block":"none";});
  const titles={tx:"New Transaction",goal:"New Goal",inst:"New Instalment"};
  document.getElementById("add-page-title").textContent=titles[type];
}
function setType(type) {
  currentType=type;
  document.getElementById("btn-expense").className="type-btn"+(type==="Expense"?" active-exp":"");
  document.getElementById("btn-income").className="type-btn"+(type==="Income"?" active-inc":"");
  updateCats();
  if (_splitOn) refreshSplitCats();
}
function buildDaySelect(id,day) { const el=document.getElementById(id);if(!el)return;el.innerHTML=Array.from({length:31},(_,i)=>`<option value="${i+1}"${i+1===day?' selected':''}>${i+1}</option>`).join(""); }
function buildMonthSelect(id,month) { const el=document.getElementById(id);if(!el)return;el.innerHTML=MO.map((m,i)=>`<option value="${i+1}"${i+1===month?' selected':''}>${m}</option>`).join(""); }
function buildYearSelect(id,year,back,fwd) { const el=document.getElementById(id);if(!el)return;const cur=new Date().getFullYear();let html="";for(let y=cur-(back||0);y<=cur+(fwd||3);y++)html+=`<option value="${y}"${y===year?' selected':''}>${y}</option>`;el.innerHTML=html; }
function getDateVal(dId,mId,yId) { const d=document.getElementById(dId)?.value||"1",m=document.getElementById(mId)?.value,y=document.getElementById(yId)?.value;if(!m||!y)return"";return y+"-"+String(m).padStart(2,"0")+"-"+String(d).padStart(2,"0"); }
function getMonthVal(mId,yId) { const m=document.getElementById(mId)?.value,y=document.getElementById(yId)?.value;if(!m||!y)return"";return y+"-"+String(m).padStart(2,"0")+"-01"; }
function setupAdd() {
  currentEntryType="tx"; setEntryType("tx");
  const now=new Date(),d=now.getDate(),mo=now.getMonth()+1,y=now.getFullYear();
  buildDaySelect("f-date-d",d);buildMonthSelect("f-date-m",mo);buildYearSelect("f-date-y",y,1,0);
  buildMonthSelect("g-due-m",mo);buildYearSelect("g-due-y",y,0,5);
  buildDaySelect("i-start-d",d);buildMonthSelect("i-start-m",mo);buildYearSelect("i-start-y",y,1,0);
  ["f-amount","f-desc","f-notes","g-name","g-target","g-saved","g-monthly","i-name","i-total","i-monthly","i-total-mo"].forEach(id=>{const el=document.getElementById(id);if(el)el.value="";});
  document.getElementById("i-paid").value="0"; updateCats(); updateInstCats();
  const gCatSel=document.getElementById("g-category");
  catBuildList("g-category", EXPENSE_CATS);
  // App-styled dropdowns for date + colour selects (replaces native iOS wheel)
  sddEnhance("f-date-d",{flex:"1"}); sddEnhance("f-date-m",{flex:"1.4"}); sddEnhance("f-date-y",{flex:"1.2"});
  sddEnhance("g-due-m",{flex:"1.4"}); sddEnhance("g-due-y",{flex:"1.2"});
  sddEnhance("i-start-d",{flex:"1"}); sddEnhance("i-start-m",{flex:"1.4"}); sddEnhance("i-start-y",{flex:"1.2"});
  sddEnhance("g-color",{swatch:true,up:true}); sddEnhance("i-color",{swatch:true,up:true});
  isRecurring = false;
  const togRec = document.getElementById("toggle-recurring");
  if (togRec) togRec.className = "toggle";
  resetSplit();
  const fAmt = document.getElementById("f-amount");
  if (fAmt && !fAmt._splitBound) { fAmt.addEventListener("input", updateSplitRemainder); fAmt._splitBound = true; }
  const hasUrl=!!settings.sheetsUrl;
  document.getElementById("add-sync-dot").style.background=hasUrl?"var(--green)":"var(--slate-300)";
  document.getElementById("add-sync-label").textContent=hasUrl&&settings.autosync?"Will sync to Google Sheets":"Will save locally only";
  nkpBind();
}
function updateCats() { const cats=currentType==="Income"?INCOME_CATS:EXPENSE_CATS; catBuildList("f-category", cats); }
function updateInstCats() { catBuildList("i-category", EXPENSE_CATS); }

// Shared swipe-to-delete engine for any rows wrapped in `selector` containers
// (history + calendar). onDelete(id) runs when the revealed bin is tapped.
function initSwipeRows(selector, onDelete) {
  let openRow = null;
  // Tap outside the open row snaps it closed
  document.addEventListener('touchstart', e => {
    if (!openRow) return;
    if (!openRow.closest(selector).contains(e.target)) {
      openRow.classList.remove('no-transition');
      openRow.style.transform = '';
      openRow = null;
    }
  }, {passive:true});

  document.querySelectorAll(selector).forEach(container => {
    const row = container.querySelector('.hist-tx-row');
    const bg  = container.querySelector('.swipe-del-bg');
    if (!row || !bg) return;
    const id = parseInt(container.dataset.id);
    let startX=0, currentX=0, isDragging=false;
    const THRESHOLD = 72;

    row.addEventListener('touchstart', e => {
      if (openRow && openRow !== row) { // close any other open row first
        openRow.classList.remove('no-transition');
        openRow.style.transform = '';
        openRow = null;
      }
      startX = e.touches[0].clientX;
      currentX = row.style.transform ? -THRESHOLD : 0; // preserve open state
      isDragging = true;
      row.classList.add('no-transition');
    }, {passive:true});

    row.addEventListener('touchmove', e => {
      if (!isDragging) return;
      const dx = e.touches[0].clientX - startX;
      const newX = currentX + dx;
      if (newX > 0) return; // can't swipe right past origin
      row.style.transform = 'translateX(' + Math.max(newX, -THRESHOLD - 16) + 'px)';
    }, {passive:true});

    row.addEventListener('touchend', () => {
      isDragging = false;
      row.classList.remove('no-transition');
      const finalX = parseFloat(row.style.transform.replace('translateX(','')) || 0;
      if (finalX < -THRESHOLD / 2) { row.style.transform = 'translateX(-' + THRESHOLD + 'px)'; openRow = row; }
      else { row.style.transform = ''; openRow = null; }
    });

    bg.addEventListener('click', () => {
      row.style.transform = '';
      openRow = null;
      onDelete(id);
    });
  });
}

function initSwipeToDelete() {
  initSwipeRows('.swipe-container', id => deleteTx(id)); // confirm() runs inside deleteTx
}

function setBtn(id,loading,label,bg) { const btn=document.getElementById(id);if(!btn)return;btn.disabled=loading;btn.style.opacity=loading?"0.6":"1";btn.textContent=loading?"Saving…":label;if(bg)btn.style.background=bg; }
function flashBtn(id,label,bg) { const btn=document.getElementById(id);if(!btn)return;btn.disabled=false;btn.style.opacity="1";btn.textContent="✓ Saved!";btn.style.background="var(--green)";setTimeout(()=>{btn.textContent=label;btn.style.background=bg||"";},1400); }

// ══ SPLIT TRANSACTION ════════════════════════════════════════
// One purchase divided across categories. Each line becomes its own normal
// transaction sharing a splitId, so Analytics/Budget see the real per-category
// amounts automatically. History groups them back into a single card.
let _splitOn = false, _splitSeq = 0, _splitEditId = null;
function _splitSetSel(id, val) { const s = document.getElementById(id); if (!s) return; s.value = String(val); if (SDD_ENHANCED.has(id)) sddSync(id); }
// Edit an existing split by reusing the Add-transaction form in "edit split" mode.
function openEditSplit(splitId) {
  const members = txs.filter(t => t.splitId === splitId);
  if (!members.length) return;
  goTo("add"); // runs setupAdd() (resets the form + split state) synchronously
  requestAnimationFrame(() => {
    setEntryType("tx");
    _splitEditId = splitId;
    const m0 = members[0], total = members.reduce((s,m)=>s+m.amount,0), d = parseDate(m0.date);
    setType(m0.type);
    document.getElementById("f-amount").value = String(total);
    document.getElementById("f-desc").value = m0.desc || m0.description || "";
    _splitSetSel("f-date-d", d.getDate()); _splitSetSel("f-date-m", d.getMonth()+1); _splitSetSel("f-date-y", d.getFullYear());
    if (!_splitOn) toggleSplit();           // turn split editor on
    const rowsEl = document.getElementById("split-rows");
    [...rowsEl.querySelectorAll(".split-row")].forEach(r => SDD_ENHANCED.delete("split-cat-"+r.id.replace("split-row-","")));
    rowsEl.innerHTML = "";                   // replace default rows with one per member
    members.forEach(m => { addSplitRow(m.category); const amt = document.getElementById("split-amt-"+(_splitSeq-1)); if (amt) amt.value = String(m.amount); });
    updateSplitRemainder();
    document.getElementById("add-page-title").textContent = "Edit Split";
    setBtn("btn-add-tx", false, "Save Split");
  });
}
function toggleSplit() {
  _splitOn = !_splitOn;
  document.getElementById("toggle-split").className = "toggle" + (_splitOn ? " on" : "");
  document.getElementById("split-editor").style.display = _splitOn ? "block" : "none";
  const catField = document.getElementById("f-category-field");
  if (catField) catField.style.display = _splitOn ? "none" : "block";
  if (_splitOn && !document.querySelector("#split-rows .split-row")) { addSplitRow(); addSplitRow(); }
  updateSplitRemainder();
}
function _splitCatOptions() {
  const cats = currentType === "Income" ? INCOME_CATS : EXPENSE_CATS;
  return cats.map(c => '<option value="' + c.e + " " + c.n + '">' + c.e + " " + c.n + '</option>').join("");
}
function addSplitRow(presetCat) {
  const i = _splitSeq++;
  const rowsEl = document.getElementById("split-rows");
  if (!rowsEl) return;
  const row = document.createElement("div");
  row.className = "split-row"; row.id = "split-row-" + i;
  row.innerHTML =
    '<select id="split-cat-' + i + '">' + _splitCatOptions() + '</select>' +
    '<input id="split-amt-' + i + '" class="split-amt" type="text" inputmode="none" placeholder="0">' +
    '<button type="button" class="split-del" onclick="removeSplitRow(' + i + ')" aria-label="Remove">×</button>';
  rowsEl.appendChild(row);
  sddEnhance("split-cat-" + i, {flex:"1", icon:true});
  if (presetCat) { const s = document.getElementById("split-cat-"+i); if (s && [...s.options].some(o=>o.value===presetCat)) { s.value = presetCat; sddSync("split-cat-"+i); } }
  const amt = document.getElementById("split-amt-" + i);
  if (amt) amt.addEventListener("input", updateSplitRemainder);
  nkpMarkInputs();
  updateSplitRemainder();
}
function removeSplitRow(i) {
  const row = document.getElementById("split-row-" + i);
  if (row) row.remove();
  SDD_ENHANCED.delete("split-cat-" + i);
  updateSplitRemainder();
}
function _splitRows() {
  return [...document.querySelectorAll("#split-rows .split-row")].map(r => {
    const i = r.id.replace("split-row-","");
    return { cat: document.getElementById("split-cat-"+i)?.value || "", amount: parseFloat(document.getElementById("split-amt-"+i)?.value) || 0 };
  });
}
function updateSplitRemainder() {
  const total = parseFloat(document.getElementById("f-amount")?.value) || 0;
  const sum = _splitRows().reduce((s,it)=>s+it.amount,0);
  const rem = Math.round((total - sum) * 100) / 100;
  const totEl = document.getElementById("split-total"); if (totEl) totEl.textContent = "฿" + fmt(total);
  const el = document.getElementById("split-remainder"); if (!el) return;
  if (Math.abs(rem) < 0.005 && total > 0) { el.className = "split-remainder ok"; el.textContent = "✓ Fully allocated — ฿0 left"; }
  else if (rem >= 0) { el.className = "split-remainder warn"; el.textContent = "฿" + fmt(rem) + " left to allocate"; }
  else { el.className = "split-remainder warn"; el.textContent = "฿" + fmt(-rem) + " over the total"; }
}
function refreshSplitCats() {
  [...document.querySelectorAll("#split-rows .split-row")].forEach(r => {
    const i = r.id.replace("split-row-","");
    const sel = document.getElementById("split-cat-"+i); if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = _splitCatOptions();
    if ([...sel.options].some(o=>o.value===prev)) sel.value = prev;
    sddSync("split-cat-"+i);
  });
}
function resetSplit() {
  _splitOn = false; _splitEditId = null;
  const rowsEl = document.getElementById("split-rows");
  if (rowsEl) { [...rowsEl.querySelectorAll(".split-row")].forEach(r => SDD_ENHANCED.delete("split-cat-"+r.id.replace("split-row-",""))); rowsEl.innerHTML = ""; }
  const ed = document.getElementById("split-editor"); if (ed) ed.style.display = "none";
  const tog = document.getElementById("toggle-split"); if (tog) tog.className = "toggle";
  const catField = document.getElementById("f-category-field"); if (catField) catField.style.display = "block";
  const btn = document.getElementById("btn-add-tx"); if (btn) { btn.disabled = false; btn.style.opacity = "1"; btn.textContent = "Add Transaction"; }
}
async function submitSplitTx() {
  const total = parseFloat(document.getElementById("f-amount").value) || 0;
  const desc = document.getElementById("f-desc").value.trim();
  const date = getDateVal("f-date-d","f-date-m","f-date-y");
  const notes = document.getElementById("f-notes").value.trim();
  if (!total || total <= 0) { showToast("Enter a valid amount"); return; }
  if (!desc) { showToast("Enter a description"); return; }
  const items = _splitRows().filter(it => it.amount > 0 && it.cat);
  if (items.length < 2) { showToast("Add at least 2 split categories"); return; }
  const sum = items.reduce((s,it)=>s+it.amount,0);
  if (Math.abs(sum - total) > 0.01) { showToast("Splits must add up to ฿"+fmt(total)); return; }
  setBtn("btn-add-tx",true,"Add Transaction");
  const editing = !!_splitEditId;
  const splitId = editing ? _splitEditId : ("split-" + Date.now());
  const oldMembers = editing ? txs.filter(t => t.splitId === splitId) : [];
  const base = Date.now();
  const newTxs = items.map((it,idx) => ({ id: base + idx, date, type: currentType, category: it.cat, desc, amount: it.amount, notes, splitId }));
  if (editing) { const oldIds = new Set(oldMembers.map(m=>m.id)); txs = txs.filter(t => !oldIds.has(t.id)); unsyncedIds = unsyncedIds.filter(uid => !oldIds.has(uid)); }
  newTxs.forEach(t => txs.push(t)); saveTxs();
  if (settings.sheetsUrl && settings.autosync) {
    setSyncStatus("syncing");
    if (editing) { for (const m of oldMembers) { await Promise.race([postToSheets("delete_transaction",{rowId:m.rowId,data:{desc:m.desc||"",amount:m.amount}}), new Promise(r=>setTimeout(()=>r(false),5000))]); } }
    const ok = await Promise.race([postToSheets("add_transactions_bulk",{data:newTxs}), new Promise(r=>setTimeout(()=>r(false),8000))]);
    if (ok) { showToast(editing?"Split updated + synced ✓":"Split added + synced ✓"); setSyncStatus("ok"); }
    else { newTxs.forEach(t=>unsyncedIds.push(t.id)); showToast("Saved locally — will sync later"); setSyncStatus("error"); }
  } else showToast(editing ? "Split updated ✓" : ("Split saved ✓ ("+items.length+" categories)"));
  localStorage.setItem("ft_unsynced",JSON.stringify(unsyncedIds));
  const wasEditing = editing; _splitEditId = null;
  flashBtn("btn-add-tx","Add Transaction","var(--slate-900)"); await delay(900); goTo(wasEditing ? "history" : "home");
}
async function deleteSplitGroup(splitId) {
  const members = txs.filter(t => t.splitId === splitId);
  if (!members.length) return;
  const total = members.reduce((s,m)=>s+m.amount,0);
  if (!(await appConfirm({title:"Delete this split?", message:members.length+" linked transactions (฿"+fmt(total)+") will be removed.", okText:"Delete all", cancelText:"Cancel", danger:true}))) return;
  const ids = new Set(members.map(m=>m.id));
  txs = txs.filter(t => !ids.has(t.id));
  unsyncedIds = unsyncedIds.filter(uid => !ids.has(uid));
  localStorage.setItem("ft_unsynced", JSON.stringify(unsyncedIds));
  saveTxs(); renderHistory(); renderHome();
  if (settings.sheetsUrl) {
    setSyncStatus("syncing");
    let allOk = true;
    for (const m of members) { const ok = await Promise.race([postToSheets("delete_transaction",{rowId:m.rowId,data:{date:m.date,desc:m.desc||"",amount:m.amount}}), new Promise(r=>setTimeout(()=>r(false),5000))]); if(!ok) allOk=false; }
    setSyncStatus(allOk?"ok":"error");
  }
  showToast("Split deleted");
}

async function submitTx() {
  if(document.getElementById("btn-add-tx").disabled)return;
  if (_splitOn) { return submitSplitTx(); }
  const amount=parseFloat(document.getElementById("f-amount").value),desc=document.getElementById("f-desc").value.trim(),date=getDateVal("f-date-d","f-date-m","f-date-y"),cat=document.getElementById("f-category").value,notes=document.getElementById("f-notes").value.trim();
  if(!amount||amount<=0){showToast("Enter a valid amount");return;} if(!desc){showToast("Enter a description");return;}
  setBtn("btn-add-tx",true,"Add Transaction");
  const tx={id:Date.now(),date,type:currentType,category:cat,desc,amount,notes}; txs.push(tx); saveTxs();
  if (isRecurring) {
    const existing = RECURRING.findIndex(r => r.desc === desc && r.category === cat);
    const recEntry = {id:tx.id, desc, category:cat, amount, type:currentType, notes};
    if (existing >= 0) RECURRING[existing] = recEntry; else RECURRING.push(recEntry);
    saveRecurring();
    showToast("Added as recurring ✓");
  }
  if(settings.sheetsUrl&&settings.autosync){setSyncStatus("syncing");const ok=await Promise.race([postToSheets("add_transaction",{data:{...tx}}),new Promise(r=>setTimeout(()=>r(false),6000))]);if(ok){showToast("Added + synced ✓");setSyncStatus("ok");}else{unsyncedIds.push(tx.id);localStorage.setItem("ft_unsynced",JSON.stringify(unsyncedIds));showToast("Saved locally — will sync later");setSyncStatus("error");}}
  else showToast("Transaction added ✓");
  flashBtn("btn-add-tx","Add Transaction","var(--slate-900)"); await delay(900); goTo("home");
}

async function submitGoal() {
  if(document.getElementById("btn-add-goal").disabled)return;
  const name=document.getElementById("g-name").value.trim(),target=parseFloat(document.getElementById("g-target").value)||0,saved=parseFloat(document.getElementById("g-saved").value)||0,monthly=parseFloat(document.getElementById("g-monthly").value)||0,due=safeDate(getMonthVal("g-due-m","g-due-y")),colorVal=document.getElementById("g-color").value.split(",");
  if(!name){showToast("Enter a goal name");return;} if(!target||target<=0){showToast("Enter a target amount");return;}
  setBtn("btn-add-goal",true,"Add Goal","var(--green)");
  const category=document.getElementById("g-category").value||"💰 Other";
  const newGoal={id:Date.now(),icon:name.match(/^\p{Emoji}/u)?.[0]||"🎯",name:name.replace(/^\p{Emoji}\s*/u,""),saved,target,monthly,color:colorVal[0],bg:colorVal[1]||"var(--slate-100)",due,category,spends:[]};
  GOALS.push(newGoal); saveGoals();
  if(settings.sheetsUrl&&settings.autosync){setSyncStatus("syncing");const ok=await Promise.race([postToSheets("add_goal",{data:{name,target,saved,monthly,due,color:colorVal[0]}}),new Promise(r=>setTimeout(()=>r(false),6000))]);if(ok){showToast("Goal added + synced ✓");setSyncStatus("ok");}else{showToast("Saved locally — sync timed out");setSyncStatus("error");}}
  else showToast("Goal saved ✓");
  flashBtn("btn-add-goal","Add Goal","var(--green)"); await delay(900); goTo("goals");
}

async function submitInst() {
  if(document.getElementById("btn-add-inst").disabled)return;
  const name=document.getElementById("i-name").value.trim(),total=parseFloat(document.getElementById("i-total").value)||0,monthly=parseFloat(document.getElementById("i-monthly").value)||0,totalMo=parseInt(document.getElementById("i-total-mo").value)||0,paid=parseInt(document.getElementById("i-paid").value)||0,cat=document.getElementById("i-category").value,color=document.getElementById("i-color").value;
  if(!name){showToast("Enter an item name");return;} if(!total||total<=0){showToast("Enter a total amount");return;} if(!monthly||monthly<=0){showToast("Enter monthly payment");return;} if(!totalMo||totalMo<=0){showToast("Enter total months");return;}
  setBtn("btn-add-inst",true,"Add Instalment","var(--indigo)");
  const startDate=getDateVal("i-start-d","i-start-m","i-start-y");
  INSTALLMENTS.push({id:Date.now(),icon:name.match(/^\p{Emoji}/u)?.[0]||"📦",name:name.replace(/^\p{Emoji}\s*/u,""),cat,total,monthly,paid:Math.min(paid,totalMo),total_mo:totalMo,color,startDate}); saveInsts();
  if(settings.sheetsUrl&&settings.autosync){setSyncStatus("syncing");const ok=await Promise.race([postToSheets("add_installment",{data:{name,category:cat,total,monthly,startDate,totalMonths:totalMo,monthsPaid:paid}}),new Promise(r=>setTimeout(()=>r(false),6000))]);if(ok){showToast("Instalment added + synced ✓");setSyncStatus("ok");}else{showToast("Saved locally — sync timed out");setSyncStatus("error");}}
  else showToast("Instalment saved ✓");
  flashBtn("btn-add-inst","Add Instalment","var(--indigo)"); await delay(900); goTo("installments");
}

// ══ SHEETS SYNC ═══════════════════════════════════════════════
async function postToSheets(action,payload) {
  if(!settings.sheetsUrl)return false;
  try { const res=await fetch(settings.sheetsUrl,{method:"POST",body:JSON.stringify({action,...payload}),headers:{"Content-Type":"text/plain"}}); const data=await res.json(); return !data.error; } catch{return false;}
}
async function rebuildInstallmentLog() {
  if(!settings.sheetsUrl){showToast("Add Sheets URL in Settings first");return;}
  const sub=document.getElementById("rebuild-log-sub"); const prev=sub?sub.textContent:"";
  if(sub)sub.textContent="Rebuilding…";
  setSyncStatus("syncing");
  const ok=await Promise.race([postToSheets("rebuild_installment_log",{}),new Promise(r=>setTimeout(()=>r(false),10000))]);
  if(ok){setSyncStatus("ok");showToast("Instalment log rebuilt ✓");if(sub)sub.textContent="Regenerate the log sheet & clear orphan rows";}
  else{setSyncStatus("error");showToast("Rebuild failed — check your URL");if(sub)sub.textContent=prev;}
}
async function manualSync() {
  if(!settings.sheetsUrl){showToast("Add Sheets URL in Settings first");goTo("settings");return;}
  const pending=txs.filter(t=>unsyncedIds.includes(t.id)); if(!pending.length){showToast("Everything is already synced ✓");return;}
  setSyncStatus("syncing"); showToast("Syncing "+pending.length+" transactions…");
  const ok=await postToSheets("add_transactions_bulk",{data:pending});
  if(ok){unsyncedIds=[];localStorage.setItem("ft_unsynced",JSON.stringify([]));settings.lastSync=new Date().toISOString();saveSettings();setSyncStatus("ok");showToast(pending.length+" transactions synced ✓");document.getElementById("last-sync-label").textContent="Last pushed: just now";}
  else{setSyncStatus("error");showToast("Sync failed — check your URL");}
}
async function testConnection() {
  const url=document.getElementById("sheets-url").value.trim(); if(!url){document.getElementById("conn-status").textContent="Enter a URL first";return;}
  settings.sheetsUrl=url; saveSettings(); document.getElementById("conn-status").textContent="Testing…";
  try{const res=await fetch(url+"?action=ping"),data=await res.json();if(data.status==="ok"){document.getElementById("conn-status").textContent="✓ Connected — "+data.timestamp;setSyncStatus("ok");}else document.getElementById("conn-status").textContent="✗ Unexpected response";}
  catch{document.getElementById("conn-status").textContent="✗ Connection failed — check URL";}
}
function setSyncStatus(status) {
  const bar=document.getElementById("sync-bar"),dot=document.getElementById("sync-dot"),msg=document.getElementById("sync-msg");
  if(!settings.sheetsUrl){bar.classList.add("hidden");return;}
  bar.classList.remove("hidden","error"); dot.classList.remove("pulse","red");
  if(status==="ok")msg.textContent="Synced with Google Sheets";
  else if(status==="syncing"){dot.classList.add("pulse");msg.textContent="Syncing…";}
  else if(status==="error"){bar.classList.add("error");dot.classList.add("red");msg.textContent="Sync failed — tap to retry";}
}
function updateSyncBar() { setSyncStatus(unsyncedIds.length?"error":"ok"); }

// ══ SETTINGS ══════════════════════════════════════════════════
function renderSettings() {
  document.getElementById("sheets-url").value=settings.sheetsUrl||"";
  document.getElementById("toggle-autosync").className="toggle"+(settings.autosync?" on":"");
  document.getElementById("toggle-pin").className="toggle"+(settings.pinEnabled?" on":"");
  document.getElementById("toggle-notif").className="toggle"+(settings.notif?" on":"");
  const tnb=document.getElementById("toggle-notif-budget"); if(tnb) tnb.className="toggle"+(settings.notifBudget?" on":"");
  const tnl=document.getElementById("toggle-notif-log");    if(tnl) tnl.className="toggle"+(settings.notifLog?" on":"");
  const tng=document.getElementById("toggle-notif-goal");   if(tng) tng.className="toggle"+(settings.notifGoal?" on":"");
  applyDarkMode();
  if(settings.lastSync)document.getElementById("last-sync-label").textContent="Last pushed: "+new Date(settings.lastSync).toLocaleString();
  if(settings.lastPull)document.getElementById("last-pull-label").textContent="Last pulled: "+new Date(settings.lastPull).toLocaleString();
  if(Notification.permission==="granted")document.getElementById("notif-status").textContent="✓ Notifications enabled";
}
function toggleSetting(key) {
  if(key==="autosync")settings.autosync=!settings.autosync;
  if(key==="pin")settings.pinEnabled=!settings.pinEnabled;
  if(key==="notif"){settings.notif=!settings.notif;if(settings.notif)requestNotifPermission();}
  if(key==="notifBudget") settings.notifBudget = !settings.notifBudget;
  if(key==="notifLog")    settings.notifLog    = !settings.notifLog;
  if(key==="notifGoal")   settings.notifGoal   = !settings.notifGoal;
  saveSettings(); renderSettings();
}
async function requestNotifPermission() {
  if(!("Notification" in window)){document.getElementById("notif-status").textContent="Not supported";return;}
  const perm=await Notification.requestPermission(); document.getElementById("notif-status").textContent=perm==="granted"?"✓ Notifications enabled":"✗ Permission denied";
}
function exportData() {
  const blob=new Blob([JSON.stringify({transactions:txs,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="fintrack_export.json";a.click();
}
function exportCSV() {
  const esc = v => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
  const headers = ["Date","Type","Category","Description","Amount","Notes","From Goal","Goal Name","Split ID"];
  const lines = [headers.map(esc).join(",")];
  txs.forEach(t => {
    lines.push([
      esc(t.date || ""),
      esc(t.type || ""),
      esc((t.category || "").replace(/^\S+\s/, "")),
      esc(t.desc || t.description || ""),
      (Number(t.amount) || 0),                 // unquoted → spreadsheets read it as a number
      esc(t.notes || ""),
      esc(t.fromGoal ? "Yes" : "No"),
      esc(t.goalName || ""),
      esc(t.splitId || "")
    ].join(","));
  });
  // Lead with a UTF-8 BOM so Excel renders Thai text, emoji and ฿ correctly
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  const now = new Date();
  const stamp = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fintrack_transactions_" + stamp + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showToast("CSV exported ✓ (" + txs.length + " transactions)");
}
async function confirmClearGoals() { if(await appConfirm({title:"Delete all goals?", message:"Every goal will be removed. This does not affect Google Sheets.", okText:"Delete all", danger:true})){GOALS.length=0;localStorage.removeItem("ft_goals");showToast("Goals cleared");goTo("goals");} }
async function confirmClearInsts() { if(await appConfirm({title:"Delete all instalments?", message:"Every instalment plan will be removed. This does not affect Google Sheets.", okText:"Delete all", danger:true})){INSTALLMENTS.length=0;localStorage.removeItem("ft_insts");showToast("Instalments cleared");goTo("installments");} }
async function confirmClear() { if(await appConfirm({title:"Delete all local transactions?", message:"All transactions stored on this device will be erased. Your Google Sheets data is safe.", okText:"Delete all", danger:true})){localStorage.removeItem("ft_txs");localStorage.removeItem("ft_unsynced");txs=[];unsyncedIds=[];saveTxs();showToast("Local data cleared");goTo("home");} }
document.getElementById("sheets-url").addEventListener("blur",function(){settings.sheetsUrl=this.value.trim();saveSettings();updateSyncBar();});

// ── Re-lock on return from background ───────────────────────
// Uses a 60-second grace period — switching tabs briefly won't re-lock
let _hiddenAt = null;
const LOCK_GRACE_MS = 60000; // 60 seconds

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    _hiddenAt = Date.now();
  } else {
    if (!settings.pinEnabled) return;
    if (_hiddenAt === null) return;
    const away = Date.now() - _hiddenAt;
    _hiddenAt = null;
    if (away >= LOCK_GRACE_MS) {
      // Re-lock: show PIN screen
      pinBuffer = "";
      pinMode = "enter";
      document.getElementById("pin-sub").textContent = "Enter your PIN";
      document.getElementById("pin-error").textContent = "";
      updatePinDots();
      document.getElementById("pin-screen").classList.remove("hidden");
    }
  }
});

function setChartPeriod(period, btn) {
  chartPeriod = period;
  document.querySelectorAll('.period-pill').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');
  renderSpendingChart();
}

// ══ BUDGET ════════════════════════════════════════════════════
let BUDGETS = JSON.parse(localStorage.getItem("ft_budgets") || "[]");
if (!BUDGETS.length) BUDGETS = [];
function saveBudgets() { localStorage.setItem("ft_budgets", JSON.stringify(BUDGETS)); }

async function fetchBudgetsFromSheets(silent = false) {
  if(!settings.sheetsUrl)return false;
  try{const res=await fetch(settings.sheetsUrl+"?action=get_budgets"),data=await res.json();if(data.budgets&&Array.isArray(data.budgets)&&data.budgets.length){BUDGETS=data.budgets;saveBudgets();return true;}return false;}
  catch{return false;}
}
async function syncBudgetsToSheets() {
  if(!settings.sheetsUrl)return false;
  return await Promise.race([postToSheets("save_budgets",{budgets:BUDGETS}),new Promise(r=>setTimeout(()=>r(false),6000))]);
}

let budgetYear = new Date().getFullYear();
let budgetMonth = new Date().getMonth();
let editBudgetIdx = -1;
let budgetDropdownOpen = false;

// ── Budget period picker ──────────────────────────────────────
function toggleBudgetDropdown() {
  budgetDropdownOpen = !budgetDropdownOpen;
  const picker = document.getElementById("budget-picker");
  const chip   = document.getElementById("budget-filter-chip");
  picker.classList.toggle("hidden", !budgetDropdownOpen);
  chip.classList.toggle("open", budgetDropdownOpen);
  if (budgetDropdownOpen) { buildPeriodSelects("budget-sel-month", "budget-sel-year", budgetMonth, budgetYear); sddEnhance("budget-sel-year"); sddEnhance("budget-sel-month"); }
}
function closeBudgetDropdown() {
  budgetDropdownOpen = false;
  document.getElementById("budget-picker").classList.add("hidden");
  document.getElementById("budget-filter-chip").classList.remove("open");
}
function applyBudgetPicker() {
  budgetYear  = parseInt(document.getElementById("budget-sel-year").value);
  budgetMonth = parseInt(document.getElementById("budget-sel-month").value);
  closeBudgetDropdown();
  renderBudget();
}
function budgetGoToday() {
  const now = new Date();
  budgetMonth = now.getMonth();
  budgetYear  = now.getFullYear();
  closeBudgetDropdown();
  renderBudget();
}

function renderBudget() {
  const label = MO[budgetMonth] + " " + budgetYear;
  document.getElementById("budget-filter-label").textContent  = label;
  document.getElementById("budget-viewing-label").textContent = "Viewing " + label;

  const monthTxArr = txs.filter(t => {
    const d = parseDate(t.date);
    return d.getMonth() === budgetMonth && d.getFullYear() === budgetYear && t.type === "Expense" && !isGoalSpend(t);
  });
  const totalSpent  = monthTxArr.reduce((s, t) => s + t.amount, 0);
  const totalBudget = BUDGETS.reduce((s, b) => s + b.limit, 0);
  const totalPct    = totalBudget > 0 ? Math.min(Math.round(totalSpent / totalBudget * 100), 100) : 0;
  const ovColor     = totalPct >= 100 ? "var(--red)" : totalPct >= 80 ? "var(--amber)" : "var(--teal)";
  document.getElementById("budget-overview").innerHTML =
    '<div class="budget-ov-row"><span class="budget-ov-lbl">Total spent</span><span class="budget-ov-val">' + fmt(totalSpent) + '</span></div>' +
    '<div class="budget-ov-row"><span class="budget-ov-lbl">Total budget</span><span class="budget-ov-val">' + fmt(totalBudget) + '</span></div>' +
    '<div class="budget-total-bar"><div class="budget-total-fill" style="width:' + totalPct + '%;background:' + ovColor + '"></div></div>' +
    '<div style="display:flex;justify-content:space-between;font-size:10px;color:var(--slate-400);margin-top:5px"><span>' + totalPct + '% used</span><span>' + fmt(Math.max(totalBudget - totalSpent, 0)) + ' remaining</span></div>';
  if (!BUDGETS.length) {
    document.getElementById("budget-grid").innerHTML = '<div class="empty-state">No budgets set — tap below to add one</div>';
    return;
  }
  document.getElementById("budget-grid").innerHTML = BUDGETS.map((b, idx) => {
    const spent = monthTxArr.filter(t => (t.category || "").includes(b.cat.replace(/^\S+\s/, ""))).reduce((s, t) => s + t.amount, 0);
    const pct   = b.limit > 0 ? Math.min(Math.round(spent / b.limit * 100), 100) : 0;
    const color = pct >= 100 ? "var(--red)" : pct >= 80 ? "var(--amber)" : "var(--teal)";
    const emoji = b.cat.split(" ")[0];
    const catName = b.cat.replace(/^\S+\s/, "");
    // Sparkline: last 6 months of spending for this category
    const sparkData = [], sparkLabels = [];
    for (let i=5;i>=0;i--) {
      const d=new Date(budgetYear,budgetMonth-i,1);
      const mo=d.getMonth(),yr=d.getFullYear();
      sparkLabels.push(MO[mo].slice(0,3)+" "+String(yr).slice(2));
      sparkData.push(txs.filter(t=>{const td=parseDate(t.date);return td.getMonth()===mo&&td.getFullYear()===yr&&t.type==="Expense"&&!isGoalSpend(t)&&(t.category||"").includes(catName);}).reduce((s,t)=>s+t.amount,0));
    }
    const sparkMax=Math.max(...sparkData,1);
    const sparkW=80,sparkH=24,barW=9,barGap=4;
    const sparkUid = "sp-"+idx+"-"+budgetYear+budgetMonth;
    const sparkSvg='<div class="spark-bars" id="'+sparkUid+'" style="position:relative;display:inline-block;width:'+sparkW+'px;height:'+sparkH+'px">'+
      sparkData.map((v,i)=>{
        const h=Math.max(2,Math.round((v/sparkMax)*(sparkH-2)));
        const x=i*(barW+barGap), y=sparkH-h;
        const isLast=(i===sparkData.length-1);
        const tipId = sparkUid+"-t"+i;
        return '<div style="position:absolute;left:'+x+'px;bottom:0;width:'+barW+'px;height:'+sparkH+'px;display:flex;flex-direction:column;justify-content:flex-end" onclick="showSparkTip(\"'+tipId+'\")">'+
          '<div class="spark-tip" id="'+tipId+'">'+sparkLabels[i]+'\n'+fmt(v)+'</div>'+
          '<div style="width:'+barW+'px;height:'+h+'px;border-radius:2px;background:'+( isLast?color:"var(--slate-300)")+'"></div>'+
        '</div>';
      }).join("")+'</div>';
    return '<div class="budget-card">' +
      '<div class="budget-card-top">' +
        '<div class="budget-cat">' + emoji + ' ' + b.cat.replace(/^\S+\s/, "") + '</div>' +
        '<div style="display:flex;align-items:center;gap:8px">' +
          '<span class="budget-pct" style="color:' + color + '">' + pct + '%</span>' +
          '<button class="budget-edit-btn" onclick="openBudgetEditModal(' + idx + ')" aria-label="Edit">' + EDIT_PENCIL_SM + '</button>' +
          '<button style="background:var(--red-bg);border:none;border-radius:6px;padding:3px 8px;font-size:10px;font-weight:600;color:var(--red);cursor:pointer" onclick="deleteBudget(' + idx + ')">✕</button>' +
        '</div>' +
      '</div>' +
      '<div class="budget-bar"><div class="budget-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
      '<div class="budget-amounts"><span class="budget-spent">' + fmt(spent) + ' spent</span><span>limit: ' + fmt(b.limit) + '</span></div>' +
      '<div class="sparkline-wrap"><div class="sparkline-lbl"><span>Last 6 months</span><span>'+MO[(budgetMonth+11)%12]+' → '+MO[budgetMonth]+'</span></div>'+sparkSvg+'</div>' +
      (pct >= 80 ? '<div style="margin-top:8px;font-size:10px;font-weight:600;color:' + color + ';background:' + (pct>=100?'var(--red-bg)':'var(--amber-bg)') + ';padding:5px 8px;border-radius:6px">' + (pct>=100?'⚠️ Over budget!':'⚠️ Approaching limit') + '</div>' : '') +
    '</div>';
  }).join("");
  renderBudgetTrend();
}

let budgetTrendMo = 6;

function setBudgetTrendMo(n, btn) {
  budgetTrendMo = n;
  btn.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("on"));
  btn.classList.add("on");
  renderBudgetTrend();
}

function renderBudgetTrend() {
  const wrap = document.getElementById("budget-trend-wrap");
  const el   = document.getElementById("budget-trend-lines");
  if (!wrap || !el || !BUDGETS.length) { if(wrap) wrap.style.display="none"; return; }
  wrap.style.display = "block";
  const n = budgetTrendMo;
  const W = 260, H = 72, padT = 16, padB = 16;
  const chartH = H - padT - padB;

  el.innerHTML = BUDGETS.map(b => {
    const catName = b.cat.replace(/^\S+\s/, "");
    const emoji   = b.cat.split(" ")[0];
    // Collect n months of data
    const months = [], amounts = [], labels = [];
    for (let i = n - 1; i >= 0; i--) {
      const d  = new Date(budgetYear, budgetMonth - i, 1);
      const mo = d.getMonth(), yr = d.getFullYear();
      labels.push(MO[mo].slice(0,3));
      amounts.push(txs.filter(t => {
        const td = parseDate(t.date);
        return td.getMonth()===mo && td.getFullYear()===yr && t.type==="Expense" && !isGoalSpend(t) && (t.category||"").includes(catName);
      }).reduce((s,t)=>s+t.amount, 0));
    }
    const maxAmt = Math.max(...amounts, b.limit, 1);
    const limitY = padT + (1 - b.limit/maxAmt) * chartH;
    // Build SVG points
    const pts = amounts.map((v,i) => {
      const x = (i/(n-1)) * W;
      const y = padT + (1 - v/maxAmt) * chartH;
      return {x, y, v};
    });
    const lineStr = pts.map((p,i) => (i===0?'M':'L') + p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
    const areaStr = pts.map((p,i) => (i===0?'M':'L') + p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ')
      + ' L'+W.toFixed(1)+','+(padT+chartH)+' L0,'+(padT+chartH)+' Z';
    // Color of last point
    const lastPct = b.limit > 0 ? Math.round(amounts[amounts.length-1]/b.limit*100) : 0;
    const lineColor = lastPct>=100?"var(--red)":lastPct>=80?"var(--amber)":"var(--teal)";
    // Axis labels — show first, middle, last only
    // Format label: full amount for last, short (k) for others
    function fmtLbl(v, isLast) {
      if (isLast) return '฿' + (v>=1000?(v/1000).toFixed(v%1000===0?0:1)+'k':Math.round(v));
      return v>=1000?(v/1000).toFixed(v%1000===0?0:1)+'k':Math.round(v);
    }
    // Per-point dot color
    function dotColor(v) {
      const p2 = b.limit>0?Math.round(v/b.limit*100):0;
      return p2>=100?"var(--red)":p2>=80?"var(--amber)":lineColor;
    }
    const axisLabels = labels.map((l,i) => {
      const isLast = i===n-1;
      const show = n<=6 || i===0 || i===Math.floor((n-1)/2) || isLast;
      return '<text x="'+(i/(n-1)*W).toFixed(1)+'" y="'+(H-1)+'" font-size="7.5" fill="'+(isLast?lineColor:'var(--slate-400)')+'" font-weight="'+(isLast?'bold':'normal')+'" text-anchor="middle">'+(show?l:'')+'</text>';
    }).join('');
    const dataLabels = pts.map((p,i) => {
      const isLast = i===n-1;
      const dc = dotColor(p.v);
      const lbl = fmtLbl(p.v, isLast);
      const labelY = (p.y - 6).toFixed(1);
      return '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="'+(isLast?3.5:2.5)+'" fill="'+dc+'" opacity="'+(isLast?1:0.7)+'"/>' +
        (isLast ? '<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="1.5" fill="var(--white)"/>' : '') +
        '<text x="'+p.x.toFixed(1)+'" y="'+labelY+'" font-size="'+(isLast?8:7)+'" font-weight="'+(isLast?'bold':'normal')+'" fill="'+(isLast?dc:'var(--slate-400)')+'" text-anchor="middle">'+lbl+'</text>';
    }).join('');
    return '<div class="budget-line-row">' +
      '<div class="budget-line-hd">' +
        '<span class="budget-line-name">' + emoji + ' ' + catName + '</span>' +
        '<span class="budget-line-limit">limit ' + fmt(b.limit) + '</span>' +
      '</div>' +
      '<svg width="100%" height="'+H+'" viewBox="0 0 '+W+' '+H+'" style="display:block;overflow:visible">' +
        '<defs><linearGradient id="btg'+b.cat.replace(/\W/g,'')+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="'+lineColor+'" stop-opacity="0.15"/><stop offset="100%" stop-color="'+lineColor+'" stop-opacity="0"/></linearGradient></defs>' +
        '<path d="'+areaStr+'" fill="url(#btg'+b.cat.replace(/\W/g,'')+')"/>' +
        '<line x1="0" y1="'+limitY.toFixed(1)+'" x2="'+W+'" y2="'+limitY.toFixed(1)+'" stroke="var(--red)" stroke-width="1" stroke-dasharray="4,3" opacity="0.5"/>' +
        '<text x="2" y="'+(limitY-2).toFixed(1)+'" font-size="7" fill="var(--red)" opacity="0.7">limit</text>' +
        '<path d="'+lineStr+'" fill="none" stroke="'+lineColor+'" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
        dataLabels +
        axisLabels +
      '</svg>' +
    '</div>';
  }).join('<div style="height:1px;background:var(--slate-100);margin:2px 0 14px"></div>');
}

function openBudgetEditModal(idx) {
  editBudgetIdx=idx; const b=BUDGETS[idx];
  document.getElementById("modal-budget-title").textContent="Edit budget — "+b.cat.replace(/^\S+\s/,"");
  document.getElementById("modal-budget-sub").textContent="Current limit: "+fmt(b.limit);
  document.getElementById("modal-budget-amount").value=b.limit;
  document.getElementById("modal-budget").classList.remove("hidden");
  nkpBind();
  /* keypad field: no autofocus (avoids auto-opening keypad over the form) */
}
async function confirmSetBudget() {
  if(editBudgetIdx<0)return; const val=parseFloat(document.getElementById("modal-budget-amount").value)||0;
  if(val<=0){showToast("Enter a valid amount");return;}
  BUDGETS[editBudgetIdx].limit=val; saveBudgets(); closeModal("budget"); renderBudget();
  const ok = await syncBudgetsToSheets();
  if (ok) showToast("Budget updated + synced ✓"); else showToast("Saved locally — Sheets sync failed");
}
function openBudgetAddModal() {
  const existing=BUDGETS.map(b=>b.cat),available=EXPENSE_CATS.filter(c=>!existing.includes(c.e+" "+c.n));
  if(!available.length){showToast("All categories already have a budget");return;}
  catBuildList("modal-budget-cat", available);
  document.getElementById("modal-budget-new-amount").value="";
  document.getElementById("modal-budget-add").classList.remove("hidden");
  nkpBind();
  /* keypad field: no autofocus (avoids auto-opening keypad over the form) */
}
async function confirmAddBudget() {
  const cat=document.getElementById("modal-budget-cat").value,val=parseFloat(document.getElementById("modal-budget-new-amount").value)||0;
  if(val<=0){showToast("Enter a valid amount");return;}
  BUDGETS.push({cat,limit:val}); saveBudgets(); closeModal("budget-add"); renderBudget();
  const ok = await syncBudgetsToSheets();
  if (ok) showToast("Budget added + synced ✓"); else showToast("Saved locally — Sheets sync failed");
}
async function deleteBudget(idx) {
  if(await appConfirm({title:'Remove this budget?', message:'Budget for "'+BUDGETS[idx].cat.replace(/^\S+\s/,"")+'" will be removed.', okText:"Remove", danger:true})){
    BUDGETS.splice(idx,1); saveBudgets(); renderBudget();
    const ok = await syncBudgetsToSheets();
    if (ok) showToast("Budget removed + synced ✓"); else showToast("Removed locally — Sheets sync failed");
  }
}

// ══ GOAL CONTRIBUTION HISTORY ════════════════════════════════════
function toggleContribLog(idx) {
  const el  = document.getElementById("contrib-log-" + idx);
  const btn = document.getElementById("goal-hist-btn-" + idx);
  if (!el) return;
  const isOpen = el.style.maxHeight !== "0px" && el.style.maxHeight !== "";
  el.style.maxHeight = isOpen ? "0" : el.scrollHeight + "px";
  if (btn) btn.classList.toggle("open", !isOpen);
}

let editContribGoalIdx = -1, editContribIdx = -1;

function openEditContribModal(goalIdx, contribIdx) {
  editContribGoalIdx = goalIdx;
  editContribIdx     = contribIdx;
  const g = GOALS[goalIdx];
  const c = (g.contributions||[])[contribIdx];
  if (!c) return;
  document.getElementById("edit-contrib-sub").textContent = "Editing contribution for " + g.name;
  document.getElementById("edit-contrib-amount").value = c.amount;
  document.getElementById("edit-contrib-note").value   = c.note || "";
  // Build date dropdowns, preselecting the contribution's existing date
  const today = new Date();
  buildDaySelect("ec-date-d", today.getDate());
  buildMonthSelect("ec-date-m", today.getMonth()+1);
  buildYearSelect("ec-date-y", today.getFullYear(), 5, 1);
  if (c.date) {
    const p = c.date.split("-");
    if (p.length === 3) {
      const y=parseInt(p[0]), m=parseInt(p[1]), d=parseInt(p[2]);
      const dS=document.getElementById("ec-date-d"), mS=document.getElementById("ec-date-m"), yS=document.getElementById("ec-date-y");
      for(let i=0;i<dS.options.length;i++) if(parseInt(dS.options[i].value)===d){dS.selectedIndex=i;break;}
      for(let i=0;i<mS.options.length;i++) if(parseInt(mS.options[i].value)===m){mS.selectedIndex=i;break;}
      for(let i=0;i<yS.options.length;i++) if(parseInt(yS.options[i].value)===y){yS.selectedIndex=i;break;}
    }
  }
  sddEnhance("ec-date-d",{flex:"1",up:true}); sddEnhance("ec-date-m",{flex:"1.4",up:true}); sddEnhance("ec-date-y",{flex:"1.2",up:true});
  document.getElementById("modal-edit-contrib").classList.remove("hidden");
  nkpBind();
  /* keypad field: no autofocus (avoids auto-opening keypad over the form) */
}

function confirmEditContrib() {
  if (editContribGoalIdx < 0 || editContribIdx < 0) return;
  const g       = GOALS[editContribGoalIdx];
  const contribs = g.contributions || [];
  const old     = contribs[editContribIdx];
  if (!old) return;
  const newAmount = parseFloat(document.getElementById("edit-contrib-amount").value) || 0;
  const newNote   = document.getElementById("edit-contrib-note").value.trim();
  const newDate   = getDateVal("ec-date-d","ec-date-m","ec-date-y") || old.date;
  if (newAmount <= 0) { showToast("Enter a valid amount"); return; }
  // Adjust saved total by difference
  g.saved = Math.max(0, g.saved - old.amount + newAmount);
  contribs[editContribIdx] = { ...old, amount: newAmount, note: newNote, date: newDate };
  g.contributions = contribs;
  saveGoals();
  closeModal("edit-contrib");
  editContribGoalIdx = -1; editContribIdx = -1;
  renderGoals();
  showToast("Contribution updated ✓");
}

async function deleteGoalContrib(goalIdx, contribIdx) {
  if (!(await appConfirm({title:"Remove this contribution?", okText:"Remove", danger:true}))) return;
  const g = GOALS[goalIdx];
  if (!g.contributions || !g.contributions[contribIdx]) return;
  const removed = g.contributions[contribIdx];
  g.contributions.splice(contribIdx, 1);
  g.saved = Math.max(0, g.saved - removed.amount);
  saveGoals(); renderGoals();
  showToast("Contribution removed — " + fmt(removed.amount) + " deducted from saved total");
}

// ══ GOAL SPENDING ═══════════════════════════════════════════════
let spendGoalIdx = -1;

function openSpendGoalModal(idx) {
  spendGoalIdx = idx;
  const g = GOALS[idx];
  const spends = g.spends || [];
  const totalSpent = spends.reduce((s,sp)=>s+sp.amount, 0);
  const remaining = g.saved - totalSpent;
  document.getElementById("spend-goal-title").textContent = "Spend from " + g.name;
  document.getElementById("spend-goal-sub").textContent = (g.category||"") + " · " + fmt(Math.max(remaining,0)) + " remaining";
  document.getElementById("spend-goal-amount").value = "";
  document.getElementById("spend-goal-desc").value = "";
  const today = new Date();
  buildDaySelect("sg-date-d", today.getDate());
  buildMonthSelect("sg-date-m", today.getMonth()+1);
  buildYearSelect("sg-date-y", today.getFullYear(), 2, 1);
  sddEnhance("sg-date-d",{flex:"1",up:true}); sddEnhance("sg-date-m",{flex:"1.4",up:true}); sddEnhance("sg-date-y",{flex:"1.2",up:true});
  document.getElementById("modal-spend-goal").classList.remove("hidden");
  nkpBind();
  /* keypad field: no autofocus (avoids auto-opening keypad over the form) */
}

async function confirmSpendGoal() {
  if (spendGoalIdx < 0) return;
  const g = GOALS[spendGoalIdx];
  const amount = parseFloat(document.getElementById("spend-goal-amount").value) || 0;
  const desc   = document.getElementById("spend-goal-desc").value.trim() || "Spend from goal";
  const date   = getDateVal("sg-date-d","sg-date-m","sg-date-y") || toDateStr(new Date());
  if (!amount || amount <= 0) { showToast("Enter an amount"); return; }

  // Create the tagged transaction first so the spend-log entry can point at its id.
  const txId = Date.now();
  if (!g.spends) g.spends = [];
  const spendEntry = { id: txId, amount, desc, date };
  g.spends.push(spendEntry);
  saveGoals();

  const tx = {
    id: txId,
    date,
    type: "Expense",
    category: g.category || "💰 Other",
    desc,
    amount,
    notes: "",
    fromGoal: true,
    goalId: g.id,
    goalName: g.name
  };
  txs.push(tx); saveTxs();

  closeModal("spend-goal");
  spendGoalIdx = -1;
  renderGoals();
  showToast("Spend recorded ✓");

  // Sync to Sheets
  if (settings.sheetsUrl && settings.autosync) {
    setSyncStatus("syncing");
    const ok = await Promise.race([
      postToSheets("add_transaction", { data: { ...tx } }),
      new Promise(r => setTimeout(()=>r(false), 6000))
    ]);
    if (ok) { setSyncStatus("ok"); } else { setSyncStatus("error"); }
  }
}

async function deleteGoalSpend(goalIdx, spendIdx) {
  if (!(await appConfirm({title:"Remove this spend entry?", okText:"Remove", danger:true}))) return;
  const g = GOALS[goalIdx];
  if (!g.spends) return;
  const spend = g.spends[spendIdx];
  // Remove from goal spends
  g.spends.splice(spendIdx, 1);
  saveGoals();
  // Remove the linked tx by its own id (precise — no amount/date collision risk).
  if (spend) {
    const before = txs.length;
    txs = txs.filter(t => t.id !== spend.id);
    if (txs.length !== before) saveTxs();
  }
  renderGoals();
  showToast("Spend removed ✓");
}

// ══ IN-APP NOTIFICATIONS ════════════════════════════════════════
function checkInAppNotifications() {
  try {
  const el = document.getElementById("notif-banners");
  if (!el) return;
  const banners = [];
  const now = new Date();
  const curMo = now.getMonth(), curYr = now.getFullYear();
  const dismissed = JSON.parse(sessionStorage.getItem("dismissed_notifs") || "[]");

  // Budget alerts (80% / 100%)
  if (settings.notifBudget && BUDGETS.length) {
    const monthArr = txs.filter(t => {
      const d = parseDate(t.date);
      return d.getMonth()===curMo && d.getFullYear()===curYr && t.type==="Expense" && !isGoalSpend(t);
    });
    BUDGETS.forEach(b => {
      const catName = b.cat.replace(/^\S+\s/, "");
      const spent = monthArr.filter(t=>(t.category||"").includes(catName)).reduce((s,t)=>s+t.amount,0);
      const pct = b.limit > 0 ? Math.round(spent/b.limit*100) : 0;
      const id = "budget_" + b.cat;
      if (pct >= 100 && !dismissed.includes(id+"_100")) {
        banners.push({id:id+"_100", type:"alert", icon:"ti-alert-triangle", iconBg:"var(--red-border)",
          title:"Over budget — " + b.cat.replace(/^\S+\s/,""),
          sub:"You've spent " + fmt(spent) + " of your " + fmt(b.limit) + " limit (" + pct + "%)"});
      } else if (pct >= 80 && !dismissed.includes(id+"_80")) {
        banners.push({id:id+"_80", type:"warn", icon:"ti-alert-triangle", iconBg:"var(--amber-border)",
          title:"Budget alert — " + b.cat.replace(/^\S+\s/,""),
          sub:"You've spent " + fmt(spent) + " of your " + fmt(b.limit) + " limit (" + pct + "%). " + fmt(b.limit - spent) + " remaining."});
      }
    });
  }

  // Log reminder — no tx in last 2 days
  if (settings.notifLog) {
    const id = "log_reminder";
    if (!dismissed.includes(id)) {
      const sortedTxs = txs.filter(t=>t.type==="Expense").map(t=>parseDate(t.date)).sort((a,b)=>b-a);
      const lastTx = sortedTxs[0];
      const daysSince = lastTx ? Math.floor((now - lastTx) / 86400000) : 999;
      if (daysSince >= 2) {
        banners.push({id, type:"warn", icon:"ti-clock", iconBg:"var(--amber-border)",
          title:"No expenses logged recently",
          sub:"It's been " + daysSince + " day" + (daysSince!==1?"s":"") + " since your last transaction. Don't forget to log your expenses."});
      }
    }
  }

  // Goal savings reminder + progress milestones
  if (settings.notifGoal && GOALS.length) {
    GOALS.forEach(g => {
      const pct = g.target > 0 ? Math.round((g.saved / g.target) * 100) : 0;

      // 100% — goal reached
      if (pct >= 100) {
        const id = "goal_done_" + g.name;
        if (!dismissed.includes(id)) {
          banners.push({id, type:"alert", icon:"ti-trophy", iconBg:"var(--green-border)",
            title:"Goal reached! — " + g.name,
            sub:"You've hit your target of " + fmt(g.target) + ". Well done!"});
        }
        return;
      }

      // 75% milestone
      if (pct >= 75) {
        const id = "goal_75_" + g.name;
        if (!dismissed.includes(id)) {
          banners.push({id, type:"info", icon:"ti-flag", iconBg:"var(--green-border)",
            title:"75% there — " + g.name,
            sub:fmt(g.saved) + " of " + fmt(g.target) + " saved. " + fmt(g.target - g.saved) + " to go!"});
        }
      }

      // 50% milestone
      else if (pct >= 50) {
        const id = "goal_50_" + g.name;
        if (!dismissed.includes(id)) {
          banners.push({id, type:"info", icon:"ti-flag", iconBg:"var(--green-border)",
            title:"Halfway there — " + g.name,
            sub:fmt(g.saved) + " of " + fmt(g.target) + " saved. Keep it up!"});
        }
      }

      // No contribution this month reminder
      else {
        const id = "goal_" + g.name;
        if (!dismissed.includes(id)) {
          const contribs = g.contributions || [];
          const addedThisMonth = contribs.some(c => {
            const d = parseDate(c.date);
            return d.getMonth()===curMo && d.getFullYear()===curYr;
          });
          if (!addedThisMonth) {
            banners.push({id, type:"info", icon:"ti-flag", iconBg:"var(--green-border)",
              title:"Goal reminder — " + g.name,
              sub:"No savings added this month yet. Monthly target: " + fmt(g.monthly || 0) + "."});
          }
        }
      }
    });
  }

  if (!banners.length) { el.innerHTML = ""; return; }
  el.innerHTML = banners.map(b =>
    '<div class="notif-banner notif-' + b.type + '" id="notif-' + b.id + '">' +
      '<div class="notif-icon-wrap" style="background:' + b.iconBg + '">' +
        '<i class="ti ' + b.icon + '" style="font-size:14px" aria-hidden="true"></i>' +
      '</div>' +
      '<div class="notif-body">' +
        '<div class="notif-title">' + b.title + '</div>' +
        '<div class="notif-sub">' + b.sub + '</div>' +
      '</div>' +
      '<button class="notif-dismiss" onclick="dismissNotif(&quot;' + b.id + '&quot;)" aria-label="Dismiss">×</button>' +
    '</div>'
  ).join("");
  } catch(e) { console.warn("Notification check failed:", e); }
}

function dismissNotif(id) {
  const el = document.getElementById("notif-" + id);
  if (el) el.remove();
  const dismissed = JSON.parse(sessionStorage.getItem("dismissed_notifs") || "[]");
  dismissed.push(id);
  sessionStorage.setItem("dismissed_notifs", JSON.stringify(dismissed));
}

// ══ RECURRING TRANSACTIONS ═══════════════════════════════════
function toggleRecurring() {
  isRecurring = !isRecurring;
  const btn = document.getElementById("toggle-recurring");
  if (btn) btn.className = "toggle" + (isRecurring ? " on" : "");
}

function getPendingRecurring() {
  const now = new Date();
  const currentMo = now.getMonth(), currentYr = now.getFullYear();
  const thisMonthDescs = new Set(
    txs.filter(t => { const d = parseDate(t.date); return d.getMonth()===currentMo && d.getFullYear()===currentYr; })
       .map(t => (t.desc||t.description||"").toLowerCase())
  );
  return RECURRING.filter(r => !thisMonthDescs.has((r.desc||"").toLowerCase()));
}

function checkRecurringSuggestions() {
  const banner = document.getElementById("recurring-banner");
  const sugEl  = document.getElementById("recurring-suggestions");
  if (!banner || !sugEl) return;
  // Only show banner on the 1st day of the month
  const now = new Date();
  if (now.getDate() !== 1 || !RECURRING.length) { banner.classList.remove("show"); return; }
  const due = getPendingRecurring();
  if (!due.length) { banner.classList.remove("show"); return; }
  const total = due.reduce((s, r) => s + (r.amount||0), 0);
  sugEl.innerHTML = due.map(r =>
    '<div class="recurring-item">' +
      '<div><div class="recurring-item-name">' + (r.desc||"") + '</div>' +
      '<div class="recurring-item-amt">' + (r.category||"").replace(/^\S+\s/,"") + ' · ' + fmt(r.amount) + '</div></div>' +
      '<button class="recurring-add-btn" onclick="addRecurringNow(' + JSON.stringify(r).replace(/"/g,"&quot;") + ')">+ Add</button>' +
    '</div>'
  ).join("") +
  '<div style="margin-top:8px;display:flex;gap:6px">' +
    '<button class="recurring-add-btn" style="flex:1;padding:6px 0" onclick="logAllRecurringFromBanner()">Log all · ' + fmt(total) + '</button>' +
    '<button onclick="dismissRecurringSuggestions()" style="font-size:10px;background:none;border:none;color:var(--indigo);cursor:pointer;padding:4px 8px">Dismiss</button>' +
  '</div>';
  banner.classList.add("show");
}

async function addRecurringNow(r, overrideAmt) {
  const now = new Date();
  const date = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
  const amount = overrideAmt !== undefined ? overrideAmt : r.amount;
  const notes = r.notes ? r.notes + " · recurring" : "recurring";
  const tx = {id:Date.now(), date, type:r.type||"Expense", category:r.category, desc:r.desc, amount:amount, notes:notes};
  txs.push(tx); saveTxs();
  showToast("Logged: " + r.desc + " ✓");
  checkRecurringSuggestions();
  renderHome();
  if (settings.sheetsUrl && settings.autosync) {
    setSyncStatus("syncing");
    const ok = await Promise.race([postToSheets("add_transaction",{data:{...tx}}), new Promise(res=>setTimeout(()=>res(false),6000))]);
    if (ok) setSyncStatus("ok"); else setSyncStatus("error");
  }
}

async function logAllRecurringFromBanner() {
  const due = getPendingRecurring();
  if (!due.length) return;
  await bulkLogRecurring(due);
  dismissRecurringSuggestions();
  showToast(due.length + " recurring items logged ✓");
}

function dismissRecurringSuggestions() {
  const banner = document.getElementById("recurring-banner");
  if (banner) banner.classList.remove("show");
}

function removeRecurring(desc, category) {
  RECURRING = RECURRING.filter(r => !(r.desc===desc && r.category===category));
  saveRecurring();
  showToast("Removed from recurring");
  checkRecurringSuggestions();
  renderRecurringPage();
}

async function removeRecurringByIdx(idx) {
  const r = RECURRING[idx];
  if (!r) return;
  if (!(await appConfirm({title:"Remove recurring item?", message:'"'+(r.desc||"This item")+'" will stop appearing on your recurring list.', okText:"Remove", danger:true}))) return;
  RECURRING.splice(idx, 1);
  saveRecurring();
  showToast("Removed from recurring");
  checkRecurringSuggestions();
  renderRecurringPage();
}

// ── Recurring Page ────────────────────────────────────────────
let _recEditIdx = null; // index of item currently being amount-edited

function renderRecurringPage() {
  const list = document.getElementById("rec-page-list");
  const pendingLabel = document.getElementById("rec-pending-label");
  const logAllBtn = document.getElementById("rec-log-all-btn");
  if (!list) return;
  if (!RECURRING.length) {
    list.innerHTML = '<div class="rec-empty">No recurring items yet.<br>Mark a transaction as recurring when adding it.</div>';
    if (pendingLabel) pendingLabel.textContent = "";
    if (logAllBtn) logAllBtn.disabled = true;
    return;
  }
  const now = new Date();
  const currentMo = now.getMonth(), currentYr = now.getFullYear();
  const thisMonthDescs = new Set(
    txs.filter(t => { const d = parseDate(t.date); return d.getMonth()===currentMo && d.getFullYear()===currentYr; })
       .map(t => (t.desc||t.description||"").toLowerCase())
  );
  const pending = RECURRING.filter(r => !thisMonthDescs.has((r.desc||"").toLowerCase()));
  const pendingTotal = pending.reduce((s, r) => s + (r.amount||0), 0);
  if (pendingLabel) pendingLabel.textContent = pending.length ? pending.length + " pending · " + fmt(pendingTotal) : "All logged this month ✓";
  if (logAllBtn) logAllBtn.disabled = pending.length === 0;
  list.innerHTML = RECURRING.map((r, idx) => {
    const isLogged = thisMonthDescs.has((r.desc||"").toLowerCase());
    const isIncome = (r.type||"Expense") === "Income";
    const isEditing = (_recEditIdx === idx);
    const iconMap = {"Income":"💰","Entertainment":"🎬","Food & Dining":"🍜","Transport":"🚗","Health":"💊","Utilities":"💡","Shopping":"🛍️","Housing":"🏠","Education":"📚","Travel":"✈️"};
    const catName = (r.category||"").replace(/^\S+\s/,"");
    const icon = iconMap[catName] || (isIncome ? "💰" : "🔄");
    return '<div class="rec-page-item" id="rec-item-' + idx + '">' +
      '<div class="rec-page-icon' + (isIncome?" income":"") + '">' + icon + '</div>' +
      '<div class="rec-page-info">' +
        '<div class="rec-page-name">' + (r.desc||"") + '</div>' +
        '<div class="rec-page-cat">' + (r.category||"").replace(/^\S+\s/,"") + ' · monthly</div>' +
      '</div>' +
      '<div class="rec-page-right">' +
        (isEditing ?
          '<div class="rec-amt-edit-row">' +
            '<span style="font-size:12px;color:var(--slate-400)">฿</span>' +
            '<input class="rec-amt-input" id="rec-amt-input-' + idx + '" type="text" inputmode="none" readonly value="' + r.amount + '" />' +
            '<button class="rec-amt-confirm" onclick="confirmRecurringAmt(' + idx + ')" aria-label="confirm"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--white)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>' +
            '<button class="rec-amt-cancel" onclick="cancelRecurringAmt()" aria-label="cancel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
          '</div>' +
          '<span class="rec-was-hint">was ' + fmt(r.amount) + '</span>'
        :
          '<span class="rec-amt-display' + (isIncome?" income":"") + '" onclick="editRecurringAmt(' + idx + ')" title="Tap to edit amount">' + fmt(r.amount) + '</span>' +
          (isLogged ?
            '<span class="rec-status-logged"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Logged</span>'
          :
            '<div style="display:flex;gap:5px;align-items:center">' +
              '<span class="rec-status-pending">Pending</span>' +
              '<button class="rec-log-btn" onclick="logRecurringItem(' + idx + ')">Log</button>' +
            '</div>'
          )
        ) +
      '</div>' +
      '<button class="rec-edit-btn" onclick="openEditRecurringModal(' + idx + ')" title="Edit">' + EDIT_PENCIL + '</button>' +
      '<button class="rec-del-btn" onclick="removeRecurringByIdx(' + idx + ')" title="Remove">×</button>' +
    '</div>';
  }).join("");
  // Open the keypad directly when editing (programmatic focus alone no longer opens it)
  if (_recEditIdx !== null) {
    const inp = document.getElementById("rec-amt-input-" + _recEditIdx);
    if (inp) { nkpBindRecInput(_recEditIdx); nkpOpen(inp); }
  }
}

function editRecurringAmt(idx) {
  _recEditIdx = idx;
  renderRecurringPage();
}

function cancelRecurringAmt() {
  _recEditIdx = null;
  renderRecurringPage();
}

function confirmRecurringAmt(idx) {
  const inp = document.getElementById("rec-amt-input-" + idx);
  if (!inp) return;
  const newAmt = parseFloat(inp.value);
  if (isNaN(newAmt) || newAmt <= 0) { showToast("Enter a valid amount"); return; }
  RECURRING[idx].amount = newAmt;
  saveRecurring();
  _recEditIdx = null;
  renderRecurringPage();
  showToast("Amount updated ✓");
}

async function logRecurringItem(idx) {
  const r = RECURRING[idx];
  if (!r) return;
  await addRecurringNow(r);
  renderRecurringPage();
}

async function bulkLogRecurring(items) {
  const now = new Date();
  const date = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0") + "-" + String(now.getDate()).padStart(2,"0");
  const newTxs = items.map(r => ({
    id: Date.now() + Math.random(), date,
    type: r.type||"Expense", category: r.category,
    desc: r.desc, amount: r.amount, notes: r.notes ? r.notes + " · recurring" : "recurring"
  }));
  // Save all to localStorage first
  newTxs.forEach(tx => txs.push(tx));
  saveTxs();
  renderHome();
  // Push to Sheets as one bulk request
  if (settings.sheetsUrl && settings.autosync) {
    setSyncStatus("syncing");
    const ok = await Promise.race([
      postToSheets("add_transactions_bulk", { data: newTxs }),
      new Promise(res => setTimeout(() => res(false), 10000))
    ]);
    if (ok) {
      setSyncStatus("ok");
    } else {
      setSyncStatus("error");
      // Mark as unsynced so manual push can catch them
      newTxs.forEach(tx => { if (!unsyncedIds.includes(tx.id)) unsyncedIds.push(tx.id); });
      localStorage.setItem("ft_unsynced", JSON.stringify(unsyncedIds));
      showToast("Saved locally — sync when online");
    }
  }
}

async function logAllRecurring() {
  const due = getPendingRecurring();
  if (!due.length) return;
  await bulkLogRecurring(due);
  renderRecurringPage();
  showToast(due.length + " items logged ✓");
}

// ── Estimated Bills Page ──────────────────────────────────────
let _estEditIdx = null;   // index of bill currently being amount-edited inline
let _estAddEditIdx = -1;  // index of bill being edited in the add/edit modal, -1 = adding new

function renderEstBillsPage() {
  const list = document.getElementById("est-page-list");
  const pendingLabel = document.getElementById("est-pending-label");
  const totalVal = document.getElementById("est-total-val");
  if (!list) return;
  if (!ESTIMATED_BILLS.length) {
    list.innerHTML = '<div class="rec-empty">No estimated bills yet.<br>Add bills you know are coming — like electric or credit card — to forecast this month before they arrive.</div>';
    if (pendingLabel) pendingLabel.textContent = "";
    if (totalVal) totalVal.textContent = fmt(0);
    return;
  }
  const now = new Date();
  const currentMo = now.getMonth(), currentYr = now.getFullYear();
  const thisMonthDescs = new Set(
    txs.filter(t => { const d = parseDate(t.date); return d.getMonth()===currentMo && d.getFullYear()===currentYr && t.type==="Expense"; })
       .map(t => (t.desc||t.description||"").toLowerCase())
  );
  const pending = ESTIMATED_BILLS.filter(b => !thisMonthDescs.has((b.desc||"").toLowerCase()));
  const pendingTotal = pending.reduce((s,b)=>s+(b.amount||0), 0);
  if (totalVal) totalVal.textContent = fmt(pendingTotal);
  if (pendingLabel) pendingLabel.textContent = pending.length + " of " + ESTIMATED_BILLS.length + " still pending this month";
  list.innerHTML = ESTIMATED_BILLS.map((b, idx) => {
    const isLogged = thisMonthDescs.has((b.desc||"").toLowerCase());
    const isEditing = (_estEditIdx === idx);
    const icon = (b.category||"").match(/^\S+/)?.[0] || "🔄";
    const catName = (b.category||"").replace(/^\S+\s/, "");
    return '<div class="rec-page-item" id="est-item-' + idx + '">' +
      '<div class="rec-page-icon">' + icon + '</div>' +
      '<div class="rec-page-info">' +
        '<div class="rec-page-name">' + (b.desc||"") + '</div>' +
        '<div class="rec-page-cat">' + catName + ' · estimate</div>' +
      '</div>' +
      '<div class="rec-page-right">' +
        (isEditing ?
          '<div class="rec-amt-edit-row">' +
            '<span style="font-size:12px;color:var(--slate-400)">฿</span>' +
            '<input class="rec-amt-input" id="est-amt-input-' + idx + '" type="text" inputmode="none" readonly value="' + b.amount + '" />' +
            '<button class="rec-amt-confirm" onclick="confirmEstAmt(' + idx + ')" aria-label="confirm"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--white)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></button>' +
            '<button class="rec-amt-cancel" onclick="cancelEstAmt()" aria-label="cancel"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--slate-400)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
          '</div>' +
          '<span class="rec-was-hint">was ' + fmt(b.amount) + '</span>'
        :
          '<span class="rec-amt-display" onclick="editEstAmt(' + idx + ')" title="Tap to edit amount">' + fmt(b.amount) + '</span>' +
          (isLogged ?
            '<span class="rec-status-logged"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Logged</span>'
          :
            '<span class="rec-status-pending">Pending</span>'
          )
        ) +
      '</div>' +
      '<button class="rec-edit-btn" onclick="openEditEstBillModal(' + idx + ')" title="Edit">' + EDIT_PENCIL + '</button>' +
      '<button class="rec-del-btn" onclick="removeEstBill(' + idx + ')" title="Remove">×</button>' +
    '</div>';
  }).join("");
  if (_estEditIdx !== null) {
    const inp = document.getElementById("est-amt-input-" + _estEditIdx);
    if (inp) { nkpBind(); nkpOpen(inp); }
  }
}

function editEstAmt(idx) { _estEditIdx = idx; renderEstBillsPage(); }
function cancelEstAmt() { _estEditIdx = null; renderEstBillsPage(); }
function confirmEstAmt(idx) {
  const inp = document.getElementById("est-amt-input-" + idx);
  if (!inp) return;
  const newAmt = parseFloat(inp.value);
  if (isNaN(newAmt) || newAmt <= 0) { showToast("Enter a valid amount"); return; }
  ESTIMATED_BILLS[idx].amount = newAmt;
  saveEstBills();
  _estEditIdx = null;
  renderEstBillsPage();
  renderHome();
  showToast("Amount updated ✓");
}

async function removeEstBill(idx) {
  const b = ESTIMATED_BILLS[idx];
  if (!b) return;
  if (!(await appConfirm({title:"Remove estimated bill?", message:'"'+(b.desc||"This item")+'" will no longer count toward Safe to Spend.', okText:"Remove", danger:true}))) return;
  ESTIMATED_BILLS.splice(idx, 1);
  saveEstBills();
  renderEstBillsPage();
  renderHome();
  showToast("Removed");
}

function openAddEstBillModal() {
  _estAddEditIdx = -1;
  catBuildList("est-add-cat", EXPENSE_CATS);
  document.getElementById("est-add-desc").value = "";
  document.getElementById("est-add-amount").value = "";
  document.querySelector("#modal-add-estbill .modal-title").textContent = "Add estimated bill";
  document.getElementById("est-add-confirm-btn").textContent = "Add bill";
  openModal("add-estbill");
  nkpBind();
}

function openEditEstBillModal(idx) {
  const b = ESTIMATED_BILLS[idx];
  if (!b) return;
  _estAddEditIdx = idx;
  catBuildList("est-add-cat", EXPENSE_CATS);
  catSetValue("est-add-cat", b.category);
  document.getElementById("est-add-desc").value = b.desc || "";
  document.getElementById("est-add-amount").value = b.amount || "";
  document.querySelector("#modal-add-estbill .modal-title").textContent = "Edit estimated bill";
  document.getElementById("est-add-confirm-btn").textContent = "Save changes";
  openModal("add-estbill");
  nkpBind();
}

function confirmAddEstBill() {
  const desc = document.getElementById("est-add-desc").value.trim();
  const amount = parseFloat(document.getElementById("est-add-amount").value);
  const cat = document.getElementById("est-add-cat").value;
  if (!desc) { showToast("Enter a description"); return; }
  if (!amount || amount <= 0) { showToast("Enter a valid amount"); return; }
  const entry = { desc, category: cat, amount };
  const isEdit = _estAddEditIdx >= 0;
  if (isEdit) ESTIMATED_BILLS[_estAddEditIdx] = entry;
  else ESTIMATED_BILLS.push(entry);
  saveEstBills();
  closeModal("add-estbill");
  renderEstBillsPage();
  renderHome();
  showToast(isEdit ? "Bill updated ✓" : "Added ✓");
  _estAddEditIdx = -1;
}

// ══ CALENDAR PAGE ════════════════════════════════════════════
let _calYear = new Date().getFullYear();
let _calMonth = new Date().getMonth();
let _calSelectedDate = null;

const MO_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function calChangePage(dir) {
  _calMonth += dir;
  if (_calMonth > 11) { _calMonth = 0; _calYear++; }
  if (_calMonth < 0)  { _calMonth = 11; _calYear--; }
  _calSelectedDate = null;
  renderCalendarPage();
}

function renderCalendarPage() {
  const yr = _calYear, mo = _calMonth;
  document.getElementById("cal-page-month-lbl").textContent = MO[mo] + " " + yr;

  // Build day → txs map
  const dayMap = {};
  txs.forEach(t => {
    const d = parseDate(t.date);
    if (d.getFullYear() !== yr || d.getMonth() !== mo) return;
    const key = d.getDate();
    if (!dayMap[key]) dayMap[key] = [];
    dayMap[key].push(t);
  });

  // Build day → upcoming instalments map ("forward-looking" only: today or later).
  // Instalments don't log transactions automatically, so this is the only place that shows them ahead of time.
  const today0 = new Date(); today0.setHours(0,0,0,0);
  const ghostMap = {};
  INSTALLMENTS.forEach(p => {
    if (p.paid >= p.total_mo) return; // fully paid off — nothing upcoming
    const sd = p.startDate ? parseDate(p.startDate) : null;
    const dueDay = (sd && !isNaN(sd)) ? Math.min(sd.getDate(), new Date(yr, mo+1, 0).getDate()) : 1; // fallback to day 1 if no due date set
    const dueDate = new Date(yr, mo, dueDay);
    if (dueDate < today0) return; // only forward-looking — already-past due dates aren't ghosts
    if (!ghostMap[dueDay]) ghostMap[dueDay] = [];
    ghostMap[dueDay].push({icon:p.icon, name:p.name, amount:p.monthly});
  });
  const hasAnyGhost = Object.keys(ghostMap).length > 0;
  const legendEl = document.getElementById("cal-ghost-legend");
  if (legendEl) legendEl.style.display = hasAnyGhost ? "flex" : "none";

  // Summary
  const monthArr = txs.filter(t => { const d = parseDate(t.date); return d.getFullYear()===yr && d.getMonth()===mo; });
  const sumInc = monthArr.filter(t=>t.type==="Income").reduce((s,t)=>s+t.amount,0);
  const sumExp = monthArr.filter(t=>t.type==="Expense"&&!isGoalSpend(t)).reduce((s,t)=>s+t.amount,0);
  document.getElementById("cal-summ-inc").textContent = fmt(sumInc);
  document.getElementById("cal-summ-exp").textContent = fmt(sumExp);
  document.getElementById("cal-summ-count").textContent = monthArr.length;
  renderUpcomingRecurring(yr, mo);

  // Grid
  const grid = document.getElementById("cal-page-grid");
  grid.innerHTML = "";
  ["M","T","W","T","F","S","S"].forEach(d => {
    const el = document.createElement("div"); el.className = "cal-dow"; el.textContent = d; grid.appendChild(el);
  });
  const firstDay = new Date(yr, mo, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const today = new Date();
  const isThisMonth = today.getFullYear() === yr && today.getMonth() === mo;

  for (let i = 0; i < offset; i++) {
    const el = document.createElement("div"); el.className = "cal-cell"; grid.appendChild(el);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dayTxs = dayMap[d] || [];
    const ghosts = ghostMap[d] || [];
    const el = document.createElement("div");
    const isSelected = _calSelectedDate === d;
    el.className = "cal-cell" + (dayTxs.length ? " has-tx" : "") + (ghosts.length && !dayTxs.length ? " ghost" : "") + (isSelected ? " selected" : "");

    const numEl = document.createElement("span");
    numEl.className = "cal-cell-num" + (isThisMonth && d === today.getDate() ? " cal-today" : "");
    numEl.textContent = d;
    el.appendChild(numEl);

    if (dayTxs.length) {
      const inc = dayTxs.filter(t=>t.type==="Income").reduce((s,t)=>s+t.amount,0);
      const exp = dayTxs.filter(t=>t.type==="Expense").reduce((s,t)=>s+t.amount,0);
      const net = inc - exp;
      const dotsEl = document.createElement("div"); dotsEl.className = "cal-cell-dots";
      if (exp > 0) { const dot = document.createElement("div"); dot.className="cal-cell-dot"; dot.style.background="var(--red-strong)"; dotsEl.appendChild(dot); }
      if (inc > 0) { const dot = document.createElement("div"); dot.className="cal-cell-dot"; dot.style.background="var(--green-strong)"; dotsEl.appendChild(dot); }
      el.appendChild(dotsEl);
      const netEl = document.createElement("div");
      netEl.className = "cal-cell-net";
      netEl.style.color = net >= 0 ? "var(--green-strong)" : "var(--red-strong)";
      netEl.textContent = (net >= 0 ? "+" : "-") + fmt(Math.abs(net), 0);
      el.appendChild(netEl);
      el.onclick = () => calSelectDay(d, dayTxs);
    } else if (ghosts.length) {
      const dot = document.createElement("div"); dot.className = "cal-cell-ghost-dot";
      el.appendChild(dot);
      el.onclick = () => calSelectGhostDay(d, ghosts);
    }
    grid.appendChild(el);
  }

  // Restore detail if day still selected
  if (_calSelectedDate && dayMap[_calSelectedDate]) {
    calRenderDetail(_calSelectedDate, dayMap[_calSelectedDate]);
  } else if (_calSelectedDate && ghostMap[_calSelectedDate]) {
    calRenderGhostDetail(_calSelectedDate, ghostMap[_calSelectedDate]);
  } else {
    document.getElementById("cal-detail").style.display = "none";
  }
}

// Recurring items have no specific day attached (they're logged whenever during the month),
// so — unlike instalments — they can't be placed on a calendar cell. Shown as a list instead.
// Only meaningful for the actual current month (pending status is always "this month, right now").
function renderUpcomingRecurring(yr, mo) {
  const el = document.getElementById("cal-upcoming-recurring");
  if (!el) return;
  const now = new Date();
  if (yr !== now.getFullYear() || mo !== now.getMonth()) { el.innerHTML = ""; return; }
  const pending = getPendingRecurring();
  if (!pending.length) { el.innerHTML = ""; return; }
  el.innerHTML = '<div class="cal-upcoming-card">' +
    '<div class="cal-upcoming-hd">Recurring not yet logged this month</div>' +
    pending.map(r => '<div class="cal-upcoming-row"><span>' + (r.desc||"") + '</span><span class="cal-upcoming-amt">' + fmt(r.amount) + '</span></div>').join("") +
  '</div>';
}

function calSelectGhostDay(d, ghosts) {
  if (_calSelectedDate === d) { _calSelectedDate = null; document.getElementById("cal-detail").style.display = "none"; renderCalendarPage(); return; }
  _calSelectedDate = d;
  renderCalendarPage();
  calRenderGhostDetail(d, ghosts);
}

// Upcoming-only day: nothing to delete (no transaction exists yet), just a preview of what's due.
function calRenderGhostDetail(d, ghosts) {
  const total = ghosts.reduce((s,g)=>s+g.amount, 0);
  document.getElementById("cal-detail-date").textContent = d + " " + MO[_calMonth] + " " + _calYear;
  const netEl = document.getElementById("cal-detail-net");
  netEl.textContent = "Upcoming";
  netEl.style.color = "var(--amber-strong, var(--amber-strong))";
  document.getElementById("cal-detail-body").innerHTML =
    '<div class="cal-grp-lbl">Expected — not logged yet</div>' +
    ghosts.map(g =>
      '<div class="cal-tx-row"><div class="cal-tx-icon" style="background:var(--amber-bg)">' + g.icon + '</div>' +
      '<div style="flex:1;min-width:0"><div class="cal-tx-desc">' + g.name + '</div><div class="cal-tx-cat">Instalment due</div></div>' +
      '<span class="cal-tx-amt" style="color:var(--slate-500)">' + fmt(g.amount) + '</span></div>'
    ).join("") +
    (ghosts.length > 1 ? '<div class="cal-grp-total" style="gap:6px"><span style="color:var(--slate-400);font-weight:500">Total due</span><span>' + fmt(total) + '</span></div>' : '');
  document.getElementById("cal-detail").style.display = "block";
}

function calSelectDay(d, dayTxs) {
  if (_calSelectedDate === d) {
    _calSelectedDate = null;
    document.getElementById("cal-detail").style.display = "none";
    renderCalendarPage();
    return;
  }
  _calSelectedDate = d;
  renderCalendarPage();
  calRenderDetail(d, dayTxs);
}

function calRenderDetail(d, dayTxs) {
  const inc = dayTxs.filter(t=>t.type==="Income").reduce((s,t)=>s+t.amount,0);
  const exp = dayTxs.filter(t=>t.type==="Expense").reduce((s,t)=>s+t.amount,0);
  const net = inc - exp;
  document.getElementById("cal-detail-date").textContent = d + " " + MO[_calMonth] + " " + _calYear;
  const netEl = document.getElementById("cal-detail-net");
  netEl.textContent = (net >= 0 ? "+" : "-") + fmt(Math.abs(net));
  netEl.style.color = net >= 0 ? "var(--green-strong)" : "var(--red-strong)";

  const incTxs = dayTxs.filter(t=>t.type==="Income");
  const expTxs = dayTxs.filter(t=>t.type==="Expense");

  function txSwipeRow(t, isInc) {
    const catName = (t.category||"").replace(/^\S+\s/,"");
    const bg = CAT_BG[catName] || (isInc ? "var(--tint-green-bg)" : "var(--slate-50)");
    return '<div class="swipe-container cal-swipe-container" data-id="' + t.id + '" style="margin-bottom:0">' +
      '<div class="swipe-del-bg" style="border-radius:0"><i class="ti ti-trash" style="font-size:20px;color:var(--red)"></i></div>' +
      '<div class="cal-tx-row hist-tx-row" style="border-radius:0;border:none;margin-bottom:0;background:var(--white)">' +
        '<div class="cal-tx-icon" style="background:' + bg + '">' + (t.category||"").match(/^\S+/)?.[0] + '</div>' +
        '<div style="flex:1;min-width:0"><div class="cal-tx-desc">' + (t.desc||t.description||"") + '</div><div class="cal-tx-cat">' + catName + '</div></div>' +
        '<span class="cal-tx-amt" style="color:' + (isInc?"var(--green-strong)":"var(--red-strong)") + '">' + (isInc?"+":"-") + fmt(t.amount) + '</span>' +
      '</div>' +
    '</div>';
  }

  let html = "";
  if (incTxs.length) {
    html += '<div class="cal-grp-lbl">Income</div>';
    incTxs.forEach(t => { html += txSwipeRow(t, true); });
  }
  if (expTxs.length) {
    html += '<div class="cal-grp-lbl">Expenses</div>';
    expTxs.forEach(t => { html += txSwipeRow(t, false); });
  }
  document.getElementById("cal-detail-body").innerHTML = html;
  document.getElementById("cal-detail").style.display = "block";
  initCalSwipeToDelete();
}

function initCalSwipeToDelete() {
  initSwipeRows('.cal-swipe-container', id => {
    deleteTx(id);
    const remaining = txs.filter(t => { const dt=parseDate(t.date); return dt.getFullYear()===_calYear && dt.getMonth()===_calMonth && dt.getDate()===_calSelectedDate; });
    if (remaining.length) calRenderDetail(_calSelectedDate, remaining);
    else { document.getElementById("cal-detail").style.display="none"; _calSelectedDate=null; }
    renderCalendarPage();
  });
}

// ══ MONTHLY REPORT CARD ══════════════════════════════════════
function showMonthlyReport() {
  const mo = analyticsMonth, yr = analyticsYear;
  const arr = monthTxs(mo, yr).filter(t => !isGoalSpend(t));
  const incTxs = arr.filter(t => t.type === "Income");
  const expTxs = arr.filter(t => t.type === "Expense");
  const inc = incTxs.reduce((s,t) => s+t.amount, 0);
  const exp = expTxs.reduce((s,t) => s+t.amount, 0);
  const net = inc - exp;
  const rate = inc > 0 ? Math.round((net/inc)*100) : 0;

  // Top category
  const catMap = {};
  expTxs.forEach(t => { catMap[t.category] = (catMap[t.category]||0) + t.amount; });
  const topCat = Object.entries(catMap).sort((a,b)=>b[1]-a[1])[0];
  const topCatName = topCat ? topCat[0].replace(/^\S+\s/,"") : "—";
  const topCatPct  = topCat && exp > 0 ? Math.round((topCat[1]/exp)*100) : 0;

  // Biggest transactions
  const bigInc = incTxs.sort((a,b)=>b.amount-a.amount)[0];
  const bigExp = expTxs.sort((a,b)=>b.amount-a.amount)[0];

  const card = document.getElementById("report-card-inner");
  if (card) {
    card.classList.remove("rc-dark", "rc-light");
    card.classList.add(settings.darkMode ? "rc-dark" : "rc-light");
  }
  document.getElementById("report-period").textContent = MO[mo] + " " + yr;
  const netEl = document.getElementById("report-net-amt");
  netEl.textContent = (net >= 0 ? "+" : "-") + fmt(Math.abs(net), 0);
  netEl.style.color = net >= 0 ? "var(--teal)" : "var(--red)";
  document.getElementById("report-inc").textContent = fmt(inc);
  document.getElementById("report-inc-sub").textContent = incTxs.length + " source" + (incTxs.length!==1?"s":"");
  document.getElementById("report-exp").textContent = fmt(exp);
  document.getElementById("report-exp-sub").textContent = expTxs.length + " transaction" + (expTxs.length!==1?"s":"");
  document.getElementById("report-rate").textContent = rate + "%";
  document.getElementById("report-rate2").textContent = rate + "%";
  document.getElementById("report-top-cat").textContent = topCatName;
  document.getElementById("report-top-cat-sub").textContent = topCat ? fmt(topCat[1]) + " · " + topCatPct + "%" : "—";
  document.getElementById("report-big-inc").textContent = bigInc ? (bigInc.desc||"") + " · " + fmt(bigInc.amount) : "—";
  document.getElementById("report-big-exp").textContent = bigExp ? (bigExp.desc||"") + " · " + fmt(bigExp.amount) : "—";
  document.getElementById("report-bar").style.width = Math.min(rate, 100) + "%";
  openModal("report");
}

async function saveReportImage() {
  const card = document.getElementById("report-card-inner");
  if (!card || typeof html2canvas === "undefined") { showToast("Saving not available"); return; }
  showToast("Generating image…");
  try {
    const canvas = await html2canvas(card, { backgroundColor: "var(--slate-900)", scale: 2, logging: false, useCORS: true });
    const a = document.createElement("a");
    const mo = analyticsMonth, yr = analyticsYear;
    a.download = "fintrack-report-" + MO[mo].toLowerCase() + "-" + yr + ".png";
    a.href = canvas.toDataURL("image/png");
    a.click();
    showToast("Report saved ✓");
  } catch(e) { showToast("Could not save image"); }
}

// ══ NATIVE-SELECT ENHANCER ═══════════════════════════════════
// Wraps a native <select> with a styled overlay (matching the app theme) while keeping the
// real <select> as the value source, so existing .value reads/writes keep working. Call
// sddEnhance(id) once; call sddSync(id) after rebuilding the select's <option>s dynamically.

// ══ TEXT DROPDOWN (plain-text filter selects) ════════════════

// ══ CUSTOM DROPDOWN (category selects) ═══════════════════════
// IDs that use the custom dropdown

// Close all dropdowns when clicking outside

// ══ ADD RECURRING MODAL ═════════════════════════════════════
let _recAddType = "Expense";
let _recAddEditIdx = -1;

function _recSetModalMode(isEdit) {
  const titleEl = document.querySelector("#modal-add-recurring .modal-title");
  const subEl   = document.querySelector("#modal-add-recurring .modal-sub");
  const btnEl   = document.getElementById("rec-add-confirm-btn");
  if (titleEl) titleEl.textContent = isEdit ? "Edit recurring" : "Add recurring";
  if (subEl)   subEl.textContent   = isEdit ? "Update this recurring item" : "This will appear on your recurring list every month";
  if (btnEl)   btnEl.textContent   = isEdit ? "Save changes" : "Add recurring";
}

function openAddRecurringModal() {
  _recAddEditIdx = -1;
  _recAddType = "Expense";
  setRecAddType("Expense");
  document.getElementById("rec-add-desc").value = "";
  document.getElementById("rec-add-amount").value = "";
  document.getElementById("rec-add-notes").value = "";
  _recSetModalMode(false);
  openModal("add-recurring");
  nkpBind();
}

function openEditRecurringModal(idx) {
  const r = RECURRING[idx];
  if (!r) return;
  _recAddEditIdx = idx;
  setRecAddType(r.type || "Expense");          // builds the category list for this type
  catSetValue("rec-add-cat", r.category);       // then select the item's category
  document.getElementById("rec-add-desc").value   = r.desc || "";
  document.getElementById("rec-add-amount").value = r.amount || "";
  document.getElementById("rec-add-notes").value  = r.notes || "";
  _recSetModalMode(true);
  openModal("add-recurring");
  nkpBind();
}

function setRecAddType(type) {
  _recAddType = type;
  const expBtn = document.getElementById("rec-add-type-expense");
  const incBtn = document.getElementById("rec-add-type-income");
  const confirmBtn = document.getElementById("rec-add-confirm-btn");
  const cats = type === "Income" ? INCOME_CATS : EXPENSE_CATS;
  catBuildList("rec-add-cat", cats);
  if (type === "Expense") {
    expBtn.style.border = "2px solid var(--red)"; expBtn.style.background = "var(--red-bg)"; expBtn.style.color = "var(--red-text)";
    incBtn.style.border = "1.5px solid var(--slate-200)"; incBtn.style.background = "var(--white)"; incBtn.style.color = "var(--slate-400)";
    confirmBtn.style.background = "var(--teal)";
  } else {
    incBtn.style.border = "2px solid var(--green-strong)"; incBtn.style.background = "#f0fdf4"; incBtn.style.color = "var(--green-text)";
    expBtn.style.border = "1.5px solid var(--slate-200)"; expBtn.style.background = "var(--white)"; expBtn.style.color = "var(--slate-400)";
    confirmBtn.style.background = "var(--green-strong)";
  }
}

function confirmAddRecurring() {
  const desc   = document.getElementById("rec-add-desc").value.trim();
  const amount = parseFloat(document.getElementById("rec-add-amount").value);
  const cat    = document.getElementById("rec-add-cat").value;
  const notes  = document.getElementById("rec-add-notes").value.trim();
  if (!desc)            { showToast("Enter a description"); return; }
  if (!amount || amount <= 0) { showToast("Enter a valid amount"); return; }
  const entry = { desc, category: cat, amount, type: _recAddType, notes };
  const isEdit = _recAddEditIdx >= 0;
  if (isEdit) {
    RECURRING[_recAddEditIdx] = entry;
    _recAddEditIdx = -1;
  } else {
    const existing = RECURRING.findIndex(r => r.desc === desc && r.category === cat);
    if (existing >= 0) RECURRING[existing] = entry; else RECURRING.push(entry);
  }
  saveRecurring();
  closeModal("add-recurring");
  renderRecurringPage();
  showToast(isEdit ? "Recurring updated ✓" : "Added to recurring ✓");
  if (settings.sheetsUrl && settings.autosync) postToSheets("save_recurring", { recurring: RECURRING });
}

// ══ CALENDAR SEARCH ══════════════════════════════════════════
function calOnSearch() {
  const q = (document.getElementById("cal-search").value || "").toLowerCase().trim();
  const resultsEl = document.getElementById("cal-search-results");
  const mainEl = document.getElementById("cal-main-content");
  if (!q) {
    resultsEl.style.display = "none";
    mainEl.style.display = "block";
    return;
  }
  mainEl.style.display = "none";
  resultsEl.style.display = "block";
  const matched = txs.filter(t => {
    const desc = (t.desc || t.description || "").toLowerCase();
    const cat  = (t.category || "").toLowerCase();
    const notes = (t.notes || "").toLowerCase();
    return desc.includes(q) || cat.includes(q) || notes.includes(q);
  }).sort((a, b) => parseDate(b.date) - parseDate(a.date));

  if (!matched.length) {
    resultsEl.innerHTML = '<div style="padding:20px;text-align:center;font-size:13px;color:var(--slate-400)">No transactions found</div>';
    return;
  }

  let lastDate = "";
  let html = '<div style="padding:8px 14px 4px;font-size:11px;color:var(--slate-400)">' + matched.length + ' result' + (matched.length!==1?"s":"") + ' for "' + q + '"</div>';
  matched.forEach(t => {
    const dateStr = t.date || "";
    if (dateStr !== lastDate) {
      const d = parseDate(dateStr);
      const label = d.getDate() + " " + MO[d.getMonth()] + " " + d.getFullYear();
      html += '<div style="font-size:10px;font-weight:700;color:var(--slate-400);text-transform:uppercase;letter-spacing:0.06em;padding:8px 14px 2px">' + label + '</div>';
      lastDate = dateStr;
    }
    const catName = (t.category || "").replace(/^\S+\s/, "");
    const bg = CAT_BG[catName] || "var(--slate-50)";
    const isInc = t.type === "Income";
    html += '<div style="display:flex;align-items:center;gap:10px;padding:7px 14px;border-bottom:0.5px solid var(--slate-100)">' +
      '<div style="width:28px;height:28px;border-radius:8px;background:' + bg + ';display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0">' + (t.category||"").match(/^\S+/)?.[0] + '</div>' +
      '<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;color:var(--slate-800)">' + (t.desc||t.description||"") + '</div><div style="font-size:10px;color:var(--slate-400)">' + catName + '</div></div>' +
      '<span style="font-size:12px;font-weight:700;color:' + (isInc?"var(--green-strong)":"var(--red-strong)") + '">' + (isInc?"+":"-") + fmt(t.amount) + '</span>' +
    '</div>';
  });
  resultsEl.innerHTML = html;
}
// ══ NUMERIC KEYPAD (Option A) ════════════════════════════════
// Any <input inputmode="none"> opens the in-app keypad on focus.
// inputmode="none" stops the native keyboard; focus delegation
// (below) opens our sheet. All existing .value reads keep working.

// Lift the focused field above the keypad: translate the modal sheet up, or scroll the page.
let _nkpModalEl = null;

// Done button: if inline-editing a recurring amount, confirm it; otherwise just close.

// Delegation — open keypad whenever a no-keyboard input is tapped.
// inputmode="none" alone is unreliable on iOS Safari, so we also mark these
// inputs readonly (which guarantees no native keyboard) and open on click.

// One click handler drives everything. The keypad sheet is bottom-docked and never
// covers the form, so tapping a text field focuses it normally (native keyboard shows)
// and simply closes the keypad as a side effect.
document.addEventListener("click", e => {
  const nkpOv = document.getElementById("nkp-overlay");
  const tkbOv = document.getElementById("tkb-overlay");
  // taps inside either keyboard are handled by the keys themselves
  if (nkpOv && nkpOv.contains(e.target)) return;
  if (tkbOv && tkbOv.contains(e.target)) return;
  if (_nkpIsTarget(e.target)) { tkbClose(); nkpOpen(e.target); return; } // numeric field → keypad
  if (_tkbIsTarget(e.target)) { nkpClose(); tkbOpen(e.target); return; } // text field → keyboard
  // tapped elsewhere — close whichever keyboard is open
  if (nkpOv && nkpOv.classList.contains("open")) nkpClose();
  if (tkbOv && tkbOv.classList.contains("open")) tkbClose();
});

// Back-compat shims for older call sites — also (re)mark inputs readonly,
// so dynamically-rendered fields (e.g. recurring amount editor) are covered.

// ══ TEXT KEYBOARD (EN / TH) ══════════════════════════════════
// A custom on-screen keyboard for text fields, in the app's sheet style.
// English (QWERTY) + Thai (Kedmanee) layouts + a 123 symbol layer, with a
// teal language-switch key. Replaces the native keyboard on all text inputs.

// Lift the focused field above the keyboard (mirror of nkpReveal)

// ── Shared focus state: active-field ring + blinking caret ──
let _kbRingEl = null, _kbCaretCanvas = null, _kbCaretScroll = null;

// Position the blinking caret at the END of the field's text (keyboards only insert at end).

// Add temporary bottom scroll-room so the active field can always lift above the keyboard,
// even when it sits near the bottom of the page (otherwise there's nothing below to scroll into).
let _kbScrollPadEl = null, _kbScrollPadPrev = "";

// Mark every text input to use the custom keyboard (skip numeric ones → numeric keypad).

// App-styled confirmation dialog (replaces native confirm()). Returns Promise<boolean>.

// ══ EDGE SWIPE-BACK ══════════════════════════════════════════
// Swipe right from the left edge to go back, on pages that have a back button.
// Starts only from the very left edge so it never clashes with row swipe-to-delete.
const SWIPE_BACK_PAGES = new Set(["history","budget","calendar","recurring","estbills","goals","installments","analytics","settings"]);
(function initSwipeBack() {
  let dragging = false, startX = 0, startY = 0, pageEl = null;
  const EDGE = 28, THRESHOLD = 80, MAX_PULL = 130;

  function cancel() {
    if (pageEl) { pageEl.style.transition = "transform 0.2s ease, opacity 0.2s ease"; pageEl.style.transform = ""; pageEl.style.opacity = ""; }
    dragging = false; pageEl = null;
  }

  document.addEventListener("touchstart", e => {
    // Don't intercept while a keyboard, modal or dialog is open
    if (document.querySelector(".modal-overlay:not(.hidden), .report-modal-overlay:not(.hidden), .confirm-overlay:not(.hidden), .nkp-overlay.open, .tkb-overlay.open")) return;
    const t = e.touches[0];
    if (t.clientX > EDGE) return;
    const ap = document.querySelector(".page.active");
    if (!ap || !SWIPE_BACK_PAGES.has(ap.id.replace("page-", ""))) return;
    dragging = true; pageEl = ap; startX = t.clientX; startY = t.clientY;
  }, {passive:true});

  document.addEventListener("touchmove", e => {
    if (!dragging) return;
    const t = e.touches[0], dx = t.clientX - startX, dy = t.clientY - startY;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) { cancel(); return; } // vertical scroll — let go
    if (dx > 0) {
      e.preventDefault(); // block native edge gesture + scroll during our drag
      const pull = Math.min(dx, MAX_PULL);
      pageEl.style.transition = "none";
      pageEl.style.transform = "translateX(" + pull + "px)";
      pageEl.style.opacity = String(1 - (pull / MAX_PULL) * 0.25);
    }
  }, {passive:false});

  document.addEventListener("touchend", e => {
    if (!dragging) return;
    const dx = e.changedTouches[0].clientX - startX;
    const el = pageEl;
    dragging = false; pageEl = null;
    if (el) { el.style.transition = "transform 0.2s ease, opacity 0.2s ease"; el.style.transform = ""; el.style.opacity = ""; }
    if (dx > THRESHOLD) goTo(_prevPage || "home");
  });
})();

nkpMarkInputs();
tkbMarkInputs();
startup();