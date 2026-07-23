"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Shared expand/collapse state for the Module Rail.
 *
 * Previously this lived privately inside `ModuleRail`. It's lifted to a context
 * so a second consumer — the `WorkspaceSubnavBar` at the top of the content
 * area — can react to it: when the rail is collapsed to icons, the sub-pages of
 * the active workspace would otherwise be hidden, so the subnav bar surfaces
 * them horizontally instead. The preference is remembered across sessions.
 */
const RAIL_STORAGE_KEY = "sobi:rail-expanded";

interface RailState {
  expanded: boolean;
  toggle: () => void;
}

const RailStateContext = createContext<RailState | null>(null);

export function RailStateProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate browser preference after SSR
      setExpanded(localStorage.getItem(RAIL_STORAGE_KEY) === "1");
    } catch {
      // Storage may be blocked in privacy modes; collapsed remains a safe default.
    }
  }, []);

  function toggle() {
    setExpanded((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(RAIL_STORAGE_KEY, next ? "1" : "0");
      } catch {
        // The in-memory preference still works for the current page session.
      }
      return next;
    });
  }

  return (
    <RailStateContext.Provider value={{ expanded, toggle }}>
      {children}
    </RailStateContext.Provider>
  );
}

export function useRailState(): RailState {
  const value = useContext(RailStateContext);
  if (!value) {
    throw new Error("useRailState must be used within a RailStateProvider");
  }
  return value;
}
