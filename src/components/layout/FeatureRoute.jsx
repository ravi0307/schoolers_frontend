import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useFeatures } from "../../context/FeatureContext";
import { isFeatureEnabled } from "../../features/registry";

// Blocks direct navigation to a page whose feature is disabled for the
// school. Access rule: feature enabled for the user's school AND the user's
// role is authorized (role part stays in ProtectedRoute; this handles the
// feature part for School Admin sessions). Non-admin roles are not gated in
// the UI — the backend enforces their access per request.
export default function FeatureRoute({ feature, children }) {
  const { user } = useAuth();
  const { features, loading } = useFeatures();
  const location = useLocation();

  if (!feature || !["admin", "subadmin"].includes(user?.role)) return children;
  // Unknown config while loading: wait (nothing renders until known).
  if (loading) return null;
  if (!isFeatureEnabled(features, feature)) {
    return (
      <Navigate
        to="/admin/dashboard"
        replace
        state={{
          accessDenied: true,
          accessDeniedFeature: true,
          attemptedPath: location.pathname,
        }}
      />
    );
  }
  return children;
}
