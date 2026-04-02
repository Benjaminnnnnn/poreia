import React from "react";
import { AppNavigationProvider } from "@/app/navigation";

const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <AppNavigationProvider>{children}</AppNavigationProvider>;
};

export default AppProviders;
