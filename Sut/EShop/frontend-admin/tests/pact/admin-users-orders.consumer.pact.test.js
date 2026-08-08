/**
 * Consumer contract - Admin user and order management.
 * Covers: GET/DELETE admin users, GET admin orders, PUT admin order status.
 */
const { provider, M } = require('./pact-setup')
const apiClient = require('../../src/api/apiClient').default

function useAdminMock(mock) {
    apiClient.defaults.baseURL = mock.url
    apiClient.defaults.headers.common.Authorization = 'Bearer placeholder.token.value'
}

describe('Admin users and orders contract', () => {
    afterEach(() => {
        delete apiClient.defaults.headers.common.Authorization
    })

    it('GET /api/admin/users returns users for the admin table', async () => {
        provider
            .given('authenticated as admin with users')
            .uponReceiving('a request for the admin user list')
            .withRequest({ method: 'GET', path: '/api/admin/users' })
            .willRespondWith({
                status: 200,
                body: M.eachLike({
                    id: M.integer(2),
                    email: M.string('customer@example.com'),
                    role: M.string('user'),
                }),
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.get('/api/admin/users')
            expect(res.status).toBe(200)
            expect(res.data[0]).toHaveProperty('email')
            expect(res.data[0]).toHaveProperty('role')
        })
    })

    it('DELETE /api/admin/users/:id deletes a user', async () => {
        provider
            .given('authenticated as admin with disposable admin user 2')
            .uponReceiving('a request to delete user 2')
            .withRequest({ method: 'DELETE', path: '/api/admin/users/2' })
            .willRespondWith({
                status: 200,
                body: { message: M.string('User deleted') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.delete('/api/admin/users/2')
            expect(res.status).toBe(200)
        })
    })

    it('GET /api/admin/orders returns orders for the admin table', async () => {
        provider
            .given('authenticated as admin with orders')
            .uponReceiving('a request for the admin order list')
            .withRequest({ method: 'GET', path: '/api/admin/orders' })
            .willRespondWith({
                status: 200,
                body: M.eachLike({
                    id: M.integer(1),
                    user_id: M.integer(2),
                    total_amount: M.integer(30000000),
                    status: M.string('pending'),
                    shipping_address: M.string('123 Le Loi, Q1, HCMC'),
                    created_at: M.string('2026-01-01 10:00:00'),
                    user_name: M.string('Customer One'),
                }),
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.get('/api/admin/orders')
            expect(res.status).toBe(200)
            expect(res.data[0]).toHaveProperty('user_name')
            expect(res.data[0]).toHaveProperty('status')
        })
    })

    it('PUT /api/admin/orders/:id/status rejects canceled to delivered', async () => {
        provider
            .given('authenticated as admin with canceled order 1')
            .uponReceiving('a request to mark canceled order 1 as delivered')
            .withRequest({
                method: 'PUT',
                path: '/api/admin/orders/1/status',
                body: { status: M.string('delivered') },
            })
            .willRespondWith({
                status: 400,
                body: {
                    error: M.string(
                        'Invalid state transition from canceled to delivered'
                    ),
                },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            await expect(
                apiClient.put('/api/admin/orders/1/status', {
                    status: 'delivered',
                })
            ).rejects.toMatchObject({
                response: {
                    status: 400,
                    data: {
                        error: 'Invalid state transition from canceled to delivered',
                    },
                },
            })
        })
    })

    it('PUT /api/admin/orders/:id/status confirms a pending order', async () => {
        provider
            .given('authenticated as admin with pending order 1')
            // STT-A-01: pending -> confirmed.
            .uponReceiving('a request to mark pending order 1 as confirmed (STT-A-01)')
            .withRequest({
                method: 'PUT',
                path: '/api/admin/orders/1/status',
                body: { status: M.string('confirmed') },
            })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Order status updated') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.put('/api/admin/orders/1/status', {
                status: 'confirmed',
            })
            expect(res.status).toBe(200)
        })
    })

    it('PUT /api/admin/orders/:id/status cancels a pending order', async () => {
        provider
            .given('authenticated as admin with pending order 1')
            // STT-A-05: pending -> canceled.
            .uponReceiving('a request to mark pending order 1 as canceled (STT-A-05)')
            .withRequest({
                method: 'PUT',
                path: '/api/admin/orders/1/status',
                body: { status: M.string('canceled') },
            })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Order status updated') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.put('/api/admin/orders/1/status', {
                status: 'canceled',
            })
            expect(res.status).toBe(200)
        })
    })

    it('PUT /api/admin/orders/:id/status ships a confirmed order', async () => {
        provider
            .given('authenticated as admin with confirmed order 1')
            // STT-A-08: confirmed -> shipping.
            .uponReceiving('a request to mark confirmed order 1 as shipping (STT-A-08)')
            .withRequest({
                method: 'PUT',
                path: '/api/admin/orders/1/status',
                body: { status: M.string('shipping') },
            })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Order status updated') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.put('/api/admin/orders/1/status', {
                status: 'shipping',
            })
            expect(res.status).toBe(200)
        })
    })

    it('PUT /api/admin/orders/:id/status cancels a confirmed order', async () => {
        provider
            .given('authenticated as admin with confirmed order 1')
            // STT-A-10: confirmed -> canceled.
            .uponReceiving('a request to mark confirmed order 1 as canceled (STT-A-10)')
            .withRequest({
                method: 'PUT',
                path: '/api/admin/orders/1/status',
                body: { status: M.string('canceled') },
            })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Order status updated') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.put('/api/admin/orders/1/status', {
                status: 'canceled',
            })
            expect(res.status).toBe(200)
        })
    })

    it('PUT /api/admin/orders/:id/status delivers a shipping order', async () => {
        provider
            .given('authenticated as admin with shipping order 1')
            // STT-A-14: shipping -> delivered.
            .uponReceiving('a request to mark shipping order 1 as delivered (STT-A-14)')
            .withRequest({
                method: 'PUT',
                path: '/api/admin/orders/1/status',
                body: { status: M.string('delivered') },
            })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Order status updated') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.put('/api/admin/orders/1/status', {
                status: 'delivered',
            })
            expect(res.status).toBe(200)
        })
    })
})
