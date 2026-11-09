// Same-origin /api on live (nginx → backend). Override only for local Vite if needed.
export const API = import.meta.env.VITE_API_BASE_URL || '/api'
