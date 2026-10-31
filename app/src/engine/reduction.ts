import type { ReductionRate } from '../domain/types';
import type { Ruleset } from '../schema/ruleset.schema';

export interface ReductionInput {
  judgementIncomeTotal: number; // 全員（後期高齢者へ移った人も含む）の軽判所得の合計
  insuredCount: number; // 被保険者数（最初に加入者がいる月の人数）
  salaryEarnerCount: number; // 給与所得者等の人数
  allDeclared: boolean;
  forcedRate?: ReductionRate;
}

export interface ReductionResult {
  rate: ReductionRate;
  thresholds: number[]; // 7割・5割・2割の順
}

/** 7割/5割/2割軽減の判定（Excel: 計算!M24〜M34） */
export function judgeReduction(rules: Ruleset, i: ReductionInput): ReductionResult {
  const r = rules.reduction;
  const extra = i.salaryEarnerCount === 0 ? 0 : (i.salaryEarnerCount - 1) * r.salaryEarnerExtraPerPerson;
  const thresholds = r.tiers.map((t) => t.base + extra + t.perInsured * i.insuredCount);
  if (i.forcedRate !== undefined) return { rate: i.forcedRate, thresholds };
  if (r.requiresDeclaration && !i.allDeclared) return { rate: 0, thresholds };
  for (let k = 0; k < r.tiers.length; k++) {
    if (i.judgementIncomeTotal <= thresholds[k]!) return { rate: r.tiers[k]!.rate, thresholds };
  }
  return { rate: 0, thresholds };
}
