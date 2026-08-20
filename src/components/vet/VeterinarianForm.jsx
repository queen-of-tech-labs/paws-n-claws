import React, { useState } from "react";
import { isNativePlatform } from '@/lib/platform';
import api from '@/api/firebaseClient';
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { X, Search, Loader2, MapPin } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function VeterinarianForm({ veterinarian, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    clinic_name: veterinarian?.clinic_name || "",
    veterinarian_name: veterinarian?.veterinarian_name || "",
    phone_number: veterinarian?.phone_number || "",
    email: veterinarian?.email || "",
    address: veterinarian?.address || "",
    website: veterinarian?.website || "",
    emergency_hours: veterinarian?.emergency_hours || false,
    notes: veterinarian?.notes || "",
    linked_pets: veterinarian?.linked_pets || [],
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [useLocation, setUseLocation] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const { data: pets = [] } = useQuery({
    queryKey: ["userPets"],
    queryFn: async () => {
      const user = await api.auth.me();
      return api.entities.Pet.filter({ created_by: user.email });
    },
  });

  const validate = () => {
    const newErrors = {};
    if (!formData.clinic_name.trim()) newErrors.clinic_name = "Clinic name is required";
    if (!formData.veterinarian_name.trim()) newErrors.veterinarian_name = "Veterinarian name is required";
    if (!formData.phone_number.trim()) newErrors.phone_number = "Phone number is required";
    if (!formData.address.trim()) newErrors.address = "Address is required";
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Invalid URL format (must start with http:// or https://)";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (veterinarian) {
        await api.entities.Veterinarian.update(veterinarian.id, formData);
      } else {
        await api.entities.Veterinarian.create(formData);
      }
      onSuccess();
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePetLink = (petId) => {
    setFormData((prev) => ({
      ...prev,
      linked_pets: prev.linked_pets.includes(petId)
        ? prev.linked_pets.filter((id) => id !== petId)
        : [...prev.linked_pets, petId],
    }));
  };

  const handleLocationToggle = async (checked) => {
    setLocationError(null);
    if (!checked) { setUseLocation(false); return; }
    if (userLocation) { setUseLocation(true); return; }

    const isNative = isNativePlatform();

    if (isNative) {
      try {
        // Request permission via Capacitor — shows Android system dialog
        const { Geolocation } = await import('@capacitor/geolocation');
        
        // Check current status first
        const status = await Geolocation.checkPermissions();
        console.log('Current permission status:', status);
        
        let granted = status.location === 'granted' || status.coarseLocation === 'granted';
        
        if (!granted) {
          // Request it — this shows the Android system popup
          const result = await Geolocation.requestPermissions({ permissions: ['location', 'coarseLocation'] });
          console.log('Permission request result:', result);
          granted = result.location === 'granted' || result.coarseLocation === 'granted';
        }

        if (!granted) {
          setLocationError('Location permission denied. Go to Settings → Apps → Paws & Claws → Permissions → Location → Allow while using app.');
          setUseLocation(false);
          return;
        }

        // Get position
        const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000 });
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setUseLocation(true);
        console.log('Location obtained:', position.coords);

      } catch (err) {
        console.error('Location error:', err);
        setLocationError('Could not get location. Please allow location access in Settings → Apps → Paws & Claws → Permissions → Location.');
        setUseLocation(false);
      }
    } else {
      // Web browser
      if (!navigator.geolocation) {
        setLocationError('Location not available in this browser.');
        setUseLocation(false);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => { setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setUseLocation(true); },
        () => { setLocationError('Unable to get location. Please enable location permissions.'); setUseLocation(false); },
        { enableHighAccuracy: false, timeout: 15000 }
      );
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && !userLocation) {
      setErrors({ search: 'Please enter a search term or enable location.' });
      return;
    }

    setSearching(true);
    setSearchResults([]);
    setErrors({});

    try {
      const isNative = isNativePlatform();
      const baseUrl = isNative ? 'https://paws-n-claws.vercel.app' : '';

      // Build query params
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('query', searchQuery.trim());
      if (useLocation && userLocation) {
        params.set('lat', userLocation.lat);
        params.set('lng', userLocation.lng);
      }

      console.log('Searching vets:', params.toString());
      const response = await fetch(`${baseUrl}/api/places-search?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      console.log('Search results:', data.results?.length || 0);
      setSearchResults(data.results || []);

      if (!data.results?.length) {
        setErrors({ search: 'No vet clinics found. Try a different search term or location.' });
      }
    } catch (error) {
      console.error('Search error:', error);
      setErrors({ search: error.message || 'Search failed. Please try again.' });
    } finally {
      setSearching(false);
    }
  };

  const handleSelectClinic = (place) => {
    // Use data already returned from search — no second API call needed
    setFormData({
      ...formData,
      clinic_name: place.name || '',
      address: place.vicinity || '',
      phone_number: place.phone || '',
      website: place.website || '',
    });
    setShowSearch(false);
    setSearchResults([]);
    setSearchQuery("");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-slate-700">
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {veterinarian ? "Edit Veterinarian" : "Add Veterinarian"}
          </h2>
          <Button variant="ghost" size="icon" onClick={onCancel} className="text-slate-400">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!showSearch ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSearch(true)}
              className="w-full mb-4 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
            >
              <Search className="w-4 h-4 mr-2" />
              Search for Vet Clinic
            </Button>
          ) : (
            <div className="mb-4 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
              <div className="flex gap-2 mb-3">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for vet clinics..."
                  className="bg-slate-700 border-slate-600 text-white flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())}
                />
                <Button
                  type="button"
                  onClick={handleSearch}
                  disabled={searching || !searchQuery.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowSearch(false);
                    setSearchResults([]);
                    setSearchQuery("");
                  }}
                  className="text-slate-400"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Checkbox
                  id="use-location"
                  checked={useLocation}
                  onCheckedChange={handleLocationToggle}
                />
                <Label htmlFor="use-location" className="text-sm text-slate-300 cursor-pointer">
                  Use my location to find nearby vets
                </Label>
              </div>
              {locationError && (
                <p className="text-xs text-red-400 mb-3">{locationError}</p>
              )}

              {searchResults.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      onClick={() => handleSelectClinic(result)}
                      className="w-full text-left p-3 bg-slate-800 hover:bg-slate-750 rounded-lg border border-slate-600 hover:border-blue-500/50 transition-colors"
                    >
                      <div className="font-medium text-white">{result.name}</div>
                      <div className="text-sm text-slate-400 flex items-start gap-1 mt-1">
                        <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span>{result.address}</span>
                      </div>
                      {result.rating && (
                        <div className="text-xs text-slate-500 mt-1">
                          ⭐ {result.rating} ({result.total_ratings} reviews)
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {errors.search && <p className="text-red-400 text-sm mt-2">{errors.search}</p>}
            </div>
          )}

          <div>
            <Label className="text-slate-300">Clinic Name *</Label>
            <Input
              value={formData.clinic_name}
              onChange={(e) => setFormData({ ...formData, clinic_name: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
            {errors.clinic_name && <p className="text-red-400 text-sm mt-1">{errors.clinic_name}</p>}
          </div>

          <div>
            <Label className="text-slate-300">Veterinarian Name *</Label>
            <Input
              value={formData.veterinarian_name}
              onChange={(e) => setFormData({ ...formData, veterinarian_name: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
            {errors.veterinarian_name && <p className="text-red-400 text-sm mt-1">{errors.veterinarian_name}</p>}
          </div>

          <div>
            <Label className="text-slate-300">Phone Number *</Label>
            <Input
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
            {errors.phone_number && <p className="text-red-400 text-sm mt-1">{errors.phone_number}</p>}
          </div>

          <div>
            <Label className="text-slate-300">Email</Label>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
            {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email}</p>}
          </div>

          <div>
            <Label className="text-slate-300">Address *</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="bg-slate-700 border-slate-600 text-white"
            />
            {errors.address && <p className="text-red-400 text-sm mt-1">{errors.address}</p>}
          </div>

          <div>
            <Label className="text-slate-300">Website</Label>
            <Input
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              placeholder="https://example.com"
              className="bg-slate-700 border-slate-600 text-white"
            />
            {errors.website && <p className="text-red-400 text-sm mt-1">{errors.website}</p>}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="emergency_hours"
              checked={formData.emergency_hours}
              onCheckedChange={(checked) => setFormData({ ...formData, emergency_hours: checked })}
            />
            <Label htmlFor="emergency_hours" className="text-slate-300 cursor-pointer">
              Offers Emergency Hours
            </Label>
          </div>

          <div>
            <Label className="text-slate-300">Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add any additional notes about this veterinarian or clinic..."
              className="bg-slate-700 border-slate-600 text-white"
              rows={3}
            />
          </div>

          {pets.length > 0 && (
            <div>
              <Label className="text-slate-300 mb-2 block">Link to Pets</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto bg-slate-700/30 rounded-lg p-3">
                {pets.map((pet) => (
                  <div key={pet.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`pet-${pet.id}`}
                      checked={formData.linked_pets.includes(pet.id)}
                      onCheckedChange={() => togglePetLink(pet.id)}
                    />
                    <Label htmlFor={`pet-${pet.id}`} className="text-slate-300 cursor-pointer">
                      {pet.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.submit && <p className="text-red-400 text-sm">{errors.submit}</p>}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
              {submitting ? "Saving..." : veterinarian ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}