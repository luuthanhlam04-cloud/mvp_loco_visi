import React, { useState } from 'react';
import { Navigation, MapPin, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Step {
  instruction: string;
  distance: number;
  name: string;
}

interface RouteInstructionsProps {
  distance: number; // in meters
  duration: number; // in seconds
  steps: Step[];
  onClose: () => void;
}

export function RouteInstructions({ distance, duration, steps, onClose }: RouteInstructionsProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const formatDistance = (m: number) => {
    if (m < 1000) return `${Math.round(m)}m`;
    return `${(m / 1000).toFixed(1)}km`;
  };

  const formatDuration = (s: number) => {
    const mins = Math.round(s / 60);
    return `${mins} phút`;
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, x: 50, scale: 0.95 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="absolute top-6 right-6 w-80 bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-indochine-yellow-dark/20 overflow-hidden z-20 flex flex-col max-h-[80%]"
      >
        {/* Header */}
        <div className="p-4 bg-indochine-green text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2 font-bold">
            <Navigation size={20} />
            <h2>Chỉ đường (Mocked)</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-white/20 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Info */}
        <div className="p-4 border-b border-indochine-bg flex gap-4 shrink-0 bg-white">
          <div className="flex flex-col">
            <span className="text-2xl font-bold text-indochine-dark">{formatDuration(duration)}</span>
            <span className="text-sm font-medium text-gray-500">{formatDistance(distance)}</span>
          </div>
          <div className="flex-1 text-xs text-gray-400 bg-indochine-bg p-2 rounded-xl flex items-center gap-2">
            <AlertCircle size={16} className="text-indochine-yellow-dark shrink-0" />
            <span>Tuyến đường nhanh nhất do tình trạng giao thông hiện tại.</span>
          </div>
        </div>

        {/* Turn-by-turn Steps */}
        <div className="flex-grow overflow-y-auto no-scrollbar p-4 space-y-4">
          <div className="relative border-l-2 border-indochine-yellow-dark/30 ml-3 space-y-6 pb-4">
            
            <div className="relative pl-6">
              <div className="absolute w-4 h-4 rounded-full bg-indochine-green -left-[9px] top-1 border-2 border-white shadow-sm" />
              <h4 className="font-bold text-sm text-indochine-dark">Bắt đầu từ Nhà Hát Lớn</h4>
            </div>

            {steps.map((step, idx) => (
              <div key={idx} className="relative pl-6">
                <div className="absolute w-2 h-2 rounded-full bg-gray-300 -left-[5px] top-1.5" />
                <p className="text-sm text-indochine-dark mb-1 font-medium">{step.instruction}</p>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span className="bg-indochine-bg px-2 py-0.5 rounded-md text-indochine-green-light font-bold">
                    {step.name}
                  </span>
                  <span>{formatDistance(step.distance)}</span>
                </div>
              </div>
            ))}

            <div className="relative pl-6">
              <div className="absolute w-4 h-4 rounded-full bg-red-500 -left-[9px] top-1 border-2 border-white shadow-sm flex items-center justify-center">
                 <MapPin size={10} className="text-white" />
              </div>
              <h4 className="font-bold text-sm text-indochine-dark">Đến điểm đích</h4>
            </div>

          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
