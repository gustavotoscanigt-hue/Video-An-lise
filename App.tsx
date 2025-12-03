import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, FileVideo, AlertCircle, Play, Video, Square, Trash2 } from 'lucide-react';
import { Point, DrawingPath, Annotation, Clip, AnalysisData, ToolMode, ModalConfig } from './types';
import { Modal } from './components/Modal';
import { VideoControls } from './components/VideoControls';

// Utility for unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

export default function App() {
  // --- State ---
  // Video & Playback
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  
  // Clip Logic
  const [isClipPlaying, setIsClipPlaying] = useState(false);
  const [activeClipId, setActiveClipId] = useState<string | null>(null);
  const clipTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoStateBeforeClip = useRef<{ time: number; wasPlaying: boolean }>({ time: 0, wasPlaying: false });

  // Tools
  const [currentMode, setCurrentMode] = useState<ToolMode>('point');
  const [brushColor, setBrushColor] = useState('#00ff00');
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const currentPathRef = useRef<Point[]>([]);

  // Data
  const [notes, setNotes] = useState('');
  const [drawings, setDrawings] = useState<DrawingPath[]>([]);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [clips, setClips] = useState<Clip[]>([]);
  
  // Files
  const [originalVideoFile, setOriginalVideoFile] = useState<File | null>(null);

  // Modal
  const [modalConfig, setModalConfig] = useState<ModalConfig>({
    isOpen: false,
    type: 'alert',
    title: '',
    onConfirm: () => {},
    onCancel: () => {},
  });

  // --- Modal Helpers ---
  const showAlert = (message: string, title = "Aviso") => {
    setModalConfig({
      isOpen: true,
      type: 'alert',
      title,
      message,
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, title = "Confirmação") => {
    setModalConfig({
      isOpen: true,
      type: 'confirm',
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  const showPrompt = (title: string, onConfirm: (val: string) => void, defaultValue = "") => {
    setModalConfig({
      isOpen: true,
      type: 'input',
      title,
      defaultValue,
      onConfirm: (val) => {
        if (val) onConfirm(val);
        setModalConfig(prev => ({ ...prev, isOpen: false }));
      },
      onCancel: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
    });
  };

  // --- Canvas & Drawing Logic ---

  const getNormalizedPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  };

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const time = videoRef.current?.currentTime || 0;

    // Draw Drawings
    drawings.forEach(drawing => {
      // Show drawings that are within 0.5s of current time
      if (Math.abs(drawing.time - time) < 0.5) {
        ctx.strokeStyle = drawing.color;
        ctx.lineWidth = drawing.size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        drawing.points.forEach((p, i) => {
          const x = p.x * canvas.width;
          const y = p.y * canvas.height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    });

    // Draw Annotations (Points)
    annotations.forEach(ann => {
       if (Math.abs(ann.time - time) < 0.5) {
         const x = ann.x * canvas.width;
         const y = ann.y * canvas.height;
         
         // Point
         ctx.beginPath();
         ctx.arc(x, y, 8, 0, 2 * Math.PI);
         ctx.fillStyle = ann.color;
         ctx.fill();
         ctx.strokeStyle = 'white';
         ctx.lineWidth = 2;
         ctx.stroke();

         // Label
         ctx.font = '12px sans-serif';
         ctx.fillStyle = 'rgba(0,0,0,0.8)';
         const textWidth = ctx.measureText(ann.text).width;
         ctx.fillRect(x - textWidth/2 - 4, y + 12, textWidth + 8, 20);
         ctx.fillStyle = 'white';
         ctx.textAlign = 'center';
         ctx.fillText(ann.text, x, y + 26);
       }
    });
  }, [drawings, annotations]);

  useEffect(() => {
    if (videoSrc) {
       redrawCanvas();
    }
  }, [currentTime, videoSrc, redrawCanvas]);

  // Sync Video Loop
  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
      if (videoRef.current) {
        setCurrentTime(videoRef.current.currentTime);
        if (isClipPlaying && activeClipId) {
          const clip = clips.find(c => c.id === activeClipId);
          if (clip && videoRef.current.currentTime >= clip.endTime) {
            stopClip();
          }
        }
      }
      animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isClipPlaying, activeClipId, clips]);


  // --- Event Handlers ---

  const handleStartInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!videoSrc || isClipPlaying) return;
    if (currentMode === 'none') return;
    
    // Prevent scrolling on touch
    if ('touches' in e && currentMode === 'pen') {
       // e.preventDefault(); // Can block scroll, use carefully
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const pos = getNormalizedPos(e, canvas);

    if (currentMode === 'point') {
      showPrompt("Nome do ponto / Clip:", (text) => {
         const time = videoRef.current?.currentTime || 0;
         
         // Add Annotation
         const newAnn: Annotation = {
           id: generateId(),
           time,
           x: pos.x,
           y: pos.y,
           text,
           color: brushColor
         };
         setAnnotations(prev => [...prev, newAnn]);

         // Create Auto Clip (2 seconds)
         const newClip: Clip = {
           id: generateId(),
           name: text,
           startTime: time,
           endTime: Math.min(time + 2, videoRef.current?.duration || time + 2),
           duration: 2,
           speed: 0.5
         };
         setClips(prev => [...prev, newClip]);
      }, `Ponto ${annotations.length + 1}`);
    } else if (currentMode === 'pen') {
      setIsDrawing(true);
      currentPathRef.current = [pos];
    }
  };

  const handleMoveInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || currentMode !== 'pen' || !canvasRef.current) return;
    const pos = getNormalizedPos(e, canvasRef.current);
    currentPathRef.current.push(pos);
    
    // Live Draw
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
       const x = pos.x * canvasRef.current.width;
       const y = pos.y * canvasRef.current.height;
       ctx.lineTo(x, y);
       ctx.strokeStyle = brushColor;
       ctx.lineWidth = brushSize;
       ctx.stroke();
       ctx.beginPath();
       ctx.moveTo(x, y);
    }
  };

  const handleEndInteraction = () => {
    if (isDrawing && currentMode === 'pen') {
      setIsDrawing(false);
      if (currentPathRef.current.length > 1) {
        setDrawings(prev => [...prev, {
          id: generateId(),
          time: videoRef.current?.currentTime || 0,
          points: [...currentPathRef.current],
          color: brushColor,
          size: brushSize
        }]);
      }
      currentPathRef.current = [];
    }
    // Reset path on context
    const ctx = canvasRef.current?.getContext('2d');
    ctx?.beginPath();
  };

  // --- Playback Logic ---

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const playClip = (clip: Clip) => {
    if (!videoRef.current) return;
    
    // Save state if not already in a clip
    if (!isClipPlaying) {
      videoStateBeforeClip.current = {
        time: videoRef.current.currentTime,
        wasPlaying: !videoRef.current.paused
      };
    }

    setIsClipPlaying(true);
    setActiveClipId(clip.id);
    
    videoRef.current.pause();
    videoRef.current.currentTime = clip.startTime;
    videoRef.current.playbackRate = clip.speed;
    videoRef.current.play();

    // The stopping logic is handled in the animation loop for better precision
  };

  const stopClip = (resume = true) => {
    if (!videoRef.current) return;

    if (clipTimeoutRef.current) clearTimeout(clipTimeoutRef.current);

    videoRef.current.pause();
    videoRef.current.playbackRate = playbackSpeed; // Restore global speed
    
    if (resume) {
       videoRef.current.currentTime = videoStateBeforeClip.current.time;
       if (videoStateBeforeClip.current.wasPlaying) {
          videoRef.current.play();
          setIsPlaying(true);
       } else {
          setIsPlaying(false);
       }
    }

    setIsClipPlaying(false);
    setActiveClipId(null);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current && !isClipPlaying) {
      videoRef.current.playbackRate = speed;
    }
  };

  // --- File Logic ---

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoFileName(file.name);
      setOriginalVideoFile(file);
      setClips([]);
      setAnnotations([]);
      setDrawings([]);
      setNotes('');
    }
  };

  const handleSaveAnalysis = () => {
    if (!window.JSZip || !window.saveAs || !originalVideoFile) {
      showAlert("Erro: Bibliotecas de compressão não carregadas ou vídeo não encontrado.");
      return;
    }

    const zip = new window.JSZip();
    const data: AnalysisData = {
      notes,
      drawings,
      annotations,
      clips,
      primaryVideoFileName: videoFileName || 'video.mp4'
    };

    zip.file("analysis_data.json", JSON.stringify(data, null, 2));
    zip.file(data.primaryVideoFileName, originalVideoFile);

    zip.generateAsync({ type: "blob" }).then((content: Blob) => {
       const date = new Date().toISOString().slice(0, 10);
       window.saveAs(content, `Analise_${videoFileName}_${date}.zip`);
       showAlert("Análise salva com sucesso!");
    });
  };

  const handleLoadAnalysis = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !window.JSZip) return;

    window.JSZip.loadAsync(file).then((zip: any) => {
       zip.file("analysis_data.json").async("string").then((json: string) => {
         try {
           const data = JSON.parse(json) as AnalysisData;
           setNotes(data.notes || '');
           setDrawings(data.drawings || []);
           setAnnotations(data.annotations || []);
           setClips(data.clips || []);
           setVideoFileName(data.primaryVideoFileName);

           // Load Video from Zip
           if (data.primaryVideoFileName && zip.file(data.primaryVideoFileName)) {
             zip.file(data.primaryVideoFileName).async("blob").then((blob: Blob) => {
                const vidFile = new File([blob], data.primaryVideoFileName, { type: blob.type });
                setOriginalVideoFile(vidFile);
                setVideoSrc(URL.createObjectURL(vidFile));
                showAlert("Análise carregada com sucesso!");
             });
           } else {
             showAlert("Vídeo principal não encontrado no arquivo.");
           }
         } catch (err) {
           showAlert("Arquivo de dados corrompido.");
         }
       });
    }).catch(() => showAlert("Arquivo ZIP inválido."));
  };

  const handleNewAnalysis = () => {
    showConfirm("Deseja iniciar uma nova análise? Dados não salvos serão perdidos.", () => {
       setVideoSrc(null);
       setVideoFileName(null);
       setClips([]);
       setAnnotations([]);
       setDrawings([]);
       setNotes('');
       setOriginalVideoFile(null);
       setCurrentTime(0);
       setIsPlaying(false);
    });
  };

  const handleClearAll = () => {
    showConfirm("Limpar todas as anotações e clips?", () => {
       setClips([]);
       setAnnotations([]);
       setDrawings([]);
    });
  };

  // --- Resize Observer for Canvas ---
  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const resize = () => {
      if (videoRef.current && canvasRef.current) {
         canvasRef.current.width = videoRef.current.clientWidth;
         canvasRef.current.height = videoRef.current.clientHeight;
         redrawCanvas();
      }
    };
    window.addEventListener('resize', resize);
    // Initial size set
    const i = setInterval(() => {
       if (videoRef.current?.videoWidth) {
         resize();
         clearInterval(i);
       }
    }, 100);
    return () => {
      window.removeEventListener('resize', resize);
      clearInterval(i);
    }
  }, [videoSrc, redrawCanvas]);


  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800">
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm z-10">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
            <Video className="text-indigo-600" />
            SurfBiomech Analyzer
          </h1>
          <div className="text-sm text-gray-500 hidden md:block">
            Professional Video Analysis Tool
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto p-4 md:p-6 lg:flex lg:gap-8 overflow-hidden">
        
        {/* Left Column: Video Stage */}
        <main className="lg:w-2/3 flex flex-col gap-4">
          
          {/* Upload / Video Area */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 relative">
            
            {!videoSrc ? (
              <div className="aspect-video flex flex-col items-center justify-center bg-slate-50 border-2 border-dashed border-slate-300 m-4 rounded-lg hover:bg-slate-100 transition-colors">
                 <Upload size={48} className="text-slate-400 mb-4" />
                 <h3 className="text-lg font-semibold text-slate-700 mb-2">Carregar Vídeo Principal</h3>
                 <div className="flex gap-4">
                    <label className="cursor-pointer px-5 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md transition-all active:scale-95">
                      Escolher Vídeo
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    </label>
                    <label className="cursor-pointer px-5 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium shadow-md transition-all active:scale-95">
                      Carregar Análise (.zip)
                      <input type="file" accept=".zip" onChange={handleLoadAnalysis} className="hidden" />
                    </label>
                 </div>
              </div>
            ) : (
              <div className={`relative aspect-video bg-black group overflow-hidden ${isClipPlaying ? 'transition-transform duration-500 scale-[3.0]' : 'transition-transform duration-500 scale-100'}`}>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  className="w-full h-full object-contain"
                  onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                />
                <canvas
                  ref={canvasRef}
                  className={`absolute inset-0 w-full h-full z-10 touch-none ${currentMode !== 'none' ? 'cursor-crosshair' : ''}`}
                  onMouseDown={handleStartInteraction}
                  onMouseMove={handleMoveInteraction}
                  onMouseUp={handleEndInteraction}
                  onMouseLeave={handleEndInteraction}
                  onTouchStart={handleStartInteraction}
                  onTouchMove={handleMoveInteraction}
                  onTouchEnd={handleEndInteraction}
                />
                
                {/* Overlay Badge for Mode */}
                <div className="absolute top-4 left-4 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-sm pointer-events-none">
                  {currentMode === 'point' ? 'MODO: PONTO + CLIP' : currentMode === 'pen' ? 'MODO: DESENHO' : 'MODO: NAVEGAÇÃO'}
                </div>
              </div>
            )}

            {/* Controls */}
            <VideoControls 
              isPlaying={isPlaying}
              isClipPlaying={isClipPlaying}
              currentTime={currentTime}
              duration={duration}
              playbackSpeed={playbackSpeed}
              currentMode={currentMode}
              color={brushColor}
              brushSize={brushSize}
              onPlayPause={togglePlay}
              onStopClip={() => stopClip(true)}
              onSpeedChange={handleSpeedChange}
              onModeChange={setCurrentMode}
              onColorChange={setBrushColor}
              onBrushSizeChange={setBrushSize}
              onClearAll={handleClearAll}
              onNewAnalysis={handleNewAnalysis}
            />
          </div>
          
          {/* Ad Placeholder Horizontal */}
          <div className="w-full h-24 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 text-sm">
            Space for Banner Ad
          </div>

        </main>

        {/* Right Column: Sidebar */}
        <aside className="lg:w-1/3 flex flex-col gap-6 mt-6 lg:mt-0">
          
          {/* Clips List */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col max-h-[400px]">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">Clips Automáticos</h3>
              <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">{clips.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {clips.length === 0 ? (
                <div className="text-center text-gray-400 py-8 text-sm">
                  <p>Nenhum ponto marcado.</p>
                  <p className="text-xs mt-1">Use a ferramenta "Ponto" para criar clips.</p>
                </div>
              ) : (
                clips.map((clip, idx) => (
                  <div 
                    key={clip.id} 
                    className={`p-3 rounded-lg border transition-all ${
                      activeClipId === clip.id 
                        ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                        : 'border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-semibold text-gray-800 block text-sm">{clip.name}</span>
                        <span className="text-xs text-gray-500 font-mono">
                          {Math.floor(clip.startTime/60)}:{Math.floor(clip.startTime%60).toString().padStart(2,'0')} - {clip.duration}s
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => isClipPlaying && activeClipId === clip.id ? stopClip(true) : playClip(clip)}
                          className={`p-1.5 rounded-md text-white transition-colors ${
                             isClipPlaying && activeClipId === clip.id ? 'bg-red-500 hover:bg-red-600' : 'bg-indigo-500 hover:bg-indigo-600'
                          }`}
                        >
                          {isClipPlaying && activeClipId === clip.id ? <Square size={14} fill="currentColor"/> : <Play size={14} fill="currentColor"/>}
                        </button>
                        <button 
                          onClick={() => {
                            setClips(clips.filter(c => c.id !== clip.id));
                            setAnnotations(annotations.filter(a => a.text !== clip.name)); // Simplify link between ann/clip
                          }}
                          className="p-1.5 rounded-md bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
             <h3 className="font-bold text-gray-700 mb-3">Notas da Análise</h3>
             <textarea 
               value={notes}
               onChange={(e) => setNotes(e.target.value)}
               className="w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none outline-none"
               placeholder="Escreva suas observações técnicas aqui..."
             />
          </div>
          
          {/* Actions */}
          <div className="mt-auto">
            <button 
              onClick={handleSaveAnalysis}
              disabled={!videoSrc}
              className={`w-full py-3 px-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-md transition-all ${
                videoSrc 
                  ? 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg active:scale-[0.98]' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Download size={20} />
              Salvar Análise (.zip)
            </button>
            <p className="text-xs text-center text-gray-400 mt-2">
              Inclui vídeo, anotações e desenhos.
            </p>
          </div>

          {/* Ad Placeholder Sidebar */}
          <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200 text-gray-400 text-sm">
            Ad Sidebar
          </div>

        </aside>
      </div>

      <Modal config={modalConfig} />
    </div>
  );
}