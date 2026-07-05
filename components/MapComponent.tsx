"use client";

import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Activity } from '../lib/zod-schemas';
import mockRoutesData from '../data/mock_routes.json';
import { RouteInstructions } from './RouteInstructions';

interface MapComponentProps {
  activities: Activity[];
  activeActivityIndex?: number;
  hoveredActivityIndex?: number;
  onMarkerClick?: (index: number) => void;
  onMarkerHover?: (index?: number) => void;
  isDragging?: boolean;
}

const mockRoutes: Record<string, any> = mockRoutesData;

// Vị trí hiện tại: Tòa A2, Học viện Công nghệ Bưu chính Viễn thông, 96 Trần Phú, Hà Đông
const CURRENT_LOCATION = { lat: 20.98096, lng: 105.78708, name: "Tòa A2, PTIT, 96 Trần Phú, Hà Đông" };

// Mọi thứ sẽ chạy trên mã nguồn mở MapLibre + OpenStreetMap (không cần Token)

function translateInstruction(m: any) {
  if (!m) return "Đi thẳng";
  const type = m.type;
  const modifier = m.modifier;

  let modStr = '';
  switch(modifier) {
    case 'uturn': modStr = 'quay đầu'; break;
    case 'sharp right': modStr = 'rẽ ngoặt phải'; break;
    case 'right': modStr = 'rẽ phải'; break;
    case 'slight right': modStr = 'chếch sang phải'; break;
    case 'straight': modStr = 'đi thẳng'; break;
    case 'slight left': modStr = 'chếch sang trái'; break;
    case 'left': modStr = 'rẽ trái'; break;
    case 'sharp left': modStr = 'rẽ ngoặt trái'; break;
  }

  if (type === 'depart') return `Bắt đầu đi về phía ${modifier === 'left' ? 'trái' : modifier === 'right' ? 'phải' : 'trước'}`;
  if (type === 'arrive') return `Đến đích`;
  if (type === 'turn') return `Rẽ ${modStr || modifier}`;
  if (type === 'continue') return `Tiếp tục ${modStr || 'đi thẳng'}`;
  if (type === 'roundabout' || type === 'rotary') return `Đi vào vòng xuyến, rẽ ${modStr || 'ra'}`;
  if (type === 'new name') return `Đi tiếp vào`;
  if (type === 'end of road') return `Cuối đường rẽ ${modStr}`;
  if (type === 'merge') return `Hòa vào làn ${modStr}`;
  
  return type ? `${type} ${modStr}` : 'Đi thẳng';
}

export function MapComponent({ activities, activeActivityIndex, hoveredActivityIndex, onMarkerClick, onMarkerHover, isDragging = false }: MapComponentProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const currentLocMarker = useRef<mapboxgl.Marker | null>(null);
  
  const [activeRoute, setActiveRoute] = useState<any | null>(null);
  const lastAnimatedPlaceId = useRef<string | undefined>(undefined);

  // 1. Initialize map (Chạy 1 lần duy nhất)
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'raster-tiles': {
            type: 'raster',
            tiles: [
              'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
            ],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap Contributors'
          }
        },
        layers: [
          {
            id: 'simple-tiles',
            type: 'raster',
            source: 'raster-tiles',
            minzoom: 0,
            maxzoom: 19
          }
        ]
      },
      center: [CURRENT_LOCATION.lng, CURRENT_LOCATION.lat],
      zoom: 13,
      pitch: 45,
      bearing: -17.6,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

    map.current.on('load', () => {
      // Add empty route source
      if (!map.current) return;
      map.current.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: []
          }
        }
      });

      map.current.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#4A7A66', // indochine-green-light
          'line-width': 6,
          'line-opacity': 0.8
        }
      });
      
      // Add current location marker (Point 0)
      const el = document.createElement('div');
      el.className = 'marker-wrapper w-10 h-10 flex items-center justify-center';
      
      const inner = document.createElement('div');
      inner.className = 'w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center font-bold text-xs bg-blue-600 text-white border-white scale-110 z-30 ring-4 ring-blue-500/20';
      inner.innerHTML = '0';
      el.appendChild(inner);

      // Tooltip for point 0
      const popup = new mapboxgl.Popup({ offset: 25, closeButton: false, closeOnClick: false })
        .setText(CURRENT_LOCATION.name);

      currentLocMarker.current = new mapboxgl.Marker({ element: el })
        .setLngLat([CURRENT_LOCATION.lng, CURRENT_LOCATION.lat])
        .setPopup(popup)
        .addTo(map.current!);
      
      // Mở popup mặc định để user dễ thấy
      currentLocMarker.current.togglePopup();
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // 2. Sync Markers (Vị trí & Số lượng) - Cực kỳ mượt mà, không destroy DOM
  useEffect(() => {
    if (!map.current || isDragging) return;

    // Đảm bảo số lượng marker bằng đúng số lượng activities
    while (markers.current.length > activities.length) {
      const marker = markers.current.pop();
      marker?.remove();
    }
    
    while (markers.current.length < activities.length) {
      const index = markers.current.length;
      
      // Thêm Wrapper ngoài cùng để Mapbox thoải mái ghi đè Transform (chứa tọa độ translate)
      const el = document.createElement('div');
      el.className = 'marker-wrapper w-10 h-10 flex items-center justify-center';
      el.style.display = 'none'; // Ẩn marker cho đến khi có tọa độ hợp lệ
      
      // Inner sẽ chứa toàn bộ Style và CSS Transforms nội bộ (bounce, scale)
      const inner = document.createElement('div');
      inner.className = 'marker-inner w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center font-bold text-xs transition-all duration-300 cursor-pointer bg-white text-indochine-dark border-indochine-green/20 z-10';
      el.appendChild(inner);
      
      // Thêm event cứng theo vị trí Index (bởi vì thẻ DOM ở vị trí này luôn đại diện cho điểm thứ index)
      el.addEventListener('click', () => { if (onMarkerClick) onMarkerClick(index); });
      el.addEventListener('mouseenter', () => { if (onMarkerHover) onMarkerHover(index); });
      el.addEventListener('mouseleave', () => { if (onMarkerHover) onMarkerHover(undefined); });

      // Phải cung cấp tọa độ tạm [0,0] để không bị crash khi addTo map
      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([0, 0])
        .addTo(map.current!);
      markers.current.push(marker);
    }

    // Cập nhật lại tọa độ và text (số thứ tự) cho tất cả các marker hiện có
    activities.forEach((activity, index) => {
      const marker = markers.current[index];
      const el = marker.getElement();
      
      if (activity && activity.lat !== undefined && activity.lng !== undefined && !isNaN(activity.lat) && !isNaN(activity.lng)) {
        marker.setLngLat([activity.lng, activity.lat]);
        el.style.display = 'flex'; // Hiện marker khi đã có tọa độ
      } else {
        el.style.display = 'none'; // Ẩn marker nếu dữ liệu stream chưa tới tọa độ
      }

      const inner = el.querySelector('.marker-inner');
      if (inner) {
        inner.innerHTML = `${index + 1}`;
      }
    });

  }, [activities, onMarkerClick, onMarkerHover, isDragging]);

  // 3. Sync Hover & Active Styling - Xử lý riêng biệt để không ảnh hưởng routing
  useEffect(() => {
    markers.current.forEach((marker, index) => {
      const el = marker.getElement();
      const inner = el.querySelector('.marker-inner');
      if (!inner) return;

      const isActive = index === activeActivityIndex;
      const isHovered = index === hoveredActivityIndex;

      if (isActive) {
        inner.className = 'marker-inner w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center font-bold text-xs transition-all duration-300 cursor-pointer bg-indochine-green text-white border-white scale-125 z-20';
        el.style.zIndex = '30';
      } else if (isHovered) {
        inner.className = 'marker-inner w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center font-bold text-xs transition-all duration-300 cursor-pointer bg-indochine-yellow-dark text-white border-white scale-110 animate-bounce z-30';
        el.style.zIndex = '40';
      } else {
        inner.className = 'marker-inner w-8 h-8 rounded-full border-2 shadow-lg flex items-center justify-center font-bold text-xs transition-all duration-300 cursor-pointer bg-white text-indochine-dark border-indochine-green/20 z-10';
        el.style.zIndex = '10';
      }
    });
  }, [activeActivityIndex, hoveredActivityIndex, activities.length]);

  // 4. Sync Route (Gọi API OSRM) - Ràng buộc chặt chẽ để tránh gọi liên tục
  const activePlaceId = activeActivityIndex !== undefined ? activities[activeActivityIndex]?.place_id : undefined;
  const prevPlaceId = (activeActivityIndex !== undefined && activeActivityIndex > 0) ? activities[activeActivityIndex - 1]?.place_id : undefined;

  useEffect(() => {
    if (!map.current || isDragging) return;
    let abortController: AbortController | null = null;
    let timeoutId: any = null;

    if (activeActivityIndex !== undefined && activities[activeActivityIndex]) {
      const active = activities[activeActivityIndex];
      
      // Bỏ qua nếu dữ liệu vị trí chưa được load hoàn chỉnh
      if (!active.lat || !active.lng || isNaN(active.lat) || isNaN(active.lng)) {
        setTimeout(() => setActiveRoute(null), 0);
        return;
      }

      // Xác định điểm xuất phát: điểm trước đó, hoặc CURRENT_LOCATION nếu là điểm đầu
      let startLng = CURRENT_LOCATION.lng;
      let startLat = CURRENT_LOCATION.lat;
      let startName = CURRENT_LOCATION.name;

      if (activeActivityIndex > 0 && activities[activeActivityIndex - 1]) {
        const prev = activities[activeActivityIndex - 1];
        if (prev.lat && prev.lng && !isNaN(prev.lat) && !isNaN(prev.lng)) {
          startLng = prev.lng;
          startLat = prev.lat;
          startName = prev.name;
        }
      }

      abortController = new AbortController();
      timeoutId = setTimeout(() => abortController?.abort(), 1500); // 1.5s timeout pitching-ready

      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${active.lng},${active.lat}?steps=true&geometries=geojson&overview=full`;

      fetch(url, { signal: abortController.signal })
        .then(res => res.json())
        .then(osrmData => {
          clearTimeout(timeoutId);
          if (osrmData && osrmData.routes && osrmData.routes[0] && map.current && map.current.isStyleLoaded()) {
            const route = osrmData.routes[0];
            let steps = [];
            
            // Add start location text
            steps.push({
              instruction: `Từ ${startName}`,
              distance: 0,
              name: startName
            });

            if (route.legs && route.legs[0] && route.legs[0].steps) {
              steps = steps.concat(route.legs[0].steps.map((step: any) => {
                let sname = step.name || '';
                if (!sname && step.maneuver.type === 'arrive') sname = active.name;
                if (!sname) sname = 'Đường nội bộ / Lối đi chung';
                return {
                  instruction: translateInstruction(step.maneuver),
                  distance: step.distance,
                  name: sname
                };
              }));
            }

            const routeData = {
              distance: route.distance,
              duration: route.duration,
              geometry: route.geometry,
              steps: steps
            };

            const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
            if (source) {
              source.setData({
                type: 'Feature',
                properties: {},
                geometry: routeData.geometry
              });
            }

            // CHỈ di chuyển camera nếu người dùng VỪA CHỌN điểm này (không phải do đang kéo thả cập nhật route)
            if (lastAnimatedPlaceId.current !== activePlaceId) {
              map.current.flyTo({
                center: [active.lng, active.lat],
                zoom: Math.max(map.current.getZoom(), 14), // Giữ nguyên mức zoom hiện tại nếu đã zoom sát, hoặc zoom vào 14
                speed: 1.2,
                essential: true
              });
              lastAnimatedPlaceId.current = activePlaceId;
            }

            setActiveRoute(routeData);
          } else {
            throw new Error('No route found');
          }
        })
        .catch(err => {
          // Fallback Ảo diệu: FlyTo lướt mượt mà giấu lỗi mạng
          if (err.name === 'AbortError') console.log('OSRM timeout 1.5s - Fallback to flyTo');
          clearTimeout(timeoutId);
          setTimeout(() => setActiveRoute(null), 0);
          
          if (map.current && map.current.isStyleLoaded()) {
            const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
            if (source) source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
            
            // CHỈ di chuyển camera nếu người dùng VỪA CHỌN điểm này (không phải do đang kéo thả)
            if (lastAnimatedPlaceId.current !== activePlaceId) {
              map.current.flyTo({
                center: [active.lng, active.lat],
                zoom: Math.max(map.current.getZoom(), 14),
                speed: 1.5,
                duration: 500, // Nhảy thẳng để giấu thời gian chờ 1.5s
                essential: true
              });
              lastAnimatedPlaceId.current = activePlaceId;
            }
          }
        });

    } else {
      setTimeout(() => setActiveRoute(null), 0);
      if (map.current && map.current.isStyleLoaded()) {
        const source = map.current.getSource('route') as mapboxgl.GeoJSONSource;
        if (source) source.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
      }
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (abortController) abortController.abort();
    };
  }, [activeActivityIndex, activities, isDragging]); // Chỉ update route khi Điểm Đích hoặc Điểm Xuất Phát thực sự thay đổi!

  return (
    <div className="relative w-full h-full p-4 pl-0">
      <div 
        ref={mapContainer} 
        className="map-container shadow-2xl shadow-indochine-dark/10" 
      />
      <div className="absolute inset-4 left-0 rounded-[1.5rem] pointer-events-none mix-blend-multiply bg-[#F4EBD0]/10" />
      
      {/* Route Instructions Panel */}
      {activeRoute && (
        <RouteInstructions 
          distance={activeRoute.distance}
          duration={activeRoute.duration}
          steps={activeRoute.steps}
          onClose={() => setActiveRoute(null)}
        />
      )}
    </div>
  );
}
