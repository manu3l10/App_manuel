import { createBrowserRouter } from "react-router";
import { Home } from "./pages/Home";
import { Community } from "./pages/Community";
import { Calendar } from "./pages/Calendar";
import { Itineraries } from "./pages/Itineraries";
import { Favorites } from "./pages/Favorites";
import { Profile } from "./pages/Profile";
import { Settings } from "./pages/Settings";
import { SupabaseTest } from "./pages/SupabaseTest";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Home,
  },
  {
    path: "/community",
    Component: Community,
  },
  {
    path: "/calendar",
    Component: Calendar,
  },
  {
    path: "/itineraries",
    Component: Itineraries,
  },
  {
    path: "/favorites",
    Component: Favorites,
  },
  {
    path: "/profile",
    Component: Profile,
  },
  {
    path: "/settings",
    Component: Settings,
  },
  {
    path: "/test-supabase",
    Component: SupabaseTest,
  },
]);
