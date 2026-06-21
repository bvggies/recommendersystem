const GHANA_SUFFIX = ', Ghana';

function isGoogleMapsConfigured() {
  return Boolean(process.env.GOOGLE_MAPS_API_KEY);
}

function withGhanaContext(location) {
  const value = String(location || '').trim();
  if (!value) return '';
  return /ghana/i.test(value) ? value : `${value}${GHANA_SUFFIX}`;
}

function estimateFallback(origin, destination) {
  return {
    origin,
    destination,
    distance_km: null,
    duration_minutes: null,
    distance_text: 'Estimate unavailable',
    duration_text: 'Estimate unavailable',
    source: 'unavailable',
    map_embed_url: null
  };
}

async function getRouteEta(origin, destination) {
  const normalizedOrigin = withGhanaContext(origin);
  const normalizedDestination = withGhanaContext(destination);

  if (!normalizedOrigin || !normalizedDestination) {
    throw new Error('Origin and destination are required');
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const mapEmbedUrl = apiKey
    ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${encodeURIComponent(normalizedOrigin)}&destination=${encodeURIComponent(normalizedDestination)}&mode=driving`
    : null;

  if (!isGoogleMapsConfigured()) {
    return {
      ...estimateFallback(origin, destination),
      map_embed_url: mapEmbedUrl,
      source: 'mock',
      message: 'Configure GOOGLE_MAPS_API_KEY for live distance and ETA.'
    };
  }

  const params = new URLSearchParams({
    origins: normalizedOrigin,
    destinations: normalizedDestination,
    mode: 'driving',
    region: 'gh',
    key: apiKey
  });

  const response = await fetch(
    `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`
  );
  const data = await response.json();

  if (data.status !== 'OK') {
    throw new Error(data.error_message || 'Failed to calculate route ETA');
  }

  const element = data.rows?.[0]?.elements?.[0];

  if (!element || element.status !== 'OK') {
    return {
      ...estimateFallback(origin, destination),
      map_embed_url: mapEmbedUrl,
      source: 'partial',
      message: 'Could not calculate driving ETA for this route.'
    };
  }

  return {
    origin,
    destination,
    distance_km: Number((element.distance.value / 1000).toFixed(1)),
    duration_minutes: Math.ceil(element.duration.value / 60),
    distance_text: element.distance.text,
    duration_text: element.duration.text,
    map_embed_url: mapEmbedUrl,
    source: 'google'
  };
}

module.exports = {
  isGoogleMapsConfigured,
  withGhanaContext,
  getRouteEta
};
