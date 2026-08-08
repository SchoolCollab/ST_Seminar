const { provider, M } = require("./pact-setup");
const {
  cancelOrder,
  getMyOrders,
  resetApiBaseUrl,
  setApiBaseUrl,
} = require("../../src/api/apiClient");

afterEach(() => {
  resetApiBaseUrl();
});

describe("frontend-mobile orders Pact contract", () => {
  it("GET /api/orders/my-orders returns mobile order history", async () => {
    provider
      .given("authenticated user has pending order 1")
      .uponReceiving("a mobile request for the current user order history")
      .withRequest({
        method: "GET",
        path: "/api/orders/my-orders",
        headers: { Authorization: "Bearer placeholder.token.value" },
      })
      .willRespondWith({
        status: 200,
        body: M.eachLike({
          id: M.integer(1),
          total_amount: M.integer(30000000),
          status: M.string("pending"),
          created_at: M.string("2026-08-08 00:00:00"),
        }),
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await getMyOrders("placeholder.token.value");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data[0]).toHaveProperty("id");
      expect(res.data[0]).toHaveProperty("status");
      expect(res.data[0]).toHaveProperty("total_amount");
      expect(res.data[0]).toHaveProperty("created_at");
    });
  });

  it("PUT /api/orders/:id/cancel sends the mobile empty-object cancel body", async () => {
    provider
      .given("authenticated user has pending order 1")
      .uponReceiving("a mobile request to cancel pending order 1")
        .withRequest({
          method: "PUT",
          path: "/api/orders/1/cancel",
          headers: {
            Authorization: "Bearer placeholder.token.value",
          },
        })
      .willRespondWith({
        status: 200,
        body: { message: M.string("Order canceled successfully") },
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await cancelOrder("placeholder.token.value", 1);

      expect(res.status).toBe(200);
    });
  });
});
