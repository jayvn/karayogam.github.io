import { $, mk, esc, S, me, updDl } from "/mgroove/shared.js";
import { IC, iVoted, itemLabel, rCard } from "/mgroove/cards.js";

export let go;
export function setGo(fn) { go = fn; }

export const TAB = { song: "songs", costume: "costumes", misc: "misc" };

export function renderDash() {
  const dc = $("dashRecent");
  dc.innerHTML = "";

  const all = [
    ...S.songs.map((s) => ({ ...s, _t: "song" })),
    ...S.costumes.map((c) => ({ ...c, _t: "costume" })),
    ...S.misc.map((m) => ({ ...m, _t: "misc" })),
  ];

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

  if (S.songs.some((s) => !iVoted(s.id))) document.querySelector('[data-v="songs"]').appendChild(mk("span", "bdot"));
  if (S.costumes.some((c) => !iVoted(c.id))) document.querySelector('[data-v="costumes"]').appendChild(mk("span", "bdot"));
  if (S.misc.some((m) => !iVoted(m.id))) document.querySelector('[data-v="misc"]').appendChild(mk("span", "bdot"));

}

let applyCF;
export function setApplyCF(fn) { applyCF = fn; }

let renderSched;
export function setRenderSched(fn) { renderSched = fn; }

export function fullRender() {
  ["songL", "cosL", "miscL"].forEach((id) => ($(id).innerHTML = ""));
  const byNew = (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0);
  [...S.songs].sort(byNew).forEach((s) => rCard(s, "song", $("songL")));
  [...S.costumes].sort(byNew).forEach((c) => rCard(c, "costume", $("cosL")));
  [...S.misc].sort(byNew).forEach((m) => rCard(m, "misc", $("miscL")));
  applyCF();
  renderSched?.();
  renderDash();
  updDl();
}
