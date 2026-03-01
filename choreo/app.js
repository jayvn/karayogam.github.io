// ChoreoMarker - Choreography marking tool for dance rehearsals

// IndexedDB — reuse a single connection
let _db = null;
const openDB = () => _db ? Promise.resolve(_db) : new Promise(resolve => {
  const req = indexedDB.open('ChoreoMarkerDB', 2);
  req.onupgradeneeded = e => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
  };
  req.onsuccess = () => { _db = req.result; resolve(_db); };
});

const saveAudioToDB = async (blob, fileName) => {
  const db = await openDB();
  const tx = db.transaction('audio', 'readwrite');
  tx.objectStore('audio').put({ blob, fileName }, 'current');
};

const loadAudioFromDB = async () => {
  const db = await openDB();
  return new Promise(resolve => {
    const req = db.transaction('audio', 'readonly').objectStore('audio').get('current');
    req.onsuccess = () => resolve(req.result);
  });
};

const deleteAudioFromDB = async () => {
  const db = await openDB();
  db.transaction('audio', 'readwrite').objectStore('audio').delete('current');
  _db = null;
};

// Utils
const formatTime = s => {
  if (!s && s !== 0) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

const getInitials = name => {
  if (!name) return "?";
  const p = name.trim().split(' ');
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase().padEnd(2, name[0].toUpperCase());
};

const COLORS = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

// State
const state = {
  audioSrc: null, fileName: "", isPlaying: false, currentTime: 0, duration: 0,
  bookmarks: [], dancers: [], positions: {},
  draggedId: null, editingDancer: null, editingBookmarkId: null,
  showDancers: true, isLoading: false, animationId: null
};

// DOM refs
let audio, stage, waveformCanvas, waveform, fileInput, jsonInput, bookmarksContainer;

// Audio Context & Waveform
let audioCtx = null;
const getAudioCtx = () => audioCtx || (audioCtx = new (window.AudioContext || window.webkitAudioContext)());

class Waveform {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.buffer = null;
  }

  async load(src) {
    this.canvas.width = this.canvas.offsetWidth || 800;
    const data = await fetch(src).then(r => r.arrayBuffer());
    const ctx = getAudioCtx();
    if (ctx.state === 'suspended') {
      this._pendingData = data;
      const resume = async () => {
        if (!this._pendingData) return;
        this.buffer = await getAudioCtx().decodeAudioData(this._pendingData);
        this._pendingData = null;
        this.draw();
      };
      document.addEventListener('click', resume, { once: true });
      document.addEventListener('keydown', resume, { once: true });
      return;
    }
    this.buffer = await ctx.decodeAudioData(data);
    this.draw();
  }

  draw() {
    if (!this.buffer) return;
    const { width, height } = this.canvas;
    const ctx = this.ctx;
    const data = this.buffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    const progress = state.duration ? state.currentTime / state.duration : 0;

    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    for (let i = 0; i < width; i++) {
      let min = 1, max = -1;
      for (let j = 0; j < step; j++) {
        const d = data[i * step + j];
        if (d < min) min = d;
        if (d > max) max = d;
      }
      ctx.fillStyle = i / width < progress ? '#818cf8' : '#374151';
      ctx.fillRect(i, (height - Math.max(2, (max - min) * amp)) / 2, 1, Math.max(2, (max - min) * amp));
    }

    state.bookmarks.forEach(m => {
      if (!state.duration) return;
      const x = (m.time / state.duration) * width;
      ctx.fillStyle = m.type === 'manual' ? '#f97316' : '#10b981';
      ctx.fillRect(x, 0, 2, height);
      ctx.beginPath();
      ctx.moveTo(x - 4, 0);
      ctx.lineTo(x + 4, 0);
      ctx.lineTo(x, 6);
      ctx.fill();
    });
  }
}

// Storage
const save = () => {
  if (state.isLoading) return;
  localStorage.setItem('choreo_dancers', JSON.stringify(state.dancers));
  localStorage.setItem('choreo_bookmarks', JSON.stringify(state.bookmarks));
  localStorage.setItem('choreo_positions', JSON.stringify(state.positions));
  localStorage.setItem('choreo_fileName', state.fileName);
};

const load = () => {
  state.dancers = JSON.parse(localStorage.getItem('choreo_dancers') || '[]');
  state.bookmarks = JSON.parse(localStorage.getItem('choreo_bookmarks') || '[]');
  state.positions = JSON.parse(localStorage.getItem('choreo_positions') || '{}');
  state.fileName = localStorage.getItem('choreo_fileName') || '';
};

// Position tracking
const updatePositions = time => {
  state.dancers.forEach(d => {
    const mark = state.bookmarks
      .filter(b => b.time <= time && b.positions?.[d.id])
      .sort((a, b) => b.time - a.time)[0];
    state.positions[d.id] = mark?.positions[d.id] || state.positions[d.id] || { x: 50, y: 50 };
  });
};

const recordMovement = (id, pos) => {
  state.positions[id] = pos;
  const dancer = state.dancers.find(d => d.id === id);
  const initials = getInitials(dancer?.name);
  const existing = state.bookmarks.find(b => b.type === 'movement' && Math.abs(b.time - state.currentTime) < 0.1);

  if (existing) {
    if (!existing.name.includes(initials)) existing.name += `, ${initials}`;
    existing.positions = { ...existing.positions, [id]: pos };
  } else {
    state.bookmarks.push({
      id: Date.now(), time: state.currentTime, type: 'movement',
      name: `Mov: ${initials}`, positions: { ...state.positions }
    });
    state.bookmarks.sort((a, b) => a.time - b.time);
  }
  save();
};

// Audio controls
const togglePlay = async () => {
  if (!audio) return;
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') await ctx.resume();

  if (state.isPlaying) {
    audio.pause();
    cancelAnimationFrame(state.animationId);
  } else {
    audio.play();
    animationLoop();
  }
  state.isPlaying = !state.isPlaying;
  renderPlayer();
};

const animationLoop = () => {
  if (!state.isPlaying) return;
  state.currentTime = audio.currentTime;
  if (!state.draggedId) updatePositions(state.currentTime);
  updatePlayerUI();
  renderStage();
  state.animationId = requestAnimationFrame(animationLoop);
};

const seek = time => {
  if (!audio) return;
  audio.currentTime = time;
  state.currentTime = time;
  updatePositions(time);
  updatePlayerUI();
  renderStage();
};

// Bookmarks
const addBookmark = () => {
  state.bookmarks.push({
    id: Date.now(), time: state.currentTime, type: 'manual',
    name: 'Note', positions: JSON.parse(JSON.stringify(state.positions))
  });
  state.bookmarks.sort((a, b) => a.time - b.time);
  save();
  renderTimeline();
  waveform?.draw();
  setTimeout(() => bookmarksContainer?.scrollTo(0, bookmarksContainer.scrollHeight), 100);
};

const jumpTo = b => {
  seek(b.time);
  updateTimelineHighlight();
};

// Dancers
const addDancer = async () => {
  const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
  const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
  const cfg = { apiKey: "AIzaSyDGrq3qdR3pqHc0dQMXnE20c2wcLOINN-8", authDomain: "rendercode-d73da.firebaseapp.com", projectId: "rendercode-d73da", appId: "1:798989930424:web:7f324e5153cabc5d90494d" };
  const fbApp = getApps().length ? getApps()[0] : initializeApp(cfg);
  const snap = await getDoc(doc(getFirestore(fbApp), "mgroove", "v1"));
  const roster = snap.exists() ? (snap.data().roster || []) : [];

  const available = roster.filter(name => !state.dancers.find(d => d.name === name));
  if (!available.length) return alert("All roster members already added.");

  const dlg = document.createElement('dialog');
  dlg.className = 'fixed inset-0 bg-gray-900 rounded-xl p-4 shadow-2xl border border-gray-700 max-w-xs w-full';
  dlg.innerHTML = `<h3 class="font-semibold text-gray-200 mb-3">Add Dancer</h3>
    <div class="space-y-1 max-h-64 overflow-y-auto">${available.map(n =>
      `<button class="w-full text-left px-3 py-2 rounded-lg hover:bg-indigo-600 text-gray-100 text-sm" data-name="${n}">${n}</button>`
    ).join('')}</div>
    <button id="dlg-cancel" class="mt-3 w-full py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm">Cancel</button>`;
  document.body.appendChild(dlg);
  dlg.showModal();

  const pick = name => {
    dlg.close(); dlg.remove();
    const d = { id: `d_${Date.now()}`, name, color: COLORS[state.dancers.length % COLORS.length] };
    state.dancers.push(d);
    state.positions[d.id] = { x: 50, y: 50 };
    save(); renderStage(); renderDancers();
  };
  dlg.querySelectorAll('[data-name]').forEach(btn => btn.onclick = () => pick(btn.dataset.name));
  dlg.querySelector('#dlg-cancel').onclick = () => { dlg.close(); dlg.remove(); };
};

const deleteDancer = id => {
  state.dancers = state.dancers.filter(d => d.id !== id);
  delete state.positions[id];
  state.bookmarks.forEach(b => b.positions && delete b.positions[id]);
  state.editingDancer = null;
  save();
  renderStage();
  renderDancers();
  renderTimeline();
  renderModal();
};

// Drag handling
const startDrag = (e, id) => {
  if (e.type === 'touchstart') document.body.style.overflow = 'hidden';
  if (state.isPlaying) { audio.pause(); state.isPlaying = false; }
  state.draggedId = id;
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', endDrag);
  window.addEventListener('touchmove', onDrag, { passive: false });
  window.addEventListener('touchend', endDrag);
};

const onDrag = e => {
  if (!state.draggedId || !stage) return;
  const touch = e.touches?.[0] || e;
  const rect = stage.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, ((touch.clientX - rect.left) / rect.width) * 100));
  const y = Math.max(0, Math.min(100, ((touch.clientY - rect.top) / rect.height) * 100));
  state.positions[state.draggedId] = { x, y };
  renderStage();
};

const endDrag = () => {
  document.body.style.overflow = '';
  if (state.draggedId) {
    recordMovement(state.draggedId, state.positions[state.draggedId]);
    state.draggedId = null;
  }
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', endDrag);
  window.removeEventListener('touchmove', onDrag);
  window.removeEventListener('touchend', endDrag);
  renderTimeline();
};

// Import/Export
const exportData = () => {
  const blob = new Blob([JSON.stringify({ version: 1, meta: { audioFile: state.fileName }, dancers: state.dancers, bookmarks: state.bookmarks, positions: state.positions }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.fileName?.split('.')[0] || 'choreo'}_data.json`;
  a.click();
};

const importData = e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const data = JSON.parse(ev.target.result);
    if (data.dancers) state.dancers = data.dancers;
    if (data.bookmarks) state.bookmarks = data.bookmarks;
    if (data.positions) state.positions = data.positions;
    state.currentTime = 0;
    if (audio) audio.currentTime = 0;
    save();
    renderAll();
  };
  reader.readAsText(file);
  e.target.value = null;
};

const clearStorage = async () => {
  if (!confirm('Clear all saved data including audio file?')) return;
  ['choreo_dancers', 'choreo_bookmarks', 'choreo_positions', 'choreo_fileName'].forEach(k => localStorage.removeItem(k));
  await deleteAudioFromDB();
  if (state.audioSrc) URL.revokeObjectURL(state.audioSrc);
  Object.assign(state, { dancers: [], bookmarks: [], positions: {}, fileName: '', audioSrc: null, isPlaying: false, currentTime: 0, duration: 0 });
  renderAll();
};

const handleAudioUpload = async e => {
  const file = e.target.files[0];
  if (!file) return;
  if (state.audioSrc) URL.revokeObjectURL(state.audioSrc);

  state.audioSrc = URL.createObjectURL(file);
  state.fileName = file.name;
  state.bookmarks = [];
  state.isPlaying = false;
  state.currentTime = 0;

  audio.src = state.audioSrc;
  await saveAudioToDB(file, file.name);
  save();
  // force player rebuild for new audio
  document.getElementById('player-container').innerHTML = '';
  renderPlayer();
  renderStage();
  renderTimeline();
  document.getElementById('upload-btn-text').textContent = state.fileName;
};

// Rendering

// Full reset render — only for import/clear/init
const renderAll = () => {
  renderStage();
  renderPlayer();
  renderDancers();
  renderTimeline();
  renderModal();
  waveform?.draw();
  const btnText = document.getElementById('upload-btn-text');
  if (btnText) btnText.textContent = state.fileName || 'Upload Audio';
};

// Stage: uses CSS transform for GPU-composited moves; only rebuilds DOM when dancer set changes
const renderStage = () => {
  const content = stage?.querySelector('.stage-content');
  if (!content) return;

  const currentIds = state.dancers.map(d => d.id).join(',');
  if (content.dataset.dancerIds !== currentIds) {
    content.dataset.dancerIds = currentIds;
    content.innerHTML = state.dancers.map(d => {
      const p = state.positions[d.id] || { x: 50, y: 50 };
      return `<div data-id="${d.id}" class="absolute w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shadow-xl z-10 touch-none select-none hover:scale-110" style="left:${p.x}%;top:${p.y}%;transform:translate(-50%,-50%);background:${d.color};cursor:grab;border:3px solid rgba(255,255,255,0.9)" title="${d.name}">${getInitials(d.name)}<div class="absolute -bottom-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white/90"></div></div>`;
    }).join('');
    state.dancers.forEach(d => {
      const el = content.querySelector(`[data-id="${d.id}"]`);
      el?.addEventListener('mousedown', e => startDrag(e, d.id));
      el?.addEventListener('touchstart', e => startDrag(e, d.id));
    });
  } else {
    state.dancers.forEach(d => {
      const el = content.querySelector(`[data-id="${d.id}"]`);
      if (!el) return;
      const p = state.positions[d.id] || { x: 50, y: 50 };
      el.style.left = `${p.x}%`;
      el.style.top = `${p.y}%`;
      el.style.cursor = state.draggedId === d.id ? 'grabbing' : 'grab';
      el.style.background = d.color;
      el.title = d.name;
      el.childNodes[0].textContent = getInitials(d.name);
    });
  }
};

const renderPlayer = () => {
  const container = document.getElementById('player-container');
  if (!container) return;

  if (!state.audioSrc) {
    if (!container.querySelector('#upload-prompt')) {
      container.innerHTML = `<div id="upload-prompt" class="h-24 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-800"><span class="flex items-center gap-2">⬆️ Load Audio</span></div>`;
      container.querySelector('#upload-prompt').onclick = () => fileInput.click();
    }
    return;
  }

  if (!container.querySelector('#seek-slider')) {
    container.innerHTML = `
      <div class="space-y-4">
        <div class="relative h-16 w-full bg-gray-950 rounded-lg overflow-hidden">
          <canvas id="waveform-canvas" width="800" height="64" class="w-full h-16 rounded-lg opacity-90"></canvas>
          <input type="range" id="seek-slider" min="0" max="${state.duration || 1}" value="${state.currentTime}" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"/>
          <div id="progress-bar" class="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-10 shadow-[0_0_10px_rgba(255,255,255,0.5)]" style="left:0%"><div class="absolute -top-1 -ml-[6px] w-[13px] h-[13px] bg-white rounded-full shadow-md"></div></div>
        </div>
        <div class="flex items-center justify-between gap-4">
          <div id="time-display" class="font-mono text-xs text-gray-400 w-12">0:00</div>
          <div class="flex items-center gap-6">
            <button id="rw-btn" class="p-2 text-gray-400 hover:text-white">⏪</button>
            <button id="play-btn" class="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all">▶️</button>
            <button id="ff-btn" class="p-2 text-gray-400 hover:text-white">⏩</button>
          </div>
          <div id="dur-display" class="font-mono text-xs text-gray-400 w-12 text-right">0:00</div>
        </div>
        <button id="mark-btn" class="w-full bg-indigo-600 hover:bg-indigo-500 py-3 text-lg font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 text-white shadow-lg shadow-indigo-500/20">📝 Mark at 0:00</button>
      </div>`;

    waveformCanvas = document.getElementById('waveform-canvas');
    waveform = new Waveform(waveformCanvas);
    if (state.audioSrc) waveform.load(state.audioSrc);

    document.getElementById('seek-slider').oninput = e => seek(parseFloat(e.target.value));
    document.getElementById('play-btn').onclick = togglePlay;
    document.getElementById('rw-btn').onclick = () => seek(audio.currentTime - 5);
    document.getElementById('ff-btn').onclick = () => seek(audio.currentTime + 5);
    document.getElementById('mark-btn').onclick = addBookmark;
  }

  document.getElementById('play-btn').textContent = state.isPlaying ? '⏸️' : '▶️';
  document.getElementById('dur-display').textContent = formatTime(state.duration);
  document.getElementById('seek-slider').max = state.duration || 0;
  updatePlayerUI();
};

const updatePlayerUI = () => {
  if (!state.audioSrc) return;
  const slider = document.getElementById('seek-slider');
  if (slider && document.activeElement !== slider) slider.value = state.currentTime;
  document.getElementById('time-display').textContent = formatTime(state.currentTime);
  const bar = document.getElementById('progress-bar');
  if (bar) bar.style.left = `${state.duration ? (state.currentTime / state.duration) * 100 : 0}%`;
  const markBtn = document.getElementById('mark-btn');
  if (markBtn) markBtn.textContent = `📝 Mark at ${formatTime(state.currentTime)}`;
  waveform?.draw();
};

const renderDancers = () => {
  const container = document.getElementById('dancers-list');
  if (!container || !state.dancers.length) { if (container) container.innerHTML = ''; return; }

  container.innerHTML = `
    <div class="space-y-3">
      <div id="dancers-toggle" class="flex items-center justify-between px-2 cursor-pointer hover:bg-gray-800/30 rounded-lg p-2">
        <h2 class="font-semibold text-gray-300">Dancers (${state.dancers.length})</h2>
        <span class="text-gray-400">${state.showDancers ? '▼' : '▶'}</span>
      </div>
      ${state.showDancers ? `<div class="space-y-2">${state.dancers.map(d => `
        <div class="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" style="background:${d.color}">${getInitials(d.name)}</div>
            <span class="text-gray-100">${d.name}</span>
          </div>
          <div class="flex gap-2">
            <button class="p-2 text-gray-400 hover:text-white" data-edit="${d.id}">✏️</button>
            <button class="p-2 text-gray-400 hover:text-red-400" data-del="${d.id}">🗑️</button>
          </div>
        </div>`).join('')}</div>` : ''}
    </div>`;

  document.getElementById('dancers-toggle').onclick = () => { state.showDancers = !state.showDancers; renderDancers(); };
  state.dancers.forEach(d => {
    container.querySelector(`[data-edit="${d.id}"]`)?.addEventListener('click', () => { state.editingDancer = d; renderModal(); setTimeout(() => document.getElementById('edit-dancer-input')?.focus(), 0); });
    container.querySelector(`[data-del="${d.id}"]`)?.addEventListener('click', () => deleteDancer(d.id));
  });
};

// Timeline: full rebuild only when bookmarks change; highlight update is in-place
const renderTimeline = () => {
  const container = document.getElementById('timeline-container');
  if (!container) return;
  if (!state.bookmarks.length) { container.innerHTML = ''; return; }

  container.innerHTML = `
    <div class="space-y-3 pb-24 md:pb-6">
      <div class="flex items-center justify-between px-2">
        <h2 class="font-semibold text-gray-300">Timeline (${state.bookmarks.length})</h2>
        <button id="clear-marks" class="text-gray-400 hover:text-white text-xs px-2 py-1">Clear All</button>
      </div>
      <div id="bookmarks-scroll" class="space-y-2 max-h-[400px] overflow-y-auto pr-2">
        ${state.bookmarks.map(b => {
          const isMov = b.type === 'movement';
          const isCurrent = Math.abs(state.currentTime - b.time) < 0.5;
          return `<div data-bid="${b.id}" class="flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${isCurrent ? 'bg-gray-800 border-gray-600' : 'bg-gray-900 border-gray-800 hover:bg-gray-800/50'} border-l-4 ${isMov ? 'border-l-emerald-500' : 'border-l-orange-500'}">
            <div class="flex items-center gap-3 flex-1">
              <div class="font-mono text-xs text-gray-500 w-10">${formatTime(b.time)}</div>
              <span class="${isMov ? 'text-emerald-500' : 'text-orange-500'}">${isMov ? '🚶' : '📝'}</span>
              <span class="bm-name ${isMov ? 'text-emerald-400' : 'text-orange-400'} font-medium truncate">${b.name}</span>
            </div>
            <div class="flex gap-1">
              <button data-edit-mark="${b.id}" class="p-2 text-gray-600 hover:text-white">✏️</button>
              <button data-del-mark="${b.id}" class="p-2 text-gray-600 hover:text-red-400">🗑️</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  bookmarksContainer = document.getElementById('bookmarks-scroll');

  // Event delegation — one listener handles all bookmark interactions
  container.onclick = e => {
    const delBtn = e.target.closest('[data-del-mark]');
    const editBtn = e.target.closest('[data-edit-mark]');
    const row = e.target.closest('[data-bid]');

    if (delBtn) {
      const id = parseInt(delBtn.dataset.delMark);
      state.bookmarks = state.bookmarks.filter(x => x.id !== id);
      save(); renderTimeline(); waveform?.draw();
      return;
    }
    if (editBtn) {
      const id = parseInt(editBtn.dataset.editMark);
      const b = state.bookmarks.find(x => x.id === id);
      const name = prompt('Rename mark:', b.name);
      if (name !== null) { b.name = name.trim() || b.name; save(); renderTimeline(); }
      return;
    }
    if (row) {
      const id = parseInt(row.dataset.bid);
      const b = state.bookmarks.find(x => x.id === id);
      if (b) jumpTo(b);
    }
  };

  document.getElementById('clear-marks').onclick = e => {
    e.stopPropagation();
    if (!confirm('Clear all timeline marks?')) return;
    state.bookmarks = []; save(); renderTimeline(); waveform?.draw();
  };
};

// Update only the active-row highlight without rebuilding the timeline
const updateTimelineHighlight = () => {
  const container = document.getElementById('timeline-container');
  if (!container) return;
  container.querySelectorAll('[data-bid]').forEach(el => {
    const b = state.bookmarks.find(x => x.id === parseInt(el.dataset.bid));
    if (!b) return;
    const isCurrent = Math.abs(state.currentTime - b.time) < 0.5;
    el.classList.toggle('bg-gray-800', isCurrent);
    el.classList.toggle('border-gray-600', isCurrent);
    el.classList.toggle('bg-gray-900', !isCurrent);
    el.classList.toggle('border-gray-800', !isCurrent);
  });
};

const renderModal = () => {
  const modal = document.getElementById('edit-dancer-modal');
  if (!modal) return;
  if (!state.editingDancer) { modal.style.display = 'none'; modal.innerHTML = ''; return; }

  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="bg-gray-800 rounded-2xl p-6 w-full max-w-sm border border-gray-700">
      <h3 class="text-lg font-semibold mb-4">Edit Dancer</h3>
      <input id="edit-dancer-input" class="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white mb-3" value="${state.editingDancer.name}"/>
      <div class="flex gap-2 mb-4 flex-wrap">
        ${COLORS.map(c => `<button data-color="${c}" class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${c === state.editingDancer.color ? 'border-white scale-110' : 'border-transparent'}" style="background:${c}"></button>`).join('')}
      </div>
      <div class="flex justify-between gap-3">
        <button id="modal-delete" class="bg-red-500/10 text-red-400 hover:bg-red-500/20 px-4 py-2 rounded-xl">Delete</button>
        <div class="flex gap-2">
          <button id="modal-cancel" class="bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded-xl">Cancel</button>
          <button id="modal-save" class="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl">Save</button>
        </div>
      </div>
    </div>`;

  const input = document.getElementById('edit-dancer-input');
  const saveName = () => {
    const dancer = state.dancers.find(d => d.id === state.editingDancer.id);
    dancer.name = input.value;
    dancer.color = state.editingDancer.color;
    state.editingDancer = null;
    save();
    renderStage();
    renderDancers();
    renderModal();
  };
  modal.querySelectorAll('[data-color]').forEach(btn => {
    btn.onclick = () => {
      state.editingDancer.color = btn.dataset.color;
      modal.querySelectorAll('[data-color]').forEach(b => { b.classList.toggle('border-white', b === btn); b.classList.toggle('border-transparent', b !== btn); });
    };
  });
  document.getElementById('modal-delete').onclick = () => deleteDancer(state.editingDancer.id);
  document.getElementById('modal-cancel').onclick = () => { state.editingDancer = null; renderModal(); };
  document.getElementById('modal-save').onclick = saveName;
  input.onkeydown = e => e.key === 'Enter' && saveName();
};

// Init
const init = async () => {
  audio = document.getElementById('audio-element');
  stage = document.getElementById('stage');
  fileInput = document.getElementById('file-input');
  jsonInput = document.getElementById('json-input');

  audio.addEventListener('loadedmetadata', () => { state.duration = audio.duration; renderPlayer(); });
  audio.addEventListener('ended', () => { state.isPlaying = false; renderPlayer(); });
  audio.addEventListener('timeupdate', () => { if (!state.isPlaying) { state.currentTime = audio.currentTime; updatePositions(state.currentTime); updatePlayerUI(); renderStage(); } });

  fileInput.onchange = handleAudioUpload;
  jsonInput.onchange = importData;

  document.getElementById('upload-audio-btn').onclick = () => fileInput.click();
  document.getElementById('import-btn').onclick = () => jsonInput.click();
  document.getElementById('export-btn').onclick = exportData;
  document.getElementById('clear-storage-btn').onclick = clearStorage;
  document.getElementById('add-dancer-btn').onclick = addDancer;

  document.addEventListener('keydown', e => {
    if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (state.audioSrc) togglePlay();
    }
  });

  state.isLoading = true;
  load();

  // Auto-add mgroove user as dancer if signed in there and on roster
  try {
    const mgroove = JSON.parse(localStorage.getItem('mgroove_local') || '{}');
    const alias = mgroove?.profile?.alias;
    if (alias && !state.dancers.find(d => d.name === alias)) {
      const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js");
      const { getFirestore, doc, getDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
      const cfg = { apiKey: "AIzaSyDGrq3qdR3pqHc0dQMXnE20c2wcLOINN-8", authDomain: "rendercode-d73da.firebaseapp.com", projectId: "rendercode-d73da", appId: "1:798989930424:web:7f324e5153cabc5d90494d" };
      const fbApp = getApps().length ? getApps()[0] : initializeApp(cfg);
      const snap = await getDoc(doc(getFirestore(fbApp), "mgroove", "v1"));
      const roster = snap.exists() ? (snap.data().roster || []) : [];
      if (roster.includes(alias)) {
        const d = { id: `d_${Date.now()}`, name: alias, color: COLORS[state.dancers.length % COLORS.length] };
        state.dancers.push(d);
        state.positions[d.id] = { x: 50, y: 50 };
      }
    }
  } catch {}

  const audioData = await loadAudioFromDB();
  if (audioData?.blob) {
    state.audioSrc = URL.createObjectURL(audioData.blob);
    audio.src = state.audioSrc;
  }
  state.isLoading = false;
  renderAll();
};

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/choreo/sw.js'));
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
