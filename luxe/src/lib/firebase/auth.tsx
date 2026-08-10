"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, onIdTokenChanged } from "firebase/auth";
import { auth } from "./client";

export type Role = "rider" | "driver" | "admin" | null;

interface AuthContextType {
  user: User | null;
  role: Role;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        try {
          const idTokenResult = await currentUser.getIdTokenResult(true);
          const customRole = idTokenResult.claims.role as Role | undefined;
          setRole(customRole || "rider"); // default to rider if claim missing during propagation
        } catch (error) {
          console.error("Error fetching custom claims:", error);
          setRole(null);
        }
      } else {
        setRole(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
