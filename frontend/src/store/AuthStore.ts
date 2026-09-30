import axios from "axios";
import { create } from "zustand";
import { setAccessToken } from "../services/jwt.service";
import { User } from "@server/schemas/users";
import { SERVER_URL } from "../lib/serverUrl";

export type SafeUser = Omit<User, "password">;

const API_BASE = SERVER_URL;

// Keep in sync with ACCESS_TOKEN_EXPIRY in routes/utils.ts.
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_MARGIN_MS = 60 * 1000;

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function clearRefreshTimer() {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = null;
}

function scheduleRefresh(refreshSession: () => void) {
  clearRefreshTimer();
  refreshTimer = setTimeout(
    refreshSession,
    ACCESS_TOKEN_TTL_MS - REFRESH_MARGIN_MS,
  );
}

const useAuthStore = create<{
  user: SafeUser | null;
  authLoading: boolean;
  tokenLoading: boolean;
  setUser: (args: SafeUser) => void;
  logoutService: () => void;
  loginService: (email: string, password: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}>((set, get) => ({
  user: null,
  authLoading: false,
  tokenLoading: true,
  setUser: (args) => set({ user: args }),
  logoutService: () => {
    clearRefreshTimer();
    setAccessToken(null);
    set({ user: null, authLoading: false, tokenLoading: false });
    axios
      .post(`${API_BASE}/api/v0/user/logout`, null, { withCredentials: true })
      .catch((err) => console.log(err));
  },
  loginService: async (email, password) => {
    set({ authLoading: true });
    try {
      const res = await axios.post(
        `${API_BASE}/api/v0/user/login`,
        { email, password },
        { withCredentials: true },
      );
      if (res.data.result?.user && res.data.result?.accessToken) {
        setAccessToken(res.data.result.accessToken);
        scheduleRefresh(() => get().refreshSession());
        set({ user: res.data.result?.user, authLoading: false });
        return true;
      } else {
        set({ authLoading: false, user: null });
        return false;
      }
    } catch (err) {
      console.log(err);
      set({ authLoading: false });
      return false;
    }
  },
  // Called on app load and on a timer before expiry to silently exchange the
  // httpOnly refresh-token cookie for a fresh in-memory access token.
  refreshSession: async () => {
    try {
      const res = await axios.post(
        `${API_BASE}/api/v0/user/refresh`,
        null,
        { withCredentials: true },
      );
      if (res.data.result?.user && res.data.result?.accessToken) {
        setAccessToken(res.data.result.accessToken);
        scheduleRefresh(() => get().refreshSession());
        set({ user: res.data.result?.user, tokenLoading: false });
      } else {
        set({ tokenLoading: false, user: null });
      }
    } catch (err) {
      console.log(err);
      get().logoutService();
    }
  },
}));

export default useAuthStore;

