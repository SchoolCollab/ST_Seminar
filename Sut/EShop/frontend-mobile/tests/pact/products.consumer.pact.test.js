const { provider, M } = require("./pact-setup");
const {
  getProduct,
  getProducts,
  resetApiBaseUrl,
  setApiBaseUrl,
} = require("../../src/api/apiClient");

afterEach(() => {
  resetApiBaseUrl();
});

describe("frontend-mobile products Pact contract", () => {
  const productLike = {
    id: M.integer(1),
    name: M.string("iPhone 15 Pro Max"),
    price: M.integer(30000000),
    description: M.string("Điện thoại cao cấp"),
    imageUrl: M.string("https://placehold.co/300x300/png"),
    category_id: M.integer(1),
  };

  it("GET /api/products?search= returns products on mobile initial load", async () => {
    provider
      .given("at least one product exists")
      .uponReceiving("a mobile initial product-list request with empty search")
      .withRequest({
        method: "GET",
        path: "/api/products",
        query: { search: "" },
      })
      .willRespondWith({
        status: 200,
        body: M.eachLike(productLike),
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await getProducts("");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data[0]).toHaveProperty("id");
      expect(typeof res.data[0].price).toBe("number");
    });
  });

  it("GET /api/products?search={term} returns mobile search results", async () => {
    provider
      .given("at least one product exists")
      .uponReceiving("a mobile product search request for iPhone")
      .withRequest({
        method: "GET",
        path: "/api/products",
        query: { search: "iPhone" },
      })
      .willRespondWith({
        status: 200,
        body: M.eachLike(productLike),
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await getProducts("iPhone");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data[0]).toHaveProperty("name");
    });
  });

  it("GET /api/products/:id returns a mobile product detail", async () => {
    provider
      .given("product 1 exists")
      .uponReceiving("a mobile request for product 1")
      .withRequest({ method: "GET", path: "/api/products/1" })
      .willRespondWith({
        status: 200,
        body: productLike,
      });

    await provider.executeTest(async (mock) => {
      setApiBaseUrl(`${mock.url}/api`);
      const res = await getProduct(1);

      expect(res.status).toBe(200);
      expect(res.data.name).toBe("iPhone 15 Pro Max");
      expect(typeof res.data.price).toBe("number");
    });
  });
});
