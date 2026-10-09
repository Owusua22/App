// Offline regression checks for the real Axios interceptors and Redux reducers.
// No live Franko credentials or backend calls are used.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const babel = require('@babel/core');

const storage = new Map();
const memory = {
  async getItem(key) { return storage.get(key) ?? null; },
  async setItem(key, value) { storage.set(key, value); },
  async removeItem(key) { storage.delete(key); },
  async multiRemove(keys) { keys.forEach((key) => storage.delete(key)); },
};
let refreshCalls = 0;
let redirectCalls = 0;
let refreshResult = null;
let handlers;
const axiosInstance = function (config) { return Promise.resolve({ data: { ok: true }, config }); };
axiosInstance.interceptors = {
  request: { use(ok, fail) { handlers.request = ok; handlers.requestFail = fail; } },
  response: { use(ok, fail) { handlers.success = ok; handlers.failure = fail; } },
};
class Cancel extends Error { constructor(message) { super(message); this.__CANCEL__ = true; } }
const axiosMock = {
  create: () => axiosInstance,
  post: async () => { refreshCalls += 1; return refreshResult(); },
  Cancel,
  isCancel: (error) => Boolean(error?.__CANCEL__),
};
const replacements = {
  axios: axiosMock,
  '@react-native-async-storage/async-storage': memory,
  '../../services/navigationService': { requestAuthRedirect: () => { redirectCalls += 1; }, reset: () => {} },
  'base-64': require('base-64'),
};
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const code = babel.transformSync(readFileSync(file, 'utf8'), {
    babelrc: false, configFile: false, plugins: ['@babel/plugin-transform-modules-commonjs'],
  }).code;
  const mockedRequire = (name) => {
    if (name in replacements) return replacements[name];
    if (name.startsWith('./')) {
      const path = file.replace(/\/[^/]+$/, '') + '/' + name.slice(2) + '.js';
      return load(path);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', code)(mockedRequire, module, module.exports);
  return module.exports;
}
const session = load('redux/slice/customerSessionStorage.js');
handlers = {};
const auth = load('redux/slice/axiosInstance.js');
const customer = load('redux/slice/customerSlice.js');
const orders = load('redux/slice/orderSlice.js');
let customerState;
let orderState;
auth.registerAuthUpdatedHandler((updated) => {
  customerState = customer.default(customerState, customer.updateSessionTokens(updated));
});
auth.registerAuthExpiredHandler(() => {
  customerState = customer.default(customerState, customer.silentLogoutAction());
  orderState = orders.default(orderState, orders.clearOrderSession());
});
const token = (secondsFromNow) => `a.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + secondsFromNow })).toString('base64url')}.b`;
const putSession = async (access, refresh) => {
  customerState = customer.default(undefined, customer.setCurrentCustomer({ contactNumber: 'test', accessToken: access, refreshToken: refresh }));
  orderState = orders.default(undefined, orders.saveCheckoutDetails({ privateAddress: 'test' }));
  await memory.setItem('customer', JSON.stringify({ contactNumber: 'test', accessToken: access, refreshToken: refresh }));
  await memory.setItem('customers', JSON.stringify([{ contactNumber: 'test' }]));
  await memory.setItem('userOrders', 'private orders');
  await memory.setItem('orderAddressDetails', 'private address');
  await memory.setItem('shippingDetails', 'private address');
  await memory.setItem('orderDeliveryDetails', 'private address');
  await memory.setItem('pendingOrderId', 'private order');
  await memory.setItem('selectedLocation', 'private location');
  await memory.setItem('lastActivityTimestamp', String(Date.now()));
};
const order401 = (access) => {
  const config = { method: 'get', url: '/', headers: { Authorization: `Bearer ${access}` }, params: { endpoint: '/Order/GetOrderByCustomer' }, _authVersion: session.getSessionVersion() };
  const error = Object.assign(new Error('Request failed with status code 401'), { config, response: { status: 401, config } });
  return handlers.failure(error).then(() => error, (rejected) => rejected);
};

// Concurrent 401s share one rejected refresh; clear both Redux and storage.
await putSession(token(300), token(600));
refreshResult = () => Promise.reject({ response: { status: 401 } });
const [e1, e2] = await Promise.all([order401(customerState.currentCustomer.accessToken), order401(customerState.currentCustomer.accessToken)]);
assert.equal(refreshCalls, 1);
assert.equal(e1.authExpired, true);
assert.equal(e2.authExpired, true);
assert.equal(customerState.currentCustomer, null);
assert.equal(customerState.isAuthenticated, false);
assert.deepEqual(customerState.customerList, []);
assert.equal(orderState.checkoutDetails, null);
assert.equal(orderState.orders.length, 0);
for (const key of ['customer', 'customers', 'userOrders', 'orderAddressDetails', 'shippingDetails', 'orderDeliveryDetails', 'pendingOrderId', 'selectedLocation', 'checkoutDetails', 'lastActivityTimestamp']) {
  assert.equal(storage.has(key), false, `Storage key ${key} survived expiry`);
}
assert.equal(redirectCalls, 1);

// A valid refresh keeps the session and retries the original order request.
const oldAccess = token(300);
const newAccess = token(1200);
await putSession(oldAccess, token(900));
refreshResult = async () => ({ status: 200, data: { accessToken: newAccess, refreshToken: token(1800) } });
const renewed = await handlers.failure(Object.assign(new Error('401'), {
  config: { method: 'get', url: '/', headers: { Authorization: `Bearer ${oldAccess}` }, _authVersion: session.getSessionVersion() },
  response: { status: 401 },
}));
assert.equal(renewed.config.headers.Authorization, `Bearer ${newAccess}`);
assert.equal(JSON.parse(storage.get('customer')).accessToken, newAccess);
assert.equal(customerState.isAuthenticated, true);
assert.equal(customerState.currentCustomer.accessToken, newAccess);
assert.equal(redirectCalls, 1);

// Outage/server failure is not an invalid credential and must not erase data.
await putSession(token(300), token(900));
refreshResult = () => Promise.reject({ response: { status: 503 } });
const transient = await order401(customerState.currentCustomer.accessToken);
assert.notEqual(transient.authExpired, true);
assert.equal(customerState.isAuthenticated, true);
assert.ok(storage.has('customer'));
assert.equal(redirectCalls, 1);

// At startup/resume, a known-expired refresh credential logs out without an API call.
await putSession(token(-30), token(-30));
const before = refreshCalls;
assert.equal(await auth.checkActiveSession(), false);
assert.equal(refreshCalls, before);
assert.equal(customerState.currentCustomer, null);
assert.equal(redirectCalls, 2);

// Access token expiring while the app is away signs out on foreground return.
await putSession(token(-30), token(900));
await memory.setItem('lastActivityTimestamp', String(Date.now() - 60_000));
assert.equal(await auth.checkActiveSession({ logoutIfExpiredWhileAway: true }), false);
assert.equal(customerState.currentCustomer, null);
assert.equal(redirectCalls, 3);

// Auth failure from an earlier session cannot log out a newly signed-in user.
await putSession(token(300), token(900));
const oldVersion = session.getSessionVersion() - 1;
const stale = Object.assign(new Error('401'), {
  config: { method: 'get', url: '/', headers: { Authorization: `Bearer ${token(-600)}` }, _authVersion: oldVersion },
  response: { status: 401 },
});
await handlers.failure(stale).catch(() => {});
assert.equal(customerState.isAuthenticated, true);
assert.equal(redirectCalls, 3);
// Brand-new/partial guest storage never triggers a sign-in redirect.
await memory.setItem('customer', JSON.stringify({ contactNumber: 'first-time-guest' }));
assert.equal(await auth.checkActiveSession(), false);
assert.equal(storage.has('customer'), false);
assert.equal(redirectCalls, 3);
const publicRequest = await handlers.request({ method: 'get', url: '/', headers: {}, params: { endpoint: '/Product/Product-Get' } });
assert.equal(publicRequest.headers.Authorization, undefined);
assert.equal(redirectCalls, 3);
console.log('Auth session regression checks passed (401, refresh, storage/Redux, transient error, startup/resume, stale response).');
