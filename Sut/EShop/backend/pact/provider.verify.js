/**
 * Pact provider verifier for eshop-backend.
 *
 * Usage:
 *   NODE_ENV=test node pact/provider.verify.js
 *
 * Behaviour:
 *   - Starts the Express app on an ephemeral port.
 *   - Pulls consumer pacts from the broker (PACT_BROKER_BASE_URL / _TOKEN).
 *   - For each interaction, calls the matching stateHandler; if the handler
 *     returns { token }, the verifier injects it as an Authorization header
 *     via requestFilter so protected endpoints work without hard-coded JWTs.
 *   - Publishes the verification result back to the broker when CI=true.
 */
process.env.NODE_ENV = 'test'

const { Verifier } = require('@pact-foundation/pact')
const app = require('../server')
const stateHandlers = require('./states/stateHandlers')

let stateToken = null

const wrappedHandlers = Object.fromEntries(
    Object.entries(stateHandlers).map(([name, fn]) => [
        name,
        async params => {
            const result = (await fn(params)) || {}
            stateToken = result.token || null
        },
    ])
)

const server = app.listen(0, async () => {
    const { port } = server.address()
    try {
        const options = {
            provider: 'eshop-backend',
            providerBaseUrl: `http://localhost:${port}`,
            publishVerificationResult: process.env.CI === 'true',
            providerVersion: process.env.GIT_SHA || 'local',
            providerVersionBranch: process.env.GIT_BRANCH || 'local',
            stateHandlers: wrappedHandlers,
            requestFilter: (req, _res, next) => {
                if (stateToken) {
                    req.headers['authorization'] = `Bearer ${stateToken}`
                }
                next()
            },
        }

        if (process.env.PACT_BROKER_BASE_URL) {
            options.pactBrokerUrl = process.env.PACT_BROKER_BASE_URL
            if (process.env.PACT_BROKER_TOKEN) {
                options.pactBrokerToken = process.env.PACT_BROKER_TOKEN
            }
            options.consumerVersionSelectors = [
                { mainBranch: true },
                { deployedOrReleased: true },
            ]
        } else {
            // Local fallback: read the pact file produced by the consumer.
            options.pactUrls = [
                require('path').resolve(
                    __dirname,
                    '../../frontend-web/pacts/eshop-web-eshop-backend.json'
                ),
            ]
        }

        await new Verifier(options).verifyProvider()
        console.log('Pact verification succeeded.')
        process.exit(0)
    } catch (err) {
        console.error('Pact verification failed:', err)
        process.exit(1)
    } finally {
        server.close()
    }
})
