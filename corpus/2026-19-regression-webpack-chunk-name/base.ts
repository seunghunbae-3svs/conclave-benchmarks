export function loadCheckoutModule() {
  return import(/* webpackChunkName: "checkout" */ "./checkout.js");
}
