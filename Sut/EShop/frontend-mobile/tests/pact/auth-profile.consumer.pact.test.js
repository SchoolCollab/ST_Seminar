const { provider, M } = require("./pact-setup");
const {
  login,
  resetApiBaseUrl,
  setApiBaseUrl,
  updateCurrentUser,
} = require("../../src/api/apiClient");

afterEach(() => {
  resetApiBaseUrl();
});

describe("frontend-mobile auth/profile Pact contract", () => {
  it("POST /api/login returns profile fields the mobile UI initializes", async () => {
    provider
      .given("mobile user tester.mobile@example.com exists")
      .uponReceiving("a mobile login request with correct credentials")
      .withRequest({
        method: "POST",
        path: "/api/login",
        headers: { "Content-Type": "application/json" },
        body: {
          email: "tester.mobile@example.com",
          password: "MobilePass123!",
        },
      })
      .willRespondWith({
        status: 200,
        body: {
          message: M.string("Login successful"),
          token: M.string("aaa.bbb.ccc"),
          user: {
            id: M.integer(1),
            email: M.string("tester.mobile@example.com"),
            name: M.string("Mobile Tester"),
            role: M.string("user"),
            phone: M.string("0912345678"),
            shipping_address: M.string("123 Le Loi, Q1, HCMC"),
          },
        },
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await login("tester.mobile@example.com", "MobilePass123!");

      expect(res.status).toBe(200);
      expect(typeof res.data.token).toBe("string");
      expect(res.data.user.phone).toBe("0912345678");
      expect(res.data.user.shipping_address).toBe("123 Le Loi, Q1, HCMC");
    });
  });

  it("PUT /api/users/me sends the mobile profile update shape", async () => {
    provider
      .given("authenticated as mobile tester")
      .uponReceiving("a mobile profile update request")
      .withRequest({
        method: "PUT",
        path: "/api/users/me",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer placeholder.token.value",
        },
        body: {
          name: "Mobile Tester",
          phone: "0912345678",
          shippingAddress: "123 Le Loi, Q1, HCMC",
        },
      })
      .willRespondWith({
        status: 200,
        body: { message: M.string("Profile updated") },
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await updateCurrentUser("placeholder.token.value", {
        name: "Mobile Tester",
        phone: "0912345678",
        shippingAddress: "123 Le Loi, Q1, HCMC",
      });

      expect(res.status).toBe(200);
    });
  });
});
