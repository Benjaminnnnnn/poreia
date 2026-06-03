export const tripQueryKeys = {
  all: ["trips"] as const,
  lists: () => [...tripQueryKeys.all, "list"] as const,
};
