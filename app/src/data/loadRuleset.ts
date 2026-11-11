import { RulesetSchema, type Ruleset } from '../schema/ruleset.schema';

// ルールセットは (年度, 団体コード) ごとに別ファイル。必要な1件だけを動的に読み込む（自治体が増えてもサイズが膨らまない）
const modules = import.meta.glob('./rulesets/*/*.json');

/** draft（確認中）のデータを本番で出してよいか。公開前の確認時だけ true にする: VITE_ALLOW_DRAFT=false で無効化 */
export const ALLOW_DRAFT = import.meta.env.VITE_ALLOW_DRAFT !== 'false';

export type RulesetLoad =
  | { state: 'ready'; rules: Ruleset }
  | { state: 'notReady'; reason: 'NOT_FOUND' | 'INVALID' | 'NOT_PUBLISHED' };

export async function loadRuleset(municipalityCode: string, fiscalYear: number): Promise<RulesetLoad> {
  const loader = modules[`./rulesets/${fiscalYear}/${municipalityCode}.json`];
  if (!loader) return { state: 'notReady', reason: 'NOT_FOUND' };
  try {
    const raw = ((await loader()) as { default: unknown }).default;
    const parsed = RulesetSchema.safeParse(raw);
    if (!parsed.success) {
      console.error('ルールセットの検証に失敗しました', parsed.error.issues);
      return { state: 'notReady', reason: 'INVALID' };
    }
    if (parsed.data.meta.status === 'draft' && !ALLOW_DRAFT) return { state: 'notReady', reason: 'NOT_PUBLISHED' };
    return { state: 'ready', rules: parsed.data };
  } catch (e) {
    console.error('ルールセットの読み込みに失敗しました', e);
    return { state: 'notReady', reason: 'NOT_FOUND' };
  }
}
