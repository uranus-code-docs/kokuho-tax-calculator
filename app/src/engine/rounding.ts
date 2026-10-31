/** 浮動小数の誤差（例: 3,000,000×0.7 = 2099999.9999…）で切り捨てが1円ずれないようにする */
const EPS = 1e-7;

export const floorSafe = (x: number): number => Math.floor(x + EPS);

export interface RoundingRule {
  unit: number;
  mode: 'floor' | 'round' | 'ceil';
}

export function applyRounding(x: number, rule: RoundingRule): number {
  const q = x / rule.unit;
  const n = rule.mode === 'floor' ? floorSafe(q) : rule.mode === 'round' ? Math.round(q) : Math.ceil(q - EPS);
  return n * rule.unit;
}

/** ROUND(円/12, 2) を「銭（1/100円）」の整数で返す（Excelの月割りと同じ）。小数の足し算の誤差を避ける */
export const monthlyCents = (yen: number): number => Math.round((yen / 12) * 100);

/** 限度額/12 の小数第2位（銭）。Excelは区分によって ROUND / ROUNDDOWN が違う */
export function capMonthlyCents(cap: number, mode: 'round' | 'floor'): number {
  const v = (cap / 12) * 100;
  return mode === 'round' ? Math.round(v) : floorSafe(v);
}

/** 銭 → 円（ROUND(x, 0)） */
export const centsToYenRound = (cents: number): number => Math.floor((cents + 50) / 100);

export const floor100 = (yen: number): number => Math.floor(yen / 100) * 100;
