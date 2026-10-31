import { useEffect, useState } from 'react';
import { loadRuleset, type RulesetLoad } from '../data/loadRuleset';

export type RulesetState = { state: 'loading' } | RulesetLoad;

/** (団体コード, 年度) のルールセットを読み込み、Zodで検証した結果の状態を返す */
export function useRuleset(municipalityCode: string, fiscalYear: number): RulesetState {
  const [result, setResult] = useState<RulesetState>({ state: 'loading' });
  useEffect(() => {
    let cancelled = false;
    setResult({ state: 'loading' });
    loadRuleset(municipalityCode, fiscalYear).then((r) => {
      if (!cancelled) setResult(r);
    });
    return () => {
      cancelled = true;
    };
  }, [municipalityCode, fiscalYear]);
  return result;
}
