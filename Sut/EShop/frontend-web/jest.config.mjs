/**
 * Jest config scoped to Pact consumer tests.
 * Only picks up files under tests/pact/ so it never collides with Vite.
 */
export default {
    testEnvironment: 'node',
    testMatch: ['**/tests/pact/**/*.pact.test.js'],
    transform: { '^.+\\.jsx?$': 'babel-jest' },
    maxWorkers: 1,
    testTimeout: 30000,
}
