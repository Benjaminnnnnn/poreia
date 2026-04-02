import React from "react";
import AppAuthShell from "@/features/auth/components/AppAuthShell";

const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <AppAuthShell>{children}</AppAuthShell>;
};

export default AppShell;
