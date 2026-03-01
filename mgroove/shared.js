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
let fbReady = false;

const SHARED_KEYS = ["songs", "costumes", "slots", "expenses", "past", "users", "misc", "roster"];
const LOCAL_KEY = "mgroove_local";
const ADMIN_PIN = "0000";

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

const localState = {
  profile: { alias: "", nickname: "", location: "", paypal: "" },
  ...JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"),
};

export const S = {
  songs: [],
  costumes: [],
  slots: [],
  expenses: [],
  past: [],
  users: {},
  misc: [],
  roster: [],
  ...localState,
  isAdmin: false,
};

export const saveLocal = () =>
  localStorage.setItem(LOCAL_KEY, JSON.stringify({ profile: S.profile }));
export const saveShared = () => {
  if (!fbReady) return;
  const data = {};
  SHARED_KEYS.forEach((k) => (data[k] = S[k]));
  setDoc(docRef, data, { merge: true });
};
export const save = () => {
  saveLocal();
  saveShared();
};
export const me = () => S.profile.alias || "Anon";
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

export function initAdmin(onToggle) {
  S.isAdmin = false;
  $("admTog").checked = false;
  $("admTog").onchange = (e) => {
    if (e.target.checked) {
      const m = modal(
        '<h3>🔒ividentha karyam?</h3><div class="f"><input type="password" id="pinIn" placeholder="PIN…" class="pin-input"></div><div class="acts"><button class="btn" id="pinC">Cancel</button><button class="btn btn-add" id="pinOk">OK</button></div>',
      );
      m.q("#pinIn").focus();
      const done = () => {
        const pin = m.q("#pinIn").value;
        m.close();
        if (pin === ADMIN_PIN) {
          S.isAdmin = true;
          document.body.classList.add("admin");
          $("admTog").checked = true;
          onToggle();
        } else {
          $("admTog").checked = false;
          alert("Wrong PIN");
        }
      };
      m.q("#pinC").onclick = m.close;
      m.q("#pinOk").onclick = done;
      m.q("#pinIn").onkeydown = (e) => {
        if (e.key === "Enter") done();
      };
      e.target.checked = false;
    } else {
      S.isAdmin = false;
      document.body.classList.remove("admin");
      onToggle();
    }
  };
}

export async function initFirebase(onSnap) {
  fbReady = true;

  try {
    const oldLocal = JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
    if (oldLocal.myVotes?.length && me() !== "Anon") {
      S.users[me()] ??= {};
      S.users[me()].votes = [
        ...new Set([...(S.users[me()].votes ?? []), ...oldLocal.myVotes]),
      ];
      delete oldLocal.myVotes;
      localStorage.setItem(LOCAL_KEY, JSON.stringify(oldLocal));
      saveShared();
    }
  } catch {}

  const OLD_KEY = "mgroove_v3";
  const oldData = localStorage.getItem(OLD_KEY);
  if (oldData) {
    try {
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
      if (old.myVotes?.length && me() !== "Anon") {
        S.users[me()] ??= {};
        S.users[me()].votes = [
          ...new Set([...(S.users[me()].votes ?? []), ...old.myVotes]),
        ];
      }
      saveLocal();
      localStorage.removeItem(OLD_KEY);
    } catch {}
  }

  onSnapshot(docRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      SHARED_KEYS.forEach((k) => {
        if (data[k] !== undefined) S[k] = data[k];
      });
    }
    S.users ??= {};
    S.expenses ??= [];
    onSnap();
  });
}

export function syncU() {
  const a = me();
  if (a !== "Anon")
    S.users[a] = {
      ...S.users[a],
      location: S.profile.location || "",
      paypal: S.profile.paypal || "",
    };
}

export function updDl() {
  $("userDl").innerHTML = Object.keys(S.users)
    .map((u) => `<option value="${u}">`)
    .join("");
}
