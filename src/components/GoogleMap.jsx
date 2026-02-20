import React, { useEffect, useRef } from "react";

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

let googleMapsLoaded = false;
let loadingPromise = null;

function loadGoogleMaps() {
  if (googleMapsLoaded) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  loadingPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      googleMapsLoaded = true;
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      googleMapsLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });

  return loadingPromise;
}

/**
 * GoogleMap component
 * Props:
 *  - center: { lat, lng }
 *  - markers: Array of { lat, lng, title, subtitle, rating, review_count }
 *  - height: string (default "400px")
 */
export default function GoogleMap({ center, markers = [], height = "400px" }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    loadGoogleMaps().then(() => {
      if (!mapRef.current) return;

      // Create or update map
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
            { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
            { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });
      } else {
        mapInstanceRef.current.setCenter(center);
      }

      // Clear old markers
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];

      // Add new markers
      const infoWindow = new window.google.maps.InfoWindow();

      markers.forEach((marker) => {
        if (!marker.lat || !marker.lng) return;

        const m = new window.google.maps.Marker({
          position: { lat: marker.lat, lng: marker.lng },
          map: mapInstanceRef.current,
          title: marker.title,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#F97066",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
          },
        });

        m.addListener("click", () => {
          const content = `
            <div style="color:#1a1a1a; max-width:200px; font-family:sans-serif;">
              <strong style="font-size:14px;">${marker.title}</strong>
              ${marker.subtitle ? `<p style="margin:4px 0 0; font-size:12px; color:#555;">${marker.subtitle}</p>` : ""}
              ${marker.rating ? `<p style="margin:4px 0 0; font-size:12px;">⭐ ${marker.rating}${marker.review_count ? ` (${marker.review_count} reviews)` : ""}</p>` : ""}
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.open(mapInstanceRef.current, m);
        });

        markersRef.current.push(m);
      });

      // Auto-fit bounds if multiple markers
      if (markers.length > 1) {
        const bounds = new window.google.maps.LatLngBounds();
        markers.forEach((m) => {
          if (m.lat && m.lng) bounds.extend({ lat: m.lat, lng: m.lng });
        });
        mapInstanceRef.current.fitBounds(bounds);
      }
    });
  }, [center, markers]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%", borderRadius: "0.5rem" }}
    />
  );
}
