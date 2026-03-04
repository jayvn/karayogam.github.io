import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const fbApp = initializeApp(JSON.parse(window.__firebase_config));
const fbDb = getFirestore(fbApp);
const docRef = doc(fbDb, "mgroove", "v1");

const SHARED_KEYS = [
  "songs",
  "costumes",
  "slots",
  "expenses",
  "users",
  "misc",
  "roster",
];
const LOCAL_KEY = "mgroove_local";
export const $ = (id) => document.getElementById(id);
export const mk = (t, c) => {
  const e = document.createElement(t);
  if (c) e.className = c;
  return e;
};
export const esc = (s) => {
  const d = mk("div");
  d.textContent = s;
  return d.innerHTML;
};

const SESSION_ID_KEY = "mgroove_session_id";
export const SESSION_ID = localStorage.getItem(SESSION_ID_KEY) || (() => {
  const id = ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16));
  localStorage.setItem(SESSION_ID_KEY, id);
  return id;
})();

const localState = {
  profile: { alias: "", nickname: "" },
  ...JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"),
};

export const S = {
  songs: [],
  costumes: [],
  slots: [],
  expenses: [],
  users: {},
  misc: [],
  roster: [],
  ...localState,
};

export const saveLocal = () =>
  localStorage.setItem(LOCAL_KEY, JSON.stringify({ profile: S.profile }));
let fbReady = false;
let lastSnap = {};
export const saveShared = (...keys) => {
  if (!fbReady) return;
  const data = {};
  (keys.length ? keys : SHARED_KEYS).forEach((k) => {
    const remote = lastSnap[k];
    const local = S[k];
    // Never overwrite non-empty remote data with empty local data
    if (Array.isArray(remote) && remote.length > 0 && Array.isArray(local) && local.length === 0) {
      console.warn("saveShared: blocked empty write for", k);
      return;
    }
    data[k] = local;
  });
  if (Object.keys(data).length) setDoc(docRef, data, { merge: true });
};
export const save = (...keys) => {
  saveLocal();
  saveShared(...keys);
};
export const me = () => S.profile.alias;
export const display = () => S.profile.nickname || me();

export function modal(html) {
  const dlg = mk("dialog", "mo");
  dlg.innerHTML = '<div class="md">' + html + "</div>";
  document.body.appendChild(dlg);
  dlg.showModal();
  const cl = () => {
    dlg.close();
    dlg.remove();
  };
  dlg.onclick = (e) => {
    if (e.target === dlg) cl();
  };
  return { el: dlg, close: cl, q: (sel) => dlg.querySelector(sel) };
}

export function cDlg(msg) {
  return new Promise((r) => {
    const m = modal(
      '<p class="dlg-msg">' +
        msg +
        '</p><div class="acts"><button class="btn" id="cN">Cancel</button><button class="btn btn-add" id="cY">OK</button></div>',
    );
    m.q("#cY").onclick = () => {
      m.close();
      r(true);
    };
    m.q("#cN").onclick = () => {
      m.close();
      r(false);
    };
    m.el.onclick = (e) => {
      if (e.target === m.el) {
        m.close();
        r(false);
      }
    };
  });
}


export async function initFirebase(onSnap) {
  const OLD_KEY = "mgroove_v3";
  const oldData = localStorage.getItem(OLD_KEY);
  if (oldData) {
    const old = JSON.parse(oldData);
    const migrated = {};
    SHARED_KEYS.forEach((k) => {
      if (old[k]) migrated[k] = old[k];
    });
    if (
      Object.keys(migrated).some((k) =>
        Array.isArray(migrated[k])
          ? migrated[k].length > 0
          : Object.keys(migrated[k] || {}).length > 0,
      )
    )
      await setDoc(docRef, migrated, { merge: true });
    if (old.profile) S.profile = old.profile;
    saveLocal();
    localStorage.removeItem(OLD_KEY);
  }

  onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      SHARED_KEYS.forEach((k) => {
        if (data[k] !== undefined) S[k] = data[k];
      });
      lastSnap = { ...data };
    }
    S.users ??= {};
    S.expenses ??= [];
    fbReady = true;
    onSnap();
  });
}

export function syncU() {
  const a = me();
  if (!a) return;
  S.users[a] = { ...S.users[a], sessionId: SESSION_ID };
}

export function nameTaken(name) {
  const u = S.users[name];
  return u && u.sessionId && u.sessionId !== SESSION_ID;
}

export function updDl() {
  $("userDl").innerHTML = Object.keys(S.users)
    .map((u) => `<option value="${u}">`)
    .join("");
}
