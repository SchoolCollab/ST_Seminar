/**
 * Consumer contract — Products & Categories.
 * Covers: GET /api/products, GET /api/products/:id, GET /api/categories.
 * Cross-ref: EShop_Apidog_TestCases.md §3, EShop_Defect.md (missing product returns {}+200).
 */
const { provider, M } = require('./pact-setup')
const apiClient = require('../../api/apiClient').default

describe('Products & Categories contract', () => {
    const productLike = {
        id: M.integer(1),
        name: M.string('iPhone 15 Pro Max'),
        price: M.integer(30000000),
        description: M.string('Điện thoại cao cấp'),
        imageUrl: M.string('https://placehold.co/300x300/png'),
        category_id: M.integer(1),
    }

    it('GET /api/products returns a list of products', async () => {
        provider
            .given('at least one product exists')
            .uponReceiving('a request for the product list')
            .withRequest({ method: 'GET', path: '/api/products' })
            .willRespondWith({
                status: 200,
                body: M.eachLike(productLike),
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.get('/api/products')
            expect(res.status).toBe(200)
            expect(Array.isArray(res.data)).toBe(true)
            expect(res.data[0]).toHaveProperty('id')
            expect(res.data[0]).toHaveProperty('price')
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

    it('GET /api/categories returns a list of categories', async () => {
        provider
            .given('default categories exist')
            .uponReceiving('a request for the category list')
            .withRequest({ method: 'GET', path: '/api/categories' })
            .willRespondWith({
                status: 200,
                body: M.eachLike({
                    id: M.integer(1),
                    name: M.string('Điện thoại'),
                }),
            })

        await provider.executeTest(async mock => {
            apiClient.defaults.baseURL = mock.url
            const res = await apiClient.get('/api/categories')
            expect(res.status).toBe(200)
            expect(res.data[0]).toHaveProperty('name')
        })
    })
})
