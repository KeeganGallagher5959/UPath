import { Bike, Bus, Car, PersonStanding } from "lucide-react"

export const TRANSPORT = [
  { value: "foot", label: "Walk", icon: PersonStanding },
  { value: "bus", label: "PVTA Bus", icon: Bus },
  { value: "bike", label: "Bike", icon: Bike },
  { value: "car", label: "Car w/ parking permit", icon: Car },
] as const

export type TransportMode = (typeof TRANSPORT)[number]["value"]
