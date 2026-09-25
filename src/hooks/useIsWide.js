import { useEffect, useState } from "react";

export function useIsWide(breakpoint = 900) {
  const [isWide, setIsWide] = useState(
    () => typeof window !== "undefined" && window.matchMedia(`(min-width: ${breakpoint}px)`).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`);
    const handler = (event) => setIsWide(event.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [breakpoint]);

  return isWide;
}