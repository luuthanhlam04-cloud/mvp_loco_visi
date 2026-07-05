import { Activity } from '../lib/zod-schemas';
import { cn } from '../lib/utils';
import { Clock, MapPin, GripVertical } from 'lucide-react';
import { Reorder, useDragControls } from 'framer-motion';

interface ActivityCardProps {
  activity: Activity;
  index: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  isActive?: boolean;
  isHovered?: boolean;
  isDragEnabled?: boolean;
}

export function ActivityCard({ activity, index, onClick, onMouseEnter, onMouseLeave, onDragStart, onDragEnd, isActive, isHovered, isDragEnabled = false }: ActivityCardProps) {
  const dragControls = useDragControls();

  return (
    <Reorder.Item
      id={`activity-card-${index}`}
      value={activity}
      dragListener={false}
      dragControls={dragControls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: isActive || isHovered ? 1.03 : 1 }}
      transition={{ 
        opacity: { duration: 0.3 }, 
        scale: { duration: 0.3 } 
      }}
      onClick={onClick}
      className={cn(
        "group relative flex flex-col sm:flex-row gap-4 p-4 rounded-3xl transition-[background-color,border-color,box-shadow] duration-300 ease-out border-2",
        isActive || isHovered
          ? "bg-[#FDFBF7] border-indochine-yellow-dark shadow-xl shadow-indochine-yellow-dark/30 z-20 ring-4 ring-indochine-yellow-dark/10" 
          : "bg-white border-transparent shadow-sm hover:shadow-lg hover:border-indochine-yellow-dark/30"
      )}
    >
      <div className="relative w-full sm:w-32 h-32 shrink-0 overflow-hidden rounded-2xl bg-indochine-bg">
        {activity.image ? (
          <img 
            src={activity.image} 
            alt={activity.name}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-indochine-yellow/20 text-indochine-green/40">
            <MapPin size={32} strokeWidth={1.5} />
          </div>
        )}
      </div>

      <div className="flex flex-col flex-grow justify-center py-1">
        {activity.category && (
          <span className="text-[10px] uppercase tracking-wider font-bold text-indochine-green-light mb-1">
            {activity.category}
          </span>
        )}
        <h3 className="text-lg font-bold text-indochine-dark mb-1 leading-tight group-hover:text-indochine-green transition-colors pr-6">
          {activity.name}
        </h3>
        
        {activity.description && (
          <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed mb-3">
            {activity.description}
          </p>
        )}
        
        <div className="mt-auto flex items-center gap-3 text-xs font-medium text-gray-400">
          <div className="flex items-center gap-1 bg-indochine-bg px-2 py-1 rounded-full truncate">
            <MapPin size={14} />
            <span className="truncate max-w-[120px]">Tại điểm đến</span>
          </div>
        </div>
      </div>
      
      {isDragEnabled && (
        <div 
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-300 opacity-50 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded-lg"
          onPointerDown={(e) => {
            // Ngăn sự kiện click lan truyền để không chọn thẻ khi đang bấm kéo
            // Nhưng không được preventDefault vì framer-motion cần nhận sự kiện pointer
            dragControls.start(e);
          }}
          style={{ touchAction: 'none' }}
        >
          <GripVertical size={20} />
        </div>
      )}
    </Reorder.Item>
  );
}
