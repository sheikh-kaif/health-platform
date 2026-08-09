import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import client from "../api/client";
import { connectSocket, disconnectSocket } from "../lib/socket";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("hp_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const persist = (token, userData) => {
    if (token) localStorage.setItem("hp_token", token);
    localStorage.setItem("hp_user", JSON.stringify(userData));
    setUser(userData);
  };

  useEffect(() => {
    const token = localStorage.getItem("hp_token");
    if (user && token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }
    return () => {
      if (!user) disconnectSocket();
    };
  }, [user]);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post("/auth/login", { email, password });
      persist(data.token, data.user);
      return data.user;
    } catch (err) {
      const message = err.response?.data?.message || "Login failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerPatient = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post("/auth/register/patient", payload);
      persist(data.token, data.user);
      return data.user;
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerDoctor = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post("/auth/register/doctor", payload);

      return data;
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const registerAmbulanceDriver = useCallback(async (payload) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post("/auth/register/ambulance", payload);
      persist(data.token, data.user);
      return data.user;
    } catch (err) {
      const message = err.response?.data?.message || "Registration failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(async (credential) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post("/auth/google", { credential });
      persist(data.token, data.user);
      return data.user;
    } catch (err) {
      const message = err.response?.data?.message || "Google sign-in failed";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("hp_token");
    localStorage.removeItem("hp_user");
    setUser(null);
  }, []);

  const refreshMe = useCallback(async () => {
    const { data } = await client.get("/auth/me");
    persist(null, data.user);
    return data;
  }, []);

  const forgotPassword = useCallback(async (email) => {
    const { data } = await client.post("/auth/forgot-password", { email });
    return data;
  }, []);

  const resetPassword = useCallback(async (token, password) => {
    const { data } = await client.post(`/auth/reset-password/${token}`, {
      password,
    });
    return data;
  }, []);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const { data } = await client.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return data;
  }, []);

  const verifyEmail = useCallback(async (token) => {
    const { data } = await client.get(`/auth/verify-email/${token}`);
    return data;
  }, []);

  const resendVerification = useCallback(async () => {
    const { data } = await client.post("/auth/resend-verification");
    return data;
  }, []);

  const updateProfileBasics = useCallback(async (payload) => {
    const { data } = await client.put("/auth/me", payload);
    persist(null, data.user);
    return data;
  }, []);

  const uploadAvatar = useCallback(async (file) => {
    const form = new FormData();
    form.append("photo", file);
    const { data } = await client.post("/auth/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    persist(null, data.user);
    return data;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        registerPatient,
        registerDoctor,
        registerAmbulanceDriver,
        loginWithGoogle,
        logout,
        refreshMe,
        forgotPassword,
        resetPassword,
        changePassword,
        verifyEmail,
        resendVerification,
        updateProfileBasics,
        uploadAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
