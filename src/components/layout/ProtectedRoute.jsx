import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    if (user.role === "staff") {
      return (
        <Navigate
          to="/staff/broadcast"
          replace
          state={{ accessDenied: true, attemptedPath: location.pathname }}
        />
      );
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
