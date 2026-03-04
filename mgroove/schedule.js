import { $, mk } from "/mgroove/shared.js";

const LOC = "Grasmeierstraße 23, 80805 München";
const SCHEDULE = [
  { month: "March", sessions: [
    { date: "2026-03-07", day: "Sat", start: "09:45", end: "14:00" },
    { date: "2026-03-15", day: "Sun", start: "10:00", end: "14:30" },
    { date: "2026-03-22", day: "Sun", start: "09:45", end: "14:30" },
    { date: "2026-03-28", day: "Sat", start: "09:45", end: "14:00" },
    { date: "2026-03-29", day: "Sun", start: "10:00", end: "14:00" },
  ]},
  { month: "April", default: "09:45–14:00", sessions: [
    { date: "2026-04-05", day: "Sun", start: "09:45", end: "14:00" },
    { date: "2026-04-11", day: "Sat", start: "09:45", end: "14:00" },
    { date: "2026-04-12", day: "Sun", start: "09:45", end: "14:00" },
    { date: "2026-04-19", day: "Sun", start: "09:45", end: "14:00" },
    { date: "2026-04-26", day: "Sun", start: "09:45", end: "14:00" },
  ]},
  { month: "May", default: "10:00–14:30", sessions: [
    { date: "2026-05-03", day: "Sun", start: "10:00", end: "14:30" },
    { date: "2026-05-10", day: "Sun", start: "10:00", end: "14:30" },
    { date: "2026-05-16", day: "Sat", start: "10:00", end: "14:30" },
    { date: "2026-05-17", day: "Sun", start: "10:00", end: "14:30" },
    { date: "2026-05-24", day: "Sun", start: "10:00", end: "14:30" },
    { date: "2026-05-31", day: "Sun", start: "10:00", end: "14:30" },
  ]},
];

const SHOW = { date: "2026-06-26", start: "18:00", end: "19:00", loc: "Düsseldorf" };

const allSessions = SCHEDULE.flatMap(m => m.sessions);
const fmtTime = (t) => { const [h, m] = t.split(":"); return (h % 12 || 12) + ":" + m + (h < 12 ? " AM" : " PM"); };
const fmtDay = (date) => new Date(date + "T12:00").toLocaleDateString("en-GB", { month: "short", day: "numeric" });
const fmtDayLong = (date) => new Date(date + "T12:00").toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" });
const icalTs = (date, time) => date.replace(/-/g, "") + "T" + time.replace(/:/g, "") + "00";

function gcalUrl(title, date, start, end, loc) {
  return "https://calendar.google.com/calendar/render?" + new URLSearchParams({
    action: "TEMPLATE", text: title,
    dates: icalTs(date, start) + "/" + icalTs(date, end),
    location: loc, details: "M-Groove dance practice",
    ctz: "Europe/Berlin",
  });
}

function icalEvent(title, date, start, end, loc) {
  return [
    "BEGIN:VEVENT",
    "UID:" + date + "-" + start + "@mgroove",
    "DTSTART;TZID=Europe/Berlin:" + icalTs(date, start),
    "DTEND;TZID=Europe/Berlin:" + icalTs(date, end),
    "SUMMARY:" + title,
    "LOCATION:" + loc,
    "DESCRIPTION:M-Groove dance practice",
    "END:VEVENT",
  ].join("\r\n");
}

function downloadIcal(events, filename) {
  const ical = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//M-Groove//EN\r\n" + events.join("\r\n") + "\r\nEND:VCALENDAR";
  const a = mk("a");
  a.href = URL.createObjectURL(new Blob([ical], { type: "text/calendar" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function calBtns(title, date, start, end, loc) {
  const wrap = mk("span", "sched-cal");
  const gc = mk("a", "btn btn-sm sched-cal-btn");
  gc.textContent = "📅";
  gc.title = "Google Calendar";
  gc.href = gcalUrl(title, date, start, end, loc);
  gc.target = "_blank";
  const ic = mk("button", "btn btn-sm sched-cal-btn");
  ic.textContent = "📥";
  ic.title = "Download iCal";
  ic.onclick = () => downloadIcal([icalEvent(title, date, start, end, loc)], "mgroove-" + date + ".ics");
  wrap.append(gc, ic);
  return wrap;
}

function nextSession() {
  const now = new Date();
  for (const s of allSessions) {
    if (new Date(s.date + "T" + s.end + ":00") > now) return s;
  }
  return null;
}

function daysUntil(date) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const target = new Date(date + "T00:00:00"); target.setHours(0, 0, 0, 0);
  return Math.round((target - now) / 86400000);
}

// Dashboard: just the next upcoming practice
export function renderUpcoming() {
  const el = $("dashUpcoming");
  el.innerHTML = "";
  const next = nextSession();
  if (!next) { el.innerHTML = '<div class="dash-em">No upcoming practices</div>'; return; }

  const days = daysUntil(next.date);
  const label = days === 0 ? "🔴 Today!" : days === 1 ? "Tomorrow" : days + " days away";
  const up = mk("div", "sched-upcoming");
  up.innerHTML =
    '<div class="sched-upcoming-label">⏭️ Next Practice · <strong>' + label + '</strong></div>' +
    '<div class="sched-upcoming-date">' + fmtDayLong(next.date) + '</div>' +
    '<div class="sched-upcoming-time">🕐 ' + fmtTime(next.start) + ' – ' + fmtTime(next.end) + '</div>' +
    '<div class="sched-upcoming-loc">📍 ' + LOC + '</div>';
  const btns = mk("div", "sched-upcoming-btns");
  btns.append(calBtns("M-Groove Practice", next.date, next.start, next.end, LOC));
  up.append(btns);
  el.append(up);
}

// Full schedule tab
export function renderSchedule() {
  const el = $("schedFull");
  el.innerHTML = "";

  // Show banner
  const banner = mk("div", "sched-banner");
  banner.innerHTML =
    '<div class="sched-banner-title">🎉 Show Day</div>' +
    '<div class="sched-banner-date">📅 Friday, 26th June · 6:00–7:00 PM</div>' +
    '<div class="sched-banner-loc">📍 Düsseldorf</div>' +
    '<div class="sched-banner-note">🎭 Stage practice: 25th June · Düsseldorf</div>';
  const bannerCal = mk("div", "sched-banner-cal");
  bannerCal.append(calBtns("M-Groove Show", SHOW.date, SHOW.start, SHOW.end, SHOW.loc));
  banner.append(bannerCal);
  el.append(banner);

  // Address
  const addr = mk("div", "sched-addr");
  addr.innerHTML = '📍 All practice sessions at: <strong><a href="' + LOC_URL + '" target="_blank">' + LOC + '</a></strong>';
  el.append(addr);

  // Hint
  const hint = mk("div", "sched-hint");
  hint.textContent = "📅 = add to Google Calendar · 📥 = download .ics file for Apple/Outlook";
  el.append(hint);

  // Title + Add All
  const hdr = mk("div", "sched-hdr");
  hdr.innerHTML = "<h3>📅 Practice Schedule</h3>";
  const allBtn = mk("button", "btn btn-sm btn-add");
  allBtn.textContent = "📥 Add All to Calendar";
  allBtn.onclick = () => {
    const events = [];
    for (const m of SCHEDULE) for (const s of m.sessions)
      events.push(icalEvent("M-Groove Practice", s.date, s.start, s.end, LOC));
    events.push(icalEvent("M-Groove Show", SHOW.date, SHOW.start, SHOW.end, SHOW.loc));
    downloadIcal(events, "mgroove-all-practices.ics");
  };
  hdr.append(allBtn);
  el.append(hdr);

  const next = nextSession();

  // Months
  for (const m of SCHEDULE) {
    const sec = mk("div", "sched-month");
    const title = mk("div", "sched-month-title");
    title.innerHTML = m.month + (m.default ? ' <span class="sched-default-time">' + m.default + '</span>' : "");
    sec.append(title);

    for (const s of m.sessions) {
      const isPast = new Date(s.date + "T" + s.end + ":00") < new Date();
      const isNext = next && s.date === next.date;
      const row = mk("div", "sched-row" + (isPast ? " sched-past" : "") + (isNext ? " sched-next" : ""));
      const day = mk("span", "sched-day");
      day.textContent = s.day + ", " + fmtDay(s.date);
      const time = mk("span", "sched-time");
      time.textContent = m.default ? "" : fmtTime(s.start) + " – " + fmtTime(s.end);
      row.append(day, time, calBtns("M-Groove Practice", s.date, s.start, s.end, LOC));
      sec.append(row);
    }
    el.append(sec);
  }
}
