import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import * as schoolsApi from "../api/schools";

const FeatureContext = createContext(null);

// Effective feature configuration for the authenticated School Admin's
// school. Fetched once per session from GET /schools/{id}/features (the
// server-side source of truth) and refreshed via refresh() when the session
// changes or a consumer needs fresh state. Non-admin roles get features=null
// (their access is role-checked and enforced by the backend per request).
export function FeatureProvider({ children }) {
  const { user } = useAuth();
  const schoolId = user?.role === "admin" ? user.schoolId : null;
  const [features, setFeatures] = useState(null);
  const [loading, setLoading] = useState(!!schoolId);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!schoolId) {
      setFeatures(null);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await schoolsApi.getFeatures(schoolId);
      setFeatures(data);
      setError(null);
    } catch (err) {
      // Fail closed: an unreadable config must not surface gated features.
      setFeatures(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <FeatureContext.Provider value={{ features, loading, error, refresh }}>
      {children}
    </FeatureContext.Provider>
  );
}

export function useFeatures() {
  const ctx = useContext(FeatureContext);
  if (!ctx) throw new Error("useFeatures must be used within FeatureProvider");
  return ctx;
}
