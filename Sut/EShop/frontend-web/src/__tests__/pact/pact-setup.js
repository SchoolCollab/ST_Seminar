const path = require("path");
const { PactV3, MatchersV3 } = require("@pact-foundation/pact");

/**
 * Single PactV3 mock provider shared across all consumer test files.
 * Consumer  : eshop-web       (this Vite/React frontend)
 * Provider  : eshop-backend   (Express server under Sut/EShop/backend)
 *
 * Generated contracts are written to ./pacts/ and picked up by the
 * `pact:publish` script, then verified by the provider in CI.
 */
const provider = new PactV3({
  consumer: "eshop-web",
  provider: "eshop-backend",
  dir: path.resolve(process.cwd(), "pacts"),
  logLevel: "warn",
});

module.exports = { provider, M: MatchersV3 };
