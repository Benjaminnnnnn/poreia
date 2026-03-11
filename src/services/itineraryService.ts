import { v4 as uuidv4 } from 'uuid';
import { ChatMessage, TravelItinerary } from '../types';

const POLLINATIONS_TEXT_ENDPOINT = import.meta.env.DEV
  ? '/api/pollinations/text/'
  : 'https://gen.pollinations.ai/text/';
const POLLINATIONS_CHAT_COMPLETIONS_ENDPOINT = import.meta.env.DEV
  ? '/api/pollinations/v1/chat/completions'
  : 'https://gen.pollinations.ai/v1/chat/completions';
const POLLINATIONS_API_KEY = import.meta.env.VITE_POLLINATIONS_API_KEY?.trim();
const MAX_PROMPT_CHARS = 1600;
const POLLINATIONS_MODEL = 'openai';

const REQUIRED_JSON_SCHEMA = `{
  "destination": "Tokyo, Japan",
  "title": "5-Day Tokyo Foodie Escape",
  "totalDays": 5,
  "totalBudget": 2000,
  "currency": "USD",
  "overview": "Short overview of the trip.",
  "days": [
    {
      "day": 1,
      "theme": "Arrival and local food markets",
      "activities": [
        {
          "time": "09:00",
          "description": "Activity description",
          "location": "Location name",
          "lat": 35.0,
          "lng": 139.0,
          "costEstimate": 25,
          "img_prompt": "short visual phrase"
        }
      ]
    }
  ],
  "budgetBreakdown": [
    {
      "category": "Food",
      "amount": 600
    }
  ]
}`;

const SCHEMA_INSTRUCTION = [
  'Return exactly one JSON object for a travel itinerary.',
  'Do not return markdown, commentary, prose, preambles, or code fences.',
  'Use exactly these top-level keys: destination, title, totalDays, totalBudget, currency, overview, days, budgetBreakdown.',
  'days must be an array of objects with keys: day, theme, activities.',
  'activities must be an array of objects with keys: time, description, location, lat, lng, costEstimate, img_prompt.',
  'budgetBreakdown must be an array of objects with keys: category, amount.',
  'All numeric fields must be valid JSON numbers, not strings.',
  'If information is uncertain, make a realistic estimate and still return the full JSON object.',
  `Follow this exact shape:\n${REQUIRED_JSON_SCHEMA}`,
].join(' ');

function trimToMaxLength(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}...`;
}

function summarizeCurrentItinerary(currentItinerary: TravelItinerary): string {
  const daySummaries = currentItinerary.days
    .map((day) => {
      const activities = day.activities
        .map((activity) => `${activity.time} ${activity.description} @ ${activity.location}`)
        .join(' | ');
      return `Day ${day.day} (${day.theme}): ${activities}`;
    })
    .join('\n');

  return trimToMaxLength(
    [
      `Destination: ${currentItinerary.destination}`,
      `Title: ${currentItinerary.title}`,
      `Overview: ${currentItinerary.overview}`,
      daySummaries,
    ].join('\n'),
    900,
  );
}

function buildPrompt(
  prompt: string,
  history: ChatMessage[],
  currentItinerary?: TravelItinerary | null,
): string {
  const contextParts = [
    'You are Poreia, an elite AI travel planner.',
    SCHEMA_INSTRUCTION,
    'Use realistic budgets and include lat/lng for activities.',
  ];

  if (currentItinerary) {
    contextParts.push(
      'Refine this existing itinerary and keep unchanged parts consistent unless the user asks for major changes.',
      `Current itinerary summary:\n${summarizeCurrentItinerary(currentItinerary)}`,
    );
  }

  if (history.length > 0) {
    const historyText = history
      .slice(-3)
      .map((message) => `${message.role}: ${message.text}`)
      .join('\n');
    contextParts.push(`Recent chat history:\n${historyText}`);
  }

  contextParts.push(`User request: ${prompt}`);

  return trimToMaxLength(contextParts.join('\n\n'), MAX_PROMPT_CHARS);
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

function ensureString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing or invalid ${fieldName}`);
  }
  return value;
}

function ensureNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`Missing or invalid ${fieldName}`);
  }
  return value;
}

function isItineraryLike(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return Array.isArray(record.days) && Array.isArray(record.budgetBreakdown);
}

function unwrapItineraryCandidate(raw: unknown): Record<string, unknown> {
  if (isItineraryLike(raw)) {
    return raw;
  }

  if (!raw || typeof raw !== 'object') {
    throw new Error('Provider response was not a valid itinerary object');
  }

  const record = raw as Record<string, unknown>;
  const commonWrapperKeys = ['itinerary', 'trip', 'data', 'result', 'response'];

  for (const key of commonWrapperKeys) {
    if (isItineraryLike(record[key])) {
      return record[key] as Record<string, unknown>;
    }
  }

  for (const value of Object.values(record)) {
    if (isItineraryLike(value)) {
      return value;
    }
  }

  throw new Error('Provider response was missing itinerary collections');
}

function normalizeItinerary(raw: unknown): TravelItinerary {
  const itinerary = unwrapItineraryCandidate(raw);
  const days = Array.isArray(itinerary.days) ? itinerary.days : null;
  const budgetBreakdown = Array.isArray(itinerary.budgetBreakdown)
    ? itinerary.budgetBreakdown
    : null;

  if (!days || !budgetBreakdown) {
    throw new Error('Provider response was missing itinerary collections');
  }

  return {
    destination: ensureString(itinerary.destination, 'destination'),
    title: ensureString(itinerary.title, 'title'),
    totalDays: ensureNumber(itinerary.totalDays, 'totalDays'),
    totalBudget: ensureNumber(itinerary.totalBudget, 'totalBudget'),
    currency: ensureString(itinerary.currency, 'currency'),
    overview: ensureString(itinerary.overview, 'overview'),
    days: days.map((day, index) => {
      if (!day || typeof day !== 'object') {
        throw new Error(`Invalid day at index ${index}`);
      }

      const dayRecord = day as Record<string, unknown>;
      const activities = Array.isArray(dayRecord.activities) ? dayRecord.activities : null;
      if (!activities) {
        throw new Error(`Missing activities for day ${index + 1}`);
      }

      return {
        day: ensureNumber(dayRecord.day, `days[${index}].day`),
        theme: ensureString(dayRecord.theme, `days[${index}].theme`),
        activities: activities.map((activity, activityIndex) => {
          if (!activity || typeof activity !== 'object') {
            throw new Error(`Invalid activity at day ${index + 1}, activity ${activityIndex + 1}`);
          }

          const activityRecord = activity as Record<string, unknown>;

          return {
            id: uuidv4(),
            time: ensureString(activityRecord.time, 'activity.time'),
            description: ensureString(activityRecord.description, 'activity.description'),
            location: ensureString(activityRecord.location, 'activity.location'),
            lat: typeof activityRecord.lat === 'number' ? activityRecord.lat : undefined,
            lng: typeof activityRecord.lng === 'number' ? activityRecord.lng : undefined,
            costEstimate:
              typeof activityRecord.costEstimate === 'number'
                ? activityRecord.costEstimate
                : undefined,
            img_prompt:
              typeof activityRecord.img_prompt === 'string'
                ? activityRecord.img_prompt
                : undefined,
          };
        }),
      };
    }),
    budgetBreakdown: budgetBreakdown.map((entry, index) => {
      if (!entry || typeof entry !== 'object') {
        throw new Error(`Invalid budget entry at index ${index}`);
      }

      const budgetRecord = entry as Record<string, unknown>;
      return {
        category: ensureString(budgetRecord.category, `budgetBreakdown[${index}].category`),
        amount: ensureNumber(budgetRecord.amount, `budgetBreakdown[${index}].amount`),
      };
    }),
  };
}

function toProviderError(error: unknown): Error {
  if (error instanceof SyntaxError) {
    return new Error('The itinerary service returned invalid JSON.');
  }

  if (error instanceof Error) {
    if (error.message.includes('Failed to fetch')) {
      return new Error(
        'The itinerary service is temporarily unavailable from this browser. This may be a network or CORS issue.',
      );
    }

    return error;
  }

  return new Error('The itinerary service failed unexpectedly.');
}

function getClientApiKey(): string | null {
  if (!POLLINATIONS_API_KEY) {
    return null;
  }

  return POLLINATIONS_API_KEY;
}

async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.text();

  if (!body.trim()) {
    return `The itinerary service returned ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(body) as {
      error?: { message?: string };
    };
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    // Fall back to plain text.
  }

  return body.trim();
}

async function requestChatCompletion(prompt: string, apiKey: string): Promise<string> {
  const response = await fetch(POLLINATIONS_CHAT_COMPLETIONS_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: POLLINATIONS_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are Poreia, an elite AI travel planner. ' +
            SCHEMA_INSTRUCTION +
            ' Return only valid JSON that matches the required itinerary schema.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: {
        type: 'json_object',
      },
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new Error('The itinerary service returned an empty chat completion.');
  }

  return content;
}

async function requestAnonymousText(prompt: string): Promise<string> {
  const url = new URL(`${POLLINATIONS_TEXT_ENDPOINT}${encodeURIComponent(prompt)}`);
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'text/plain, application/json',
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new Error('The itinerary service returned an empty response.');
  }

  return text;
}

export async function generateOrRefineItinerary(
  prompt: string,
  history: ChatMessage[] = [],
  currentItinerary?: TravelItinerary | null,
): Promise<TravelItinerary> {
  const fullPrompt = buildPrompt(prompt, history, currentItinerary);
  const apiKey = getClientApiKey();

  try {
    const text = apiKey
      ? await requestChatCompletion(fullPrompt, apiKey)
      : await requestAnonymousText(fullPrompt);

    const parsed = JSON.parse(extractJsonObject(text));
    return normalizeItinerary(parsed);
  } catch (error) {
    console.error('Failed to generate itinerary', error);
    throw toProviderError(error);
  }
}
