import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Navigate, RouterProvider, createBrowserRouter } from "react-router-dom";
import { AppLayout } from "./AppLayout";
import { EventItemSummaryPage } from "./pages/EventItemSummaryPage";
import { EventRedirect } from "./pages/EventRedirect";
import { IndexRedirect } from "./pages/IndexRedirect";
import { QuestPage } from "./pages/QuestPage";
import { ReportersPage } from "./pages/ReportersPage";

const router = createBrowserRouter(
  [
    {
      element: <AppLayout />,
      children: [
        { index: true, element: <IndexRedirect /> },
        { path: "events/:eventId", element: <EventRedirect /> },
        { path: "events/:eventId/quests/:questId", element: <QuestPage /> },
        { path: "events/:eventId/reporters", element: <ReportersPage /> },
        { path: "events/:eventId/event-items", element: <EventItemSummaryPage /> },
        { path: "*", element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: "/eventstats" },
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
