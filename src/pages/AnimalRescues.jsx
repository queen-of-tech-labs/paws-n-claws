import React, { useState } from "react";
import api from '@/api/firebaseClient';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, Search, Phone, Globe, Heart, HandHeart,
  ExternalLink, Loader2, Navigation, Users, Plus
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { motion } from "framer-motion";
import SuggestRescueForm from "../components/rescues/SuggestRescueForm";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export default function AnimalRescues() {
  const [location, setLocation] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([40.7128, -74.006]);
  const [activeTab, setActiveTab] = useState("all");
  const [showSuggestForm, setShowSuggestForm] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState({});

  const handleSearch = async () => {
    setLoading(true);
    
    // Fetch approved suggestions and LLM results in parallel
    const [approvedSuggestions, llmResponse] = await Promise.all([
      api.entities.RescueSuggestion.filter({ status: "approved" }),
      api.integrations.Core.InvokeLLM({
        prompt: `Find animal rescues, shelters, and adoption centers near ${location || "a major city"}. Include rescue organizations, SPCA/humane societies, breed-specific rescues (including cat-only and dog-only rescues), and wildlife rehabilitation centers. For each, provide whether they accept volunteers and if they accept donations.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            rescues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string", enum: ["rescue", "shelter", "adoption_center", "wildlife_rehab"] },
                  address: { type: "string" },
                  phone: { type: "string" },
                  website: { type: "string" },
                  description: { type: "string" },
                  animals: { type: "array", items: { type: "string" } },
                  accepts_volunteers: { type: "boolean" },
                  accepts_donations: { type: "boolean" },
                  donation_link: { type: "string" },
                  lat: { type: "number" },
                  lng: { type: "number" },
                }
              }
            },
            center_lat: { type: "number" },
            center_lng: { type: "number" }
          }
        }
      })
    ]);

    // Convert approved suggestions to rescue format with geocoding if needed
    const suggestionsAsRescues = await Promise.all(
      approvedSuggestions.map(async (s) => {
        let lat = s.latitude;
        let lng = s.longitude;

        // Geocode address if coordinates are missing
        if (!lat || !lng) {
          const geoResponse = await api.integrations.Core.InvokeLLM({
            prompt: `Provide the latitude and longitude coordinates for this address: ${s.address}`,
            response_json_schema: {
              type: "object",
              properties: {
                latitude: { type: "number" },
                longitude: { type: "number" }
              }
            }
          });
          lat = geoResponse.latitude;
          lng = geoResponse.longitude;
        }

        return {
          name: s.name,
          type: "rescue",
          address: s.address,
          phone: "",
          website: s.website || "",
          description: s.description,
          animals: s.animals_served || [],
          accepts_volunteers: s.accepts_volunteers || false,
          accepts_donations: s.accepts_donations || false,
          donation_link: s.donation_link || s.website || "",
          lat: lat,
          lng: lng,
        };
      })
    );

    // Merge LLM results with approved suggestions
    const allResults = [...suggestionsAsRescues, ...(llmResponse.rescues || [])];
    
    setResults(allResults);
    if (llmResponse.center_lat && llmResponse.center_lng) {
      setMapCenter([llmResponse.center_lat, llmResponse.center_lng]);
    }
    setLoading(false);
  };

  const typeLabels = {
    rescue: "Rescue",
    shelter: "Shelter",
    adoption_center: "Adoption Center",
    wildlife_rehab: "Wildlife Rehab"
  };

  const filtered = activeTab === "all"
    ? results
    : results.filter(r => {
        if (activeTab === "volunteer") return r.accepts_volunteers;
        if (activeTab === "donate") return r.accepts_donations;
        return r.type === activeTab;
      });

  return (
    <div className="overflow-x-hidden">
      {/* Hero Image */}
      <div className="w-full h-48 overflow-hidden relative mb-6">
        <img 
          src="https://images.unsplash.com/photo-1574158622682-e40e69881006?w=1200&h=400&fit=crop" 
          alt="Cat in field" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/80"></div>
      </div>

      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Animal Rescues</h1>
          <p className="text-sm text-slate-400 mt-1">Find rescues, shelters, and ways to help animals in need</p>
        </div>

      {/* Search */}
      <Card className="border-orange-100 mb-6">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B5B50]/40" />
              <Input
                placeholder="City, ZIP, or address..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="pl-10"
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="bg-[#F97066] hover:bg-[#E5524A] text-white">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span className="ml-1.5 hidden sm:inline">Search</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white border border-orange-100 flex-wrap h-auto gap-1 p-1">
            <TabsTrigger value="all" className="text-xs font-bold data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066]">All</TabsTrigger>
            <TabsTrigger value="rescue" className="text-xs font-bold data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066]">Rescues</TabsTrigger>
            <TabsTrigger value="shelter" className="text-xs font-bold data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066]">Shelters</TabsTrigger>
            <TabsTrigger value="volunteer" className="text-xs font-bold data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066]">Volunteer</TabsTrigger>
            <TabsTrigger value="donate" className="text-xs font-bold data-[state=active]:bg-[#F97066]/10 data-[state=active]:text-[#F97066]">Donate</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Map */}
        <div className="space-y-3 order-2 lg:order-1">
          <Card className="border-orange-100 overflow-hidden">
            <div className="h-[400px] lg:h-[600px]">
              <MapContainer center={mapCenter} zoom={12} style={{ height: "100%", width: "100%" }} key={mapCenter.join(",")}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {filtered.filter(r => r.lat && r.lng).map((rescue, i) => (
                  <Marker key={i} position={[rescue.lat, rescue.lng]}>
                    <Popup>
                      <strong>{rescue.name}</strong><br />
                      {rescue.address}
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </Card>
          <Button
            variant="outline"
            onClick={() => setShowSuggestForm(!showSuggestForm)}
            className="w-full bg-slate-800 border-slate-700 text-white hover:bg-slate-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Suggest a Rescue Organization
          </Button>
          
          {showSuggestForm && (
            <SuggestRescueForm onClose={() => setShowSuggestForm(false)} />
          )}
        </div>

        {/* Results */}
        <div className="space-y-3 order-1 lg:order-2">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#F97066] mx-auto mb-3" />
                <p className="text-sm text-[#6B5B50]/60">Finding rescues near you...</p>
              </div>
            </div>
          ) : filtered.length === 0 && results.length === 0 ? (
            <div className="text-center py-16">
              <HandHeart className="w-12 h-12 text-[#6B5B50]/20 mx-auto mb-3" />
              <p className="text-sm text-[#6B5B50]/60">
                Enter a location to find animal rescues nearby
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center py-8 text-sm text-[#6B5B50]/50">No results for this filter</p>
          ) : (
            filtered.map((rescue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="border-orange-100 hover:border-orange-200 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FDE8D8] to-[#FFF1E6] flex items-center justify-center flex-shrink-0">
                        <Heart className="w-5 h-5 text-[#F97066]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-[#3D2E24]">{rescue.name}</h3>
                          <Badge variant="secondary" className="bg-orange-50 text-[#6B5B50] text-xs border-0">
                            {typeLabels[rescue.type] || rescue.type}
                          </Badge>
                        </div>
                        <p className="text-sm text-[#6B5B50]/70 mt-1 flex items-start gap-1">
                          <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                          {rescue.address}
                        </p>
                        {rescue.description && (
                          <div className="mt-2">
                            <p className={`text-xs text-[#6B5B50]/80 ${!expandedDescriptions[i] ? "line-clamp-2" : ""}`}>
                              {rescue.description}
                            </p>
                            {rescue.description.length > 100 && (
                              <button
                                onClick={() => setExpandedDescriptions(prev => ({
                                  ...prev,
                                  [i]: !prev[i]
                                }))}
                                className="text-xs text-[#F97066] hover:underline mt-1"
                              >
                                {expandedDescriptions[i] ? "See less" : "See more"}
                              </button>
                            )}
                          </div>
                        )}
                        {rescue.animals && rescue.animals.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {rescue.animals.map((a, j) => (
                              <Badge key={j} variant="secondary" className="bg-green-50 text-green-700 text-xs border-0">{a}</Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-3">
                          {rescue.accepts_volunteers && (
                            <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                              <Users className="w-3 h-3 mr-1" /> Volunteers Welcome
                            </Badge>
                          )}
                          {rescue.accepts_donations && (
                            <Badge className="bg-pink-100 text-pink-700 border-0 text-xs">
                              <Heart className="w-3 h-3 mr-1" /> Accepts Donations
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-orange-50">
                          {rescue.phone && (
                            <a href={`tel:${rescue.phone}`}>
                              <Button variant="outline" size="sm" className="text-xs">
                                <Phone className="w-3 h-3 mr-1" /> {rescue.phone}
                              </Button>
                            </a>
                          )}
                          {rescue.website && (
                            <a href={rescue.website.startsWith("http") ? rescue.website : `https://${rescue.website}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="text-xs">
                                <Globe className="w-3 h-3 mr-1" /> Website
                              </Button>
                            </a>
                          )}
                          {rescue.donation_link && (
                            <a href={rescue.donation_link.startsWith("http") ? rescue.donation_link : `https://${rescue.donation_link}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="text-xs bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100">
                                <Heart className="w-3 h-3 mr-1" /> Donate
                              </Button>
                            </a>
                          )}
                          {rescue.address && (
                            <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(rescue.address)}`} target="_blank" rel="noopener noreferrer">
                              <Button variant="outline" size="sm" className="text-xs">
                                <Navigation className="w-3 h-3 mr-1" /> Directions
                              </Button>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
      </div>
    </div>
  );
}