"use client";

import React, { useState, useEffect, useRef } from 'react';
import { experimental_useObject as useObject } from '@ai-sdk/react';
import { itinerarySchema, Activity } from '../lib/zod-schemas';
import { ActivityCard } from './ActivityCard';
import { MapComponent } from './MapComponent';
import { Send, Sparkles, Loader2, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { cn } from '../lib/utils';

export function ItineraryTimeline() {
  const [prompt, setPrompt] = useState('');
  const [isMounted, setIsMounted] = useState(false);
  const [activePlaceId, setActivePlaceId] = useState<string | undefined>(undefined);
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | undefined>(undefined);
  const [localActivities, setLocalActivities] = useState<Activity[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileMapVisible, setIsMobileMapVisible] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const validActivities = localActivities.filter(a => a !== undefined && a !== null);

  const activeIdx = validActivities.findIndex(a => a && a.place_id === activePlaceId);
  const activeActivityIndex = activeIdx !== -1 ? activeIdx : undefined;

  const hoveredIdx = validActivities.findIndex(a => a && a.place_id === hoveredPlaceId);
  const hoveredActivityIndex = hoveredIdx !== -1 ? hoveredIdx : undefined;

  // Auto-Scroll to active card
  useEffect(() => {
    if (activeActivityIndex !== undefined && !isMobileMapVisible) {
      const el = document.getElementById(`activity-card-${activeActivityIndex}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeActivityIndex, isMobileMapVisible]);

  // Handle Hydration mismatch safely
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { object, submit, isLoading, error } = useObject({
    api: '/api/generate',
    schema: itinerarySchema,
  });

  // Đồng bộ hóa dữ liệu từ luồng stream của AI vào local state
  useEffect(() => {
    const aiActivities = (object?.activities as Activity[]) || [];
    if (isLoading) {
      setLocalActivities(aiActivities);
    } else if (aiActivities.length > 0 && localActivities.length === 0) {
      setLocalActivities(aiActivities);
    }
  }, [object?.activities, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;
    setActivePlaceId(undefined);
    setIsMobileMapVisible(false);
    submit({ prompt });
  };

  // Auto scroll to bottom when new items appear
  useEffect(() => {
    if (scrollRef.current && object?.activities) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTo({
        top: scrollElement.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [object?.activities?.length, object?.activities]);

  if (!isMounted) return null;

  return (
    <div className="flex w-full h-[100dvh] bg-indochine-bg overflow-hidden lg:p-4 lg:gap-6 relative">
      {/* Left Column: Timeline & Input */}
      <div 
        className={cn(
          "w-full lg:w-[40%] flex flex-col h-full bg-white lg:rounded-3xl shadow-xl lg:border border-indochine-yellow-dark/20 overflow-hidden relative z-10",
          isMobileMapVisible ? "hidden lg:flex" : "flex"
        )}
      >
        
        {/* Header */}
        <div className="p-4 lg:p-6 border-b border-indochine-bg bg-white/80 backdrop-blur z-20 shrink-0">
          <div className="flex items-center gap-2 mb-1 lg:mb-2">
            <Sparkles className="text-indochine-green-light" size={24} />
            <h1 className="text-xl lg:text-2xl font-bold text-indochine-dark">LOCO AI</h1>
          </div>
          <p className="text-xs lg:text-sm text-gray-500">Dệt nên lịch trình hoàn hảo của riêng bạn</p>
        </div>

        {/* Timeline Area */}
        <div 
          ref={scrollRef}
          className="flex-grow overflow-y-auto no-scrollbar p-4 lg:p-6 space-y-4 lg:space-y-6"
        >
          {!object && !isLoading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4 opacity-50">
              <div className="w-24 h-24 rounded-full bg-indochine-bg flex items-center justify-center">
                <Sparkles size={40} className="text-indochine-yellow-dark" />
              </div>
              <p>Hãy nhập sở thích của bạn để bắt đầu...</p>
            </div>
          )}

          <Reorder.Group axis="y" values={validActivities} onReorder={setLocalActivities} className="space-y-4 lg:space-y-6">
            {validActivities.map((activity, index) => {
              if (!activity) return null;
              return (
                <ActivityCard 
                  key={activity.place_id || `temp-${index}`}
                  activity={activity} 
                  index={index}
                  isActive={activeActivityIndex === index}
                  isHovered={hoveredActivityIndex === index}
                  isDragEnabled={!isLoading}
                  onClick={() => {
                    setActivePlaceId(activity.place_id);
                    setIsMobileMapVisible(true);
                  }}
                  onMouseEnter={() => setHoveredPlaceId(activity.place_id)}
                  onMouseLeave={() => setHoveredPlaceId(undefined)}
                  onDragStart={() => setIsDragging(true)}
                  onDragEnd={() => setIsDragging(false)}
                />
              );
            })}
          </Reorder.Group>

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center p-8 text-indochine-green-light gap-3"
            >
              <Loader2 className="animate-spin" size={24} />
              <span className="font-medium animate-pulse">Đang dệt lộ trình...</span>
            </motion.div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-500 rounded-2xl text-sm border border-red-100">
              Có lỗi xảy ra khi dệt lộ trình. Vui lòng thử lại.
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-3 lg:p-4 bg-white border-t border-indochine-bg relative z-20 shrink-0">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="VD: 1 ngày Food tour phố cổ Hà Nội..."
              className="w-full pl-5 lg:pl-6 pr-12 lg:pr-14 py-3 lg:py-4 rounded-full bg-indochine-bg border border-indochine-yellow-dark/30 focus:outline-none focus:ring-2 focus:ring-indochine-green-light/50 focus:bg-white transition-all text-indochine-dark placeholder-gray-400 shadow-sm text-sm lg:text-base"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="absolute right-2 top-2 bottom-2 aspect-square rounded-full bg-indochine-green text-white flex items-center justify-center hover:bg-indochine-green-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              <Send size={18} className={isLoading ? 'opacity-0' : 'opacity-100'} />
              {isLoading && <Loader2 size={18} className="absolute animate-spin" />}
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Map */}
      <div 
        className={cn(
          "lg:w-[60%] h-full lg:rounded-3xl overflow-hidden relative",
          isMobileMapVisible ? "block w-full absolute inset-0 z-50 lg:static lg:z-auto" : "hidden lg:block"
        )}
      >
        {isMobileMapVisible && (
          <button 
            onClick={() => setIsMobileMapVisible(false)}
            className="lg:hidden absolute top-4 left-4 z-[60] bg-white text-indochine-dark p-3 rounded-full shadow-lg border border-indochine-bg/50 flex items-center justify-center"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <MapComponent 
          activities={validActivities} 
          activeActivityIndex={activeActivityIndex} 
          hoveredActivityIndex={hoveredActivityIndex}
          isDragging={isDragging}
          onMarkerClick={(index) => setActivePlaceId(validActivities[index]?.place_id)}
          onMarkerHover={(index) => setHoveredPlaceId(index !== undefined ? validActivities[index]?.place_id : undefined)}
          isMobileMapVisible={isMobileMapVisible}
        />
      </div>
    </div>
  );
}
