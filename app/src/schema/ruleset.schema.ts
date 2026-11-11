import { z } from 'zod';

const Rounding = z.object({ unit: z.number().int().positive(), mode: z.enum(['floor', 'round', 'ceil']) });

/** 区間表: from 以上の最後の区間を使う。 値 = (round適用後の額) × rate − subtract （0未満は0） */
const Bracket = z.object({
  from: z.number().nonnegative(),
  round: Rounding.nullable().optional(),
  rate: z.number().min(0).max(1),
  subtract: z.number().nonnegative(),
});

const CategoryId = z.enum(['medical', 'support', 'care', 'child']);

const AgeMultiplier = z.object({
  preschool: z.number().min(0).max(1).optional(),
  under18: z.number().min(0).max(1).optional(),
  general: z.number().min(0).max(1).optional(),
  senior65: z.number().min(0).max(1).optional(),
});

const CategoryRule = z.object({
  id: CategoryId,
  label: z.string(),
  incomeRate: z.number().min(0).max(100), // %
  assetRate: z.number().min(0).max(100).default(0), // %
  perCapita: z.object({ amount: z.number().nonnegative(), ageMultiplier: AgeMultiplier.optional() }),
  perHousehold: z.number().nonnegative(),
  cap: z.number().positive(), // 年間の限度額
  capMonthlyRounding: z.enum(['round', 'floor']), // 限度額/12 の小数第2位の丸め（市のExcelは区分で違う）
  eligibility: z.object({ minAge: z.number().int().optional(), maxAge: z.number().int().optional() }),
  householdReliefApplies: z.boolean().default(true),
});

export const RulesetSchema = z
  .object({
    schemaVersion: z.literal(1),
    meta: z.object({
      municipalityCode: z.string().regex(/^\d{6}$/),
      municipalityName: z.string(),
      fiscalYear: z.number().int(),
      levyType: z.enum(['tax', 'premium']),
      status: z.enum(['draft', 'reviewed', 'published']),
      sources: z.array(z.object({ title: z.string(), url: z.string().url(), retrievedAt: z.string() })).min(1),
      verifiedAt: z.string().nullable(),
      reviewer: z.string().nullable(),
    }),
    ageClasses: z.object({
      seniorAge: z.number().int(),
      preschoolAge: z.number().int(),
      minorAge: z.number().int(),
      retireAge: z.number().int(),
    }),
    basicDeduction: z.number().nonnegative(),
    income: z.object({
      salaryDeduction: z.array(Bracket).min(1),
      pensionDeduction: z.object({ under65: z.array(Bracket).min(1), over65: z.array(Bracket).min(1) }),
      salaryPensionOffset: z.object({ perItemCap: z.number().nonnegative() }),
      salarySpecialReliefFactor: z.number().min(0).max(1),
    }),
    reduction: z.object({
      judgementPensionExtraDeduction: z.number().nonnegative(),
      salaryEarnerCriteria: z.object({ salary: z.number(), pensionUnder65: z.number(), pension65Plus: z.number() }),
      salaryEarnerExtraPerPerson: z.number().nonnegative(),
      tiers: z
        .array(z.object({ rate: z.union([z.literal(0.7), z.literal(0.5), z.literal(0.2)]), base: z.number(), perInsured: z.number() }))
        .length(3),
      requiresDeclaration: z.boolean(),
    }),
    householdRelief: z.object({
      half: z.object({ factor: z.number() }),
      quarter: z.object({ factor: z.number() }),
    }),
    categories: z.array(CategoryRule).min(1),
    capMode: z.enum(['monthly']), // 月ごとに min(月額, 限度額/12)。年間加入では年額の頭打ちと一致する
  })
  .superRefine((r, ctx) => {
    if (r.meta.status === 'published' && (!r.meta.verifiedAt || !r.meta.reviewer)) {
      ctx.addIssue({ code: 'custom', message: 'published には verifiedAt と reviewer が必要' });
    }
  });

export type Ruleset = z.infer<typeof RulesetSchema>;
export type CategoryRuleT = z.infer<typeof CategoryRule>;
