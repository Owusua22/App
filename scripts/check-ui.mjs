import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const home = read('screens/shop/HomeScreen.js');
const carousel = read('components/CarouselComponent.js');
const card = read('components/CatalogProductCard.js');
const checkout = read('screens/orders/CheckoutScreen.js');
const account = read('screens/account/AccountScreen.js');
const auth = read('screens/account/SignupScreen.js');

assert.match(home, /const SECTIONS\s*=\s*\[\s*\{ key: 'carousel'/);
assert.match(carousel, /<CampaignFallback onShop=\{shop\}/);
assert.match(card, /borderWidth: 1/);
assert.match(card, /backgroundColor: franko.primary/);
assert.match(checkout, /renderDelivery\(\).*renderPayment\(\).*renderSummary\(\)/s);
assert.match(checkout, /checkOutOrder|validateCart/);
assert.match(checkout, /itemRow:\s*\{[^}]*borderWidth:\s*1/s);
assert.match(account, /handleDeleteAccount|handleLogout|AddressManagement/);
assert.match(auth, /initialAuthMode === 'signup'/);

const catalog = ['BrandScreen.js', 'ProductsScreen.js', 'ShowroomScreen.js', 'RecentlyViewedScreen.js'];
for (const name of readdirSync(new URL('../screens/shop/categories/', import.meta.url))) {
  if (name.endsWith('.js')) catalog.push(`categories/${name}`);
}
for (const screen of catalog) {
  const source = read(`screens/shop/${screen}`);
  assert.match(source, /<CatalogProductCard/, `${screen} must use the shared card`);
}
console.log(`Verified home, checkout, account, unified cards and ${catalog.length} catalog screens.`);
