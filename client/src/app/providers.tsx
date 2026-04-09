import React from "react";
import { AppNavigationProvider } from "@/app/navigation";
import { TooltipProvider } from "@/components/ui/Tooltip";

const AppProviders: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <AppNavigationProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </AppNavigationProvider>
  );
};

export default AppProviders;
