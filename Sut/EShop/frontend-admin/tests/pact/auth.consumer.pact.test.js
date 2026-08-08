/**
 * Consumer contract - Admin authentication.
 * Covers: POST /api/login.
 */
const { provider, M } = require('./pact-setup')
const apiClient = require('../../src/api/apiClient').default

describe('Admin auth contract', () => {
    afterEach(() => {
        delete apiClient.defaults.headers.common.Authorization
    })

    it('POST /api/login returns an admin JWT and admin role', async () => {
        provider
            .given('admin user admin@eshop.com exists')
            .uponReceiving('an admin login request')
            .withRequest({
                method: 'POST',
                path: '/api/login',
                body: {
                    email: 'admin@eshop.com',
                    password: 'Admin123!',
                },
            })
            .willRespondWith({
                status: 200,
                body: {
                    message: M.string('Login successful'),
                    token: M.regex(/^[\w-]+\.[\w-]+\.[\w-]+$/, 'aaa.bbb.ccc'),
                    user: {
                        id: M.integer(1),
                        name: M.string('Admin User'),
                        email: M.string('admin@eshop.com'),
                        role: M.string('admin'),
                    },
                },
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.post('/api/login', {
                email: 'admin@eshop.com',
                password: 'Admin123!',
            })
            expect(res.status).toBe(200)
            expect(res.data.user.role).toBe('admin')
            expect(typeof res.data.token).toBe('string')
        })
    })
})
