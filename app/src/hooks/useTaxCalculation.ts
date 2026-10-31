import { useMemo } from 'react';
import type { CalcResult, HouseholdInput } from '../domain/types';
import { calculate } from '../engine/calculate';
import type { Ruleset } from '../schema/ruleset.schema';

/** 計算エンジンを呼ぶだけの薄いフック。入力が未完成（世帯主の生年月日なし）の間は null */
export function useTaxCalculation(rules: Ruleset | null, input: HouseholdInput | null): CalcResult | null {
  return useMemo(() => (rules && input ? calculate(rules, input) : null), [rules, input]);
}
