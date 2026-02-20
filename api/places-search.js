/**
 * Vercel Serverless Function: /api/places-search
 * Proxies Google Places Nearby Search to avoid CORS issues in the browser.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lat, lng, query } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Places API key not configured' });
  }

  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=10000&type=veterinary_care&keyword=${encodeURIComponent(query || 'veterinarian')}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Places API error:', data.status, data.error_message);
      return res.status(500).json({ error: data.error_message || `Places API error: ${data.status}` });
    }

    return res.status(200).json({ results: data.results || [] });
  } catch (err) {
    console.error('Failed to fetch from Places API:', err);
    return res.status(500).json({ error: err.message });
  }
}
