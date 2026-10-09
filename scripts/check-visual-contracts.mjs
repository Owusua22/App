import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const categories = fs.readdirSync(path.join(root, 'screens/shop/categories')).filter((name) => name.endsWith('.js'));
const home = read('screens/shop/HomeScreen.js');
const carousel = read('components/CarouselComponent.js');
const card = read('components/CatalogProductCard.js');

assert.match(home, /const SECTIONS = \[\s*\{ key: 'carousel', Component: CarouselComponent \}/);
assert.match(carousel, /<CampaignFallback onShop=\{shop\}/);
assert.match(carousel, /<Image source=\{FRANKO_LOGO\}/, 'Bundled carousel fallback must show Franko logo');
assert.match(carousel, /preloadImage\(uri, \{ priority: 'high' \}\)/);
assert.match(carousel, /visibleAds\.map/);
assert.doesNotMatch(carousel, /THE FRANKO EDIT|Find your/);
assert.match(read('App.js'), /createNativeStackNavigator/);
assert.match(read('App.js'), /Inter_400Regular/);
assert.match(read('components/AppText.js'), /fontFamily: family/);
assert.match(card, /name="shopping-cart"/);
assert.match(card, /getProductImageUri\(product\)/, 'Card images must follow the database image fields');
assert.match(card, /onLoadStart=\{onImageLoadStart\}/, 'Remote images need a visible delayed loader');
assert.match(read('components/CatalogFetchNotice.js'), /ActivityIndicator/);
assert.match(read('components/CategoryProductCarousel.js'), /<CatalogFetchNotice/);
assert.doesNotMatch(read('components/CategoryProductCarousel.js'), /requestedCategoryRef/);
assert.match(card, /CATALOG_CARD_HEIGHT = 280/);
assert.match(card, /<View style=\{styles.actionRow\}>/);
assert.ok(card.indexOf('style={styles.priceBlock}') < card.indexOf('style={styles.actionRow}'), 'Cart must be below the price, not overlaying it');
assert.doesNotMatch(card.slice(card.indexOf('actionRow: {'), card.indexOf('cartDisabled: {')), /position:\s*['"]absolute/);

const grids = [...categories.map((name) => `categories/${name}`), 'BrandScreen.js', 'ShowroomScreen.js', 'ProductsScreen.js', 'RecentlyViewedScreen.js', 'WishlistScreen.js', 'SearchScreen.js'];
for (const name of grids) {
  const source = read(`screens/shop/${name}`);
  assert.match(source, /<CatalogProductCard/, `${name} needs the shared card`);
  if (!['RecentlyViewedScreen.js', 'WishlistScreen.js'].includes(name)) {
    assert.match(source, /<CatalogFetchNotice/, `${name} needs a visible database loading state`);
  }
  assert.match(source, /getCatalogLayout/, `${name} needs responsive shared geometry`);
  if (name !== 'ProductsScreen.js' && name !== 'SearchScreen.js' && name !== 'RecentlyViewedScreen.js' && name !== 'WishlistScreen.js') {
    assert.match(source, /useProgressiveCatalog/, `${name} needs progressive batch rendering`);
    assert.match(source, /onEndReached=\{hasMore \? showMore : undefined\}/, `${name} needs lazy on-end loading`);
  }
}
assert.match(read('screens/shop/ProductsScreen.js'), /fetchPaginatedProducts/);
assert.match(read('screens/shop/ProductsScreen.js'), /hasMorePages/);
assert.match(read('components/ProductCard.js'), /<CatalogProductCard/);
assert.match(read('components/ComboComponent.js'), /<CatalogProductCard/);

const checkout = read('screens/orders/CheckoutScreen.js');
for (const section of ['renderDelivery()', 'renderPayment()', 'renderSummary()', 'stepStrip', 'Place Order']) {
  assert.ok(checkout.includes(section), `Checkout is missing ${section}`);
}
for (const operation of ['validateCart', 'checkoutOrder', 'payment']) {
  assert.match(checkout.toLowerCase(), new RegExp(operation.toLowerCase()));
}
const account = read('screens/account/AccountScreen.js');
for (const route of ['AddressManagement', 'OrderHistoryScreen', 'Wishlist', 'CustomerService']) assert.ok(account.includes(route));
for (const action of ['logoutCustomer', 'updateAccountStatus']) assert.ok(account.includes(action));

console.log(`Verified ${grids.length} shared-card screens, catalog loading, typography, carousel and checkout/account routes.`);
