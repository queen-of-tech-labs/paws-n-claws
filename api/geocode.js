/**
 * Vercel Serverless Function: /api/geocode
 * Proxies Google Geocoding API to avoid CORS issues in the browser.
 */

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { address } = req.query;

  if (!address) {
    return res.status(400).json({ error: 'address is required' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google API key not configured' });
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return res.status(404).json({ error: 'Location not found. Please try a different address or ZIP code.' });
    }

    const { lat, lng } = data.results[0].geometry.location;
    return res.status(200).json({ lat, lng });
  } catch (err) {
    console.error('Geocoding error:', err);
    return res.status(500).json({ error: err.message });
  }
}
