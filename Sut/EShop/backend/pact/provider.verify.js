/**
 * Pact provider verifier for eshop-backend.
 *
 * Usage:
 *   NODE_ENV=test node pact/provider.verify.js
 *   PACT_VERIFY_ONLY=eshop-web NODE_ENV=test node pact/provider.verify.js
 *
 * Behaviour:
 *   - Starts the Express app on an ephemeral port.
 *   - Pulls consumer pacts from the broker (PACT_BROKER_BASE_URL / _TOKEN).
 *   - For each interaction, calls the matching stateHandler; if the handler
 *     returns { token }, the verifier injects it as an Authorization header
 *     via requestFilter so protected endpoints work without hard-coded JWTs.
 *   - Publishes the verification result back to the broker when CI=true.
 *   - PACT_VERIFY_ONLY restricts verification to a single named consumer
 *     (e.g. 'eshop-web') instead of all three. Used by each consumer's own
 *     CI job to verify its own just-generated local pact file against the
 *     provider in the same job/runner, without needing a broker. Leave unset
 *     for the full three-consumer run (this is what run_tests.sh and the
 *     standalone Pact Provider workflow expect).
 */
process.env.NODE_ENV = 'test'

const { Verifier } = require('@pact-foundation/pact')
const fs = require('fs')
const path = require('path')
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

const consumers = [
    {
        name: 'eshop-web',
        localPact: path.resolve(
            __dirname,
            '../../frontend-web/pacts/eshop-web-eshop-backend.json'
        ),
    },
    {
        name: 'eshop-admin',
        localPact: path.resolve(
            __dirname,
            '../../frontend-admin/pacts/eshop-admin-eshop-backend.json'
        ),
    },
    {
        name: 'eshop-mobile',
        localPact: path.resolve(
            __dirname,
            '../../frontend-mobile/pacts/eshop-mobile-eshop-backend.json'
        ),
    },
]

function countInteractions(pactPath) {
    try {
        const pact = JSON.parse(fs.readFileSync(pactPath, 'utf8'))
        return pact.interactions.length
    } catch (_err) {
        return null
    }
}

const consumersToVerify = process.env.PACT_VERIFY_ONLY
    ? consumers.filter(c => c.name === process.env.PACT_VERIFY_ONLY)
    : consumers

if (process.env.PACT_VERIFY_ONLY && consumersToVerify.length === 0) {
    console.error(
        `PACT_VERIFY_ONLY was set to '${process.env.PACT_VERIFY_ONLY}', which does not match any known consumer (${consumers.map(c => c.name).join(', ')}).`
    )
    process.exit(1)
}

function buildOptions(port, consumer) {
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
            { consumer: consumer.name, mainBranch: true },
            { consumer: consumer.name, deployedOrReleased: true },
        ]
        options.consumerFilters = [consumer.name]
    } else {
        options.pactUrls = [consumer.localPact]
    }

    return options
}

const server = app.listen(0, async () => {
    const { port } = server.address()
    process.env.PACT_PROVIDER_BASE_URL = `http://localhost:${port}`
    const results = []

    try {
        for (const consumer of consumersToVerify) {
            stateToken = null
            const total = countInteractions(consumer.localPact)
            console.log(`Verifying ${consumer.name} against eshop-backend...`)

            try {
                await new Verifier(buildOptions(port, consumer)).verifyProvider()
                const countLabel = total === null ? 'unknown' : `${total}/${total}`
                console.log(
                    `Pact verification succeeded for ${consumer.name}: ${countLabel}.`
                )
                results.push({ consumer: consumer.name, passed: true, total })
            } catch (err) {
                console.error(
                    `Pact verification failed for ${consumer.name}:`,
                    err
                )
                results.push({ consumer: consumer.name, passed: false, total })
            }
        }

        const failed = results.filter(result => !result.passed)
        console.log('Pact verification summary:')
        for (const result of results) {
            const countLabel =
                result.total === null
                    ? 'unknown interactions'
                    : `${result.total} interactions`
            console.log(
                `- ${result.consumer}: ${result.passed ? 'passed' : 'failed'} (${countLabel})`
            )
        }

        if (failed.length > 0) {
            console.log('')
            console.log(
                `${failed.length} of ${results.length} consumer(s) FAILED verification: ${failed
                    .map(r => r.consumer)
                    .join(', ')}`
            )
            console.log(
                'See the "Failures:" section(s) logged above for the specific failing interaction(s) and assertion mismatch.'
            )
        }

        process.exit(failed.length === 0 ? 0 : 1)
    } finally {
        server.close()
    }
})
