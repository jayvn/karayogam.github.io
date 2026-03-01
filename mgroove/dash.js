import { $, mk, esc, S, save, me, cDlg, updDl } from "/mgroove/shared.js";
import { IC, iVoted, addMyVote, itemLabel, longFmt, rCard, rPast } from "/mgroove/cards.js";

export let go;
export function setGo(fn) { go = fn; }

export const TAB = { song: "songs", costume: "costumes", slot: "slots", misc: "misc" };

export function renderDash() {
  const dv = $("dashVotes"), dr = $("dashRsvp"), dc = $("dashRecent");
  dv.innerHTML = dr.innerHTML = dc.innerHTML = "";

  const all = [
    ...S.songs.map((s) => ({ ...s, _t: "song" })),
    ...S.costumes.map((c) => ({ ...c, _t: "costume" })),
    ...S.slots.map((s) => ({ ...s, _t: "slot" })),
    ...S.misc.map((m) => ({ ...m, _t: "misc" })),
  ];

  // Pending votes
  const unv = all.filter((i) => !i.finalized && !iVoted(i.id));
  dv.innerHTML = "<h3>🗳️ Pending Votes (" + unv.length + ')</h3><div class="dash-hint">All votes are anonymous — only totals are visible</div>';
  if (!unv.length)
    dv.innerHTML += '<div class="dash-em">✅ You\'ve voted on everything!</div>';
  else {
    unv.slice(0, 6).forEach((item) => {
      const d = mk("div", "dash-i");
      const txDiv = mk("div", "tx");
      txDiv.innerHTML = esc(itemLabel(item).slice(0, 50)) + "<br><small>" + IC[item._t] + " · " + (item.votes || 0) + " votes</small>";
      const vb = mk("button", "btn btn-sm btn-vote");
      vb.textContent = "👍";
      vb.onclick = (e) => { e.stopPropagation(); item.votes = (item.votes || 0) + 1; addMyVote(item.id); save(); renderDash(); };
      d.appendChild(mk("span", "ic")).textContent = IC[item._t];
      d.appendChild(txDiv);
      d.appendChild(vb);
      d.onclick = () => go(TAB[item._t]);
      dv.appendChild(d);
    });
    if (unv.length > 6) dv.innerHTML += '<div class="dash-em">…and ' + (unv.length - 6) + " more</div>";
  }

  // RSVP
  const unr = S.slots.filter((s) => !s.finalized && !(s.attendees ?? []).includes(me()));
  dr.innerHTML = "<h3>📅 RSVP Needed (" + unr.length + ")</h3>";
  if (!unr.length)
    dr.innerHTML += '<div class="dash-em">✅ All caught up!</div>';
  else
    unr.forEach((s) => {
      const d = mk("div", "dash-i");
      const txDiv = mk("div", "tx");
      txDiv.innerHTML = (s.datetime ? longFmt.format(new Date(s.datetime)) : "TBD") +
        (s.location ? " · " + esc(s.location) : "") + "<br><small>" + (s.attendees ?? []).length + " going</small>";
      const ab = mk("button", "btn btn-sm btn-attend");
      ab.textContent = "🙋";
      ab.onclick = (e) => { e.stopPropagation(); s.attendees ??= []; if (!s.attendees.includes(me())) s.attendees.push(me()); save(); renderDash(); };
      d.appendChild(mk("span", "ic")).textContent = "📅";
      d.appendChild(txDiv); d.appendChild(ab);
      d.onclick = () => go("slots");
      dr.appendChild(d);
    });

  // Recent
  const recent = all.toSorted((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 5);
  dc.innerHTML = "<h3>🆕 Recent</h3>";
  if (!recent.length) dc.innerHTML += '<div class="dash-em">Nothing yet!</div>';
  else
    recent.forEach((item) => {
      const d = mk("div", "dash-i dash-recent");
      const txDiv = mk("div", "tx");
      txDiv.innerHTML = esc(itemLabel(item).slice(0, 50)) + "<br><small>by " + esc(item.addedBy || "?") + " · " + (item.votes || 0) + " votes</small>";
      d.appendChild(mk("span", "ic")).textContent = IC[item._t];
      d.appendChild(txDiv);
      d.onclick = () => go(TAB[item._t]);
      dc.appendChild(d);
    });

  // Nav dots
  document.querySelectorAll("#nav button .bdot").forEach((d) => d.remove());
  if (S.songs.some((s) => !s.finalized && !iVoted(s.id))) document.querySelector('[data-v="songs"]').appendChild(mk("span", "bdot"));
  if (S.costumes.some((c) => !c.finalized && !iVoted(c.id))) document.querySelector('[data-v="costumes"]').appendChild(mk("span", "bdot"));
  if (S.slots.some((s) => !s.finalized && (!iVoted(s.id) || !(s.attendees ?? []).includes(me())))) document.querySelector('[data-v="slots"]').appendChild(mk("span", "bdot"));
  if (S.misc.some((m) => !m.finalized && !iVoted(m.id))) document.querySelector('[data-v="misc"]').appendChild(mk("span", "bdot"));

  // Admin: roster + user list
  const du = $("dashUsers");
  du.innerHTML = "";
  if (!S.isAdmin) return;

  const rh = mk("h3");
  rh.textContent = "📋 Member Roster (" + S.roster.length + ")";
  du.appendChild(rh);
  const rHint = mk("div", "dash-hint");
  rHint.textContent = "Members pick their name from this list when setting up their profile.";
  du.appendChild(rHint);

  const rAdd = mk("div", "irow");
  rAdd.innerHTML = '<input id="rosterIn" placeholder="Add member name…"><button class="btn btn-add" id="rosterAdd">＋</button>';
  du.appendChild(rAdd);

  const rList = mk("div", "roster-list");
  const renderRoster = () => {
    rList.innerHTML = "";
    S.roster.slice().sort().forEach((name) => {
      const row = mk("div", "user-row");
      row.innerHTML = "<div><strong>" + esc(name) + "</strong>" +
        (S.users[name] ? ' <span class="dim">✓ joined</span>' : ' <span class="dim">pending</span>') + "</div>";
      if (!S.users[name]) {
        const db = mk("button", "btn btn-icon del");
        db.textContent = "✕";
        db.onclick = async () => {
          if (!(await cDlg("Remove " + name + " from roster?"))) return;
          S.roster = S.roster.filter((n) => n !== name);
          save(); renderRoster();
        };
        row.appendChild(db);
      }
      rList.appendChild(row);
    });
    if (!S.roster.length) {
      const em = mk("div", "dash-em");
      em.textContent = "No members yet — add names above";
      rList.appendChild(em);
    }
  };
  renderRoster();
  du.appendChild(rList);

  du.querySelector("#rosterAdd").onclick = () => {
    const inp = du.querySelector("#rosterIn");
    const name = inp.value.trim();
    if (!name) return;
    if (!S.roster.includes(name)) { S.roster.push(name); save(); }
    inp.value = ""; renderRoster();
  };
  du.querySelector("#rosterIn").onkeydown = (e) => { if (e.key === "Enter") du.querySelector("#rosterAdd").click(); };

  const uKeys = Object.keys(S.users);
  const uh = mk("h3");
  uh.textContent = "👥 Registered Users (" + uKeys.length + ")";
  du.appendChild(uh);
  if (!uKeys.length) {
    const em = mk("div", "dash-em");
    em.textContent = "No users yet";
    du.appendChild(em);
  } else
    uKeys.sort().forEach((name) => {
      const u = S.users[name], r = mk("div", "user-row");
      r.innerHTML = "<div><strong>" + esc(name) + '</strong> <span class="dim">' + (u.location || "no location") +
        '</span></div><div class="dim">' + (u.paypal || "no PayPal") + "</div>";
      du.appendChild(r);
    });
}

let applyCF;
export function setApplyCF(fn) { applyCF = fn; }

export function fullRender() {
  ["songL", "cosL", "slL", "pastL", "miscL"].forEach((id) => ($(id).innerHTML = ""));
  S.songs.forEach((s) => rCard(s, "song", $("songL")));
  S.costumes.forEach((c) => rCard(c, "costume", $("cosL")));
  S.slots.forEach((s) => rCard(s, "slot", $("slL")));
  S.past.forEach((p) => rPast(p));
  S.misc.forEach((m) => rCard(m, "misc", $("miscL")));
  applyCF();
  renderDash();
  updDl();
}
