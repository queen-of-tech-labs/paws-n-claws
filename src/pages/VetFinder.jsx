import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Phone, Globe, Star, AlertTriangle, Loader2, Navigation } from "lucide-react";
import GoogleMap from "@/components/GoogleMap";
import { motion } from "framer-motion";


// Geocode via server-side Vercel function (avoids CORS)
async function geocodeLocation(locationStr) {
  const res = await fetch(`/api/geocode?address=${encodeURIComponent(locationStr)}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Location not found. Please try a different address or ZIP code.");
  return { lat: data.lat, lng: data.lng };
}

// Search for vets via server-side Vercel function (avoids CORS)
async function searchVets(lat, lng, keyword, isEmergency) {
  const query = isEmergency
    ? "emergency veterinary hospital"
    : `veterinarian ${keyword || ""}`.trim();

  const res = await fetch(`/api/places-search?lat=${lat}&lng=${lng}&query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error("Failed to fetch vet listings.");
  const data = await res.json();
  return data.results || [];
}

// Format a Places API result into our vet shape
function formatVet(place) {
  return {
    name: place.name,
    address: place.vicinity,
    rating: place.rating,
    review_count: place.user_ratings_total,
    is_emergency:
      place.name?.toLowerCase().includes("emergency") ||
      place.name?.toLowerCase().includes("24"),
    hours:
      place.opening_hours?.open_now !== undefined
        ? place.opening_hours.open_now ? "Open now" : "Closed now"
        : null,
    lat: place.geometry?.location?.lat,
    lng: place.geometry?.location?.lng,
    place_id: place.place_id,
  };
}

export default function VetFinder() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]);
  const [isEmergency, setIsEmergency] = useState(false);

  const handleSearch = async () => {
    if (!location.trim()) {
      setError("Please enter a location to search.");
      return;
    }
    setLoading(true);
    setError("");
    setResults([]);

    try {
      const { lat, lng } = await geocodeLocation(location);
      setMapCenter([lat, lng]);
      const places = await searchVets(lat, lng, searchQuery, isEmergency);
      if (places.length === 0) {
        setError("No vets found in that area. Try a different location or search term.");
      }
      setResults(places.map(formatVet));
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="overflow-x-hidden">
      {/* Hero Image */}
      <div className="w-full h-48 overflow-hidden relative mb-6">
        <img
          src="https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=1200&h=400&fit=crop"
          alt="Vet with Cat"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80"></div>
      </div>

      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Find a Vet</h1>
          <p className="text-sm text-slate-400 mt-1">Search for veterinary clinics near you</p>
        </div>

        {/* Search */}
        <Card className="border-orange-100 mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5B50]/40" />
                <Input
                  placeholder="City, ZIP, or address..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5B50]/40" />
                <Input
                  placeholder="Specialty (optional)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={isEmergency ? "default" : "outline"}
                  onClick={() => setIsEmergency(!isEmergency)}
                  className={
                    isEmergency
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "border-red-200 text-red-500"
                  }
                >
                  <AlertTriangle className="w-4 h-4 mr-1.5" />
                  Emergency
                </Button>
                <Button
                  onClick={handleSearch}
                  disabled={loading}
                  className="bg-[#F97066] hover:bg-[#E5524A] text-white"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Search</span>
                </Button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-400 mt-3 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> {error}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-3 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#F97066] mx-auto mb-3" />
                <p className="text-sm text-[#6B5B50]/60">Searching for vets near you...</p>
              </div>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16">
              <MapPin className="w-12 h-12 text-[#6B5B50]/20 mx-auto mb-3" />
              <p className="text-sm text-[#6B5B50]/60">
                Enter a location and search to find vets near you
              </p>
            </div>
          ) : (
            results.map((vet, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-orange-100 hover:border-orange-200 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-[#3D2E24]">{vet.name}</h3>
                          {vet.is_emergency && (
                            <Badge className="bg-red-100 text-red-700 border-0 text-xs">
                              <AlertTriangle className="w-3 h-3 mr-1" /> Emergency
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-[#6B5B50]/70 mt-1 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          {vet.address}
                        </p>
                        {vet.rating && (
                          <div className="flex items-center gap-1 mt-2">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span className="text-sm font-medium text-[#3D2E24]">
                              {vet.rating}
                            </span>
                            {vet.review_count && (
                              <span className="text-xs text-[#6B5B50]/50">
                                ({vet.review_count} reviews)
                              </span>
                            )}
                          </div>
                        )}
                        {vet.hours && (
                          <p className="text-xs text-[#6B5B50]/50 mt-2">{vet.hours}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-orange-50">
                      {vet.address && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(vet.address)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="text-xs">
                            <Navigation className="w-3 h-3 mr-1" /> Directions
                          </Button>
                        </a>
                      )}
                      {vet.place_id && (
                        <a
                          href={`https://www.google.com/maps/place/?q=place_id:${vet.place_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm" className="text-xs">
                            <Globe className="w-3 h-3 mr-1" /> View on Google Maps
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>

        {/* Map */}
        {results.length > 0 && (
          <Card className="border-orange-100 overflow-hidden">
            <GoogleMap
              center={{ lat: mapCenter[0], lng: mapCenter[1] }}
              markers={results.filter(v => v.lat && v.lng).map(v => ({
                lat: v.lat,
                lng: v.lng,
                title: v.name,
                subtitle: v.address,
                rating: v.rating,
                review_count: v.review_count,
              }))}
              height="400px"
            />
          </Card>
        )}
      </div>
    </div>
  );
}
