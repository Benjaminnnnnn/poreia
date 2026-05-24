"use client";

import dynamic from "next/dynamic";
import React from "react";

const AppProviders = dynamic(() => import("@/app/AppProviders"), { ssr: false });

export default function ClientRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppProviders>{children}</AppProviders>;
}
