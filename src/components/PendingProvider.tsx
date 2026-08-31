"use client";

import {
  createContext,
  useContext,
  useTransition,
  type ReactNode,
  type TransitionStartFunction,
} from "react";
import { FeltLoader } from "./FeltLoader";

const PendingContext = createContext<{
  pending: boolean;
  start: TransitionStartFunction;
} | null>(null);

export function PendingProvider({ children }: { children: ReactNode }) {
  const [pending, start] = useTransition();
  return (
    <PendingContext.Provider value={{ pending, start }}>
      {children}
      {pending ? <FeltLoader overlay /> : null}
    </PendingContext.Provider>
  );
}

export function usePendingTransition(): [
  boolean,
  TransitionStartFunction,
] {
  const ctx = useContext(PendingContext);
  const local = useTransition();
  if (!ctx) return local;
  return [ctx.pending, ctx.start];
}
