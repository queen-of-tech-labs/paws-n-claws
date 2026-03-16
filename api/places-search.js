/**
 * Vercel Serverless Function: /api/places-search
 * Supports text search with optional location bias
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { lat, lng, query } = req.query;

  if (!query && !lat) {
    return res.status(400).json({ error: 'query or location is required' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Places API key not configured' });
  }

  try {
    let results = [];

    if (query && query.trim()) {
      // TEXT SEARCH — finds by name, works with or without location
      // This is better for finding specific clinics like "Bradford Hills Vet"
      const searchText = query.includes('vet') || query.includes('animal') || query.includes('pet')
        ? query
        : `${query} veterinarian`;

      const body = {
        textQuery: searchText,
        maxResultCount: 20,
      };

      // If location provided, bias results toward user's area
      if (lat && lng) {
        body.locationBias = {
          circle: {
            center: {
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
            },
            radius: 40000.0, // 25 mile bias
          },
        };
      }

      const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.id,places.nationalPhoneNumber,places.websiteUri',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      console.log('Text search status:', response.status, 'results:', data.places?.length || 0, 'query:', searchText);

      if (!response.ok) {
        throw new Error(data.error?.message || `Places API error: ${response.status}`);
      }

      results = (data.places || []).map(normalizePlace);

    } else if (lat && lng) {
      // NEARBY SEARCH — no query, just find nearby vets
      const body = {
        includedTypes: ['veterinary_care'],
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: {
              latitude: parseFloat(lat),
              longitude: parseFloat(lng),
            },
            radius: 40000.0,
          },
        },
      };

      const response = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
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
