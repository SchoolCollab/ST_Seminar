/**
 * Consumer contract — Cart & Checkout.
 * Covers: GET /api/cart, POST /api/cart, POST /api/checkout.
 * Cross-ref: EShop_Defect.md (checkout trusts client total_amount, does not clear cart).
 */
const { provider, M } = require('./pact-setup')
const axios = require('axios')

describe('Cart & Checkout contract', () => {
    it("GET /api/cart returns the user's cart", async () => {
        provider
            .given('authenticated user has empty cart')
            .uponReceiving('a request for the current cart')
            .withRequest({
                method: 'GET',
                path: '/api/cart',
                headers: { Authorization: 'Bearer placeholder.token.value' },
            })
            .willRespondWith({
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                body: M.like({ cart: [] }),
            })

        await provider.executeTest(async mock => {
            const res = await axios.get(`${mock.url}/api/cart`, {
                headers: { Authorization: 'Bearer placeholder.token.value' },
            })
            expect(res.status).toBe(200)
        })
    })

    it('POST /api/cart adds an item to the cart', async () => {
        provider
            .given('authenticated user, product 1 exists')
            .uponReceiving('an add-to-cart request')
            .withRequest({
                method: 'POST',
                path: '/api/cart',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer placeholder.token.value',
                },
                body: {
                    id: M.integer(1),
                    name: M.string('iPhone 15 Pro Max'),
                    price: M.integer(30000000),
                    quantity: M.integer(1),
                },
            })
            .willRespondWith({
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                body: M.like({ message: 'Item added to cart' }),
            })

        await provider.executeTest(async mock => {
            const res = await axios.post(
                `${mock.url}/api/cart`,
                {
                    id: 1,
                    name: 'iPhone 15 Pro Max',
                    price: 30000000,
                    quantity: 1,
                },
                { headers: { Authorization: 'Bearer placeholder.token.value' } }
            )
            expect(res.status).toBe(200)
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
                    total_amount: M.integer(30000000),
                    shipping_address: M.string('123 Le Loi, Q1, HCMC'),
                },
            })
            .willRespondWith({
                status: 200,
                headers: {
                    'Content-Type': 'application/json; charset=utf-8',
                },
                body: {
                    message: M.string('Order placed'),
                    order_id: M.integer(1),
                },
            })

        await provider.executeTest(async mock => {
            const res = await axios.post(
                `${mock.url}/api/checkout`,
                {
                    total_amount: 30000000,
                    shipping_address: '123 Le Loi, Q1, HCMC',
                },
                { headers: { Authorization: 'Bearer placeholder.token.value' } }
            )
            expect(res.status).toBe(200)
            expect(res.data.order_id).toBeGreaterThan(0)
        })
    })
})
