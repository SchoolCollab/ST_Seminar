/**
 * Consumer contract - Admin coupon management and product import.
 * Covers: GET coupons, create/delete coupons, bulk product import.
 */
const { provider, M } = require('./pact-setup')
const apiClient = require('../../src/api/apiClient').default

function useAdminMock(mock) {
    apiClient.defaults.baseURL = mock.url
    apiClient.defaults.headers.common.Authorization = 'Bearer placeholder.token.value'
}

describe('Admin coupons and import contract', () => {
    afterEach(() => {
        delete apiClient.defaults.headers.common.Authorization
    })

    it('GET /api/coupons returns coupons for the admin coupon table', async () => {
        provider
            .given('authenticated as admin with coupons')
            .uponReceiving('a request for the admin coupon list')
            .withRequest({ method: 'GET', path: '/api/coupons' })
            .willRespondWith({
                status: 200,
                body: M.eachLike({
                    id: M.integer(1),
                    code: M.string('SAVE10'),
                    type: M.string('percent'),
                    discount_value: M.integer(10),
                    min_order_amount: M.integer(300000),
                    expired_at: M.string('2099-12-31'),
                    is_active: M.integer(1),
                    max_uses_per_user: M.integer(1),
                }),
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.get('/api/coupons')
            expect(res.status).toBe(200)
            expect(res.data[0]).toHaveProperty('code')
            expect(res.data[0]).toHaveProperty('max_uses_per_user')
        })
    })

    it('POST /api/admin/coupons creates a coupon from the admin form', async () => {
        provider
            .given('authenticated as admin')
            .uponReceiving('an admin coupon create request')
            .withRequest({
                method: 'POST',
                path: '/api/admin/coupons',
                body: {
                    code: M.string('ADMIN10'),
                    type: M.string('percent'),
                    discount_value: M.string('10'),
                    min_order_amount: M.string('200000'),
                    expired_at: M.string('2099-12-31'),
                    max_uses_per_user: M.string('1'),
                },
            })
            .willRespondWith({
                status: 200,
                body: {
                    message: M.string('Coupon created'),
                    id: M.integer(5),
                },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.post('/api/admin/coupons', {
                code: 'ADMIN10',
                type: 'percent',
                discount_value: '10',
                min_order_amount: '200000',
                expired_at: '2099-12-31',
                max_uses_per_user: '1',
            })
            expect(res.status).toBe(200)
            expect(res.data.id).toBeGreaterThan(0)
        })
    })

    it('DELETE /api/admin/coupons/:id deletes a coupon', async () => {
        provider
            .given('authenticated as admin with coupon 1')
            .uponReceiving('an admin coupon delete request')
            .withRequest({ method: 'DELETE', path: '/api/admin/coupons/1' })
            .willRespondWith({
                status: 200,
                body: { message: M.string('Coupon deleted') },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.delete('/api/admin/coupons/1')
            expect(res.status).toBe(200)
        })
    })

    it('POST /api/admin/import-products imports products from parsed CSV rows', async () => {
        provider
            .given('authenticated as admin')
            .uponReceiving('an admin product import request')
            .withRequest({
                method: 'POST',
                path: '/api/admin/import-products',
                body: {
                    products: M.eachLike({
                        name: M.string('Imported Product'),
                        price: M.string('100000'),
                        description: M.string('Imported from CSV'),
                        imageUrl: M.string('https://placehold.co/300'),
                        category_id: M.integer(1),
                    }),
                },
            })
            .willRespondWith({
                status: 200,
                body: {
                    message: M.string('Import hoan tat: 1/1 san pham duoc them'),
                    inserted: M.integer(1),
                    errors: M.like([]),
                },
            })

        await provider.executeTest(async mock => {
            useAdminMock(mock)
            const res = await apiClient.post('/api/admin/import-products', {
                products: [
                    {
                        name: 'Imported Product',
                        price: '100000',
                        description: 'Imported from CSV',
                        imageUrl: 'https://placehold.co/300',
                        category_id: 1,
                    },
                ],
            })
            expect(res.status).toBe(200)
            expect(res.data).toHaveProperty('message')
            expect(res.data).toHaveProperty('errors')
        })
    })
})
