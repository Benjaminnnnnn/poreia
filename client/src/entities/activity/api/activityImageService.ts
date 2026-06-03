import { Activity } from '@/shared/types';

const COMMONS_API_ENDPOINT = 'https://commons.wikimedia.org/w/api.php';
const COMMONS_SEARCH_LIMIT = '6';
const COMMONS_THUMBNAIL_WIDTH = '640';

const GOOGLE_PLACES_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY?.trim();
const GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT = process.env.NODE_ENV === 'development'
  ? '/api/google-places/v1/places:searchText'
  : 'https://places.googleapis.com/v1/places:searchText';
const GOOGLE_PLACES_BASE_ENDPOINT = process.env.NODE_ENV === 'development'
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

interface WikimediaMetadataField {
  value?: string;
}

interface WikimediaImageInfo {
  descriptionurl?: string;
  extmetadata?: {
    Artist?: WikimediaMetadataField;
    Attribution?: WikimediaMetadataField;
    Credit?: WikimediaMetadataField;
    ImageDescription?: WikimediaMetadataField;
    LicenseShortName?: WikimediaMetadataField;
    ObjectName?: WikimediaMetadataField;
    UsageTerms?: WikimediaMetadataField;
  };
  height?: number;
  thumburl?: string;
  url?: string;
  width?: number;
}

interface WikimediaPage {
  imageinfo?: WikimediaImageInfo[];
  index?: number;
  title?: string;
}

interface WikimediaSearchResponse {
  query?: {
    pages?: WikimediaPage[];
  };
}

export interface ResolvedActivityImage {
  attributionLabel?: string;
  attributionUrl?: string;
  licenseLabel?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  url: string;
}

const imageRequestCache = new Map<string, Promise<ResolvedActivityImage | null>>();

function normalizeKeyPart(value?: string): string {
  return value?.trim().toLowerCase() ?? '';
}

function buildSearchQueries(activity: Activity, destination?: string): string[] {
  const queries: string[] = [];
  const seen = new Set<string>();
  const destinationText = destination?.trim();

  const addQuery = (seed?: string) => {
    const trimmedSeed = seed?.trim();
    if (!trimmedSeed) {
      return;
    }

    const query = destinationText
      && !trimmedSeed.toLowerCase().includes(destinationText.toLowerCase())
      ? `${trimmedSeed}, ${destinationText}`
      : trimmedSeed;
    const normalized = query.toLowerCase();

    if (seen.has(normalized)) {
      return;
    }

    seen.add(normalized);
    queries.push(query);
  };

  addQuery(activity.location);
  addQuery(activity.img_prompt);
  addQuery(activity.description);
  addQuery(destinationText);

  return queries;
}

function sanitizeMetadataValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const withoutTags = value.replace(/<[^>]+>/g, ' ');
  const decoded = withoutTags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  const normalized = decoded.replace(/\s+/g, ' ').trim();

  return normalized || undefined;
}

function getFirstMetadataValue(
  ...fields: Array<WikimediaMetadataField | undefined>
): string | undefined {
  for (const field of fields) {
    const value = sanitizeMetadataValue(field?.value);
    if (value) {
      return value;
    }
  }

  return undefined;
}

function scoreCommonsPage(page: WikimediaPage, query: string): number {
  const image = page.imageinfo?.[0];
  const title = page.title?.toLowerCase() ?? '';
  const queryTokens = query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 2);

  const tokenMatches = queryTokens.reduce(
    (score, token) => score + (title.includes(token) ? 2 : 0),
    0,
  );
  const exactTitleBonus = title.includes(query.toLowerCase()) ? 6 : 0;
  const imageArea = (image?.width ?? 0) * (image?.height ?? 0);
  const sizeScore = Math.min(imageArea / 600_000, 12);
  const relevanceBias = page.index ? Math.max(0, 2 - page.index * 0.1) : 2;

  return tokenMatches + exactTitleBonus + sizeScore + relevanceBias;
}

function getWikimediaImageFromPage(page: WikimediaPage): ResolvedActivityImage | null {
  const image = page.imageinfo?.[0];
  const imageUrl = image?.thumburl ?? image?.url;

  if (!image) {
    return null;
  }

  if (!imageUrl) {
    return null;
  }

  return {
    url: imageUrl,
    sourceLabel: 'Wikimedia Commons',
    sourceUrl: image.descriptionurl,
    attributionLabel: getFirstMetadataValue(
      image.extmetadata?.Artist,
      image.extmetadata?.Credit,
      image.extmetadata?.Attribution,
    ),
    attributionUrl: image.descriptionurl,
    licenseLabel: getFirstMetadataValue(
      image.extmetadata?.LicenseShortName,
      image.extmetadata?.UsageTerms,
    ),
  };
}

async function searchWikimediaCommons(query: string): Promise<ResolvedActivityImage | null> {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    generator: 'search',
    gsrnamespace: '6',
    gsrlimit: COMMONS_SEARCH_LIMIT,
    gsrsearch: query,
    iiprop: 'url|extmetadata',
    iiurlwidth: COMMONS_THUMBNAIL_WIDTH,
    origin: '*',
    prop: 'imageinfo',
  });

  try {
    const response = await fetch(`${COMMONS_API_ENDPOINT}?${params.toString()}`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as WikimediaSearchResponse;
    const pages = payload.query?.pages ?? [];
    if (!pages.length) {
      return null;
    }

    const bestPage = [...pages].sort(
      (left, right) => scoreCommonsPage(right, query) - scoreCommonsPage(left, query),
    )[0];

    return bestPage ? getWikimediaImageFromPage(bestPage) : null;
  } catch {
    return null;
  }
}

function getGoogleAttribution(photo?: GooglePlacePhoto): Pick<
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

async function searchGooglePlacePhoto(query: string): Promise<GooglePlacePhoto | null> {
  if (!GOOGLE_PLACES_API_KEY) {
    return null;
  }

  try {
    const response = await fetch(GOOGLE_PLACES_TEXT_SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.photos',
      },
      body: JSON.stringify({
        languageCode: 'en',
        textQuery: query,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as GooglePlacesTextSearchResponse;
    return payload.places?.[0]?.photos?.[0] ?? null;
  } catch {
    return null;
  }
}

async function resolveGooglePhotoUrl(photo: GooglePlacePhoto): Promise<ResolvedActivityImage | null> {
  if (!photo.name || !GOOGLE_PLACES_API_KEY) {
    return null;
  }

  const params = new URLSearchParams({
    key: GOOGLE_PLACES_API_KEY,
    maxWidthPx: '400',
    skipHttpRedirect: 'true',
  });

  try {
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
      sourceLabel: 'Google Places',
      ...getGoogleAttribution(photo),
    };
  } catch {
    return null;
  }
}

async function resolveGoogleFallback(query: string): Promise<ResolvedActivityImage | null> {
  const photo = await searchGooglePlacePhoto(query);
  if (!photo) {
    return null;
  }

  return resolveGooglePhotoUrl(photo);
}

export function hasGooglePlacesImageSupport(): boolean {
  return Boolean(GOOGLE_PLACES_API_KEY);
}

export function getActivityImage(
  activity: Activity,
  destination?: string,
): Promise<ResolvedActivityImage | null> {
  const queries = buildSearchQueries(activity, destination);
  if (!queries.length) {
    return Promise.resolve(null);
  }

  const cacheKey = [
    normalizeKeyPart(activity.location),
    normalizeKeyPart(activity.img_prompt),
    normalizeKeyPart(activity.description),
    normalizeKeyPart(destination),
  ].join('::');

  const existingRequest = imageRequestCache.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const request = (async () => {
    for (const query of queries) {
      const commonsImage = await searchWikimediaCommons(query);
      if (commonsImage) {
        return commonsImage;
      }
    }

    for (const query of queries) {
      const googleImage = await resolveGoogleFallback(query);
      if (googleImage) {
        return googleImage;
      }
    }

    return null;
  })();

  imageRequestCache.set(cacheKey, request);
  return request;
}
