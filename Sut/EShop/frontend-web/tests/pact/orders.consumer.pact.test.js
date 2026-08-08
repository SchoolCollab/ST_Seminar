/**
 * Consumer contract — Order history.
 * Covers: GET /api/orders/my-orders, PUT /api/orders/:id/cancel.
 */
const { provider, M } = require('./pact-setup')
const apiClient = require('../../src/api/apiClient').default

describe('Order history contract', () => {
    it('GET /api/orders/my-orders returns the current user order history', async () => {
        provider
            .given('authenticated user has pending order 1')
            .uponReceiving('a request for the current user order history')
            .withRequest({
                method: 'GET',
                path: '/api/orders/my-orders',
                headers: { Authorization: 'Bearer placeholder.token.value' },
            })
            .willRespondWith({
                status: 200,
                body: M.eachLike({
                    id: M.integer(1),
                    total_amount: M.integer(30000000),
                    status: M.string('pending'),
                    created_at: M.string('2026-08-08 00:00:00'),
                }),
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.get('/api/orders/my-orders', {
                headers: { Authorization: 'Bearer placeholder.token.value' },
            })
            expect(res.status).toBe(200)
            expect(Array.isArray(res.data)).toBe(true)
            expect(res.data[0]).toHaveProperty('id')
            expect(res.data[0]).toHaveProperty('status')
            expect(res.data[0]).toHaveProperty('total_amount')
            expect(res.data[0]).toHaveProperty('created_at')
        })
    })

    it('PUT /api/orders/:id/cancel cancels a pending order', async () => {
        provider
            .given('authenticated user has pending order 1')
            // STT-B-01: pending -> canceled through the user cancel endpoint.
            .uponReceiving('a request to cancel pending order 1 (STT-B-01)')
            .withRequest({
                method: 'PUT',
                path: '/api/orders/1/cancel',
                headers: {
                    Authorization: 'Bearer placeholder.token.value',
                },
            })
            .willRespondWith({
                status: 200,
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.put(
                '/api/orders/1/cancel',
                undefined,
                { headers: { Authorization: 'Bearer placeholder.token.value' } }
            )
            expect(res.status).toBe(200)
        })
    })

    it('PUT /api/orders/:id/cancel cancels a confirmed order', async () => {
        provider
            .given('authenticated user has confirmed order 1')
            // STT-B-02: confirmed -> canceled through the user cancel endpoint.
            .uponReceiving('a request to cancel confirmed order 1 (STT-B-02)')
            .withRequest({
                method: 'PUT',
                path: '/api/orders/1/cancel',
                headers: {
                    Authorization: 'Bearer placeholder.token.value',
                },
            })
            .willRespondWith({
                status: 200,
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.put(
                '/api/orders/1/cancel',
                undefined,
                { headers: { Authorization: 'Bearer placeholder.token.value' } }
            )
            expect(res.status).toBe(200)
        })
    })

    it('PUT /api/orders/:id/cancel cancels a shipping order', async () => {
        provider
            .given('authenticated user has shipping order 1')
            // STT-B-03: shipping -> canceled through the user cancel endpoint.
            .uponReceiving('a request to cancel shipping order 1 (STT-B-03)')
            .withRequest({
                method: 'PUT',
                path: '/api/orders/1/cancel',
                headers: {
                    Authorization: 'Bearer placeholder.token.value',
                },
            })
            .willRespondWith({
                status: 200,
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.put(
                '/api/orders/1/cancel',
                undefined,
                { headers: { Authorization: 'Bearer placeholder.token.value' } }
            )
            expect(res.status).toBe(200)
        })
    })
})
