/**
 * Jest config scoped to Pact consumer tests for the extracted plain JS API module.
 * This intentionally does not use jest-expo or the React Native preset because
 * these tests do not render React Native components.
 */
export default {
  testEnvironment: "node",
  testMatch: ["**/tests/pact/**/*.pact.test.js"],
  transform: { "^.+\\.jsx?$": "babel-jest" },
  maxWorkers: 1,
  testTimeout: 30000
}
