import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
});

// Add typed wrapper functions here as endpoints come online, e.g.:
// export const getSchemes = () => api.get<Scheme[]>("/api/schemes");
