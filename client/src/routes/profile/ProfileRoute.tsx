import { useAppNavigation } from "@/app/navigation";
import Button from "@/components/ui/Button";
import SavedTripCard from "@/components/ui/SavedTripCard";
import Surface from "@/components/ui/Surface";
import { useAppAuth } from "@/features/auth/components/AuthRoute";
import { useTrips } from "@/features/trips/state/TripsContext";
import { hasFiniteCoordinates } from "@/lib/coordinates";
import {
  getActivityImage,
  type ResolvedActivityImage,
} from "@/services/activityImageService";
import type {
  Activity,
  MapPinData,
  TravelItinerary,
  TripSession,
} from "@/types";
import {
  Check,
  Clock3,
  Globe2,
  MapPinned,
  Pencil,
  Plus,
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

const WorldMap = lazy(() => import("@/components/WorldMap"));

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

interface CountryVisit {
  country: string;
  trips: TripSession[];
  lat: number;
  lng: number;
}

interface ProfileStatCardProps {
  iconBackgroundClassName: string;
  iconColorClassName: string;
  icon: React.ReactNode;
  label: string;
  value: number;
}

const ProfileStatCard: React.FC<ProfileStatCardProps> = ({
  iconBackgroundClassName,
  iconColorClassName,
  icon,
  label,
  value,
}) => (
  <div className="flex items-center gap-4 rounded-[1.25rem] border border-white/15 bg-white/10 px-5 py-4 shadow-[0_4px_16px_rgba(0,0,0,0.2)] backdrop-blur-sm">
    <div
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[0.85rem] ${iconBackgroundClassName} ${iconColorClassName}`}
    >
      {icon}
    </div>
    <div>
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/50">
        {label}
      </p>
      <p className="font-display text-[2.2rem] leading-none tracking-[-0.05em] text-white drop-shadow-lg [font-variant-numeric:lining-nums_tabular-nums]">
        {value}
      </p>
    </div>
  </div>
);

function formatTripDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getTripStopCount(itinerary: TravelItinerary | null) {
  return (
    itinerary?.days.reduce((sum, day) => sum + day.activities.length, 0) ?? 0
  );
}

function formatStopCountLabel(count: number) {
  return `${count} ${count === 1 ? "stop" : "stops"}`;
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
      return hasFiniteCoordinates(activity);
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
      !hasFiniteCoordinates(activity) ||
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

const ProfileRoute: React.FC = () => {
  const {
    actions: { goHome, openSavedTrips, openTrip },
  } = useAppNavigation();
  const {
    actions: { setTravelerName },
    state: { authUser, isUpdatingProfile, travelerName },
  } = useAppAuth();
  const {
    actions: { deleteTrip },
    state: { isLoadingTrips, trips },
  } = useTrips();
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
        .sort(
          (left, right) =>
            Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
        ),
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
      archivedTrips.reduce(
        (sum, trip) => sum + getTripStopCount(trip.currentItinerary),
        0,
      ),
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

  const handleTravelerNameSave = async () => {
    const nextTravelerName = draftTravelerName.trim();
    if (!nextTravelerName) {
      return;
    }

    try {
      await setTravelerName(nextTravelerName);
      setIsEditingTravelerName(false);
    } catch (error) {
      console.error(error);
      alert("Could not update your profile. Please try again.");
    }
  };

  const latestStopDestination =
    archivedTrips[0]?.currentItinerary?.destination?.split(",")[0] || "—";
  const regionSpotlight = countryPins[0]?.name || "—";

  return (
    <div className="relative h-full overflow-y-auto">
      {/* Background layer */}
      <div className="fixed inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&q=80&w=1200"
          alt="Traveler background"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/35 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/30" />
      </div>

      {/* Content layer */}
      <div className="relative z-10 mx-auto w-full max-w-[88rem] px-4 pt-[4.5rem] pb-8 sm:px-6 sm:pt-[5rem] lg:px-8 lg:pt-[5.5rem]">
        {/* TOP SECTION: Profile card + Map card */}
        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[22rem_1fr]">
          {/* Profile Card */}
          <Surface
            as="aside"
            variant="glass"
            padding="none"
            radius="2xl"
            className="overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              {/* Avatar + Status badge */}
              <div className="mb-6 flex items-start justify-between">
                <div className="h-[4.5rem] w-[4.5rem] overflow-hidden rounded-[1.1rem] border border-white/20 bg-white/15 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
                  {authUser.photoURL ? (
                    <img
                      src={authUser.photoURL}
                      alt={`${travelerName} profile`}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-orange-400/40 to-teal-300/30 font-display text-[2rem] text-white drop-shadow-lg">
                      {travelerName.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-white/40">
                    Status
                  </p>
                  <span className="mt-1 inline-flex items-center rounded-full border border-green-400/50 bg-green-400/10 px-2.5 py-0.5 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-green-400">
                    Active Explorer
                  </span>
                </div>
              </div>

              {/* Name + handle */}
              {isEditingTravelerName ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleTravelerNameSave();
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
                    disabled={isUpdatingProfile}
                    maxLength={40}
                    autoFocus
                    className="field-focus w-full rounded-[0.8rem] border border-white/30 bg-white/15 px-3 py-2 font-display text-[1.5rem] leading-none tracking-[-0.04em] text-white placeholder-white/50"
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <Button
                      type="submit"
                      disabled={!draftTravelerName.trim() || isUpdatingProfile}
                      size="icon"
                      className="h-9 w-auto rounded-[0.75rem] gap-1.5 px-3"
                    >
                      <Check size={14} />
                      {isUpdatingProfile ? "Saving..." : "Save"}
                    </Button>
                    <Button
                      onClick={() => {
                        setDraftTravelerName(travelerName);
                        setIsEditingTravelerName(false);
                      }}
                      disabled={isUpdatingProfile}
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
                <>
                  <h1 className="text-2xl font-semibold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:text-3xl">
                    {travelerName}
                  </h1>
                  <p className="mt-1 text-sm text-white/60">{travelerHandle}</p>
                </>
              )}

              <p className="mt-4 text-sm leading-6 text-white/70">
                A quiet record of where you have been, what you planned, and the
                trips you can reopen anytime.
              </p>

              {!isEditingTravelerName && (
                <Button
                  onClick={() => setIsEditingTravelerName(true)}
                  size="icon"
                  className="mt-4 h-9 w-auto rounded-[0.75rem] gap-1.5 px-3"
                >
                  <Pencil size={14} />
                  Edit profile
                </Button>
              )}

              {/* Horizontal stats row */}
              <div className="mt-6 flex items-start divide-x divide-white/10 border-t border-white/10 pt-5">
                <div className="flex-1 pr-4">
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Destinations
                  </p>
                  <p className="mt-1 font-display text-[1.9rem] font-bold leading-none tracking-[-0.04em] text-white drop-shadow-md">
                    {countryPins.length}
                  </p>
                </div>
                <div className="flex-1 px-4">
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Total Trips
                  </p>
                  <p className="mt-1 font-display text-[1.9rem] font-bold leading-none tracking-[-0.04em] text-white drop-shadow-md">
                    {archivedTrips.length}
                  </p>
                </div>
                <div className="flex-1 pl-4">
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/45">
                    Saved
                  </p>
                  <p className="mt-1 font-display text-[1.9rem] font-bold leading-none tracking-[-0.04em] text-white drop-shadow-md">
                    {String(trips.length).padStart(2, "0")}
                  </p>
                </div>
              </div>
            </div>
          </Surface>

          {/* Map Card */}
          <Surface
            as="section"
            variant="glass"
            padding="none"
            radius="2xl"
            className="overflow-hidden shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 pt-5 pb-4">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#D97757]">
                  Personal Atlas
                </p>
                <h2 className="mt-1.5 text-xl font-semibold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:text-2xl">
                  Countries you've been
                </h2>
              </div>
            </div>

            {/* Map */}
            <div className="relative h-[16rem] sm:h-[20rem] lg:h-[22rem]">
              <Suspense
                fallback={
                  <div className="flex h-full items-center justify-center text-sm font-medium text-white/60">
                    Loading traveler atlas…
                  </div>
                }
              >
                <WorldMap
                  pins={countryPins}
                  onPinClick={() => {}}
                  className="h-full w-full"
                />
              </Suspense>

              {!isLoadingTrips && !countryPins.length && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-md rounded-[1.25rem] border border-white/15 bg-white/10 px-5 py-4 text-center backdrop-blur-xl shadow-2xl">
                    <p className="font-display text-[1.5rem] leading-none tracking-[-0.04em] text-white drop-shadow-lg">
                      Your atlas is still blank.
                    </p>
                    <p className="mt-2 text-sm leading-6 text-white/70">
                      Save trips with destination details and your visited
                      countries will appear here automatically.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom info bar */}
            <div className="flex items-stretch border-t border-white/10">
              <div className="flex-1 px-5 py-3">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Region Spotlight
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-white">
                  {regionSpotlight}
                </p>
              </div>
              <div className="flex-1 border-l border-white/10 px-5 py-3">
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Latest Stop
                </p>
                <p className="mt-0.5 truncate text-sm font-bold text-white">
                  {latestStopDestination}
                </p>
              </div>
            </div>
          </Surface>
        </div>

        {/* STATS ROW */}
        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ProfileStatCard
            icon={<Globe2 size={20} />}
            iconBackgroundClassName="bg-[rgba(72,131,126,0.22)]"
            iconColorClassName="text-[rgba(72,200,180,0.92)]"
            label="Countries"
            value={countryPins.length}
          />
          <ProfileStatCard
            icon={<Route size={20} />}
            iconBackgroundClassName="bg-[rgba(217,102,58,0.22)]"
            iconColorClassName="text-[rgba(240,130,80,0.95)]"
            label="Trips"
            value={archivedTrips.length}
          />
          <ProfileStatCard
            icon={<MapPinned size={20} />}
            iconBackgroundClassName="bg-[rgba(199,140,47,0.22)]"
            iconColorClassName="text-[rgba(220,170,60,0.95)]"
            label="Stops"
            value={tripActivities}
          />
          <ProfileStatCard
            icon={<Clock3 size={20} />}
            iconBackgroundClassName="bg-[rgba(80,100,190,0.22)]"
            iconColorClassName="text-[rgba(140,165,235,0.95)]"
            label="Total Days"
            value={totalTripDays}
          />
        </div>

        {/* ARCHIVE FEED */}
        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-[#D97757]">
                Archive Feed
              </p>
              <h2 className="mt-1.5 text-2xl font-semibold leading-[1.1] tracking-tight text-white drop-shadow-lg sm:text-3xl">
                Resume your journeys
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goHome}
                className="flex items-center gap-1.5 rounded-full bg-[#D97757] px-4 py-2 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-[#C66546] active:scale-95"
              >
                <Plus size={15} />
                New Trip
              </button>
              <button
                type="button"
                onClick={openSavedTrips}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
              >
                View All
              </button>
            </div>
          </div>

          {isLoadingTrips ? (
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-5 py-10 text-center backdrop-blur-sm">
              <p className="font-display text-[1.7rem] leading-none tracking-[-0.04em] text-white drop-shadow-lg">
                Loading your archive.
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/70">
                Syncing saved trips from the backend.
              </p>
            </div>
          ) : archivedTrips.length ? (
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {archivedTrips.map((trip) => {
                const itinerary = trip.currentItinerary;
                const country = getTripCountry(trip);
                const coverImage = tripImages[trip.id]?.url;
                const stopCount = getTripStopCount(itinerary);

                return (
                  <div key={trip.id} className="w-[21rem] shrink-0">
                    <SavedTripCard
                      trip={trip}
                      coverImage={coverImage}
                      badgeText={country || "Saved trip"}
                      metadataLabel={`${itinerary?.totalDays ?? 0} day plan`}
                      metadataSecondary={`Updated ${formatTripDate(trip.updatedAt)}`}
                      stopCountLabel={formatStopCountLabel(stopCount)}
                      onOpen={() => openTrip(trip.id)}
                      onDelete={(event) => {
                        event.stopPropagation();
                        deleteTrip(trip.id);
                      }}
                      variant="full"
                    />
                  </div>
                );
              })}

              {/* Create new story placeholder */}
              <button
                type="button"
                onClick={goHome}
                className="flex w-[18rem] shrink-0 flex-col items-center justify-center gap-3 rounded-[1.25rem] border border-dashed border-white/20 bg-white/5 py-16 transition-colors hover:bg-white/10"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10">
                  <Plus size={22} className="text-white/50" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-white/60">
                    Create New Story
                  </p>
                  <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/35">
                    Unlimited drafts available
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="rounded-[1.25rem] border border-white/10 bg-white/5 px-5 py-10 text-center backdrop-blur-sm">
              <p className="font-display text-[1.8rem] leading-none tracking-[-0.04em] text-white drop-shadow-lg">
                Nothing saved yet.
              </p>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/70">
                Generate your first itinerary and it will land here as part of
                your personal archive, ready to reopen anytime.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProfileRoute;
