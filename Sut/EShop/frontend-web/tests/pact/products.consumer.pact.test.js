/**
 * Consumer contract — Products.
 * Covers: GET /api/products?search=, GET /api/products?search={term},
 * GET /api/products/:id.
 * Cross-ref: EShop_Apidog_TestCases.md §3, EShop_Defect.md (missing product returns {}+200).
 */
const { provider, M } = require('./pact-setup')
const apiClient = require('../../src/api/apiClient').default

describe('Products & Categories contract', () => {
    const productLike = {
        id: M.integer(1),
        name: M.string('iPhone 15 Pro Max'),
        price: M.integer(30000000),
        description: M.string('Điện thoại cao cấp'),
        imageUrl: M.string('https://placehold.co/300x300/png'),
        category_id: M.integer(1),
    }

    it('GET /api/products?search= returns products on initial load', async () => {
        provider
            .given('at least one product exists')
            .uponReceiving('an initial product-list request with empty search')
            .withRequest({
                method: 'GET',
                path: '/api/products',
                query: { search: '' },
            })
            .willRespondWith({
                status: 200,
                body: M.eachLike(productLike),
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.get('/api/products?search=')
            expect(res.status).toBe(200)
            expect(Array.isArray(res.data)).toBe(true)
            expect(res.data[0]).toHaveProperty('id')
            expect(res.data[0]).toHaveProperty('price')
        })
    })

    it('GET /api/products?search={term} returns matching products', async () => {
        provider
            .given('at least one product exists')
            .uponReceiving('a product search request for iPhone')
            .withRequest({
                method: 'GET',
                path: '/api/products',
                query: { search: 'iPhone' },
            })
            .willRespondWith({
                status: 200,
                body: M.eachLike(productLike),
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.get('/api/products?search=iPhone')
            expect(res.status).toBe(200)
            expect(Array.isArray(res.data)).toBe(true)
            expect(res.data[0]).toHaveProperty('name')
        })
    })

    it('GET /api/products/:id returns a single product', async () => {
        provider
            .given('product 1 exists')
            .uponReceiving('a request for product 1')
            .withRequest({ method: 'GET', path: '/api/products/1' })
            .willRespondWith({
                status: 200,
                body: productLike,
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.get('/api/products/1')
            expect(res.status).toBe(200)
            expect(res.data).toHaveProperty('name')
        })
    })
})
