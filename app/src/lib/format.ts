const nf = new Intl.NumberFormat('ja-JP');

/** 3桁区切り（円） */
export const yen = (n: number): string => nf.format(n);

/** 円 → 万円（切り捨て）。計算式の表示を見やすくするための簡略表示 */
export const man = (n: number): string => nf.format(Math.floor(n / 10000));
