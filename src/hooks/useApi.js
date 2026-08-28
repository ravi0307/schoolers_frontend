import { useState, useEffect, useCallback } from "react";
import { apiErrorMessage } from "../api/client";

/**
 * useApi(fetcherFn, deps) — calls fetcherFn() on mount / when deps change,
 * tracks {data, loading, error}, and exposes refetch() for after mutations.
 */
export function useApi(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const run = useCallback(() => {
    setLoading(true);
    setError(null);
    fetcher()
      .then(setData)
      .catch((err) => setError(apiErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { data, loading, error, refetch: run, setData };
}
