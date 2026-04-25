"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import "leaflet/dist/leaflet.css"

// No dynamic import for Leaflet here - we'll import it directly in useEffect
// Add type for Leaflet
type LeafletType = any;

interface JobMapComponentProps {
  jobs: any[]
  onMarkerClick: (job: any) => void
  initialCenter?: [number, number] // Optional initial center coordinates
  initialZoom?: number // Optional initial zoom level
}

export function JobMapComponent({
  jobs,
  onMarkerClick,
  initialCenter,
  initialZoom = 10, // Default to regional zoom level
}: JobMapComponentProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any | null>(null)
  const markersRef = useRef<any[]>([])
  const [isMapReady, setIsMapReady] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [L, setL] = useState<LeafletType | null>(null) // Store Leaflet instance

  // Get user's location
  useEffect(() => {
    if (typeof window !== "undefined" && navigator.geolocation && !userLocation && !initialCenter) {
      try {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            setUserLocation([latitude, longitude])
          },
          (error) => {
            // Handle geolocation errors gracefully
            console.warn(`Geolocation error (code ${error.code}): ${error.message}`)
            
            // Set default location for Philippines (Manila)
            const defaultLocation: [number, number] = [14.5995, 120.9842]
            setUserLocation(defaultLocation)
            
            // Additional logging for debugging
            const errorDetails = {
              code: error.code,
              message: error.message
            }
            console.info("Using default location due to geolocation error:", errorDetails)
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,       // ✅ Give it 15 seconds
            maximumAge: 300000    // ✅ Accept cached position up to 5 minutes
          }
        )
      } catch (e) {
        // Catch any unexpected errors with the geolocation API itself
        console.warn("Unexpected error with geolocation API:", e)
        
        // Set default location for Philippines (Manila)
        const defaultLocation: [number, number] = [14.5995, 120.9842]
        setUserLocation(defaultLocation)
      }
    }
  }, [userLocation, initialCenter])

  // Initialize Leaflet
  useEffect(() => {
    if (typeof window === "undefined") return

    // Import Leaflet directly
    const importLeaflet = async () => {
      try {
        const leafletModule = await import("leaflet");
        
        // Fix icon issues - type everything as any to avoid TypeScript errors
        const leaflet = leafletModule as any;
        
        // Fix default icon issues
        delete leaflet.Icon.Default.prototype._getIconUrl;
        
        leaflet.Icon.Default.mergeOptions({
          iconRetinaUrl: "/images/marker-icon.png",
          iconUrl: "/images/marker-icon.png",
          shadowUrl: "/images/marker-shadow.png",
        });
        
        setL(leaflet);
      } catch (err) {
        console.error("Failed to load Leaflet:", err);
      }
    };
    
    importLeaflet();
  }, []);

  // Initialize map when Leaflet is loaded
  useEffect(() => {
    if (!L || typeof window === "undefined") return

    // Initialize map if it doesn't exist
    if (!mapInstanceRef.current && mapContainerRef.current) {
      // Fallback center on Philippines if no user location or initial center
      const philippinesCenter: [number, number] = [12.8797, 121.774]
      const defaultZoom = initialZoom || 10 // Regional zoom level
      
      // Determine map center: initial center > user location > philippines default
      const mapCenter = initialCenter || userLocation || philippinesCenter
      const mapZoom = userLocation || initialCenter ? defaultZoom : 6 // If using default center, use country-level zoom

      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: mapCenter,
        zoom: mapZoom,
        minZoom: 5,
        maxZoom: 18,
        maxBounds: L.latLngBounds(
          L.latLng(4.2158, 114.0952), // Southwest corner of bounds (approx)
          L.latLng(21.3217, 126.6043), // Northeast corner of bounds (approx)
        ),
        maxBoundsViscosity: 1.0, // Prevents dragging outside bounds
      })

      // Add OpenStreetMap tile layer
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapInstanceRef.current)

      // Add Philippines outline (simplified)
      fetch("/philippines-outline.geojson")
        .then((response) => response.json())
        .then((data) => {
          L.geoJSON(data, {
            style: {
              color: "#FFD700",
              weight: 2,
              opacity: 0.6,
              fillColor: "#FFD700",
              fillOpacity: 0.1,
            },
          }).addTo(mapInstanceRef.current!)
        })
        .catch((err) => console.error("Error loading Philippines outline:", err))

      setIsMapReady(true)
    }

    // ✅ Fix: Only destroy map on actual unmount, not on every dependency change
    return () => {
      // Check if component is truly unmounting by using a flag
      mapInstanceRef.current?.remove()
      mapInstanceRef.current = null
    }
  }, [L]) // ✅ Only re-run when Leaflet loads, not on every location change

  // Add markers when map is ready and jobs are available
  useEffect(() => {
    if (!L || !isMapReady || !mapInstanceRef.current || jobs.length === 0) return;
    
    // Clear existing markers
    if (markersRef.current.length > 0) {
      markersRef.current.forEach((marker) => {
        marker.remove()
      })
      markersRef.current = []
    }

    // Create custom icon for job markers using div icon (location pin style)
    const createJobMarker = (color: string = "#ef4444", jobType: string = "") => {
      return L.divIcon({
        className: 'job-location-marker',
        html: `
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" class="w-7 h-7">
              <path fill-rule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clip-rule="evenodd" />
            </svg>
            <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-[-60%] text-white text-[10px] font-bold">${getJobTypeInitial(jobType)}</div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
        popupAnchor: [0, -28],
      });
    };

    // Helper function to get job type initial letter for marker
    const getJobTypeInitial = (type: string): string => {
      if (!type) return "J";
      const typeMap: Record<string, string> = {
        'Full-time': 'F',
        'Part-time': 'P',
        'Contract': 'C',
        'Internship': 'I',
        'Remote': 'R',
        'Freelance': 'L',
        'Temporary': 'T',
      };
      return typeMap[type] || type.charAt(0).toUpperCase();
    };

    // Get color based on job category
    const getJobColor = (category: string): string => {
      const colorMap: Record<string, string> = {
        'Technology': '#3b82f6',  // blue
        'Development': '#3b82f6', // blue
        'Design': '#8b5cf6',      // purple
        'Marketing': '#f59e0b',   // amber
        'Finance': '#10b981',     // emerald
        'Healthcare': '#ef4444',  // red
        'Education': '#f97316',   // orange
        'Administrative': '#6366f1', // indigo
        'Customer Service': '#14b8a6', // teal
        'Management': '#8b5cf6',   // violet
        'Sales': '#ec4899',       // pink
        'Engineering': '#6366f1',  // indigo
        'Skilled Labor': '#0d9488', // teal-600
        'Manual Labor': '#84cc16', // lime-500
        'General': '#6b7280',     // gray
      };
      return colorMap[category] || '#ef4444'; // default red
    };

    // Add job markers
    jobs.forEach((job) => {
      if (job.coordinates && Array.isArray(job.coordinates) && job.coordinates.length === 2) {
        // Create marker with category-specific color
        const jobColor = getJobColor(job.category);
        const marker = L.marker(job.coordinates as [number, number], { 
          icon: createJobMarker(jobColor, job.type) 
        }).addTo(mapInstanceRef.current!)

        // Create tooltip for hover
        const tooltip = L.tooltip({
          direction: "top",
          permanent: false,
          opacity: 0.9,
          className: "job-tooltip",
        }).setContent(`
          <div class="font-semibold">${job.title}</div>
          <div>${job.company}</div>
          <div class="text-xs">${job.category} (${job.type})</div>
        `)

        // Add hover functionality
        marker.bindTooltip(tooltip)

        // Add click functionality
        marker.on("click", () => {
          onMarkerClick(job)
        })

        markersRef.current.push(marker)
      }
    })

    // If we have a user location, add a marker for it
    if (userLocation) {
      const userIcon = L.divIcon({
        className: 'user-location-icon',
        html: `<div class="w-5 h-5 bg-blue-500 rounded-full border-2 border-white shadow-lg pulse flex items-center justify-center">
                <div class="w-1 h-1 bg-white rounded-full"></div>
              </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });
      
      // ✅ Fix: removed unused variable assignment
      L.marker(userLocation, { icon: userIcon })
        .addTo(mapInstanceRef.current)
        .bindTooltip("Your location");
    }

    // Fit bounds to markers if we have any
    if (markersRef.current.length > 0) {
      const group = L.featureGroup(markersRef.current)
      mapInstanceRef.current.fitBounds(group.getBounds(), {
        padding: [50, 50],
        maxZoom: 12,
      })
    }

    // Add custom CSS for tooltips and user location
    if (typeof window !== "undefined" && !document.getElementById("job-map-styles")) {
      const styleEl = document.createElement("style")
      styleEl.id = "job-map-styles"
      styleEl.innerHTML = `
        .job-tooltip {
          background-color: white;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 5px 8px;
          font-size: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .job-tooltip .leaflet-tooltip-content {
          white-space: nowrap;
        }
        .user-location-icon .pulse {
          animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
          }
        }
      `
      document.head.appendChild(styleEl)
    }
  }, [L, isMapReady, jobs, onMarkerClick, userLocation])

  // If window is not available, return null
  if (typeof window === "undefined") return null

  return <div ref={mapContainerRef} className="w-full h-full z-10 rounded-lg overflow-hidden" />
}