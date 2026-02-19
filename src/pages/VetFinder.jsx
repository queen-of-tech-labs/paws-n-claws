import React, { useState, useEffect } from "react";
import api from '@/api/firebaseClient';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Search, Phone, Globe, Star, AlertTriangle, Loader2, Navigation } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { motion } from "framer-motion";

// Fix leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function VetFinder() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]);
  const [isEmergency, setIsEmergency] = useState(false);

  const handleSearch = async () => {
    setLoading(true);
    const query = isEmergency
      ? `Find emergency veterinary clinics near ${location || "me"}. Include 24-hour and emergency animal hospitals.`
      : `Find veterinary clinics ${searchQuery ? `specializing in ${searchQuery}` : ""} near ${location || "a major city"}. Include general vets and specialty clinics.`;

    const res = await api.integrations.Core.InvokeLLM({
      prompt: query,
      add_context_from_internet: true,
      response_json_schema: {
        type: "object",
        properties: {
          vets: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                address: { type: "string" },
                phone: { type: "string" },
                website: { type: "string" },
                rating: { type: "number" },
                review_count: { type: "number" },
                specialties: { type: "array", items: { type: "string" } },
                is_emergency: { type: "boolean" },
                hours: { type: "string" },
                lat: { type: "number" },
                lng: { type: "number" },
              }
            }
          },
          center_lat: { type: "number" },
          center_lng: { type: "number" }
        }
      }
    });

    setResults(res.vets || []);
    if (res.center_lat && res.center_lng) {
      setMapCenter([res.center_lat, res.center_lng]);
    }
    setLoading(false);
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
                className="pl-10"
              />
            </div>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5B50]/40" />
              <Input
                placeholder="Specialty (optional)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={isEmergency ? "default" : "outline"}
                onClick={() => setIsEmergency(!isEmergency)}
                className={isEmergency ? "bg-red-500 hover:bg-red-600 text-white" : "border-red-200 text-red-500"}
              >
                <AlertTriangle className="w-4 h-4 mr-1.5" />
                Emergency
              </Button>
              <Button onClick={handleSearch} disabled={loading} className="bg-[#F97066] hover:bg-[#E5524A] text-white">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                <span className="ml-1.5 hidden sm:inline">Search</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results list */}
      <div className="space-y-3 mb-6">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#F97066] mx-auto mb-3" />
                <p className="text-sm text-[#6B5B50]/60">Searching for vets...</p>
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
                            <span className="text-sm font-medium text-[#3D2E24]">{vet.rating}</span>
                            {vet.review_count && <span className="text-xs text-[#6B5B50]/50">({vet.review_count} reviews)</span>}
                          </div>
                        )}
                        {vet.specialties && vet.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {vet.specialties.map((s, j) => (
                              <Badge key={j} variant="secondary" className="bg-orange-50 text-[#6B5B50] text-xs border-0">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {vet.hours && <p className="text-xs text-[#6B5B50]/50 mt-2">{vet.hours}</p>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-orange-50">
                      {vet.phone && (
                        <a href={`tel:${vet.phone}`}>
                          <Button variant="outline" size="sm" className="text-xs">
                            <Phone className="w-3 h-3 mr-1" /> {vet.phone}
                          </Button>
                        </a>
                      )}
                      {vet.website && (
                        <a href={vet.website.startsWith("http") ? vet.website : `https://${vet.website}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="text-xs">
                            <Globe className="w-3 h-3 mr-1" /> Website
                          </Button>
                        </a>
                      )}
                      {vet.address && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(vet.address)}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm" className="text-xs">
                            <Navigation className="w-3 h-3 mr-1" /> Directions
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
          <div className="h-[400px] w-full">
            <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }} key={mapCenter.join(",")}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {results.filter(v => v.lat && v.lng).map((vet, i) => (
                <Marker key={i} position={[vet.lat, vet.lng]}>
                  <Popup>
                    <strong>{vet.name}</strong><br />
                    {vet.address}<br />
                    {vet.phone && <span>📞 {vet.phone}</span>}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}