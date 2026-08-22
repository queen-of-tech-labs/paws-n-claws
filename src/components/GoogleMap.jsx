import React, { useEffect, useRef } from "react";

// Hardcoded directly rather than read from import.meta.env.VITE_GOOGLE_PLACES_API_KEY.
// That env var was never set up in the Codemagic (iOS) build pipeline, so it came
// out as "undefined" in every iOS build, which made the Maps script URL request
// "...js?key=undefined" and produced Google's own hard failure screen ("Oops!
// Something went wrong. This page didn't load Google Maps correctly."). This is the
// same class of bug as the earlier Google Sign-In "No provider was initialized"
// issue - a build-time value that was only ever verified for local/Android builds.
// Per Google's own guidance, Maps JavaScript API browser keys are meant to be
// exposed client-side; they're locked down with application/referrer restrictions
// in Google Cloud Console, not by keeping the key secret.
//
// UPDATE: the key that was here (ending in ...MXFnX8, originally sourced from
// VITE_GOOGLE_PLACES_API_KEY) turned out to belong to some other Google Cloud
// project - not paws-claws-pet-tracker-3t0ana, the project this app's billing
// (Blaze plan, "Firebase Payment" account) is actually set up on. That mismatch
// is exactly what produced BillingNotEnabledMapError even though billing looked
// completely correct in the console: the key was real, just not ours. Replaced
// with the "Browser key (auto created by Firebase)" from Credentials in the
// correct project - confirmed unrestricted (no application/website restriction)
// and confirmed to include Maps JavaScript API in its allowed-APIs list.
const GOOGLE_MAPS_API_KEY = "AIzaSyAuRNOdRNmp2_RgFbMOHc2GafbQeAuWG14";

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

  // Belt-and-suspenders resize handling: the effect above only re-triggers
  // Maps' resize when the `center`/`markers` PROPS change, which assumes
  // those are the only things that ever change the map's actual on-screen
  // size. In practice the map's container can also change size for reasons
  // that have nothing to do with those props - e.g. on AnimalRescues the
  // results list sitting above/beside the map (in the CSS grid) grows once
  // search results come in, which reflows and resizes the map's box even
  // though `center`/`markers` may update on a slightly different tick. A
  // ResizeObserver watches the actual container element itself, so it
  // catches every case, not just the ones we happened to think of.
  useEffect(() => {
    if (!mapRef.current || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current && window.google?.maps) {
        window.google.maps.event.trigger(mapInstanceRef.current, "resize");
      }
    });
    observer.observe(mapRef.current);

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ height, width: "100%", borderRadius: "0.5rem" }}
    />
  );
}
