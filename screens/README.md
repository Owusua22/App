# Franko screen workspace

Screens are grouped by customer journey so changes to a feature can be made in one folder:

- `shop/` — home, discovery, product details, search, wishlist, stores and `categories/`.
- `orders/` — cart, checkout, delivery/address, payment and order history/status.
- `account/` — profile, sign-in/sign-up and invites.
- `support/` — help, contact, FAQ, company information and policies.

The public navigation route names in `App.js` have **not** changed. New screens should use
`theme/franko.js` for brand colors and `components/CachedImage.js` / `utils/ImageCache.js`
for product images. Keep API requests in the existing Redux slices rather than in UI styles.
