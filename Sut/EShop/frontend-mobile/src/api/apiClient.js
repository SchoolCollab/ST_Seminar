const DEFAULT_API_BASE_URL = "http://192.168.10.13:3000/api";

let apiBaseUrl = process.env.MOBILE_API_BASE_URL || DEFAULT_API_BASE_URL;

export function setApiBaseUrl(baseUrl) {
  apiBaseUrl = baseUrl.replace(/\/$/, "");
}

export function resetApiBaseUrl() {
  apiBaseUrl = process.env.MOBILE_API_BASE_URL || DEFAULT_API_BASE_URL;
}

export function getApiBaseUrl() {
  return apiBaseUrl;
}

function url(path) {
  return `${apiBaseUrl}${path}`;
}

function jsonHeaders(token) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function jsonOrEmpty(response) {
  return response.json().catch(() => ({}));
}

export async function getProducts(query = "") {
  const response = await fetch(url(`/products?search=${query}`));
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch (_) {
    // Preserve backend HTML/string responses so the UI can display them.
  }
  return { ok: response.ok, status: response.status, data };
}

export async function getProduct(id) {
  const response = await fetch(url(`/products/${id}`));
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

export async function getMyOrders(token) {
  const response = await fetch(url("/orders/my-orders"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

export async function login(email, password) {
  const response = await fetch(url("/login"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

export async function registerUser({ name, email, password }) {
  const response = await fetch(url("/register"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ name, email, password }),
  });
  const data = await jsonOrEmpty(response);
  return { ok: response.ok, status: response.status, data };
}

export async function requestPasswordReset(email) {
  const response = await fetch(url("/forgot-password"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email }),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

export async function resetPassword({ email, resetToken, newPassword }) {
  const response = await fetch(url("/reset-password"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({ email, resetToken, newPassword }),
  });
  return { ok: response.ok, status: response.status };
}

export async function updateCurrentUser(token, { name, phone, shippingAddress }) {
  const response = await fetch(url("/users/me"), {
    method: "PUT",
    headers: jsonHeaders(token),
    body: JSON.stringify({ name, phone, shippingAddress }),
  });
  return { ok: response.ok, status: response.status };
}

export async function cancelOrder(token, orderId) {
  const response = await fetch(url(`/orders/${orderId}/cancel`), {
    method: "PUT",
    headers: jsonHeaders(token),
    body: JSON.stringify({}),
  });
  const data = await jsonOrEmpty(response);
  return { ok: response.ok, status: response.status, data };
}

export async function applyCoupon({ code, totalAmount, userId }) {
  const response = await fetch(url("/apply-coupon"), {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      code: code.trim().toUpperCase(),
      total_amount: totalAmount,
      user_id: userId || null,
    }),
  });
  const data = await response.json();
  return { ok: response.ok, status: response.status, data };
}

export async function checkout(token, { items, totalAmount, couponId }) {
  const response = await fetch(url("/checkout"), {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({
      items,
      total_amount: totalAmount,
      coupon_id: couponId || null,
    }),
  });
  const data = await jsonOrEmpty(response);
  return { ok: response.ok, status: response.status, data };
}

export async function recordCouponUsage(token, couponId) {
  const response = await fetch(url("/coupon-usage"), {
    method: "POST",
    headers: jsonHeaders(token),
    body: JSON.stringify({ coupon_id: couponId }),
  });
  return { ok: response.ok, status: response.status };
}
