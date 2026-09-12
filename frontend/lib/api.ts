import axios from "axios";

// Checks for local URL first, falls back to live Render backend for production
const baseURL = process.env.NEXT_PUBLIC_API_URL || "https://setu-backend-hhsc.onrender.com";

export const api = axios.create({
  baseURL: baseURL,
});

// Add typed wrapper functions here as endpoints come online, e.g.:
// export const getSchemes = () => api.get<Scheme[]>("/api/schemes");