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
 * (see frontend-web/src/__tests__/pact/*.pact.test.js).
 */
const jwt = require("jsonwebtoken");
const db = require("../../database");

// Must match SECRET_KEY hard-coded in server.js. Defect noted in
// EShop_Defect.md — Pact does not fix it, only works around it in tests.
const SECRET_KEY = "super_secret_key_that_should_not_be_here";

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve(this);
    });
  });
}

async function reset() {
  await db.resetDatabase();
}

async function seedTester() {
  await reset();
  const result = await run(
    "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
    ["Tester One", "tester.1@example.com", "TesterPass123!", "user"],
  );
  const id = result.lastID;
  return jwt.sign({ id, role: "user" }, SECRET_KEY);
}

async function seedProduct1() {
  await run(
    "INSERT INTO products (id, name, price, description, imageUrl, category_id) VALUES (?, ?, ?, ?, ?, ?)",
    [
      1,
      "iPhone 15 Pro Max",
      30000000,
      "Điện thoại cao cấp",
      "https://placehold.co/300x300/png",
      1,
    ],
  );
}

module.exports = {
  "email not registered": async () => {
    await reset();
  },

  "user tester.1@example.com exists": async () => {
    await seedTester();
  },

  "at least one product exists": async () => {
    // resetDatabase() re-seeds default products, so nothing extra needed.
    await reset();
  },

  "product 1 exists": async () => {
    // Default seed already inserts product id=1 (iPhone 15 Pro Max).
    await reset();
  },

  "default categories exist": async () => {
    await reset();
  },

  "authenticated as tester.1": async () => {
    const token = await seedTester();
    return { token };
  },

  "authenticated user has empty cart": async () => {
    const token = await seedTester();
    return { token };
  },

  "authenticated user, product 1 exists": async () => {
    const token = await seedTester();
    await seedProduct1().catch(() => {}); // ignore UNIQUE if reseeded
    return { token };
  },

  "authenticated user has 1 item worth 30000000": async () => {
    const token = await seedTester();
    // Cart is in-memory (userCarts) in server.js — POST /api/cart during
    // verification is what would populate it; for checkout we rely on the
    // request body carrying total_amount (defect: server trusts client).
    return { token };
  },
};
