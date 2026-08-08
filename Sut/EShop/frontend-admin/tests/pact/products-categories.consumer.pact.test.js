/**
 * Consumer contract - Admin product and category management.
 * Covers: product list/create/update/delete and category list/create/delete.
 */
const { provider, M } = require('./pact-setup')
const apiClient = require('../../src/api/apiClient').default

function useAdminMock(mock) {
    apiClient.defaults.baseURL = mock.url
    apiClient.defaults.headers.common.Authorization = 'Bearer placeholder.token.value'
}

describe('Admin products and categories contract', () => {
    const productLike = {
        id: M.integer(1),
        name: M.string('iPhone 15 Pro Max'),
        price: M.integer(30000000),
        description: M.string('Dien thoai cao cap'),
        imageUrl: M.string('https://placehold.co/300x300/png?text=iPhone+15'),
        category_id: M.integer(1),
    }

    afterEach(() => {
        delete apiClient.defaults.headers.common.Authorization
    })

    it('GET /api/products returns products for the admin product table', async () => {
        provider
            .given('at least one product exists')
            .uponReceiving('a request for the admin product list')
            .withRequest({ method: 'GET', path: '/api/products' })
            .willRespondWith({
                status: 200,
                body: M.eachLike(productLike),
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.get('/api/products')
            expect(res.status).toBe(200)
            expect(res.data[0]).toHaveProperty('imageUrl')
            expect(res.data[0]).toHaveProperty('price')
        })
    })

    it('POST /api/products creates a product from the admin form', async () => {
        const productInput = {
            id: null,
            name: 'Admin Created Product',
            price: '100000',
            description: 'Created from admin',
            imageUrl: 'https://placehold.co/300x300/png',
            category_id: 1,
        }

        provider
            .given('authenticated as admin')
            .uponReceiving('an admin product create request')
            .withRequest({
                method: 'POST',
                path: '/api/products',
                body: {
                    id: null,
                    name: M.string('Admin Created Product'),
                    price: M.string('100000'),
                    description: M.string('Created from admin'),
                    imageUrl: M.string('https://placehold.co/300x300/png'),
                    category_id: M.integer(1),
                },
            })
            .willRespondWith({
                status: 200,
                body: {
                    message: M.string('Product created'),
                    id: M.integer(6),
                },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.post('/api/products', productInput)
            expect(res.status).toBe(200)
            expect(res.data.id).toBeGreaterThan(0)
        })
    })

    it('PUT /api/products/:id updates a product from the admin form', async () => {
        provider
            .given('authenticated as admin with product 1')
            .uponReceiving('an admin product update request')
            .withRequest({
                method: 'PUT',
                path: '/api/products/1',
                body: {
                    id: M.integer(1),
                    name: M.string('Updated Product'),
                    price: M.string('110000'),
                    description: M.string('Updated from admin'),
                    imageUrl: M.string('https://placehold.co/300x300/png'),
                    category_id: M.integer(1),
                },
            })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Product updated') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.put('/api/products/1', {
                id: 1,
                name: 'Updated Product',
                price: '110000',
                description: 'Updated from admin',
                imageUrl: 'https://placehold.co/300x300/png',
                category_id: 1,
            })
            expect(res.status).toBe(200)
        })
    })

    it('DELETE /api/products/:id deletes a product', async () => {
        provider
            .given('authenticated as admin with product 1')
            .uponReceiving('an admin product delete request')
            .withRequest({ method: 'DELETE', path: '/api/products/1' })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Product deleted') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.delete('/api/products/1')
            expect(res.status).toBe(200)
        })
    })

    it('GET /api/categories returns categories for admin forms', async () => {
        provider
            .given('default categories exist')
            .uponReceiving('a request for the admin category list')
            .withRequest({ method: 'GET', path: '/api/categories' })
            .willRespondWith({
                status: 200,
                body: M.eachLike({
                    id: M.integer(1),
                    name: M.string('Dien thoai'),
                }),
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.get('/api/categories')
            expect(res.status).toBe(200)
            expect(res.data[0]).toHaveProperty('name')
        })
    })

    it('POST /api/categories creates a category', async () => {
        provider
            .given('authenticated as admin')
            .uponReceiving('an admin category create request')
            .withRequest({
                method: 'POST',
                path: '/api/categories',
                body: { name: M.string('Admin Category') },
            })
            .willRespondWith({
                status: 200,
                body: {
                    message: M.string('Category created'),
                    id: M.integer(4),
                },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.post('/api/categories', {
                name: 'Admin Category',
            })
            expect(res.status).toBe(200)
            expect(res.data.id).toBeGreaterThan(0)
        })
    })

    it('DELETE /api/categories/:id deletes a category', async () => {
        provider
            .given('authenticated as admin with disposable category 3')
            .uponReceiving('an admin category delete request')
            .withRequest({ method: 'DELETE', path: '/api/categories/3' })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Category deleted') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.delete('/api/categories/3')
            expect(res.status).toBe(200)
        })
    })
})
