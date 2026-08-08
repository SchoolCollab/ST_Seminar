/**
 * Consumer contract — Authentication & Users.
 * Covers: POST /api/register, POST /api/login, GET /api/users/me, PUT /api/users/me.
 * Cross-ref: EShop_Defect.md (users/me leaks password, PUT accepts role — SEC-06).
 * Contracts intentionally do NOT include `password` or `role` on responses
 * so the desired shape drives verification, not the current buggy shape.
 */
const { provider, M } = require('./pact-setup')
const apiClient = require('../../src/api/apiClient').default

describe('Auth & Users contract', () => {
    it('POST /api/register creates a new user', async () => {
        provider
            .given('email not registered')
            .uponReceiving('a registration request')
            .withRequest({
                method: 'POST',
                path: '/api/register',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    name: 'Tester One',
                    email: 'tester.1@example.com',
                    password: 'TesterPass123!',
                },
            })
            .willRespondWith({
                status: 200,
                body: {
                    message: M.string('User registered successfully'),
                    id: M.integer(1),
                },
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.post('/api/register', {
                name: 'Tester One',
                email: 'tester.1@example.com',
                password: 'TesterPass123!',
            })
            expect(res.status).toBe(200)
            expect(res.data.id).toBeGreaterThan(0)
        })
    })

    it('POST /api/login returns a JWT and user profile', async () => {
        provider
            .given('user tester.1@example.com exists')
            .uponReceiving('a login request with correct credentials')
            .withRequest({
                method: 'POST',
                path: '/api/login',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    email: 'tester.1@example.com',
                    password: 'TesterPass123!',
                },
            })
            .willRespondWith({
                status: 200,
                body: {
                    message: M.string('Login successful'),
                    token: M.regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, 'aaa.bbb.ccc'),
                    user: {
                        id: M.integer(1),
                        email: M.string('tester.1@example.com'),
                        name: M.string('Tester One'),
                        role: M.string('user'),
                    },
                },
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.post('/api/login', {
                email: 'tester.1@example.com',
                password: 'TesterPass123!',
            })
            expect(res.status).toBe(200)
            expect(typeof res.data.token).toBe('string')
        })
    })

    it("GET /api/users/me returns the authenticated user's profile", async () => {
        provider
            .given('authenticated as tester.1')
            .uponReceiving("a request for the current user's profile")
            .withRequest({
                method: 'GET',
                path: '/api/users/me',
                headers: { Authorization: 'Bearer placeholder.token.value' },
            })
            .willRespondWith({
                status: 200,
                // NOTE: `password` intentionally excluded — provider currently leaks it
                // (see EShop_Defect.md). Failing verification here is a valid M6 hit.
                body: {
                    id: M.integer(1),
                    name: M.string('Tester One'),
                    email: M.string('tester.1@example.com'),
                    role: M.string('user'),
                },
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.get('/api/users/me', {
                headers: { Authorization: 'Bearer placeholder.token.value' },
            })
            expect(res.status).toBe(200)
            expect(res.data).not.toHaveProperty('password')
        })
    })

    it("PUT /api/users/me updates the current user's profile", async () => {
        provider
            .given('authenticated as tester.1')
            .uponReceiving('a profile update request')
            .withRequest({
                method: 'PUT',
                path: '/api/users/me',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer placeholder.token.value',
                },
                // NOTE: `role` intentionally NOT in the request body — provider
                // currently allows self-promotion (SEC-06). Contract locks the
                // intended request shape.
                body: {
                    name: M.string('Tester One'),
                    phone: M.string('0912345678'),
                    shipping_address: M.string('123 Le Loi, Q1, HCMC'),
                },
            })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Profile updated') },
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.put(
                '/api/users/me',
                {
                    name: 'Tester One',
                    phone: '0912345678',
                    shipping_address: '123 Le Loi, Q1, HCMC',
                },
                { headers: { Authorization: 'Bearer placeholder.token.value' } }
            )
            expect(res.status).toBe(200)
        })
    })
})
