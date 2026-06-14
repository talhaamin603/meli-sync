export const SHIPPING  = 8;  // USD — fixed cost on every ML listing
export const INSURANCE = 5;  // USD — fixed cost on every ML listing

/**
 * Calculate ML price and profit given a known markup percentage.
 * Used for the per-row sample preview in MarginConfig.
 */
export function calcML(amazonUsd, markupPct, rate) {
  const profit = amazonUsd * (markupPct / 100);
  const mlUsd  = amazonUsd + profit + SHIPPING + INSURANCE;
  const mlCop  = Math.round(mlUsd * rate / 100) * 100;
  return { mlUsd, mlCop, profit };
}

/**
 * Calculate ML price and profit for a product.
 * Rule matching: exact range first, then round up to next range, then last rule.
 *
 * @param {number} amazonUsd  - Amazon price in USD
 * @param {Array}  rules      - margin rules from the API (min_price, max_price, markup_pct)
 * @param {number} rate       - current USD → COP exchange rate
 * @returns {{ mlUsd, mlCop, profit, markupPct, rule } | null}
 */
export function calcPrice(amazonUsd, rules, rate) {
  if (!rules.length || !rate) return null;
  const rule = rules.find(r => r.min_price <= amazonUsd && amazonUsd <= r.max_price)
            || rules.find(r => r.min_price > amazonUsd)
            || rules[rules.length - 1];
  if (!rule) return null;
  const profit = amazonUsd * (rule.markup_pct / 100);
  const mlUsd  = amazonUsd + profit + SHIPPING + INSURANCE;
  const mlCop  = Math.round(mlUsd * rate / 100) * 100;
  return { mlUsd, mlCop, profit, markupPct: rule.markup_pct, rule };
}
