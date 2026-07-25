/**
 * Jest config scoped to Pact consumer tests.
 * Only picks up files under src/__tests__/pact/ so it never collides with Vite.
 */
export default {
  testEnvironment: "node",
  testMatch: ["**/src/__tests__/pact/**/*.pact.test.js"],
  transform: { "^.+\\.jsx?$": "babel-jest" },
  testTimeout: 30000,
};
