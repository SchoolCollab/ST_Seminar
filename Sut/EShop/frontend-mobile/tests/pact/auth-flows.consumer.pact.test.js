const { provider, M } = require("./pact-setup");
const {
  registerUser,
  requestPasswordReset,
  resetApiBaseUrl,
  resetPassword,
  setApiBaseUrl,
} = require("../../src/api/apiClient");

afterEach(() => {
  resetApiBaseUrl();
});

describe("frontend-mobile registration/password Pact contract", () => {
  it("POST /api/register creates a mobile user", async () => {
    provider
      .given("email not registered")
      .uponReceiving("a mobile registration request")
      .withRequest({
        method: "POST",
        path: "/api/register",
        headers: { "Content-Type": "application/json" },
        body: {
          name: "Mobile Tester",
          email: "new.mobile@example.com",
          password: "MobilePass123!",
        },
      })
      .willRespondWith({
        status: 200,
        body: {
          message: M.string("User registered successfully"),
          id: M.integer(1),
        },
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await registerUser({
        name: "Mobile Tester",
        email: "new.mobile@example.com",
        password: "MobilePass123!",
      });

      expect(res.status).toBe(200);
      expect(res.data.id).toBeGreaterThan(0);
    });
  });

  it("POST /api/forgot-password accepts the mobile email request", async () => {
    provider
      .given("user test@eshop.com exists")
      .uponReceiving("a mobile forgot-password request")
      .withRequest({
        method: "POST",
        path: "/api/forgot-password",
        headers: { "Content-Type": "application/json" },
        body: {
          email: "test@eshop.com",
        },
      })
      .willRespondWith({
        status: 200,
        body: {
          message: M.string("Mã đặt lại mật khẩu đã được tạo"),
        },
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await requestPasswordReset("test@eshop.com");

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty("message");
    });
  });

  it("POST /api/reset-password accepts the mobile reset-token field names", async () => {
    provider
      .given("user test@eshop.com has reset token 1234")
      .uponReceiving("a mobile reset-password request")
      .withRequest({
        method: "POST",
        path: "/api/reset-password",
        headers: { "Content-Type": "application/json" },
        body: {
          email: "test@eshop.com",
          resetToken: "1234",
          newPassword: "NewPass123!",
        },
      })
      .willRespondWith({
        status: 200,
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await resetPassword({
        email: "test@eshop.com",
        resetToken: "1234",
        newPassword: "NewPass123!",
      });

      expect(res.status).toBe(200);
    });
  });
});
