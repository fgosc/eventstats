import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  signIn,
  signOut,
  getCurrentUser,
  type SignInInput,
} from "aws-amplify/auth";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (input: SignInInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>(null!);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((user) => {
        setIsAuthenticated(true);
        setUsername(user.username);
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (input: SignInInput) => {
    const result = await signIn(input);
    if (result.isSignedIn) {
      const user = await getCurrentUser();
      setIsAuthenticated(true);
      setUsername(user.username);
    }
  };

  const logout = async () => {
    await signOut();
    setIsAuthenticated(false);
    setUsername(null);
  };

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, isLoading, username, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
