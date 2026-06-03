export const routes = {
  home:    ()           => "/" as const,
  trips:   ()           => "/trips" as const,
  profile: ()           => "/profile" as const,
  trip:    (id: string) => `/t/${id}` as const,
  publicTrip: (id: string) => `/s/${id}` as const,
} as const;
