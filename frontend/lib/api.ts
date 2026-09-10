import axios from "axios";

export const api = axios.create({
  // Hardcoding this temporarily guarantees perfect routing for the pitch
  baseURL: "https://setu-backend-hhsc.onrender.com/", 
});

// Add typed wrapper functions here as endpoints come online, e.g.:
// export const getSchemes = () => api.get<Scheme[]>("/api/schemes");