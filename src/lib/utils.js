import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { isIOS } from '@/lib/platform'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

/**
 * Opens a Stripe Checkout URL correctly depending on platform.
 *
 * On iOS specifically, this MUST open in the system browser (Safari),
 * not navigate the app's own in-app WebView. Apple's App Review
 * Guideline 3.1.1 permits linking out to external purchase pages on
 * the US storefront, but only if the link genuinely leaves the app —
 * a purchase flow that stays inside the app's own WebView reads as an
 * in-app purchase mechanism and risks rejection, even if the page
 * itself is hosted by Stripe.
 *
 * This is an Apple-specific requirement (from the Epic v. Apple case),
 * not a Google Play rule. Android and web keep the original in-app
 * navigation, since that behavior is already live and already passed
 * Play Store review — there's no reason to change working behavior on
 * a platform that doesn't require it.
 */
export function openCheckoutUrl(url) {
  if (isIOS()) {
    window.open(url, '_system');
  } else {
    window.location.href = url;
  }
}
