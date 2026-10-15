import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Extract query parameters, e.g., /api/map/routes?from=Manning&to=ILC
  const { searchParams } = new URL(request.url);
  const fromBuilding = searchParams.get('from');
  const toBuilding = searchParams.get('to');

  // TODO: Validate that both buildings exist in your internal coordinate database
  // TODO: Either query your database for pre-calculated distances or ping an external mapping API (like Google Maps or Mapbox)

  // Skeleton response
  const mockRouteData = {
    origin: fromBuilding,
    destination: toBuilding,
    distanceMeters: 850,
    estimatedWalkingTimeMinutes: 10,
    coordinates: [
      // Mock GeoJSON path data for drawing a line on the frontend map
      [-72.5312, 42.3937],
      [-72.5278, 42.3912]
    ]
  };

  return NextResponse.json({ success: true, data: mockRouteData });
}