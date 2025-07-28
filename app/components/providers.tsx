
'use client'

import { ThemeProvider } from "next-themes";
import { ConvexProvider } from "convex/react";
import { convex } from "../lib/convex";
import { Toaster } from "./ui/toaster";
import { Toaster as SonnerToaster } from "./ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster />
        <SonnerToaster />
      </ThemeProvider>
    </ConvexProvider>
  );
}
