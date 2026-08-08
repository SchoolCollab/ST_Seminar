/**
 * Pact provider-state handlers for eshop-backend.
 *
 * Each handler:
 *   1. Resets the (in-memory) DB to a known baseline.
 *   2. Seeds any rows the state name implies.
 *   3. Optionally returns `{ token }` so the verifier can inject a real JWT
 *      into subsequent requests via requestFilter.
 *
 * State names MUST match the strings used in the consumer tests
 * (see frontend-web/tests/pact/*.pact.test.js).
 */
const jwt = require('jsonwebtoken')
const db = require('../../database')

// Must match SECRET_KEY hard-coded in server.js. Defect noted in
// Material/Document/SUT-Reference/EShop_Defect.md — Pact does not fix it, only
// works around it in tests.
const SECRET_KEY = 'super_secret_key_that_should_not_be_here'

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) return reject(err)
            resolve(this)
        })
    })
}

async function reset() {
    await db.resetDatabase()
}

async function seedTester() {
    await reset()
    const result = await run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Tester One', 'tester.1@example.com', 'TesterPass123!', 'user']
    )
    const id = result.lastID
    return jwt.sign({ id, role: 'user' }, SECRET_KEY)
}

async function seedAdmin() {
    await reset()
    return jwt.sign({ id: 1, role: 'admin' }, SECRET_KEY)
}

async function seedOrder(status = 'pending') {
    await run(
        'INSERT INTO orders (id, user_id, total_amount, status, shipping_address) VALUES (?, ?, ?, ?, ?)',
        [1, 2, 30000000, status, '123 Le Loi, Q1, HCMC']
    )
}

async function postJson(url, token, body) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    })

    if (!response.ok) {
        throw new Error(
            `Provider setup request failed: ${response.status} ${response.statusText}`
        )
    }

    return response.json()
}

module.exports = {
    'email not registered': async () => {
        await reset()
    },

    'user tester.1@example.com exists': async () => {
        await seedTester()
    },

    'user test@eshop.com exists': async () => {
        await reset()
    },

    'user test@eshop.com has reset token 1234': async () => {
        await reset()
        await run('UPDATE users SET reset_token = ? WHERE email = ?', [
            '1234',
            'test@eshop.com',
        ])
    },

    'admin user admin@eshop.com exists': async () => {
        await reset()
    },

    'at least one product exists': async () => {
        // resetDatabase() re-seeds default products, so nothing extra needed.
        await reset()
    },

    'product 1 exists': async () => {
        // Default seed already inserts product id=1 (iPhone 15 Pro Max).
        await reset()
    },

    'default categories exist': async () => {
        await reset()
    },

    'authenticated as tester.1': async () => {
        const token = await seedTester()
        return { token }
    },

    'authenticated as admin': async () => {
        const token = await seedAdmin()
        return { token }
    },

    'authenticated as admin with users': async () => {
        const token = await seedAdmin()
        return { token }
    },

    'authenticated as admin with disposable admin user 2': async () => {
        const token = await seedAdmin()
        await run('UPDATE users SET role = ? WHERE id = ?', ['admin', 2])
        return { token }
    },

    'authenticated as admin with orders': async () => {
        const token = await seedAdmin()
        await seedOrder('pending')
        return { token }
    },

    'authenticated as admin with pending order 1': async () => {
        const token = await seedAdmin()
        await seedOrder('pending')
        return { token }
    },

    'authenticated as admin with confirmed order 1': async () => {
        const token = await seedAdmin()
        await seedOrder('confirmed')
        return { token }
    },

    'authenticated as admin with shipping order 1': async () => {
        const token = await seedAdmin()
        await seedOrder('shipping')
        return { token }
    },

    'authenticated as admin with canceled order 1': async () => {
        const token = await seedAdmin()
        await seedOrder('canceled')
        return { token }
    },

    'authenticated as admin with product 1': async () => {
        const token = await seedAdmin()
        return { token }
    },

    'authenticated as admin with disposable category 3': async () => {
        const token = await seedAdmin()
        return { token }
    },

    'authenticated as admin with coupons': async () => {
        const token = await seedAdmin()
        return { token }
    },

    'authenticated as admin with coupon 1': async () => {
        const token = await seedAdmin()
        return { token }
    },

    'authenticated user has 1 item worth 30000000': async () => {
        const token = await seedTester()
        // For the current checkout contract, the request body carries the
        // client-computed total_amount (defect: server trusts client).
        return { token }
    },

    'web checkout created order 1 from frontend payload': async () => {
        await reset()
        await run('UPDATE users SET shipping_address = ? WHERE id = ?', [
            '123 Le Loi, Q1, HCMC',
            2,
        ])

        const token = jwt.sign({ id: 2, role: 'user' }, SECRET_KEY)
        const baseUrl = process.env.PACT_PROVIDER_BASE_URL
        if (!baseUrl) {
            throw new Error('PACT_PROVIDER_BASE_URL is required for this state')
        }

        await postJson(`${baseUrl}/api/checkout`, token, {
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
        })

        return { token }
    },

    'coupon SAVE10 exists for web checkout': async () => {
        await reset()
    },

    'authenticated user and coupon 1 exist': async () => {
        await reset()
        return { token: jwt.sign({ id: 2, role: 'user' }, SECRET_KEY) }
    },

    'authenticated user has pending order 1': async () => {
        await reset()
        await seedOrder('pending')
        return { token: jwt.sign({ id: 2, role: 'user' }, SECRET_KEY) }
    },

    'authenticated user has confirmed order 1': async () => {
        await reset()
        await seedOrder('confirmed')
        return { token: jwt.sign({ id: 2, role: 'user' }, SECRET_KEY) }
    },

    'authenticated user has shipping order 1': async () => {
        await reset()
        await seedOrder('shipping')
        return { token: jwt.sign({ id: 2, role: 'user' }, SECRET_KEY) }
    },
}
