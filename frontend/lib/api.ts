import axios from "axios";

export const api = axios.create({
  // Pointing back to live Render backend for production / GitHub push
  baseURL: "https://setu-backend-hhsc.onrender.com/", 
});

// Add typed wrapper functions here as endpoints come online, e.g.:
// export const getSchemes = () => api.get<Scheme[]>("/api/schemes");