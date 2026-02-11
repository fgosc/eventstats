import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthProvider";
import { LoginPage } from "./pages/LoginPage";
import { EventListPage } from "./pages/EventListPage";
import { EventFormPage } from "./pages/EventFormPage";
import type { ReactNode } from "react";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <p>読み込み中...</p>;
  if (!isAuthenticated) return <Navigate to="/login" />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <p>読み込み中...</p>;

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <EventListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/:eventId/edit"
        element={
          <ProtectedRoute>
            <EventFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/events/new"
        element={
          <ProtectedRoute>
            <EventFormPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
