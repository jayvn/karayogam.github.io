import { $, mk, esc, S, save, me, modal, cDlg } from "/mgroove/shared.js";

export const IC = { song: "🎶", costume: "👗", slot: "📅", misc: "🗳️" };

const shortFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" });
export const longFmt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export function itemLabel(item) {
  if (item._t === "slot") {
    const ds = item.datetime ? shortFmt.format(new Date(item.datetime)) : "Slot";
    return ds + (item.location ? " · " + item.location : "");
  }
  return item.text || "";
}

function xLink(t) { return t.split(/\s/).find((w) => URL.canParse(w)) ?? null; }
function isImg(u) { return /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i.test(u); }
function lbox(src) {
  const l = mk("div", "lb");
  l.innerHTML = '<img src="' + src + '">';
  l.onclick = () => l.remove();
  document.body.appendChild(l);
}

const myVotes = () => S.users[me()]?.votes ?? [];
export const iVoted = (id) => myVotes().includes(id);

export function addMyVote(id) {
  S.users[me()] ??= {};
  S.users[me()].votes ??= [];
  if (!iVoted(id)) S.users[me()].votes.push(id);
}
export function rmMyVote(id) {
  S.users[me()].votes = S.users[me()].votes.filter((x) => x !== id);
}

export function openEd(item, type, cb) {
  let f = "";
  if (type === "song") {
    const link = xLink(item.text || "") || "";
    const name = (item.text || "").replace(link, "").trim();
    f = '<div class="f"><label>Link</label><input id="eTL" value="' + esc(link) + '"></div>' +
        '<div class="f"><label>Name (optional)</label><input id="eT" value="' + esc(name) + '"></div>';
  }
  else if (type === "costume")
    f = '<div class="f"><label>Idea/Link</label><input id="eT" value="' + esc(item.text) + '"></div>' +
      '<div class="f"><label>Gender</label><select id="eG">' +
      ["unisex", "male", "female"].map((g) =>
        '<option value="' + g + '"' + (item.gender === g ? " selected" : "") + ">" + g + "</option>"
      ).join("") + "</select></div>";
  else {
    const dt = item.datetime ? new Date(item.datetime).toISOString().slice(0, 16) : "";
    f = '<div class="f"><label>Date & Time</label><input type="datetime-local" id="eDt" value="' + dt + '"></div>' +
      '<div class="f"><label>Location</label><input id="eLo" value="' + esc(item.location || "") + '"></div>' +
      '<div class="f"><label>Cost €</label><input type="number" id="eCo" value="' + (item.cost || 0) + '" min="0" step="0.01"></div>' +
      '<div class="f"><label>Paid by</label><input id="ePa" value="' + esc(item.payer || "") + '" list="userDl"></div>';
  }
  const m = modal(
    "<h3>✏️ Edit</h3>" + f +
    '<div class="acts"><button class="btn" id="eC">Cancel</button><button class="btn btn-add" id="eS">Save</button></div>',
  );
  m.q("#eC").onclick = m.close;
  m.q("#eS").onclick = () => {
    if (type === "song") {
      const l = m.q("#eTL").value.trim(), n = m.q("#eT").value.trim();
      item.text = l && n ? n + " " + l : l || n || item.text;
    }
    else if (type === "costume") { item.text = m.q("#eT").value.trim() || item.text; item.gender = m.q("#eG").value; }
    else {
      item.datetime = m.q("#eDt").value || item.datetime;
      item.location = m.q("#eLo").value.trim();
      item.cost = parseFloat(m.q("#eCo").value) || 0;
      item.payer = m.q("#ePa").value.trim();
    }
    save(); m.close(); cb();
  };
}

export function rCard(item, type, listEl) {
  const card = mk("div", "card card-" + type + (item.finalized ? " final" : ""));
  card.dataset.id = item.id;
  if (type === "costume") card.dataset.gender = item.gender || "unisex";

  function build() {
    card.innerHTML = "";
    if (type === "costume") card.dataset.gender = item.gender || "unisex";
    card.className = "card card-" + type + (item.finalized ? " final" : "");
    const ic = IC[type], link = xLink(item.text || "");

    let tH = "";
    if (type === "slot") {
      const ds = item.datetime ? longFmt.format(new Date(item.datetime)) : "No date";
      tH = ic + " <strong>" + ds + "</strong>";
      if (item.location) tH += " · 📍 " + esc(item.location);
    } else if (link) {
      const c = (item.text || "").replace(link, "").trim();
      tH = ic + " " + (c ? esc(c) + " " : "") +
        '<a href="' + link + '" target="_blank">' + (link.length > 45 ? link.slice(0, 45) + "…" : link) + "</a>";
    } else tH = ic + " " + esc(item.text || "");

    let meta = '<span class="card-meta dim">by ' + esc(item.addedBy || "?") + "</span>";
    if (type === "slot" && item.cost > 0)
      meta += ' <span class="card-meta dim">· 💰 €' + (+item.cost).toFixed(2) + (item.payer ? " (" + esc(item.payer) + ")" : "") + "</span>";
    if (type === "costume" && item.gender)
      meta += ' <span class="g-badge ' + item.gender + '">' + item.gender + "</span>";

    const top = mk("div", "card-top"), bd = mk("div", "card-body");
    bd.innerHTML = tH + "<div>" + meta + "</div>";

    const imgSrc = item.imageData || (type === "costume" && link && isImg(link) ? link : null);
    if (type === "costume" && imgSrc) {
      const im = mk("img", "costume-thumb");
      im.src = imgSrc;
      im.onclick = () => lbox(imgSrc);
      bd.appendChild(im);
    }

    const btns = mk("div", "card-btns");
    if (!item.finalized) {
      const eb = mk("button", "btn btn-icon");
      eb.textContent = "✏️";
      eb.onclick = () => openEd(item, type, build);
      btns.appendChild(eb);
    }
    {
      const db = mk("button", "btn btn-icon del");
      db.textContent = "✕";
      db.onclick = async () => {
        if (!(await cDlg("Delete this item?"))) return;
        const a = S[type === "misc" ? "misc" : type + "s"], i = a.findIndex((x) => x.id === item.id);
        if (i !== -1) a.splice(i, 1);
        const ei = S.expenses.findIndex((e) => e.sourceId === item.id);
        if (ei !== -1) S.expenses.splice(ei, 1);
        card.remove(); save();
      };
      btns.appendChild(db);
    }
    top.appendChild(bd); top.appendChild(btns); card.appendChild(top);

    const acts = mk("div", "card-actions");
    if (!item.finalized) {
      const vb = mk("button", "btn btn-sm btn-vote" + (iVoted(item.id) ? " voted" : ""));
      vb.textContent = "👍 " + (item.votes || 0);
      vb.onclick = () => {
        if (iVoted(item.id)) { item.votes = Math.max(0, (item.votes || 0) - 1); rmMyVote(item.id); }
        else { item.votes = (item.votes || 0) + 1; addMyVote(item.id); }
        vb.textContent = "👍 " + item.votes;
        vb.classList.toggle("voted", iVoted(item.id));
        save();
      };
      acts.appendChild(vb);
    }

    let attDiv;
    if (type === "slot") {
      const att = new Set(item.attendees ?? []);
      const ab = mk("button", "btn btn-sm btn-attend" + (att.has(me()) ? " going" : ""));
      ab.textContent = "🙋 Going (" + att.size + ")";
      ab.disabled = !!item.finalized;
      ab.onclick = () => {
        const n = me();
        att.has(n) ? att.delete(n) : att.add(n);
        item.attendees = [...att];
        ab.textContent = "🙋 Going (" + att.size + ")";
        ab.classList.toggle("going", att.has(n));
        attDiv.textContent = att.size ? "→ " + [...att].join(", ") : "";
        save();
      };
      acts.appendChild(ab);

      if (item.datetime) {
        const gcb = mk("button", "btn btn-sm");
        gcb.textContent = "📅 Google";
        gcb.title = "Add to Google Calendar";
        gcb.onclick = () => {
          const start = new Date(item.datetime);
          const end = new Date(start.getTime() + 90 * 60000);
          const fmt = (d) => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
          const p = new URLSearchParams({
            action: "TEMPLATE",
            text: "M-Groove Practice" + (item.location ? " @ " + item.location : ""),
            dates: fmt(start) + "/" + fmt(end),
            location: item.location || "",
            details: "M-Groove dance practice session",
          });
          window.open("https://calendar.google.com/calendar/render?" + p, "_blank");
        };
        acts.appendChild(gcb);

        const icb = mk("button", "btn btn-sm");
        icb.textContent = "📥 iCal";
        icb.title = "Download iCal file";
        icb.onclick = () => {
          const start = new Date(item.datetime);
          const end = new Date(start.getTime() + 90 * 60000);
          const fmt = (d) => d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
          const uid = item.id + "@mgroove";
          const ical = [
            "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//M-Groove//EN",
            "BEGIN:VEVENT",
            "UID:" + uid,
            "DTSTART:" + fmt(start),
            "DTEND:" + fmt(end),
            "SUMMARY:M-Groove Practice" + (item.location ? " @ " + item.location : ""),
            "LOCATION:" + (item.location || ""),
            "DESCRIPTION:M-Groove dance practice session",
            "END:VEVENT", "END:VCALENDAR",
          ].join("\r\n");
          const a = mk("a");
          a.href = URL.createObjectURL(new Blob([ical], { type: "text/calendar" }));
          a.download = "mgroove-" + start.toISOString().slice(0, 10) + ".ics";
          a.click(); URL.revokeObjectURL(a.href);
        };
        acts.appendChild(icb);
      }

      attDiv = mk("div", "att-list");
      attDiv.textContent = att.size ? "→ " + [...att].join(", ") : "";
    }

    const fb = mk("button", "btn btn-sm btn-final" + (item.finalized ? " finalized" : ""));
    fb.textContent = item.finalized ? "⏪ Undo" : "🎯 Finalize";
    fb.onclick = () => {
      if (item.finalized) {
        item.finalized = false;
        const ei = S.expenses.findIndex((e) => e.sourceId === item.id);
        if (ei !== -1) S.expenses.splice(ei, 1);
      } else {
        item.finalized = true;
        if (type === "slot" && item.cost > 0 && !S.expenses.find((e) => e.sourceId === item.id))
          S.expenses.push({
            sourceId: item.id,
            title: (item.location || "Session") + (item.datetime ? " " + new Date(item.datetime).toLocaleDateString() : ""),
            cost: +item.cost,
            payer: item.payer || "Group Fund",
            attendees: [...(item.attendees ?? [])],
          });
        if (type !== "slot") {
          const a = S[type === "misc" ? "misc" : type + "s"], i = a.findIndex((x) => x.id === item.id);
          if (i !== -1) a.splice(i, 1);
          S.past.push({ ...item, type, archivedAt: Date.now() });
          save(); card.remove(); return;
        }
      }
      save(); build();
    };
    acts.appendChild(fb);

    if (type === "slot" && item.finalized) {
      const arb = mk("button", "btn btn-sm");
      arb.textContent = "🕰️ Archive";
      arb.onclick = async () => {
        if (!(await cDlg("Archive?"))) return;
        const i = S.slots.findIndex((x) => x.id === item.id);
        if (i !== -1) S.slots.splice(i, 1);
        S.past.push({ ...item, type: "slot", archivedAt: Date.now() });
        save(); card.remove();
      };
      acts.appendChild(arb);
    }
    card.appendChild(acts);
    if (attDiv) card.appendChild(attDiv);
  }
  build();
  listEl.appendChild(card);
}

export function rPast(item) {
  const ic = IC[item.type] || "📌", card = mk("div", "card final");
  const txt = item.type === "slot"
    ? ic + " " + (item.datetime ? shortFmt.format(new Date(item.datetime)) : "") + (item.location ? " · " + esc(item.location) : "")
    : ic + " " + esc(item.text || "");
  card.innerHTML = '<div class="card-top"><div class="card-body">' + txt +
    '<div class="card-meta dim">Archived ' + new Date(item.archivedAt).toLocaleDateString() + "</div></div></div>";
  $("pastL").appendChild(card);
}
