import React, {
  createContext,
  startTransition,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

interface AppNavigationContextValue {
  actions: {
    goHome: () => void;
    navigate: (path: string) => void;
    openProfile: () => void;
    openTrip: (tripId: string) => void;
  };
  state: {
    currentPath: string;
    currentTripId: string | null;
    isHomePage: boolean;
    isProfilePage: boolean;
  };
}

const AppNavigationContext = createContext<AppNavigationContextValue | null>(
  null,
);

const getTripIdFromPath = (path: string): string | null => {
  const cleanPath = path.startsWith("#") ? path.substring(1) : path;
  const match = cleanPath.match(/^\/t\/(.+)$/);
  return match ? match[1] : null;
};

export const AppNavigationProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() =>
    typeof window === "undefined" ? "/" : window.location.hash || "/",
  );

  const navigate = useCallback((path: string) => {
    const hashPath = path.startsWith("/") ? `#${path}` : `#/${path}`;
    if (window.location.hash !== hashPath) {
      window.location.hash = hashPath;
    }

    startTransition(() => {
      setCurrentPath(hashPath);
    });
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPath(window.location.hash || "/");
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const currentTripId = getTripIdFromPath(currentPath);
  const cleanPath = currentPath.startsWith("#")
    ? currentPath.substring(1)
    : currentPath;
  const isProfilePage = cleanPath === "/profile";
  const isHomePage = !currentTripId && !isProfilePage;

  const actions = useMemo<AppNavigationContextValue["actions"]>(
    () => ({
      goHome: () => navigate("/"),
      navigate,
      openProfile: () => navigate("/profile"),
      openTrip: (tripId: string) => navigate(`/t/${tripId}`),
    }),
    [navigate],
  );

  const state = useMemo<AppNavigationContextValue["state"]>(
    () => ({
      currentPath,
      currentTripId,
      isHomePage,
      isProfilePage,
    }),
    [currentPath, currentTripId, isHomePage, isProfilePage],
  );

  const value = useMemo<AppNavigationContextValue>(
    () => ({
      actions,
      state,
    }),
    [actions, state],
  );

  return (
    <AppNavigationContext.Provider value={value}>
      {children}
    </AppNavigationContext.Provider>
  );
};

export const useAppNavigation = () => {
  const context = use(AppNavigationContext);

  if (!context) {
    throw new Error(
      "useAppNavigation must be used within AppNavigationProvider.",
    );
  }

  return context;
};
