import type { User } from "firebase/auth";
import {
  ArrowUpRight,
  Check,
  Clock3,
  Globe2,
  MapPinned,
  Pencil,
  Route,
  X,
} from "lucide-react";
import React, {
  Suspense,
  lazy,
  startTransition,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getActivityImage,
  type ResolvedActivityImage,
} from "../services/activityImageService";
import type {
  Activity,
  MapPinData,
  TravelItinerary,
  TripSession,
} from "../types";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import Surface from "./ui/Surface";

const WorldMap = lazy(() => import("./WorldMap"));

const COUNTRY_ALIASES = [
  ["argentina", "Argentina"],
  ["australia", "Australia"],
  ["austria", "Austria"],
  ["belgium", "Belgium"],
  ["brazil", "Brazil"],
  ["canada", "Canada"],
  ["chile", "Chile"],
  ["china", "China"],
  ["colombia", "Colombia"],
  ["costa rica", "Costa Rica"],
  ["croatia", "Croatia"],
  ["czech republic", "Czech Republic"],
  ["czechia", "Czech Republic"],
  ["denmark", "Denmark"],
  ["egypt", "Egypt"],
  ["england", "United Kingdom"],
  ["finland", "Finland"],
  ["france", "France"],
  ["germany", "Germany"],
  ["greece", "Greece"],
  ["hong kong", "Hong Kong"],
  ["hungary", "Hungary"],
  ["iceland", "Iceland"],
  ["india", "India"],
  ["indonesia", "Indonesia"],
  ["ireland", "Ireland"],
  ["israel", "Israel"],
  ["italy", "Italy"],
  ["japan", "Japan"],
  ["kenya", "Kenya"],
  ["malaysia", "Malaysia"],
  ["mexico", "Mexico"],
  ["morocco", "Morocco"],
  ["netherlands", "Netherlands"],
  ["new zealand", "New Zealand"],
  ["norway", "Norway"],
  ["peru", "Peru"],
  ["philippines", "Philippines"],
  ["poland", "Poland"],
  ["portugal", "Portugal"],
  ["scotland", "United Kingdom"],
  ["singapore", "Singapore"],
  ["south africa", "South Africa"],
  ["south korea", "South Korea"],
  ["korea", "South Korea"],
  ["spain", "Spain"],
  ["sweden", "Sweden"],
  ["switzerland", "Switzerland"],
  ["taiwan", "Taiwan"],
  ["thailand", "Thailand"],
  ["turkey", "Turkey"],
  ["uae", "United Arab Emirates"],
  ["united arab emirates", "United Arab Emirates"],
  ["uk", "United Kingdom"],
  ["u.k.", "United Kingdom"],
  ["united kingdom", "United Kingdom"],
  ["united states", "United States"],
  ["united states of america", "United States"],
  ["u.s.a.", "United States"],
  ["usa", "United States"],
  ["vietnam", "Vietnam"],
] as const;

const BLOCKED_REGION_TOKENS = new Set([
  "california",
  "florida",
  "new york",
  "patagonia",
  "bali",
  "tuscany",
]);

const PROFILE_MAP_LABEL = "Traveler atlas";

interface ProfilePageProps {
  authUser: User;
  travelerName: string;
  trips: TripSession[];
  onOpenTrip: (tripId: string) => void;
  onTravelerNameChange: (nextName: string) => void;
}

interface CountryVisit {
  country: string;
  trips: TripSession[];
  lat: number;
  lng: number;
}

function formatTripDate(timestamp: number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(timestamp);
}

function toTitleCase(value: string) {
  return value.replace(/\w\S*/g, (segment) => {
    const [first = "", ...rest] = segment;
    return `${first.toUpperCase()}${rest.join("").toLowerCase()}`;
  });
}

function normalizeToken(value: string) {
  return value.toLowerCase().replace(/[().]/g, " ").replace(/\s+/g, " ").trim();
}

function findCountryInText(value?: string | null) {
  const normalized = normalizeToken(value ?? "");
  if (!normalized) {
    return null;
  }

  for (const [alias, canonical] of COUNTRY_ALIASES) {
    const pattern = new RegExp(
      `(^|\\b)${alias.replace(/\./g, "\\.")}(\\b|$)`,
      "i",
    );
    if (pattern.test(normalized)) {
      return canonical;
    }
  }

  const segments = value
    ?.split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);
  const lastSegment = segments?.at(-1);
  if (!lastSegment) {
    return null;
  }

  const normalizedLastSegment = normalizeToken(lastSegment);
  if (
    segments.length < 2 ||
    !normalizedLastSegment ||
    BLOCKED_REGION_TOKENS.has(normalizedLastSegment)
  ) {
    return null;
  }

  return toTitleCase(lastSegment);
}

function getRepresentativeActivity(
  itinerary: TravelItinerary | null,
): Activity | undefined {
  return itinerary?.days
    .flatMap((day) => day.activities)
    .find((activity) => {
      return activity.lat !== undefined && activity.lng !== undefined;
    });
}

function getTripCountry(trip: TripSession) {
  const itinerary = trip.currentItinerary;
  if (!itinerary) {
    return null;
  }

  const destinationCountry = findCountryInText(itinerary.destination);
  if (destinationCountry) {
    return destinationCountry;
  }

  for (const day of itinerary.days) {
    for (const activity of day.activities) {
      const activityCountry =
        findCountryInText(activity.location) ||
        findCountryInText(activity.description);
      if (activityCountry) {
        return activityCountry;
      }
    }
  }

  return null;
}

function buildCountryPins(trips: TripSession[]): MapPinData[] {
  const countryVisits = new Map<string, CountryVisit>();

  trips.forEach((trip) => {
    const itinerary = trip.currentItinerary;
    const activity = getRepresentativeActivity(itinerary);
    const country = getTripCountry(trip);
    if (
      !itinerary ||
      !activity ||
      activity.lat === undefined ||
      activity.lng === undefined ||
      !country
    ) {
      return;
    }

    const existingVisit = countryVisits.get(country);
    if (existingVisit) {
      existingVisit.trips.push(trip);
      return;
    }

    countryVisits.set(country, {
      country,
      trips: [trip],
      lat: activity.lat,
      lng: activity.lng,
    });
  });

  return [...countryVisits.values()]
    .sort((left, right) => right.trips.length - left.trips.length)
    .map((visit) => ({
      id: `country-${visit.country.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: visit.country,
      lat: visit.lat,
      lng: visit.lng,
      description:
        visit.trips.length === 1
          ? "1 saved trip in your archive"
          : `${visit.trips.length} saved trips in your archive`,
      dayColor: "#2a8c8e",
      badgeLabel: "Visited",
      markerValue: String(visit.trips.length),
    }));
}

const ProfilePage: React.FC<ProfilePageProps> = ({
  authUser,
  travelerName,
  trips,
  onOpenTrip,
  onTravelerNameChange,
}) => {
  const [tripImages, setTripImages] = useState<
    Record<string, ResolvedActivityImage>
  >({});
  const [isEditingTravelerName, setIsEditingTravelerName] = useState(false);
  const [draftTravelerName, setDraftTravelerName] = useState(travelerName);

  useEffect(() => {
    setDraftTravelerName(travelerName);
  }, [travelerName]);

  const travelerHandle = authUser.email
    ? `@${authUser.email.split("@")[0]}`
    : `@${travelerName.toLowerCase().replace(/[^a-z0-9]+/g, "")}`;
  const archivedTrips = useMemo(
    () =>
      [...trips]
        .filter((trip) => trip.currentItinerary)
        .sort((left, right) => right.updatedAt - left.updatedAt),
    [trips],
  );
  const countryPins = useMemo(
    () => buildCountryPins(archivedTrips),
    [archivedTrips],
  );
  const totalTripDays = useMemo(
    () =>
      archivedTrips.reduce(
        (sum, trip) => sum + (trip.currentItinerary?.totalDays ?? 0),
        0,
      ),
    [archivedTrips],
  );
  const tripActivities = useMemo(
    () =>
      archivedTrips.reduce((sum, trip) => {
        return (
          sum +
          (trip.currentItinerary?.days.reduce(
            (daySum, day) => daySum + day.activities.length,
            0,
          ) ?? 0)
        );
      }, 0),
    [archivedTrips],
  );
  const tripsNeedingImages = useMemo(
    () =>
      archivedTrips.filter((trip) => {
        return (
          Boolean(getRepresentativeActivity(trip.currentItinerary)) &&
          !tripImages[trip.id]
        );
      }),
    [archivedTrips, tripImages],
  );

  useEffect(() => {
    let isCancelled = false;

    if (!tripsNeedingImages.length) {
      return;
    }

    void Promise.all(
      tripsNeedingImages.map(async (trip) => {
        const itinerary = trip.currentItinerary;
        const activity = getRepresentativeActivity(itinerary);
        if (!itinerary || !activity) {
          return null;
        }

        const image = await getActivityImage(activity, itinerary.destination);
        return image ? ([trip.id, image] as const) : null;
      }),
    ).then((results) => {
      if (isCancelled) {
        return;
      }

      const resolvedImages = results.filter(
        (result): result is readonly [string, ResolvedActivityImage] =>
          Boolean(result),
      );
      if (!resolvedImages.length) {
        return;
      }

      startTransition(() => {
        setTripImages((current) => {
          const next = { ...current };
          resolvedImages.forEach(([tripId, image]) => {
            next[tripId] = image;
          });
          return next;
        });
      });
    });

    return () => {
      isCancelled = true;
    };
  }, [tripsNeedingImages]);

  const handleTravelerNameSave = () => {
    const nextTravelerName = draftTravelerName.trim();
    if (!nextTravelerName) {
      return;
    }

    onTravelerNameChange(nextTravelerName);
    setIsEditingTravelerName(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-[rgb(248,245,240)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="grid gap-6 xl:grid-cols-[18rem,minmax(0,1fr)]">
          <Surface
            as="aside"
            variant="glass"
            padding="none"
            radius="2xl"
            className="overflow-hidden shadow-[0_20px_48px_rgba(118,74,36,0.08)]"
          >
            <div className="relative overflow-hidden px-5 pb-6 pt-6">
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-24 bg-[linear-gradient(135deg,rgba(230,106,63,0.16),rgba(72,131,126,0.1),rgba(248,214,145,0.18))]"
              />

              <div className="relative">
                <div className="h-24 w-24 overflow-hidden rounded-full border border-[rgba(236,220,204,0.98)] bg-[rgba(255,254,251,0.96)] shadow-[0_16px_30px_rgba(120,78,42,0.1)]">
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={`${travelerName} profile`}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[rgba(230,106,63,0.14)] font-display text-[2rem] text-[rgba(201,95,55,0.96)]">
                      {travelerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgba(126,82,54,0.72)]">
                    Traveler archive
                  </p>

                  {isEditingTravelerName ? (
                    <form
                      className="mt-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleTravelerNameSave();
                      }}
                    >
                      <label htmlFor="traveler-name-input" className="sr-only">
                        Traveler name
                      </label>
                      <input
                        id="traveler-name-input"
                        type="text"
                        value={draftTravelerName}
                        onChange={(event) =>
                          setDraftTravelerName(event.target.value)
                        }
                        maxLength={40}
                        autoFocus
                        className="w-full rounded-[0.8rem] border border-[rgba(223,205,187,0.96)] bg-[rgba(255,252,248,0.98)] px-3 py-2 font-display text-[1.5rem] leading-none tracking-[-0.04em] text-[rgba(74,43,26,0.97)] outline-none transition-colors focus:border-[rgba(223,147,93,0.92)]"
                      />
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="submit"
                          disabled={!draftTravelerName.trim()}
                          size="icon"
                          className="h-9 w-auto rounded-[0.75rem] gap-1.5 px-3"
                        >
                          <Check size={14} />
                          Save
                        </Button>
                        <Button
                          onClick={() => {
                            setDraftTravelerName(travelerName);
                            setIsEditingTravelerName(false);
                          }}
                          variant="secondary"
                          size="icon"
                          className="h-9 w-auto rounded-[0.75rem] gap-1.5 px-3"
                        >
                          <X size={14} />
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="mt-2 flex items-start gap-2">
                      <h1 className="font-display text-[2rem] leading-[0.96] tracking-[-0.05em] text-[rgba(74,43,26,0.97)]">
                        {travelerName}
                      </h1>
                      <Button
                        onClick={() => setIsEditingTravelerName(true)}
                        variant="secondary"
                        size="icon-sm"
                        className="mt-1 shrink-0 rounded-full text-[rgba(126,82,54,0.82)] hover:text-[rgba(217,102,58,0.92)]"
                        aria-label="Edit traveler name"
                      >
                        <Pencil size={14} />
                      </Button>
                    </div>
                  )}

                  <p className="mt-2 text-sm text-[rgba(112,75,52,0.76)]">
                    {travelerHandle}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-[rgba(103,67,46,0.82)]">
                    A quiet record of where you have been, what you planned, and
                    the trips you can reopen anytime.
                  </p>
                </div>

                <div className="mt-6 grid gap-3">
                  <Surface
                    as="div"
                    variant="subtle"
                    padding="none"
                    radius="lg"
                    className="px-4 py-3.5"
                  >
                    <div className="flex items-center gap-2 text-[rgba(72,131,126,0.92)]">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(72,131,126,0.12)]">
                        <Globe2 size={13} />
                      </div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[rgba(126,82,54,0.7)]">
                        Countries
                      </p>
                    </div>
                    <p className="mt-3 font-display text-[2rem] leading-none tracking-[-0.05em] text-[rgba(60,36,24,0.98)]">
                      {countryPins.length}
                    </p>
                  </Surface>

                  <div className="grid grid-cols-2 gap-3">
                    <Surface
                      as="div"
                      variant="subtle"
                      padding="none"
                      radius="lg"
                      className="px-4 py-3.5"
                    >
                      <div className="flex items-center gap-2 text-[rgba(217,102,58,0.92)]">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(217,102,58,0.12)]">
                          <Route size={13} />
                        </div>
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[rgba(126,82,54,0.7)]">
                          Trips
                        </p>
                      </div>
                      <p className="mt-3 text-[1.4rem] font-semibold text-[rgba(74,43,26,0.96)]">
                        {archivedTrips.length}
                      </p>
                    </Surface>

                    <Surface
                      as="div"
                      variant="subtle"
                      padding="none"
                      radius="lg"
                      className="px-4 py-3.5"
                    >
                      <div className="flex items-center gap-2 text-[rgba(199,140,47,0.95)]">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[rgba(199,140,47,0.12)]">
                          <MapPinned size={13} />
                        </div>
                        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-[rgba(126,82,54,0.7)]">
                          Stops
                        </p>
                      </div>
                      <p className="mt-3 text-[1.4rem] font-semibold text-[rgba(74,43,26,0.96)]">
                        {tripActivities}
                      </p>
                    </Surface>
                  </div>

                  <Surface
                    as="div"
                    variant="muted"
                    padding="none"
                    radius="lg"
                    className="px-4 py-3.5 text-sm leading-6 text-[rgba(103,67,46,0.82)]"
                  >
                    {totalTripDays} total itinerary days across your archive.
                  </Surface>
                </div>
              </div>
            </div>
          </Surface>

          <div className="min-w-0 space-y-6">
            <Surface
              as="section"
              variant="glass"
              padding="none"
              radius="2xl"
              className="overflow-hidden shadow-[0_22px_52px_rgba(118,74,36,0.08)]"
            >
              <div className="border-b border-[rgba(236,224,210,0.94)] px-5 py-4 sm:px-6">
                <div className="max-w-xl">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[rgba(126,82,54,0.72)]">
                    {PROFILE_MAP_LABEL}
                  </p>
                  <h2 className="font-display mt-2 max-w-[20ch] text-[clamp(1.8rem,3.2vw,3rem)] leading-[0.94] tracking-[-0.05em] text-[rgba(74,43,26,0.97)]">
                    Countries you've been.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[rgba(112,75,52,0.78)]">
                    Saved trips become country markers automatically.
                  </p>
                </div>
              </div>

              <div className="relative h-[24rem] sm:h-[28rem]">
                <Suspense
                  fallback={
                    <Surface
                      as="div"
                      variant="glass"
                      padding="none"
                      radius="md"
                      className="flex h-full items-center justify-center bg-[rgba(255,250,245,0.72)] text-sm font-medium text-[rgba(105,70,48,0.78)]"
                    >
                      Loading traveler atlas...
                    </Surface>
                  }
                >
                  <WorldMap
                    pins={countryPins}
                    onPinClick={() => {}}
                    className="h-full w-full"
                  />
                </Suspense>

                {!countryPins.length ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                    <Surface
                      as="div"
                      variant="glass"
                      padding="none"
                      radius="xl"
                      className="max-w-md px-5 py-4 text-center shadow-[0_18px_40px_rgba(118,74,36,0.08)] backdrop-blur-sm"
                    >
                      <p className="font-display text-[1.5rem] leading-none tracking-[-0.04em] text-[rgba(74,43,26,0.96)]">
                        Your atlas is still blank.
                      </p>
                      <p className="mt-3 text-sm leading-6 text-[rgba(112,75,52,0.76)]">
                        Save a few itineraries with destination details and your
                        visited countries will appear here automatically.
                      </p>
                    </Surface>
                  </div>
                ) : null}
              </div>
            </Surface>

            <section>
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[rgba(126,82,54,0.72)]">
                    Travel history
                  </p>
                  <h2 className="font-display mt-2 text-[clamp(1.6rem,3vw,2.4rem)] leading-[0.97] tracking-[-0.04em] text-[rgba(74,43,26,0.96)]">
                    Past itineraries, still within reach.
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-[rgba(112,75,52,0.76)]">
                  Open any trip to keep refining it where you left off.
                </p>
              </div>

              {archivedTrips.length ? (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {archivedTrips.map((trip) => {
                    const itinerary = trip.currentItinerary;
                    const country = getTripCountry(trip);
                    const coverImage = tripImages[trip.id]?.url;

                    return (
                      <Surface
                        as="article"
                        key={trip.id}
                        variant="card"
                        padding="none"
                        radius="xl"
                        className="group overflow-hidden transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1"
                      >
                        <button
                          type="button"
                          onClick={() => onOpenTrip(trip.id)}
                          className="flex h-full w-full flex-col text-left"
                        >
                          <div className="relative h-52 overflow-hidden">
                            {coverImage ? (
                              <img
                                src={coverImage}
                                alt={itinerary?.destination || trip.title}
                                className="h-full w-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="h-full w-full bg-[linear-gradient(135deg,rgba(230,106,63,0.24),rgba(248,214,145,0.28),rgba(72,131,126,0.24))]" />
                            )}

                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(60,37,25,0.02)_0%,rgba(60,37,25,0.42)_100%)]" />

                            <Badge
                              tone="glass"
                              size="md"
                              className="absolute left-4 top-4 tracking-[0.18em]"
                            >
                              {country || "Saved trip"}
                            </Badge>
                          </div>

                          <div className="flex flex-1 flex-col px-5 py-5">
                            <div className="flex flex-wrap items-center gap-2 text-[0.76rem] font-semibold uppercase tracking-[0.16em] text-[rgba(126,82,54,0.72)]">
                              <span>{itinerary?.totalDays ?? 0} days</span>
                              <span className="text-[rgba(199,170,145,0.9)]">
                                •
                              </span>
                              <span>{formatTripDate(trip.updatedAt)}</span>
                            </div>

                            <h3 className="font-display mt-3 text-[1.8rem] leading-[0.98] tracking-[-0.04em] text-[rgba(74,43,26,0.96)]">
                              {itinerary?.destination || trip.title}
                            </h3>
                            <p className="mt-3 line-clamp-3 text-sm leading-6 text-[rgba(105,69,48,0.78)]">
                              {itinerary?.overview ||
                                "Open this itinerary to keep shaping the route."}
                            </p>

                            <div className="mt-5 flex items-center justify-between text-sm font-medium text-[rgba(118,80,57,0.78)]">
                              <span className="inline-flex items-center gap-1.5">
                                <Clock3 size={14} />
                                Updated {formatTripDate(trip.updatedAt)}
                              </span>
                              <span className="inline-flex items-center gap-1.5 text-[rgba(206,95,55,0.94)] transition-transform duration-200 group-hover:translate-x-0.5">
                                Open itinerary
                                <ArrowUpRight size={15} />
                              </span>
                            </div>
                          </div>
                        </button>
                      </Surface>
                    );
                  })}
                </div>
              ) : (
                <Surface
                  as="div"
                  variant="dashed"
                  radius="xl"
                  className="px-5 py-10 text-center"
                >
                  <p className="font-display text-[1.8rem] leading-none tracking-[-0.04em] text-[rgba(84,50,31,0.96)]">
                    No travel history yet.
                  </p>
                  <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[rgba(112,75,52,0.76)]">
                    Generate your first itinerary and it will land here as part
                    of your personal archive.
                  </p>
                </Surface>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
