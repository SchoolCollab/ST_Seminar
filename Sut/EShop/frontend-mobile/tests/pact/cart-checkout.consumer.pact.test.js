const { provider, M } = require('./pact-setup')
const {
    applyCoupon,
    checkout,
    recordCouponUsage,
    resetApiBaseUrl,
    setApiBaseUrl,
} = require('../../src/api/apiClient')

afterEach(() => {
    resetApiBaseUrl()
})

describe('frontend-mobile cart/checkout Pact contract', () => {
    it('POST /api/apply-coupon returns discount data the mobile checkout UI displays', async () => {
        provider
            .given('coupon SAVE10 exists for mobile checkout')
            .uponReceiving('a mobile apply-coupon request for SAVE10')
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
            setApiBaseUrl(`${mock.url}/api`)
            const res = await applyCoupon({
                code: 'save10',
                totalAmount: 30000000,
                userId: 2,
            })

            expect(res.status).toBe(200)
            expect(res.data.coupon_id).toBeGreaterThan(0)
            expect(res.data.discount_amount).toBe(3000000)
            expect(res.data.final_amount).toBe(27000000)
        })
    })

    it('POST /api/checkout sends the full API-client cart payload', async () => {
        provider
            .given('authenticated user has 1 item worth 30000000')
            .uponReceiving(
                'a mobile checkout request from the API client with the full cart payload (App.js cart.slice bug intentionally out of scope)'
            )
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
                    message: M.string('Checkout successful'),
                    orderId: M.integer(1),
                },
            })

        await provider.executeTest(async mock => {
            setApiBaseUrl(`${mock.url}/api`)
            const res = await checkout('placeholder.token.value', {
                items: [
                    {
                        id: 1,
                        name: 'iPhone 15 Pro Max',
                        price: 30000000,
                        quantity: 1,
                    },
                ],
                totalAmount: 30000000,
                couponId: null,
            })

            expect(res.status).toBe(200)
            expect(res.data.orderId).toBeGreaterThan(0)
        })
    })

    it('POST /api/coupon-usage records mobile use of an applied coupon', async () => {
        provider
            .given('authenticated user and coupon 1 exist')
            .uponReceiving('a mobile coupon-usage recording request')
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
            setApiBaseUrl(`${mock.url}/api`)
            const res = await recordCouponUsage('placeholder.token.value', 1)

            expect(res.status).toBe(200)
        })
    })
})
