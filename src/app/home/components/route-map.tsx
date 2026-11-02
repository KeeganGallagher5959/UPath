"use client"

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { cn } from "cn"

type Stop = {
  label: string
  lng: number
  lat: number
  start?: boolean
}

// UMass Amherst campus stops (ILC, Isenberg, Worcester, Morrill, LGRT).
// Worcester coords are approximate; the rest come from OSM/Nominatim.
const STOPS: Stop[] = [
  { label: "ILC", lng: -72.5259025, lat: 42.3910382, start: true },
  { label: "Isenberg", lng: -72.5248569, lat: 42.3868154 },
  { label: "Worcester\nDining Commons", lng: -72.52377, lat: 42.39266 },
  { label: "Morrill Science Center", lng: -72.525248, lat: 42.391554 },
  { label: "LGRT", lng: -72.5276631, lat: 42.3939219 },
]

const ROUTE: [number, number][] = STOPS.map((s) => [s.lng, s.lat])

const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty"

/**
 * Campus map with the day's route traced between stops. Uses MapLibre with
 * OpenFreeMap tiles (no API key); the route is a straight-line placeholder
 * until the routing API is wired up.
 */
export function RouteMap({ className }: { className?: string }) {
  const container = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = container.current
    if (!node) return

    let map: maplibregl.Map
    try {
      map = new maplibregl.Map({
        container: node,
        style: STYLE_URL,
        center: [-72.5255, 42.3909],
        zoom: 16,
        cooperativeGestures: true,
        attributionControl: { compact: true },
      })
    } catch {
      // No WebGL (e.g. headless GPU-less browser) — keep the muted placeholder.
      return
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right")

    const resize = new ResizeObserver(() => map.resize())
    resize.observe(node)

    map.on("load", () => {
      map.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: ROUTE },
        },
      })

      map.addLayer({
        id: "route-casing",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#ffffff", "line-width": 9, "line-opacity": 0.9 },
      })

      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#3b82f6", "line-width": 5 },
      })

      for (const stop of STOPS) {
        // Keep the label inside the map: stops east of center label leftward.
        const anchor = stop.lng > -72.5255 ? "right" : "left"

        const el = document.createElement("div")
        el.className = `flex items-center gap-1.5 ${anchor === "right" ? "flex-row-reverse" : ""}`

        const dot = document.createElement("span")
        dot.className = cn(
          "block shrink-0 rounded-full border-2 bg-card shadow",
          stop.start ? "size-4 border-primary" : "size-3 border-foreground/70"
        )
        el.appendChild(dot)

        const text = document.createElement("span")
        text.className =
          "whitespace-nowrap rounded-md bg-card/90 px-1.5 py-0.5 text-xs font-semibold text-foreground shadow backdrop-blur"
        text.textContent = stop.label.replace(/\n/g, " ")
        el.appendChild(text)

        new maplibregl.Marker({ element: el, anchor })
          .setLngLat([stop.lng, stop.lat])
          .addTo(map)
      }

      const bounds = new maplibregl.LngLatBounds()
      for (const stop of STOPS) bounds.extend([stop.lng, stop.lat])
      map.fitBounds(bounds, { padding: 64, duration: 0 })
    })

    return () => {
      resize.disconnect()
      map.remove()
    }
  }, [])

  return (
    <div
      ref={container}
      className={cn(
        "relative min-h-80 overflow-hidden rounded-2xl border border-border bg-muted",
        className
      )}
      role="img"
      aria-label="Campus map showing today's route between stops"
    />
  )
}
