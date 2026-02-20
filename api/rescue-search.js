/**
 * Vercel Serverless Function: /api/rescue-search
 * Searches for animal rescues, shelters, and adoption centers
 * using Google Places API (New) Text Search.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Places API key not configured on server' });
  }

  // Use Text Search which is more flexible than Nearby Search for shelters
  const url = 'https://places.googleapis.com/v1/places:searchText';

  const body = {
    textQuery: 'animal rescue shelter adoption',
    maxResultCount: 20,
    locationBias: {
      circle: {
        center: {
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
        },
        radius: 25000.0,
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

    console.log('Rescue search status:', response.status);
    console.log('Rescue search error:', data.error || 'none');
    console.log('Rescue search results count:', data.places?.length || 0);

    if (!response.ok) {
      return res.status(500).json({
        error: data.error?.message || `Places API error: ${response.status}`,
      });
    }

    // Normalize results
    const results = (data.places || []).map((place) => {
      const name = place.displayName?.text?.toLowerCase() || '';

      let type = 'shelter';
      if (name.includes('rescue')) type = 'rescue';
      else if (name.includes('adoption') || name.includes('adopt')) type = 'adoption_center';
      else if (name.includes('wildlife') || name.includes('rehab')) type = 'wildlife_rehab';

      return {
        name: place.displayName?.text,
        type,
        address: place.formattedAddress,
        phone: place.nationalPhoneNumber || '',
        website: place.websiteUri || '',
        description: '',
        animals: [],
        accepts_volunteers: false,
        accepts_donations: true,
        donation_link: place.websiteUri || '',
        lat: place.location?.latitude,
        lng: place.location?.longitude,
        place_id: place.id,
        rating: place.rating,
        review_count: place.userRatingCount,
        hours: place.currentOpeningHours?.openNow !== undefined
          ? (place.currentOpeningHours.openNow ? 'Open now' : 'Closed now')
          : null,
      };
    });

    return res.status(200).json({ results });
  } catch (err) {
    console.error('Failed to fetch rescues:', err);
    return res.status(500).json({ error: err.message });
  }
}
