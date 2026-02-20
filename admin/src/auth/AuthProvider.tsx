import { getCurrentUser, type SignInInput, signIn, signOut } from "aws-amplify/auth";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";

interface AuthContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  username: string | null;
  login: (input: SignInInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>(null!);

/** 認証コンテキスト（isAuthenticated, username, login, logout など）を取得するカスタムフック。 */
export function useAuth() {
  return useContext(AuthContext);
}

/**
 * AWS Amplify を使った認証状態を管理し、子コンポーネントに提供するプロバイダー。
 * マウント時に getCurrentUser() で既存セッションを確認し、認証状態を初期化する。
 * login / logout を AuthContext 経由で子コンポーネントに公開する。
 */
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
    <AuthContext.Provider value={{ isAuthenticated, isLoading, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
