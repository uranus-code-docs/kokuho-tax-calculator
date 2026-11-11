import type { AgeClass } from '../domain/types';
import type { Ruleset } from '../schema/ruleset.schema';

/** 'YYYY-MM-DD' → UTC ミリ秒。不正なら NaN */
export function parseDate(iso: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return NaN;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const d = new Date(t);
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]) ? t : NaN;
}

/**
 * 年齢区分（市のExcel準拠）
 *  65歳以上: 年度の1/1時点で65歳以上（生年月日 <= (年度-65)/1/1）
 *  未就学  : 生年月日 > (年度-6)/4/1
 *  18歳未満: 生年月日 > (年度-18)/4/1
 */
export function ageClassOf(birth: number, fiscalYear: number, cfg: Ruleset['ageClasses']): AgeClass {
  if (birth <= Date.UTC(fiscalYear - cfg.seniorAge, 0, 1)) return 'senior65';
  if (birth > Date.UTC(fiscalYear - cfg.preschoolAge, 3, 1)) return 'preschool';
  if (birth > Date.UTC(fiscalYear - cfg.minorAge, 3, 1)) return 'under18';
  return 'general';
}

/** 月の添字 0..11 → { 月番号(4..12,1..3), 暦年 } */
export function monthOf(fiscalYear: number, i: number): { m: number; y: number } {
  return { m: ((3 + i) % 12) + 1, y: i < 9 ? fiscalYear : fiscalYear + 1 };
}

/**
 * その月に国保の被保険者か（市のExcelの ●）。判定日は「翌月1日」。
 *  - 翌月1日時点でまだ生まれていない → 対象外
 *  - 翌月1日時点で75歳に達している（誕生日が翌月1日より前）→ 対象外。ちょうど翌月1日が75歳誕生日なら当月は対象
 */
export function isInsuredInMonth(birth: number, fiscalYear: number, i: number, cfg: Ruleset['ageClasses']): boolean {
  const { m, y } = monthOf(fiscalYear, i);
  if (birth >= Date.UTC(y, m, 1)) return false;
  return birth >= Date.UTC(y - cfg.retireAge, m, 1);
}

/** 年齢条件（介護の40〜64歳など）。判定日は翌月1日。minAge は「その日に満minAge歳以上」、maxAge は「その日に満maxAge歳以下」 */
export function meetsAgeRange(birth: number, fiscalYear: number, i: number, minAge?: number, maxAge?: number): boolean {
  const { m, y } = monthOf(fiscalYear, i);
  if (minAge !== undefined && !(birth <= Date.UTC(y - minAge, m, 1))) return false;
  if (maxAge !== undefined && !(birth > Date.UTC(y - (maxAge + 1), m, 1))) return false;
  return true;
}
