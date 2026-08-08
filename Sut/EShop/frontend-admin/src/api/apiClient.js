import axios from 'axios'

// Centralized axios instance so Pact tests can point the admin client at a mock server.
const apiClient = axios.create({
    baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000',
})

export default apiClient
