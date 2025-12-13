import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Plus,
  Trash2,
  Upload,
  Music,
  Move,
  X,
  Type,
  Edit2,
  Check,
  Download,
  FileJson
} from 'lucide-react';

const formatTime = (seconds) => {
  if (!seconds && seconds !== 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mDisplay = m < 10 && h > 0 ? "0" + m : m;
  const sDisplay = s < 10 ? "0" + s : s;
  return h > 0 ? `${h}:${mDisplay}:${sDisplay}` : `${mDisplay}:${sDisplay}`;
};

const getInitials = (name) => {
  if (!name) return "?";
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const generateColor = (id) => {
    const colors = ['#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return colors[id % colors.length];
};

const Button = ({ children, onClick, variant = "primary", className = "", ...props }) => {
  const baseClass = "px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 active:scale-95 touch-manipulation";
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-500 focus:ring-indigo-500 text-white shadow-lg shadow-indigo-500/20",
    secondary: "bg-gray-700 hover:bg-gray-600 focus:ring-gray-500 text-gray-100",
    danger: "bg-red-500/10 text-red-400 hover:bg-red-500/20 focus:ring-red-500",
    ghost: "bg-transparent hover:bg-white/5 focus:ring-white/20 text-gray-400 hover:text-white"
  };
  return <button onClick={onClick} className={`${baseClass} ${variants[variant]} ${className}`} {...props}>{children}</button>;
};

const Waveform = ({ audioSrc, progress, markers, duration }) => {
    const canvasRef = useRef(null);
    const [audioBuffer, setAudioBuffer] = useState(null);

    useEffect(() => {
        if (!audioSrc) return;
        const fetchAudio = async () => {
            try {
                const response = await fetch(audioSrc);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
                setAudioBuffer(decodedBuffer);
            } catch (e) {
                console.error(e);
            }
        };
        fetchAudio();
    }, [audioSrc]);

    useEffect(() => {
        if (!canvasRef.current || !audioBuffer) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        const data = audioBuffer.getChannelData(0);
        const step = Math.ceil(data.length / width);
        const amp = height / 2;

        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, width, height);

        ctx.beginPath();
        for (let i = 0; i < width; i++) {
            let min = 1.0;
            let max = -1.0;
            for (let j = 0; j < step; j++) {
                const datum = data[(i * step) + j];
                if (datum < min) min = datum;
                if (datum > max) max = datum;
            }
            ctx.fillStyle = i / width < progress ? '#818cf8' : '#374151';
            const barHeight = Math.max(2, (max - min) * amp);
            const y = (height - barHeight) / 2;
            ctx.fillRect(i, y, 1, barHeight);
        }

        markers.forEach(m => {
            if (!duration) return;
            const x = (m.time / duration) * width;
            ctx.fillStyle = m.type === 'manual' ? '#f97316' : '#10b981';
            ctx.fillRect(x, 0, 2, height);

            ctx.beginPath();
            ctx.moveTo(x - 3, 0);
            ctx.lineTo(x + 5, 0);
            ctx.lineTo(x + 1, 6);
            ctx.fill();
        });

    }, [audioBuffer, progress, markers, duration]);

    return (
        <canvas ref={canvasRef} width={800} height={64} className="w-full h-16 rounded-lg opacity-90" />
    );
};

function App() {
  const [audioSrc, setAudioSrc] = useState(null);
  const [fileName, setFileName] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [bookmarks, setBookmarks] = useState([]);
  const [dancers, setDancers] = useState([]);
  const [currentPositions, setCurrentPositions] = useState({});

  const [draggedDancerId, setDraggedDancerId] = useState(null);
  const [editingDancer, setEditingDancer] = useState(null);
  const [editingBookmarkId, setEditingBookmarkId] = useState(null);
  const [tempBookmarkName, setTempBookmarkName] = useState("");
  const [showDancers, setShowDancers] = useState(false);

  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const bookmarksRef = useRef(null);
  const stageRef = useRef(null);
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    return () => { if (audioSrc) URL.revokeObjectURL(audioSrc); };
  }, [audioSrc]);

  const togglePlay = () => {
    if (audioRef.current) {
      isPlaying ? audioRef.current.pause() : audioRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const updatePositionsFromTime = (time) => {
    const newPositions = {};

    dancers.forEach(dancer => {
        const hasHistory = bookmarks.some(b => b.positions && b.positions[dancer.id]);

        if (!hasHistory) {
            newPositions[dancer.id] = currentPositions[dancer.id] || { x: 50, y: 50 };
        } else {
            const relevantMark = bookmarks
                .filter(b => b.time <= time && b.positions && b.positions[dancer.id])
                .sort((a, b) => b.time - a.time)[0];

            if (relevantMark) {
                newPositions[dancer.id] = relevantMark.positions[dancer.id];
            } else {
                newPositions[dancer.id] = { x: 50, y: 50 };
            }
        }
    });

    setCurrentPositions(newPositions);
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      setCurrentTime(t);
      if (isPlaying && !draggedDancerId) {
        updatePositionsFromTime(t);
      }
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      updatePositionsFromTime(time);
    }
  };

  const addManualBookmark = () => {
    const newBookmark = {
      id: Date.now(),
      time: currentTime,
      type: 'manual',
      name: `Note`,
      positions: JSON.parse(JSON.stringify(currentPositions))
    };
    setBookmarks(prev => [...prev, newBookmark].sort((a, b) => a.time - b.time));
    scrollToBottom();
  };

  const recordMovement = (dancerId, newPos) => {
      const updatedPositions = { ...currentPositions, [dancerId]: newPos };
      setCurrentPositions(updatedPositions);

      const dancer = dancers.find(d => d.id === dancerId);
      const initials = getInitials(dancer?.name);

      const existingMarkIndex = bookmarks.findIndex(b =>
          b.type === 'movement' && Math.abs(b.time - currentTime) < 0.1
      );

      if (existingMarkIndex !== -1) {
          setBookmarks(prev => {
              const newArr = [...prev];
              const mark = newArr[existingMarkIndex];
              let newName = mark.name;
              if (!newName.includes(initials)) {
                  newName += `, ${initials}`;
              }
              newArr[existingMarkIndex] = {
                  ...mark,
                  name: newName,
                  positions: { ...mark.positions, [dancerId]: newPos }
              };
              return newArr;
          });
      } else {
          const newBookmark = {
              id: Date.now(),
              time: currentTime,
              type: 'movement',
              name: `Mov: ${initials}`,
              positions: updatedPositions
          };
          setBookmarks(prev => [...prev, newBookmark].sort((a, b) => a.time - b.time));
          scrollToBottom();
      }
  };

  const startEditingBookmark = (e, bookmark) => {
      e.stopPropagation();
      setEditingBookmarkId(bookmark.id);
      setTempBookmarkName(bookmark.name);
  };

  const saveBookmarkName = (e, id) => {
      e.stopPropagation();
      setBookmarks(prev => prev.map(b => b.id === id ? { ...b, name: tempBookmarkName } : b));
      setEditingBookmarkId(null);
  };

  const scrollToBottom = () => {
    setTimeout(() => {
        if(bookmarksRef.current) bookmarksRef.current.scrollTop = bookmarksRef.current.scrollHeight;
    }, 100);
  };

  const jumpToBookmark = (bookmark) => {
    if (audioRef.current) {
      audioRef.current.currentTime = bookmark.time;
      setCurrentTime(bookmark.time);
      updatePositionsFromTime(bookmark.time);
      if (!isPlaying) {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const addDancer = () => {
      const newDancer = {
          id: `d_${Date.now()}`,
          name: `Dancer ${dancers.length + 1}`,
          color: generateColor(dancers.length)
      };
      setDancers([...dancers, newDancer]);
      setCurrentPositions(prev => ({ ...prev, [newDancer.id]: { x: 50, y: 50 } }));
  };

  const deleteDancer = (id) => {
      setDancers(prev => prev.filter(d => d.id !== id));
      const newCurrent = { ...currentPositions };
      delete newCurrent[id];
      setCurrentPositions(newCurrent);
      setBookmarks(prev => prev.map(b => {
          if (!b.positions) return b;
          const newPos = { ...b.positions };
          delete newPos[id];
          return { ...b, positions: newPos };
      }));
      setEditingDancer(null);
  };

  const handleDragStart = (e, id) => {
      if (e.type === 'touchstart') document.body.style.overflow = 'hidden';
      if (isPlaying) {
          audioRef.current.pause();
          setIsPlaying(false);
      }
      hasDraggedRef.current = false;
      setDraggedDancerId(id);
  };

  const handleDragMove = useCallback((e) => {
      if (!draggedDancerId || !stageRef.current) return;
      hasDraggedRef.current = true;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const rect = stageRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
      setCurrentPositions(prev => ({ ...prev, [draggedDancerId]: { x, y } }));
  }, [draggedDancerId]);

  const handleDragEnd = useCallback(() => {
      document.body.style.overflow = '';
      if (draggedDancerId) {
          const pos = currentPositions[draggedDancerId];
          recordMovement(draggedDancerId, pos);
          setDraggedDancerId(null);
      }
  }, [draggedDancerId, currentPositions]);

  useEffect(() => {
      if (draggedDancerId) {
          window.addEventListener('mousemove', handleDragMove);
          window.addEventListener('mouseup', handleDragEnd);
          window.addEventListener('touchmove', handleDragMove, { passive: false });
          window.addEventListener('touchend', handleDragEnd);
      }
      return () => {
          window.removeEventListener('mousemove', handleDragMove);
          window.removeEventListener('mouseup', handleDragEnd);
          window.removeEventListener('touchmove', handleDragMove);
          window.removeEventListener('touchend', handleDragEnd);
      };
  }, [draggedDancerId, handleDragMove, handleDragEnd]);

  // EXPORT / IMPORT
  const exportData = () => {
      const data = {
          version: 1,
          meta: { audioFile: fileName },
          dancers,
          bookmarks
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${fileName ? fileName.split('.')[0] : 'choreo'}_data.json`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const importData = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target.result);
              if(data.dancers) setDancers(data.dancers);
              if(data.bookmarks) setBookmarks(data.bookmarks);
              // Reset positions to match 00:00 or current time
              setCurrentTime(0);
              if(audioRef.current) audioRef.current.currentTime = 0;
          } catch(err) {
              alert("Error parsing JSON file");
          }
      };
      reader.readAsText(file);
      e.target.value = null; // reset input
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans pb-20 md:pb-0">

      {editingDancer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
              <div className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm border border-gray-700">
                  <h3 className="text-lg font-semibold mb-4">Edit Dancer</h3>
                  <input
                      autoFocus
                      className="w-full bg-gray-900 border border-gray-600 rounded-xl p-3 text-white mb-4"
                      defaultValue={editingDancer.name}
                      onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                              setDancers(prev => prev.map(d => d.id === editingDancer.id ? { ...d, name: e.target.value } : d));
                              setEditingDancer(null);
                          }
                      }}
                      id="edit-dancer-input"
                  />
                  <div className="flex justify-between gap-3">
                      <Button variant="danger" onClick={() => deleteDancer(editingDancer.id)}>
                          Delete & Clear Entries
                      </Button>
                      <div className="flex gap-2">
                          <Button variant="secondary" onClick={() => setEditingDancer(null)}>Cancel</Button>
                          <Button onClick={() => {
                              setDancers(prev => prev.map(d => d.id === editingDancer.id ? { ...d, name: document.getElementById('edit-dancer-input').value } : d));
                              setEditingDancer(null);
                          }}>Save</Button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
            <div className="flex items-center gap-4">
                <a href="/" className="text-gray-400 hover:text-white transition-colors text-sm">← Home</a>
                <h1 className="text-xl font-bold flex items-center gap-2 text-indigo-400">
                    <Music size={24}/> ChoreoMarker
                </h1>
            </div>

            <div className="flex gap-2">
                <input type="file" ref={fileInputRef} onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                        const url = URL.createObjectURL(file);
                        setAudioSrc(url);
                        setFileName(file.name);
                        setBookmarks([]);
                        setIsPlaying(false);
                        setCurrentTime(0);
                    }
                }} accept="audio/*" className="hidden" />

                <input type="file" ref={jsonInputRef} onChange={importData} accept=".json" className="hidden" />

                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="!py-2 text-sm">
                    <Upload size={16}/> {audioSrc ? 'Change Audio' : 'Upload Audio'}
                </Button>

                <Button onClick={() => jsonInputRef.current?.click()} variant="secondary" className="!py-2 text-sm">
                    <FileJson size={16}/> Import
                </Button>

                <Button onClick={exportData} variant="secondary" className="!py-2 text-sm">
                    <Download size={16}/> Export
                </Button>
            </div>
        </div>

        {/* Stage */}
        <div className="relative group">
            <div
                ref={stageRef}
                className="aspect-video bg-[#111] rounded-2xl border border-gray-800 overflow-hidden relative shadow-2xl"
                style={{
                    backgroundImage: 'radial-gradient(circle, #222 1px, transparent 1px)',
                    backgroundSize: '20px 20px'
                }}
            >
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                     <div className="w-1 h-full border-l border-dashed border-gray-500"></div>
                     <div className="h-1 w-full border-t border-dashed border-gray-500 absolute"></div>
                </div>
                <div className="absolute bottom-2 w-full text-center pointer-events-none">
                    <span className="text-[10px] uppercase tracking-widest text-gray-600 font-bold bg-[#111] px-2">Front</span>
                </div>

                {dancers.map(dancer => {
                    const pos = currentPositions[dancer.id] || {x:50, y:50};
                    return (
                        <div
                            key={dancer.id}
                            onMouseDown={(e) => handleDragStart(e, dancer.id)}
                            onTouchStart={(e) => handleDragStart(e, dancer.id)}
                            onDoubleClick={() => setEditingDancer(dancer)}
                            className="absolute w-12 h-12 -ml-6 -mt-6 rounded-full flex items-center justify-center font-bold text-sm shadow-xl z-10 touch-none select-none transition-transform hover:scale-110"
                            style={{
                                left: `${pos.x}%`,
                                top: `${pos.y}%`,
                                backgroundColor: dancer.color,
                                cursor: draggedDancerId === dancer.id ? 'grabbing' : 'grab',
                                border: '3px solid rgba(255,255,255,0.9)'
                            }}
                            title={dancer.name}
                        >
                            {getInitials(dancer.name)}
                            <div className="absolute -bottom-1.5 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-white/90"></div>
                        </div>
                    );
                })}
            </div>

            <div className="absolute top-4 right-4">
                <button onClick={addDancer} className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 rounded-full text-white flex items-center justify-center shadow-lg active:scale-95">
                    <Plus size={20} />
                </button>
            </div>
        </div>

        {/* Footnote */}
        {dancers.length > 0 && (
            <p className="text-xs text-gray-500 text-center mt-2">Double-click dancer to rename</p>
        )}

        {/* Player */}
        <div className="bg-gray-900 rounded-2xl p-4 md:p-6 border border-gray-800 shadow-xl">
            {!audioSrc ? (
                <div onClick={() => fileInputRef.current?.click()} className="h-24 border-2 border-dashed border-gray-700 rounded-xl flex items-center justify-center text-gray-500 cursor-pointer hover:bg-gray-800">
                    <span className="flex items-center gap-2"><Upload size={20}/> Load Audio</span>
                </div>
            ) : (
                <div className="space-y-4">
                     <audio ref={audioRef} src={audioSrc} onTimeUpdate={onTimeUpdate} onLoadedMetadata={(e) => setDuration(e.target.duration)} onEnded={() => setIsPlaying(false)} />

                    <div className="relative h-16 w-full bg-gray-950 rounded-lg overflow-hidden group">
                        <div className="absolute inset-0">
                            <Waveform audioSrc={audioSrc} progress={duration ? currentTime / duration : 0} markers={bookmarks} duration={duration} />
                        </div>
                        <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            value={currentTime}
                            onChange={handleSeek}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        />
                        <div
                            className="absolute top-0 bottom-0 w-0.5 bg-white pointer-events-none z-10 shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                            style={{ left: `${(currentTime/duration) * 100}%` }}
                        >
                            <div className="absolute -top-1 -ml-[6px] w-[13px] h-[13px] bg-white rounded-full shadow-md"></div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-4">
                        <div className="font-mono text-xs text-gray-400 w-12">{formatTime(currentTime)}</div>
                        <div className="flex items-center gap-6">
                            <button onClick={() => { if(audioRef.current) audioRef.current.currentTime -= 5; }} className="p-2 text-gray-400 hover:text-white"><RotateCcw size={20}/></button>
                            <button onClick={togglePlay} className="w-14 h-14 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all">
                                {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                            </button>
                            <button onClick={() => { if(audioRef.current) audioRef.current.currentTime += 5; }} className="p-2 text-gray-400 hover:text-white"><RotateCw size={20}/></button>
                        </div>
                        <div className="font-mono text-xs text-gray-400 w-12 text-right">{formatTime(duration)}</div>
                    </div>

                    <Button onClick={addManualBookmark} className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 text-lg font-bold">
                        <Type /> Mark
                    </Button>
                </div>
            )}
        </div>

        {/* Dancers List */}
        {dancers.length > 0 && (
            <div className="space-y-3">
                <div
                    className="flex items-center justify-between px-2 cursor-pointer hover:bg-gray-800/30 rounded-lg p-2 transition-colors"
                    onClick={() => setShowDancers(!showDancers)}
                >
                    <h2 className="font-semibold text-gray-300">Dancers ({dancers.length})</h2>
                    <span className="text-gray-400">{showDancers ? '▼' : '▶'}</span>
                </div>
                {showDancers && (
                    <div className="space-y-2">
                        {dancers.map(dancer => (
                            <div
                                key={dancer.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-gray-800 border border-gray-700"
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs"
                                        style={{ backgroundColor: dancer.color }}
                                    >
                                        {getInitials(dancer.name)}
                                    </div>
                                    <span className="text-gray-100">{dancer.name}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setEditingDancer(dancer)}
                                        className="p-2 text-gray-400 hover:text-white"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => deleteDancer(dancer.id)}
                                        className="p-2 text-gray-400 hover:text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {/* Timeline */}
        {bookmarks.length > 0 && (
            <div className="space-y-3 pb-24 md:pb-6">
                <div className="flex items-center justify-between px-2">
                    <h2 className="font-semibold text-gray-300">Timeline ({bookmarks.length})</h2>
                    <Button variant="ghost" onClick={() => setBookmarks([])} className="!py-1 !px-2 text-xs">
                        Clear All
                    </Button>
                </div>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2" ref={bookmarksRef}>
                    {bookmarks.map((bookmark) => {
                        const isCurrent = Math.abs(currentTime - bookmark.time) < 0.5;
                        const isMov = bookmark.type === 'movement';
                        const isEditing = editingBookmarkId === bookmark.id;

                        return (
                            <div
                                key={bookmark.id}
                                onClick={() => jumpToBookmark(bookmark)}
                                className={`
                                    flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all
                                    ${isCurrent ? 'bg-gray-800 border-gray-600' : 'bg-gray-900 border-gray-800 hover:bg-gray-800/50'}
                                    ${isMov ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-orange-500'}
                                `}
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="font-mono text-xs text-gray-500 w-10">{formatTime(bookmark.time)}</div>
                                    <div className="flex flex-col flex-1">
                                        <div className="flex items-center gap-2">
                                            {isMov ? <Move size={14} className="text-emerald-500 flex-shrink-0"/> : <Type size={14} className="text-orange-500 flex-shrink-0"/>}

                                            {isEditing ? (
                                                <div className="flex items-center gap-2 w-full max-w-[200px]" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        className="bg-gray-800 text-white text-sm px-2 py-1 rounded border border-gray-600 w-full focus:border-indigo-500 outline-none"
                                                        value={tempBookmarkName}
                                                        onChange={(e) => setTempBookmarkName(e.target.value)}
                                                        autoFocus
                                                        onKeyDown={(e) => e.key === 'Enter' && saveBookmarkName(e, bookmark.id)}
                                                    />
                                                    <button onClick={(e) => saveBookmarkName(e, bookmark.id)} className="text-green-400"><Check size={16}/></button>
                                                </div>
                                            ) : (
                                                <span className={`${isMov ? 'text-emerald-400' : 'text-orange-400'} font-medium truncate`}>
                                                    {bookmark.name}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {!isEditing && (
                                        <button
                                            onClick={(e) => startEditingBookmark(e, bookmark)}
                                            className="p-2 text-gray-600 hover:text-white"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setBookmarks(prev => prev.filter(b => b.id !== bookmark.id)); }}
                                        className="p-2 text-gray-600 hover:text-red-400"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default App;
