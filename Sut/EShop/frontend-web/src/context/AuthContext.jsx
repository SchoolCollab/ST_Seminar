import React, { createContext, useState, useContext, useEffect } from "react";
import apiClient from "../api/apiClient";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      apiClient
        .get("/api/users/me")
        .then((res) => {
          setUser(res.data);
        })
        .catch(() => {
          logout();
        });
    } else {
      delete apiClient.defaults.headers.common["Authorization"];
    }
  }, [token]);

  const login = async (email, password) => {
    const res = await apiClient.post("/api/login", {
      email,
      password,
    });
    setToken(res.data.token);
    localStorage.setItem("token", res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
