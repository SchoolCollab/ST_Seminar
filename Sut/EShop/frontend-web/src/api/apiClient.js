import axios from 'axios'

// Centralized axios instance so tests (Pact) can point it at a mock server.
// Base URL is overridable via VITE_API_BASE_URL for dev / test environments.
// Optional chaining on `env` guards Jest, where babel-plugin-transform-vite-meta-env
// rewrites `import.meta.env` to `process.env` and it may be undefined.
const apiClient = axios.create({
    baseURL: import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3000',
})

export default apiClient
