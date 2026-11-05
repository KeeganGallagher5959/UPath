// Server only. HeiGIT / openrouteservice helpers.
// Needs ORS_API_KEY in .env.local.

const GEOCODE_URL = "https://api.heigit.org/pelias/v1/search";

// UMass Amherst center. Biases results so "ILC" finds the campus ILC.
const CAMPUS = { lat: 42.3909, lon: -72.5255 };
const CAMPUS_RADIUS_KM = 3;

function apiKey() {
  const key = process.env.ORS_API_KEY;
  if (!key) throw new Error("ORS_API_KEY is not set");
  return key;
}

export type Geocoded = { lat: number; long: number; address: string };

/** Place name → coordinates, searched within 3 km of campus. */
export async function geocode(text: string): Promise<Geocoded | null> {
  const url = new URL(GEOCODE_URL);
  url.searchParams.set("text", text);
  url.searchParams.set("size", "1");
  url.searchParams.set("focus.point.lat", String(CAMPUS.lat));
  url.searchParams.set("focus.point.lon", String(CAMPUS.lon));
  url.searchParams.set("boundary.circle.lat", String(CAMPUS.lat));
  url.searchParams.set("boundary.circle.lon", String(CAMPUS.lon));
  url.searchParams.set("boundary.circle.radius", String(CAMPUS_RADIUS_KM));

  const res = await fetch(url, { headers: { Authorization: apiKey() } });
  if (!res.ok) throw new Error(`Geocode failed: ${res.status}`);

  const feature = (await res.json()).features?.[0];
  if (!feature) return null;

  const [long, lat] = feature.geometry.coordinates; // GeoJSON is [lng, lat]
  return { lat, long, address: feature.properties.label };
}

/**
 * geocode() with retries: "Isenberg School of Management" → "Isenberg School of"
 * → "Isenberg School" → "Isenberg". Campus buildings in OSM often have short names.
 */
export async function geocodeFuzzy(text: string): Promise<Geocoded | null> {
  const words = text.trim().split(/\s+/);
  for (let n = words.length; n >= 1; n--) {
    const hit = await geocode(words.slice(0, n).join(" "));
    if (hit) return hit;
  }
  return null;
}

const DIRECTIONS_URL = "https://api.heigit.org/openrouteservice/v2/directions";

// DB `mode` values → ORS profiles. ORS has no bus routing; fall back to walking.
const PROFILE: Record<string, string> = {
  foot: "foot-walking",
  bike: "cycling-regular",
  car: "driving-car",
  bus: "foot-walking",
};

export type Route = {
  duration_s: number;
  distance_m: number;
  /** [lng, lat] pairs — drop straight into a GeoJSON LineString for the map. */
  coordinates: [number, number][];
};

/** Route between two points. Returns time, distance, and the line to draw. */
export async function route(
  from: { lat: number; long: number },
  to: { lat: number; long: number },
  mode: string
): Promise<Route> {
  const profile = PROFILE[mode] ?? PROFILE.foot;
  const res = await fetch(`${DIRECTIONS_URL}/${profile}/geojson`, {
    method: "POST",
    headers: { Authorization: apiKey(), "Content-Type": "application/json" },
    body: JSON.stringify({
      coordinates: [[from.long, from.lat], [to.long, to.lat]],
    }),
  });
  if (!res.ok) throw new Error(`Directions failed: ${res.status}`);

  const feature = (await res.json()).features?.[0];
  if (!feature) throw new Error("No route returned");

  return {
    duration_s: feature.properties.summary.duration,
    distance_m: feature.properties.summary.distance,
    coordinates: feature.geometry.coordinates,
  };
}
