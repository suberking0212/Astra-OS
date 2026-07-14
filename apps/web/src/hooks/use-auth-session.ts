"use client";

import { useContext } from "react";

import { AuthContext } from "@/components/auth/auth-provider";

export function useAuthSession() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthSession must be used inside AuthProvider.");
  }
  return context;
}
