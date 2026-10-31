export type CategoryId = 'medical' | 'support' | 'care' | 'child'; // 医療・後期支援・介護・子ども
export type AgeClass = 'preschool' | 'under18' | 'general' | 'senior65'; // 未就学 / 18歳未満 / 一般 / 65歳以上
export type ReductionRate = 0 | 0.2 | 0.5 | 0.7;
export type HouseholdRelief = 'none' | 'half' | 'quarter';

/** 4月〜翌3月の12要素。true=その月に加入（脱退月は false）。省略時は全て true */
export type MonthMask = readonly boolean[];

export interface Member {
  relation: string; // 表示用（本人/妻/子…）
  birthDate: string; // 'YYYY-MM-DD'
  salaryIncome?: number; // 給与収入（源泉徴収票の支払金額）
  pensionIncome?: number; // 公的年金収入
  otherIncome?: number; // その他所得（営業・農業・不動産等。必要経費控除後）
  propertyTax?: number; // 固定資産税額（資産割がある自治体用）
  salarySpecialRelief?: boolean; // 特例軽減該当（世帯主以外の給与所得×0.3）
  joinMonth?: number; // 年度途中の加入月（4〜12, 1〜3）。省略は4月から
  leaveMonth?: number; // 年度途中の脱退月（その月は加入していない）。省略は3月まで
  enrollment?: MonthMask; // 12か月マスクを直接指定する場合（joinMonth/leaveMonth より優先）
}

export interface HouseholdInput {
  fiscalYear: number; // 令和8年度 → 2026
  members: Member[]; // 世帯主を先頭に。最大8人（Excel準拠）
  allDeclared: boolean; // 「全員申告済み」。false だと軽減判定をしない
  householdRelief?: HouseholdRelief; // 平等割の1/2・1/4軽減
  forcedReductionRate?: ReductionRate; // 強制軽減
}

export interface CategoryResult {
  id: CategoryId;
  label: string;
  insuredMonths: number; // 延べ加入月数（人×月）
  headcount: number; // 1か月でも対象になった人数（画面の「◯名」）
  memberIndexes: number[]; // その対象者（入力の添字）
  perCapitaUnit: number; // 均等割 1人当たり（軽減後・一般の人）
  incomeLevy: number; // 所得割（年額・月ごとの按分後の合計）
  assetLevy: number;
  perCapitaLevy: number;
  perHouseholdLevy: number;
  subtotal: number; // 限度額前の年額（円）
  capApplied: boolean; // 1か月でも限度額に達した
  amount: number; // 最終（限度額・100円未満切り捨て後）
}

export interface MemberResult {
  relation: string;
  ageClass: AgeClass;
  salaryIncome: number; // 給与所得（控除後）
  pensionIncome: number; // 年金所得
  totalIncome: number; // 所得計
  taxableBase: number; // 課税標準（所得 − 基礎控除、0以上）
  judgementIncome: number; // 軽減判定所得
  isSalaryEarner: boolean; // 給与所得者等
}

export type Warning =
  | { code: 'CAP_REACHED'; category: CategoryId }
  | { code: 'SALARY_OVER_8_5M'; member: number }
  | { code: 'NOT_DECLARED' };

export interface CalcSuccess {
  ok: true;
  total: number;
  categories: Record<CategoryId, CategoryResult>;
  members: MemberResult[];
  reduction: {
    rate: ReductionRate;
    judgementIncome: number;
    insuredCount: number;
    salaryEarnerCount: number;
    thresholds: number[]; // 7割・5割・2割の順
  };
  warnings: Warning[];
}
export interface CalcFailure {
  ok: false;
  reason: 'NO_INSURED' | 'INVALID_INPUT';
  detail?: string;
}
export type CalcResult = CalcSuccess | CalcFailure;
