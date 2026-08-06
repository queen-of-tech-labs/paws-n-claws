import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

/**
 * Opens a Stripe Checkout URL correctly depending on platform.
 *
 * On native iOS/Android (Capacitor), this MUST open in the system browser
 * (Safari/Chrome), not navigate the app's own in-app WebView. Apple's
 * App Review Guideline 3.1.1 permits linking out to external purchase
 * pages on the US storefront, but only if the link genuinely leaves the
 * app — a purchase flow that stays inside the app's own WebView reads as
 * an in-app purchase mechanism and risks rejection, even if the page
 * itself is hosted by Stripe.
 *
 * On web, a plain redirect is fine since there's no "leaving the app"
 * distinction to worry about.
 */
export function openCheckoutUrl(url) {
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    window.open(url, '_system');
  } else {
    window.location.href = url;
  }
}
