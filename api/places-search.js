/**
 * Vercel Serverless Function: /api/places-search
 * Proxies Google Places API (New) Nearby Search to avoid CORS issues in the browser.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lng, query } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Places API key not configured on server' });
  }

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
        radius: 10000.0,
      },
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.id,places.nationalPhoneNumber,places.websiteUri',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    console.log('Places API (New) status:', response.status);
    console.log('Places API (New) error:', data.error || 'none');
    console.log('Places API (New) results count:', data.places?.length || 0);

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || `Places API error: ${response.status}`,
      });
    }

    // Normalize results to match the shape the frontend expects
    const results = (data.places || []).map((place) => ({
      name: place.displayName?.text,
      vicinity: place.formattedAddress,
      rating: place.rating,
      user_ratings_total: place.userRatingCount,
      geometry: {
        location: {
          lat: place.location?.latitude,
          lng: place.location?.longitude,
        },
      },
      opening_hours: place.currentOpeningHours
        ? { open_now: place.currentOpeningHours.openNow }
        : undefined,
      place_id: place.id,
      phone: place.nationalPhoneNumber,
      website: place.websiteUri,
    }));

    return res.status(200).json({ results });
  } catch (err) {
    console.error('Failed to fetch from Places API (New):', err);
    return res.status(500).json({ error: err.message });
  }
}
