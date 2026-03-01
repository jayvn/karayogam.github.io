import { $, mk, esc, S, save, me, modal, cDlg, initFirebase, syncU, updDl, display, nameTaken } from "/mgroove/shared.js";
import { rCard } from "/mgroove/cards.js";
import { TAB, renderDash, fullRender, setGo, setApplyCF } from "/mgroove/dash.js";

// Nav
const views = {};
document.querySelectorAll('main[id^="v"]').forEach((el) => { views[el.id.slice(1).toLowerCase()] = el; });
function go(k) {
  Object.values(views).forEach((v) => v.classList.add("hidden"));
  views[k].classList.remove("hidden");
  document.querySelectorAll("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.v === k));
  if (k === "home") renderDash();
}
document.querySelectorAll("#nav button").forEach((b) => (b.onclick = () => go(b.dataset.v)));
setGo(go);

// Rename
function renameUser(oldName, newName) {
  if (S.users[oldName]) { S.users[newName] = { ...S.users[oldName] }; delete S.users[oldName]; }
  [S.songs, S.costumes, S.slots, S.past].forEach((arr) =>
    arr.forEach((item) => { if (item.addedBy === oldName) item.addedBy = newName; })
  );
  [...S.slots, ...S.past].forEach((s) => {
    if (!s.attendees) return;
    const i = s.attendees.indexOf(oldName);
    if (i !== -1) s.attendees[i] = newName;
  });
  S.expenses.forEach((e) => {
    if (e.payer === oldName) e.payer = newName;
    if (!e.attendees) return;
    const i = e.attendees.indexOf(oldName);
    if (i !== -1) e.attendees[i] = newName;
  });
}

// Profile
function openProf() {
  const roster = S.roster || [];
  const available = roster.filter((n) => !nameTaken(n) || n === S.profile.alias);
  const hasCurrent = S.profile.alias && roster.includes(S.profile.alias);

  const nameField = roster.length
    ? '<div class="f"><label>👤 Who are you?</label><select id="pA">' +
      '<option value="">— pick your name —</option>' +
      (hasCurrent ? `<option value="${esc(S.profile.alias)}" selected>${esc(S.profile.alias)}</option>` : "") +
      available.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("") + "</select></div>"
    : '<div class="f"><label>👤 Alias</label><input id="pA" value="' + esc(S.profile.alias) + '" placeholder="Your name…"></div>';

  const m = modal(
    "<h3>👤 Your Profile</h3>" + nameField +
    '<div class="f"><label>🏷️ Nickname</label><input id="pN" value="' + esc(S.profile.nickname || "") + '" placeholder="optional short name…"></div>' +
    '<div class="acts"><button class="btn" id="pC">Cancel</button><button class="btn btn-add" id="pS">Save</button></div>',
  );
  if (!roster.length) m.q("#pA").focus();
  m.q("#pC").onclick = m.close;
  m.q("#pS").onclick = async () => {
    const newAlias = m.q("#pA").value.trim(), oldAlias = S.profile.alias;
    if (!newAlias) { alert("Please pick your name!"); return; }
    if (oldAlias && newAlias !== oldAlias) {
      const ok = await cDlg(`Switch from <strong>${esc(oldAlias)}</strong> to <strong>${esc(newAlias)}</strong>?<br><small>this is a trust based website. original peril use cheyyu. Is this who you really are ?.</small>`);
      if (!ok) return;
    }
    if (newAlias !== oldAlias && nameTaken(newAlias)) {
      m.el.querySelector(".collision-warn")?.remove();
      const warn = mk("div", "collision-warn");
      warn.innerHTML = '⚠️ "<strong>' + esc(newAlias) + '</strong>" is already logged in elsewhere. Only pick a name that is yours!';
      m.q(".md").insertBefore(warn, m.q(".acts"));
      return;
    }
    S.profile.alias = newAlias;
    S.profile.nickname = m.q("#pN").value.trim();
    if (oldAlias && oldAlias !== newAlias) renameUser(oldAlias, newAlias);
    syncU(); save();
    $("hAlias").textContent = display();
    updDl(); m.close(); fullRender();
  };
}

$("hAlias").textContent = display();
$("profBtn").onclick = openProf;
$("exportBtn").onclick = () => {
  const a = mk("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(S, null, 2)], { type: "application/json" }));
  a.download = "mgroove-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  a.click(); URL.revokeObjectURL(a.href);
};

// Name gate
function showNameGate() {
  const roster = S.roster || [];
  const available = roster.filter((n) => !nameTaken(n) || n === S.profile.alias);
  const nameField = roster.length
    ? '<div class="f"><label>👤 Who are you?</label><select id="gA">' +
      '<option value="">— pick your name —</option>' +
      available.map((n) => `<option value="${esc(n)}">${esc(n)}</option>`).join("") + "</select></div>"
    : '<div class="f"><label>👤 Your name</label><input id="gA" placeholder="Enter your name…"></div>';

  const gate = mk("div", "name-gate");
  gate.innerHTML = '<div class="name-gate-box">' +
    '<div class="logo" style="font-size:2.5rem;margin-bottom:.5rem">💃 M-Groove</div>' +
    "<h2>Welcome! Who are you?</h2>" + nameField +
    '<button class="btn btn-add" id="gOk" style="width:100%;margin-top:.5rem">Let\'s go →</button></div>';
  document.body.appendChild(gate);

  const inp = gate.querySelector("#gA");
  const doGo = () => {
    const name = inp.value.trim();
    if (!name) { inp.classList.add("shake"); setTimeout(() => inp.classList.remove("shake"), 500); return; }
    if (nameTaken(name) && name !== S.profile.alias) {
      const warn = gate.querySelector(".collision-warn") || mk("div", "collision-warn");
      warn.innerHTML = '⚠️ "<strong>' + esc(name) + '</strong>" is already logged in elsewhere. Only pick a name that is yours!';
      inp.closest(".f").after(warn); return;
    }
    const oldAlias = S.profile.alias;
    S.profile.alias = name;
    if (oldAlias && oldAlias !== name) renameUser(oldAlias, name);
    syncU(); save();
    $("hAlias").textContent = display();
    updDl(); gate.remove();
    $("nav").style.pointerEvents = $("nav").style.opacity = "";
    fullRender();
  };
  gate.querySelector("#gOk").onclick = doGo;
  if (inp.tagName === "INPUT") { inp.onkeydown = (e) => { if (e.key === "Enter") doGo(); }; setTimeout(() => inp.focus(), 50); }
}

if (!S.profile.alias) {
  $("nav").style.pointerEvents = "none";
  $("nav").style.opacity = "0.3";
  showNameGate();
}

// Add item
function addI(type, data) {
  const item = { id: crypto.randomUUID(), createdAt: Date.now(), addedBy: me(), votes: 0, finalized: false, ...data };
  S[type === "misc" ? "misc" : type + "s"].push(item);
  save();
  rCard(item, type, $({ song: "songL", costume: "cosL", slot: "slL", misc: "miscL" }[type]));
}

// Songs
const doSong = () => {
  const link = $("songIn").value.trim(), name = $("songName").value.trim();
  if (!link && !name) return;
  const text = link && name ? name + " " + link : link || name;
  addI("song", { text });
  $("songIn").value = ""; $("songName").value = "";
};
$("addSong").onclick = doSong;
$("songIn").onkeydown = (e) => { if (e.key === "Enter") doSong(); };
$("songName").onkeydown = (e) => { if (e.key === "Enter") doSong(); };

// Costumes
let pendImg = null;
const doCos = () => {
  const v = $("cosIn").value.trim();
  if (!v && !pendImg) return;
  addI("costume", { text: v || "Image costume", gender: $("cosG").value, imageData: pendImg || null });
  $("cosIn").value = ""; clrI(); applyCF();
};
$("addCos").onclick = doCos;
$("cosIn").onkeydown = (e) => { if (e.key === "Enter") doCos(); };

function clrI() { pendImg = null; $("cosPrev").hidden = true; $("cosPrev").src = ""; }
$("cosClr").onclick = (e) => { e.stopPropagation(); clrI(); };

function rdImg(f) {
  if (!f || !f.type.startsWith("image/")) return;
  const r = new FileReader();
  r.onload = (e) => { pendImg = e.target.result; $("cosPrev").src = pendImg; $("cosPrev").hidden = false; };
  r.readAsDataURL(f);
}
const dz = $("cosDz");
dz.onclick = (e) => { if (e.target.tagName !== "BUTTON") $("cosFile").click(); };
$("cosFile").onchange = (e) => { if (e.target.files[0]) rdImg(e.target.files[0]); };
dz.ondragover = (e) => { e.preventDefault(); dz.classList.add("over"); };
dz.ondragleave = () => dz.classList.remove("over");
dz.ondrop = (e) => { e.preventDefault(); dz.classList.remove("over"); if (e.dataTransfer.files[0]) rdImg(e.dataTransfer.files[0]); };
document.addEventListener("paste", (e) => {
  if ($("vCostumes").classList.contains("hidden")) return;
  for (const it of e.clipboardData.items) if (it.type.startsWith("image/")) { rdImg(it.getAsFile()); break; }
});

let cosF = "all";
function applyCF() {
  document.querySelectorAll("#cosL .card").forEach((c) => c.classList.toggle("fh", cosF !== "all" && c.dataset.gender !== cosF));
}
document.querySelectorAll("#cosTabs .tab").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("#cosTabs .tab").forEach((x) => x.classList.remove("active"));
    b.classList.add("active"); cosF = b.dataset.f; applyCF();
  };
});
setApplyCF(applyCF);

// Slots
const doSlot = () => {
  const dt = $("slDt").value, loc = $("slLoc").value.trim();
  if (!dt && !loc) return;
  addI("slot", { datetime: dt, location: loc, cost: parseFloat($("slCost").value) || 0, payer: $("slPayer").value.trim(), attendees: [] });
  $("slDt").value = $("slLoc").value = $("slCost").value = $("slPayer").value = "";
};
$("addSl").onclick = doSlot;
[$("slLoc"), $("slPayer")].forEach((el) => (el.onkeydown = (e) => { if (e.key === "Enter") doSlot(); }));
const now = new Date();
now.setMinutes(0, 0, 0); now.setHours(now.getHours() + 1);
$("slDt").value = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

// Misc
const doMisc = () => { const v = $("miscIn").value.trim(); if (!v) return; addI("misc", { text: v }); $("miscIn").value = ""; };
$("addMisc").onclick = doMisc;
$("miscIn").onkeydown = (e) => { if (e.key === "Enter") doMisc(); };

// Init
syncU(); updDl();
fullRender();

await initFirebase(() => {
  syncU();
  const gate = document.querySelector(".name-gate");
  if (gate) { gate.remove(); showNameGate(); }
  else { fullRender(); $("hAlias").textContent = display(); }
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/mgroove/sw.js");
