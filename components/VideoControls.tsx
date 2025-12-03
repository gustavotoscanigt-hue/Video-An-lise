import React from 'react';
import { Play, Pause, Square, Trash2, RotateCcw, PenTool, MapPin, Eraser } from 'lucide-react';
import { ToolMode } from '../types';

interface VideoControlsProps {
  isPlaying: boolean;
  isClipPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackSpeed: number;
  currentMode: ToolMode;
  color: string;
  brushSize: number;
  onPlayPause: () => void;
  onStopClip: () => void;
  onSpeedChange: (speed: number) => void;
  onModeChange: (mode: ToolMode) => void;
  onColorChange: (color: string) => void;
  onBrushSizeChange: (size: number) => void;
  onClearAll: () => void;
  onNewAnalysis: () => void;
}

const formatTime = (seconds: number) => {
  if (!seconds && seconds !== 0) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  isClipPlaying,
  currentTime,
  duration,
  playbackSpeed,
  currentMode,
  color,
  brushSize,
  onPlayPause,
  onStopClip,
  onSpeedChange,
  onModeChange,
  onColorChange,
  onBrushSizeChange,
  onClearAll,
  onNewAnalysis
}) => {
  return (
    <div className="bg-white border-t border-gray-200">
      {/* Playback Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-4">
          <button
            onClick={isClipPlaying ? onStopClip : onPlayPause}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-white transition-all shadow-sm ${
              isClipPlaying 
                ? 'bg-red-500 hover:bg-red-600' 
                : isPlaying 
                  ? 'bg-blue-500 hover:bg-blue-600' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {isClipPlaying ? <Square size={16} fill="currentColor" /> : isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
            <span>{isClipPlaying ? 'Parar Clip' : isPlaying ? 'Pausar' : 'Play'}</span>
          </button>
          
          <span className="font-mono text-sm font-medium text-gray-600 bg-gray-200 px-3 py-1 rounded">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Velocidade</label>
          <select 
            value={playbackSpeed} 
            onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
            className="text-sm bg-white border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-indigo-500 outline-none"
            disabled={isClipPlaying}
          >
            <option value="0.25">0.25x (Super Slow)</option>
            <option value="0.5">0.5x (Slow)</option>
            <option value="1.0">1.0x (Normal)</option>
            <option value="1.5">1.5x (Fast)</option>
            <option value="2.0">2.0x (Double)</option>
          </select>
        </div>
      </div>

      {/* Tools Bar */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-3">
        <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => onModeChange('point')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              currentMode === 'point' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
            title="Marca ponto e cria clip de 2s"
          >
            <MapPin size={16} />
            <span>Ponto (Auto Clip)</span>
          </button>
          
          <button
            onClick={() => onModeChange('pen')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              currentMode === 'pen' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <PenTool size={16} />
            <span>Desenhar</span>
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
             <input 
              type="color" 
              value={color}
              onChange={(e) => onColorChange(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 p-0 overflow-hidden"
              title="Cor da anotação"
            />
            <input 
              type="number" 
              min="1" 
              max="20"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(parseInt(e.target.value))}
              className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-indigo-500 focus:border-indigo-500"
              title="Tamanho do pincel"
            />
          </div>
        </div>

        <div className="flex-grow"></div>

        <div className="flex items-center gap-2">
           <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100"
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline">Limpar</span>
          </button>

          <button
            onClick={onNewAnalysis}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors border border-gray-200 hover:border-gray-300"
          >
            <RotateCcw size={16} />
            <span className="hidden sm:inline">Novo</span>
          </button>
        </div>
      </div>
    </div>
  );
};