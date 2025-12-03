// Data Models
export interface Point {
  x: number;
  y: number;
}

export interface DrawingPath {
  id: string;
  time: number;
  points: Point[];
  color: string;
  size: number;
}

export interface Annotation {
  id: string;
  time: number;
  x: number;
  y: number;
  text: string;
  color: string;
}

export interface Clip {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  speed: number;
}

export interface AnalysisData {
  notes: string;
  drawings: DrawingPath[];
  annotations: Annotation[];
  clips: Clip[];
  primaryVideoFileName: string;
}

// Global declarations for the CDN libraries included in index.html
declare global {
  interface Window {
    JSZip: any;
    saveAs: any;
  }
}

export type ToolMode = 'point' | 'pen' | 'none';

export interface ModalConfig {
  isOpen: boolean;
  type: 'alert' | 'confirm' | 'input';
  title: string;
  message?: string;
  defaultValue?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}