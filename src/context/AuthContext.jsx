import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api.js";
import { AuthContext } from "./AuthContext.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [notification, setNotification] = useState("");

  const notify = useCallback((message) => setNotification(message), []);
  const dismissNotification = useCallback(() => setNotification(""), []);

  const refreshUser = useCallback(async () => {
    try {
      const result = await api("/auth/me");
      setUser(result.user);
      setAuthError("");
      return result.user;
    } catch (error) {
      if (error.status === 401) {
        setUser(null);
        setAuthError("");
        return null;
      }
      setAuthError(error.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api("/auth/me")
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch((error) => {
        if (active && error.status !== 401) setAuthError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const signOut = useCallback(async () => {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
    setNotification("");
  }, []);

  const value = useMemo(
    () => ({ user, loading, authError, refreshUser, signOut, notification, notify, dismissNotification }),
    [user, loading, authError, refreshUser, signOut, notification, notify, dismissNotification]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
