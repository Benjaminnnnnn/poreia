import { Activity } from '../types';

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY?.trim();
const GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT = import.meta.env.DEV
  ? '/api/google-places/v1/places:searchText'
  : 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACES_BASE_ENDPOINT = import.meta.env.DEV
  ? '/api/google-places/v1'
  : 'https://places.googleapis.com/v1';

interface GooglePlacePhoto {
  name?: string;
  authorAttributions?: Array<{
    displayName?: string;
    uri?: string;
  }>;
}

interface GooglePlacesTextSearchResponse {
  places?: Array<{
    photos?: GooglePlacePhoto[];
  }>;
}

interface GooglePlacePhotoMediaResponse {
  photoUri?: string;
}

export interface ResolvedActivityImage {
  url: string;
  attributionLabel?: string;
  attributionUrl?: string;
}

const imageRequestCache = new Map<string, Promise<ResolvedActivityImage | null>>();

function buildSearchQuery(activity: Activity, destination?: string): string | null {
  const location = activity.location.trim();
  if (!location) {
    return null;
  }

  const queryParts = [location];
  if (destination && !location.toLowerCase().includes(destination.toLowerCase())) {
    queryParts.push(destination);
  }

  return queryParts.join(', ');
}

function getAttribution(photo?: GooglePlacePhoto): Pick<
  ResolvedActivityImage,
  'attributionLabel' | 'attributionUrl'
> {
  const firstAttribution = photo?.authorAttributions?.[0];
  if (!firstAttribution?.displayName) {
    return {};
  }

  return {
    attributionLabel: firstAttribution.displayName,
    attributionUrl: firstAttribution.uri,
  };
}

async function searchPlacePhoto(query: string): Promise<GooglePlacePhoto | null> {
  const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY ?? '',
      'X-Goog-FieldMask': 'places.photos',
    },
    body: JSON.stringify({
      textQuery: query,
      languageCode: 'en',
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GooglePlacesTextSearchResponse;
  return payload.places?.[0]?.photos?.[0] ?? null;
}

async function resolvePhotoUrl(photo: GooglePlacePhoto): Promise<ResolvedActivityImage | null> {
  if (!photo.name) {
    return null;
  }

  const params = new URLSearchParams({
    maxWidthPx: '400',
    skipHttpRedirect: 'true',
    key: GOOGLE_PLACES_API_KEY ?? '',
  });

  const response = await fetch(`${GOOGLE_PLACES_BASE_ENDPOINT}/${photo.name}/media?${params.toString()}`);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GooglePlacePhotoMediaResponse;
  if (!payload.photoUri) {
    return null;
  }

  return {
    url: payload.photoUri,
    ...getAttribution(photo),
  };
}

export function hasGooglePlacesImageSupport(): boolean {
  return Boolean(GOOGLE_PLACES_API_KEY);
}

export function getActivityImage(
  activity: Activity,
  destination?: string,
): Promise<ResolvedActivityImage | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    return Promise.resolve(null);
  }

  const query = buildSearchQuery(activity, destination);
  if (!query) {
    return Promise.resolve(null);
  }

  const cacheKey = query.toLowerCase();
  const existingRequest = imageRequestCache.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    const photo = await searchPlacePhoto(query);
    if (!photo) {
      return null;
    }

    return resolvePhotoUrl(photo);
  })();

  imageRequestCache.set(cacheKey, request);
  return request;
}
