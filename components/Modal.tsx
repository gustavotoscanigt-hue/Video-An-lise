import React, { useState, useEffect } from 'react';
import { ModalConfig } from '../types';
import { X } from 'lucide-react';

interface ModalProps {
  config: ModalConfig;
}

export const Modal: React.FC<ModalProps> = ({ config }) => {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (config.isOpen && config.defaultValue) {
      setInputValue(config.defaultValue);
    } else {
      setInputValue('');
    }
  }, [config.isOpen, config.defaultValue]);

  if (!config.isOpen) return null;

  const handleConfirm = () => {
    config.onConfirm(config.type === 'input' ? inputValue : undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-4 border-b border-gray-100">
          <h3 className="font-semibold text-lg text-gray-800">{config.title}</h3>
          <button 
            onClick={config.onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {config.message && (
            <p className="text-gray-600 mb-4 text-sm leading-relaxed">{config.message}</p>
          )}

          {config.type === 'input' && (
            <input
              type="text"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              placeholder="Digite aqui..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              autoFocus
            />
          )}
        </div>

        <div className="flex justify-end gap-3 p-4 bg-gray-50 border-t border-gray-100">
          {config.type !== 'alert' && (
            <button
              onClick={config.onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 transition-colors"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 shadow-sm transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
};