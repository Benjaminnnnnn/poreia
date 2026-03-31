import { MapPinData } from "../types";

export const INITIAL_PINS: MapPinData[] = [
  {
    id: 'tokyo',
    name: 'Tokyo, Japan',
    lat: 35.6762,
    lng: 139.6503,
    image: 'https://images.pexels.com/photos/36163273/pexels-photo-36163273.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    description: 'Late-night ramen, precise design, shrine alleys, and electric city energy.',
  },
  {
    id: 'paris',
    name: 'Paris, France',
    lat: 48.8566,
    lng: 2.3522,
    image: 'https://images.pexels.com/photos/1461974/pexels-photo-1461974.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    description: 'Boulevard cafes, museum masterpieces, river walks, and classic Haussmann streets.',
  },
  {
    id: 'nyc',
    name: 'New York City, USA',
    lat: 40.7128,
    lng: -74.0060,
    image: 'https://images.pexels.com/photos/34344517/pexels-photo-34344517.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    description: 'Skyline views, world-class museums, neighborhood food crawls, and nonstop street life.',
  },
  {
    id: 'cape-town',
    name: 'Cape Town, South Africa',
    lat: -33.9249,
    lng: 18.4241,
    image: 'https://images.pexels.com/photos/32568280/pexels-photo-32568280.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    description: 'Table Mountain drama, coastal drives, vineyards, and a city framed by the sea.',
  },
  {
    id: 'sydney',
    name: 'Sydney, Australia',
    lat: -33.8688,
    lng: 151.2093,
    image: 'https://images.pexels.com/photos/31466707/pexels-photo-31466707.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop',
    description: 'Harbour landmarks, surf beaches, ferry rides, and easygoing outdoor culture.',
  }
];

export const SUGGESTED_PROMPTS = [
  "Plan a 5-day foodie trip to Tokyo on a $2,000 budget",
  "A romantic weekend in Paris for under €1,500",
  "7 days of hiking in Patagonia for beginners",
  "Luxury shopping tour in Milan for 3 days"
];
