/**
 * Consumer contract — Cart & Checkout.
 * Covers: POST /api/apply-coupon, POST /api/checkout, POST /api/coupon-usage.
 * Cross-ref: EShop_Defect.md (checkout trusts client total_amount, does not clear cart).
 */
const { provider, M } = require('./pact-setup')
const apiClient = require('../../src/api/apiClient').default

describe('Cart & Checkout contract', () => {
    it('POST /api/apply-coupon returns the discount data the checkout UI displays', async () => {
        provider
            .given('coupon SAVE10 exists for web checkout')
            .uponReceiving(
                'an apply-coupon request for SAVE10 [EXPECTED TO FAIL: corroborates known percent-formula defect]'
            )
            .withRequest({
                method: 'POST',
                path: '/api/apply-coupon',
                headers: { 'Content-Type': 'application/json' },
                body: {
                    code: 'SAVE10',
                    total_amount: 30000000,
                    user_id: 2,
                },
            })
            .willRespondWith({
                status: 200,
                body: {
                    success: true,
                    coupon_id: M.integer(1),
                    discount_amount: 3000000,
                    final_amount: 27000000,
                    message: M.string('Áp dụng thành công! Giảm 10%'),
                },
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.post('/api/apply-coupon', {
                code: 'SAVE10',
                total_amount: 30000000,
                user_id: 2,
            })
            expect(res.status).toBe(200)
            expect(res.data.coupon_id).toBeGreaterThan(0)
            expect(res.data.discount_amount).toBe(3000000)
            expect(res.data.final_amount).toBe(27000000)
        })
    })

    it('POST /api/checkout creates an order', async () => {
        provider
            .given('authenticated user has 1 item worth 30000000')
            .uponReceiving('a checkout request')
            .withRequest({
                method: 'POST',
                path: '/api/checkout',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer placeholder.token.value',
                },
                body: {
                    items: M.eachLike({
                        id: M.integer(1),
                        name: M.string('iPhone 15 Pro Max'),
                        price: M.integer(30000000),
                        quantity: M.integer(1),
                    }),
                    total_amount: M.integer(30000000),
                    coupon_id: null,
                },
            })
            .willRespondWith({
                status: 200,
                body: {
                    message: M.string('Order placed'),
                    order_id: M.integer(1),
                },
            })

        provider
            .given('web checkout created order 1 from frontend payload')
            .uponReceiving(
                'a request for the order created by web checkout [EXPECTED TO FAIL]'
            )
            .withRequest({
                method: 'GET',
                path: '/api/orders/1',
            })
            .willRespondWith({
                status: 200,
                body: {
                    id: M.integer(1),
                    user_id: M.integer(2),
                    total_amount: M.integer(30000000),
                    status: M.string('pending'),
                    shipping_address: M.string('123 Le Loi, Q1, HCMC'),
                },
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.post(
                '/api/checkout',
                {
                    items: [
                        {
                            id: 1,
                            name: 'iPhone 15 Pro Max',
                            price: 30000000,
                            quantity: 1,
                        },
                    ],
                    total_amount: 30000000,
                    coupon_id: null,
                },
                { headers: { Authorization: 'Bearer placeholder.token.value' } }
            )
            expect(res.status).toBe(200)
            expect(res.data.order_id).toBeGreaterThan(0)

            const orderRes = await apiClient.get('/api/orders/1')
            expect(orderRes.status).toBe(200)
            expect(orderRes.data.shipping_address).toBe(
                '123 Le Loi, Q1, HCMC'
            )
        })
    })

    it('POST /api/coupon-usage records use of the applied coupon', async () => {
        provider
            .given('authenticated user and coupon 1 exist')
            .uponReceiving('a coupon-usage recording request')
            .withRequest({
                method: 'POST',
                path: '/api/coupon-usage',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer placeholder.token.value',
                },
                body: {
                    coupon_id: 1,
                },
            })
            .willRespondWith({
                status: 200,
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.post(
                '/api/coupon-usage',
                { coupon_id: 1 },
                { headers: { Authorization: 'Bearer placeholder.token.value' } }
            )
            expect(res.status).toBe(200)
        })
    })
})
