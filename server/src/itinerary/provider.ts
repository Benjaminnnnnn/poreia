import { z } from 'zod';
import { AppError } from '../core/errors';
import { createPrefixedId } from '../core/id';
import type { TravelItinerary } from '../types/domain';

const POLLINATIONS_TEXT_ENDPOINT = 'https://gen.pollinations.ai/text/';
const POLLINATIONS_CHAT_COMPLETIONS_ENDPOINT = 'https://gen.pollinations.ai/v1/chat/completions';
const MAX_PROMPT_CHARS = 1600;
const POLLINATIONS_MODEL = 'openai';
const ERROR_RESPONSE_EXAMPLE = `{
  "error": "The request must be about planning or refining a trip."
}`;

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
          "img_prompt": "specific landmark, district, park, or geographic place name"
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

const RESPONSE_INSTRUCTION = [
  'Return exactly one JSON object.',
  'You may return one of two shapes only.',
  `If the request is valid, return a travel itinerary object with this exact shape:\n${REQUIRED_JSON_SCHEMA}`,
  `If the request is unrelated to travel, nonsensical, or for a refinement would require switching to a different primary destination, return this exact shape instead:\n${ERROR_RESPONSE_EXAMPLE}`,
  'Do not return markdown, commentary, prose, preambles, or code fences.',
  'For itinerary objects, use exactly these top-level keys: destination, title, totalDays, totalBudget, currency, overview, days, budgetBreakdown.',
  'If the user names a destination, the itinerary destination must match that place or a clearly nested place within it.',
  'Never substitute a different city, region, or country than the one the user requested.',
  'For itinerary objects, days must be an array of objects with keys: day, theme, activities.',
  'For itinerary objects, activities must be an array of objects with keys: time, description, location, lat, lng, costEstimate, img_prompt.',
  'For itinerary objects, img_prompt is internal metadata for photo lookup. Make it a concise, location-focused phrase such as a landmark, neighborhood, park, museum, district, or geographic site name.',
  'For itinerary objects, do not use cinematic adjectives, stylistic image prompts, or descriptive scenery phrases in img_prompt.',
  'For itinerary objects, budgetBreakdown must be an array of objects with keys: category, amount.',
  'For itinerary objects, all numeric fields must be valid JSON numbers, not strings.',
  'If information is uncertain but the travel request still makes sense, make a realistic estimate and return the full itinerary JSON object.',
].join(' ');

export const travelItinerarySchema = z.object({
  destination: z.string().min(1),
  title: z.string().min(1),
  totalDays: z.number(),
  totalBudget: z.number(),
  currency: z.string().min(1),
  overview: z.string().min(1),
  days: z.array(
    z.object({
      day: z.number(),
      theme: z.string().min(1),
      mood: z.string().optional(),
      notes: z.string().optional(),
      activities: z.array(
        z.object({
          id: z.string().min(1).optional(),
          time: z.string().min(1),
          description: z.string().min(1),
          location: z.string().min(1),
          lat: z.number().optional(),
          lng: z.number().optional(),
          costEstimate: z.number().optional(),
          img_prompt: z.string().optional(),
        }),
      ),
    }),
  ),
  budgetBreakdown: z.array(
    z.object({
      category: z.string().min(1),
      amount: z.number(),
    }),
  ),
});

const providerErrorSchema = z
  .object({
    error: z.string().trim().min(1),
  })
  .strict();

function trimToMaxLength(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}...`;
}

function normalizeComparableText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeComparableText(value: string): string[] {
  return normalizeComparableText(value).split(' ').filter((token) => token.length > 2);
}

function extractRequestedPlace(prompt: string): string | null {
  const patterns = [
    /\b(?:in|to|around|through|across|visiting|visit)\s+([^,.;!?]+?)(?=\s+(?:for|with|on|under|over|near|around|from|via|beginner|beginners|budget)\b|$)/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    const candidate = match?.[1]?.trim();
    if (!candidate) {
      continue;
    }

    return candidate.replace(/\s+/g, ' ').trim();
  }

  return null;
}

function destinationMatchesPrompt(prompt: string, itinerary: TravelItinerary): boolean {
  const requestedPlace = extractRequestedPlace(prompt);
  if (!requestedPlace) {
    return true;
  }

  const requested = normalizeComparableText(requestedPlace);
  const actual = normalizeComparableText(itinerary.destination);
  if (!requested || !actual) {
    return true;
  }

  if (actual.includes(requested) || requested.includes(actual)) {
    return true;
  }

  const requestedTokens = requested.split(' ').filter((token) => token.length > 2);
  const actualTokens = new Set(actual.split(' ').filter((token) => token.length > 2));
  const overlapCount = requestedTokens.filter((token) => actualTokens.has(token)).length;

  return overlapCount >= Math.min(2, requestedTokens.length);
}

function destinationMatchesCurrentTrip(
  currentItinerary: TravelItinerary,
  nextItinerary: TravelItinerary,
): boolean {
  const current = normalizeComparableText(currentItinerary.destination);
  const next = normalizeComparableText(nextItinerary.destination);
  if (!current || !next) {
    return false;
  }

  if (current.includes(next) || next.includes(current)) {
    return true;
  }

  const currentTokens = tokenizeComparableText(currentItinerary.destination);
  const nextTokens = new Set(tokenizeComparableText(nextItinerary.destination));
  const overlapCount = currentTokens.filter((token) => nextTokens.has(token)).length;

  return overlapCount >= Math.min(2, currentTokens.length);
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
    RESPONSE_INSTRUCTION,
    'Use realistic budgets and include lat/lng for activities.',
  ];

  if (currentItinerary) {
    contextParts.push(
      'Refine this existing itinerary only.',
      `Keep the same primary destination: ${currentItinerary.destination}.`,
      'Do not switch to a different city, region, or country, and do not return a brand-new trip concept.',
      'Keep unchanged parts consistent unless the user clearly asks to modify them.',
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

function preserveDayJournalEntries(
  nextItinerary: TravelItinerary,
  currentItinerary?: TravelItinerary | null,
): TravelItinerary {
  if (!currentItinerary) {
    return nextItinerary;
  }

  const currentDayLookup = new Map(
    currentItinerary.days.map((day) => [day.day, { mood: day.mood, notes: day.notes }]),
  );

  return {
    ...nextItinerary,
    days: nextItinerary.days.map((day) => {
      const existing = currentDayLookup.get(day.day);
      if (!existing) {
        return day;
      }

      return {
        ...day,
        mood: existing.mood ?? day.mood,
        notes: existing.notes ?? day.notes,
      };
    }),
  };
}

async function readErrorMessage(response: Response): Promise<string> {
  const body = await response.text();
  if (!body.trim()) {
    return `The itinerary service returned ${response.status}.`;
  }

  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    if (parsed.error?.message) {
      return parsed.error.message;
    }
  } catch {
    return body.trim();
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
            RESPONSE_INSTRUCTION +
            ' Return only valid JSON.',
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
    throw new AppError(503, 'provider_unavailable', await readErrorMessage(response));
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
    throw new AppError(502, 'provider_invalid_response', 'The itinerary service returned an empty chat completion.');
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
    throw new AppError(503, 'provider_unavailable', await readErrorMessage(response));
  }

  const text = await response.text();
  if (!text.trim()) {
    throw new AppError(502, 'provider_invalid_response', 'The itinerary service returned an empty response.');
  }

  return text;
}

function normalizeItinerary(raw: unknown): TravelItinerary {
  const parsed = travelItinerarySchema.safeParse(raw);
  if (!parsed.success) {
    throw new AppError(502, 'provider_invalid_response', 'The itinerary service returned an invalid itinerary.', parsed.error.flatten());
  }

  return {
    ...parsed.data,
    days: parsed.data.days.map((day) => ({
      ...day,
      activities: day.activities.map((activity) => ({
        ...activity,
        id: activity.id ?? createPrefixedId('activity'),
      })),
    })),
  };
}

function parseProviderResponse(
  raw: unknown,
  currentItinerary?: TravelItinerary | null,
): TravelItinerary {
  const providerError = providerErrorSchema.safeParse(raw);
  if (providerError.success) {
    throw new AppError(
      422,
      currentItinerary ? 'invalid_refinement_prompt' : 'invalid_trip_prompt',
      providerError.data.error,
    );
  }

  return preserveDayJournalEntries(normalizeItinerary(raw), currentItinerary);
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export class ItineraryProvider {
  constructor(private readonly apiKey: string | undefined) {}

  async generateOrRefine(
    prompt: string,
    history: ChatMessage[] = [],
    currentItinerary?: TravelItinerary | null,
  ): Promise<TravelItinerary> {
    try {
      const fullPrompt = buildPrompt(prompt, history, currentItinerary);

      const requestProviderResponse = async (value: string) =>
        this.apiKey
          ? requestChatCompletion(value, this.apiKey)
          : requestAnonymousText(value);

      const parseResponse = async (value: string) =>
        parseProviderResponse(JSON.parse(extractJsonObject(value)), currentItinerary);

      const firstPass = await parseResponse(await requestProviderResponse(fullPrompt));
      if (currentItinerary && destinationMatchesCurrentTrip(currentItinerary, firstPass)) {
        return firstPass;
      }

      if (currentItinerary) {
        const correctionPrompt = `${fullPrompt}\n\nImportant correction: keep the same primary destination as ${currentItinerary.destination}. If the user's request cannot be satisfied without changing destinations, return exactly ${ERROR_RESPONSE_EXAMPLE} instead of an itinerary.`;
        const correctedItinerary = await parseResponse(await requestProviderResponse(correctionPrompt));

        if (destinationMatchesCurrentTrip(currentItinerary, correctedItinerary)) {
          return correctedItinerary;
        }

        throw new AppError(
          502,
          'provider_invalid_response',
          `The itinerary service returned ${correctedItinerary.destination} instead of keeping the trip anchored to ${currentItinerary.destination}.`,
        );
      }

      if (destinationMatchesPrompt(prompt, firstPass)) {
        return firstPass;
      }

      const requestedPlace = extractRequestedPlace(prompt);
      if (!requestedPlace) {
        return firstPass;
      }

      const correctionPrompt = `${fullPrompt}\n\nImportant correction: the requested destination is ${requestedPlace}. Regenerate the itinerary for that destination only and do not substitute a different place.`;
      return parseResponse(await requestProviderResponse(correctionPrompt));
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        throw new AppError(502, 'provider_invalid_response', 'The itinerary service returned invalid JSON.');
      }

      throw new AppError(503, 'provider_unavailable', 'The itinerary service failed unexpectedly.');
    }
  }
}
