import { createContext, useContext, useState, useCallback, useEffect } from "react";
import * as authApi from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("schoolers_user");
    return raw ? JSON.parse(raw) : null;
  });

  // The school name and logo come from /auth/me rather than the login
  // response, and only once per session. It has to be a separate call
  // because the sidebar needs the branding for every role, but
  // GET /schools is master-only and GET /schools/{id} is master/admin-only.
  // A failure here must not log anyone out — the cached user still works,
  // the header just falls back to the portal label.
  useEffect(() => {
    if (!user?.userId) return;
    let cancelled = false;
    (async () => {
      try {
        const me = await authApi.me();
        if (cancelled) return;
        setUser((prev) => {
          if (!prev) return prev;
          if (
            prev.schoolName === me.school_name &&
            prev.schoolLogoUrl === me.school_logo_url
          ) {
            return prev;
          }
          const next = { ...prev, schoolName: me.school_name, schoolLogoUrl: me.school_logo_url };
          localStorage.setItem("schoolers_user", JSON.stringify(next));
          return next;
        });
      } catch {
        /* keep the cached session */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.userId]);

  const login = useCallback(async (username, password) => {
    const data = await authApi.login(username, password);
    localStorage.setItem("schoolers_access_token", data.access_token);
    localStorage.setItem("schoolers_refresh_token", data.refresh_token);
    const userObj = {
      userId: data.user_id,
      role: data.role,
      schoolId: data.school_id,
      linkedPersonId: data.linked_person_id,
      username: data.username || username,
      name: data.name || data.full_name || data.sender_name,
    };
    localStorage.setItem("schoolers_user", JSON.stringify(userObj));
    setUser(userObj);
    return userObj;
  }, []);

  const logout = useCallback(() => {
    localStorage.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
