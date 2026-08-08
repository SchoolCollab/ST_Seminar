const path = require('path')
const { PactV3, MatchersV3 } = require('@pact-foundation/pact')

const provider = new PactV3({
    consumer: 'eshop-admin',
    provider: 'eshop-backend',
    dir: path.resolve(process.cwd(), 'pacts'),
    logLevel: 'warn',
})

module.exports = { provider, M: MatchersV3 }
