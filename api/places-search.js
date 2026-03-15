/**
 * Vercel Serverless Function: /api/places-search
 * Supports both nearby search (lat/lng) and text search (query only)
 */

export default async function handler(req, res) {
  // CORS headers — required for native Android app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { lat, lng, query } = req.query;

  if (!lat && !lng && !query) {
    return res.status(400).json({ error: 'query or lat/lng is required' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Places API key not configured' });
  }

  try {
    let results = [];

    if (lat && lng) {
      // Nearby search with optional text query
      const url = 'https://places.googleapis.com/v1/places:searchNearby';
      const body = {
        includedTypes: ['veterinary_care'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
            },
            radius: 16000.0, // 10 miles
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.id,places.nationalPhoneNumber,places.websiteUri',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('Nearby search status:', response.status, 'results:', data.places?.length || 0);

      if (!response.ok) {
        throw new Error(data.error?.message || `Places API error: ${response.status}`);
      }

      results = (data.places || []).map(normalizePlace);

      // Filter by query text if provided
      if (query && results.length > 0) {
        const q = query.toLowerCase();
        const filtered = results.filter(r =>
          r.name?.toLowerCase().includes(q) ||
          r.vicinity?.toLowerCase().includes(q)
        );
        // Use filtered if we got matches, otherwise return all nearby
        if (filtered.length > 0) results = filtered;
      }

    } else if (query) {
      // Text-only search using Places Text Search
      const url = `https://places.googleapis.com/v1/places:searchText`;
      const body = {
        textQuery: `${query} veterinarian vet clinic`,
        maxResultCount: 20,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.id,places.nationalPhoneNumber,places.websiteUri',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('Text search status:', response.status, 'results:', data.places?.length || 0);

      if (!response.ok) {
        throw new Error(data.error?.message || `Places API error: ${response.status}`);
      }

      results = (data.places || []).map(normalizePlace);
    }

    return res.status(200).json({ results });

  } catch (err) {
    console.error('Places search error:', err);
    return res.status(500).json({ error: err.message });
  }
}

function normalizePlace(place) {
  return {
    name: place.displayName?.text || '',
    vicinity: place.formattedAddress || '',
    rating: place.rating,
    user_ratings_total: place.userRatingCount,
    geometry: {
      location: {
        lat: place.location?.latitude,
        lng: place.location?.longitude,
      },
    },
    place_id: place.id,
    phone: place.nationalPhoneNumber || '',
    website: place.websiteUri || '',
  };
}
