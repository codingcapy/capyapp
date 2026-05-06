import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TOKEN_KEY = "jwt_access_token";

export function getSession() {
  return localStorage.getItem(TOKEN_KEY);
}

export function authHeaders() {
  const token = getSession();
  return token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
}
