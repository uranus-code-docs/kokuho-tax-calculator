/** 月番号（4〜12, 1〜3）→ 年度内の添字（4月=0 … 3月=11） */
const order = (month: number): number => (month >= 4 ? month - 4 : month + 8);

/**
 * 年度途中の加入月・脱退月 → 12か月マスク（市のExcel「年度途中加入月」「年度途中脱退月」と同じ意味）
 *  - 加入月: その月から加入（その月を含む）。省略は4月から
 *  - 脱退月: その月は加入していない（その月の前月まで）。省略は3月まで
 */
export function enrollmentMask(joinMonth?: number, leaveMonth?: number): boolean[] {
  const from = joinMonth === undefined ? 0 : order(joinMonth);
  const to = leaveMonth === undefined ? 12 : order(leaveMonth);
  return Array.from({ length: 12 }, (_, i) => i >= from && i < to);
}
