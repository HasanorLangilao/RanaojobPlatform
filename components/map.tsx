"use client"

import { useEffect, useRef, useState } from 'react'
import type { Map as LeafletMap, Marker as LeafletMarker } from 'leaflet'

// Leaflet must be imported dynamically to avoid SSR issues
let L: any;

interface MapProps {
  center: [number, number];
  zoom: number;
  onMapClick?: (latlng: [number, number]) => void;
  markers?: Array<{
    position: [number, number];
    popup: string;
  }>;
}

export function Map({ center, zoom, onMapClick, markers = [] }: MapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const [mapReady, setMapReady] = useState(false);

  // Initialize map once component mounts
  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Dynamically import Leaflet on the client side
    const initMap = async () => {
      if (!L) {
        L = await import('leaflet');
        
        // Fix Leaflet icon issues
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: '/images/marker-icon.png',
          iconUrl: '/images/marker-icon.png',
          shadowUrl: '/images/marker-shadow.png',
        });
      }

      if (!mapInstanceRef.current) {
        // Create map instance
        mapInstanceRef.current = L.map(mapRef.current).setView(center, zoom);

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19 as any
        }).addTo(mapInstanceRef.current);

        // Add click handler
        if (onMapClick && mapInstanceRef.current) {
          (mapInstanceRef.current as any).on('click', (e: any) => {
            onMapClick([e.latlng.lat, e.latlng.lng]);
          });
        }

        setMapReady(true);
      } else {
        // Update view if center or zoom changes
        mapInstanceRef.current.setView(center, zoom);
      }
    };

    initMap();

    // Cleanup function
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, onMapClick]);

  // Handle markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !L) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach(({ position, popup }) => {
      const marker = L.marker(position).addTo(mapInstanceRef.current as LeafletMap);
      if (popup) {
        (marker as any).bindPopup(popup).openPopup();
      }
      markersRef.current.push(marker);
    });

    // Fit bounds if we have markers
    if (markers.length > 1) {
      const group = L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds(), {
        padding: [50, 50],
        maxZoom: 15
      });
    }

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
    };
  }, [markers, mapReady]);

  // Add CSS for Leaflet
  useEffect(() => {
    if (typeof window !== 'undefined' && !document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }, []);

  return <div ref={mapRef} className="w-full h-full" />;
}

// Add default export for dynamic import compatibility
export default Map;
