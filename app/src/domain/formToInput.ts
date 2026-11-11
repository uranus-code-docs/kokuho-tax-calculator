import type { HouseholdInput, HouseholdRelief, Member } from './types';

/** 画面の入力欄1人分（文字列のまま持つ。空欄を表現するため） */
export interface MemberForm {
  id: number;
  relation: string; // '本人' | '妻（夫）' | '子' …。空なら未入力の行（計算に含めない）
  birthDate: string; // 'YYYY-MM-DD' or ''
  salary: string;
  pension: string;
  other: string;
  joinMonth: string; // '' or '5'..'12','1'..'3'
  leaveMonth: string;
}

export interface HouseholdForm {
  members: MemberForm[];
  allDeclared: boolean;
  relief: HouseholdRelief;
}

export const emptyMember = (id: number, relation = ''): MemberForm => ({
  id,
  relation,
  birthDate: '',
  salary: '',
  pension: '',
  other: '',
  joinMonth: '',
  leaveMonth: '',
});

const num = (s: string): number | undefined => {
  if (s.trim() === '') return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
};
const month = (s: string): number | undefined => {
  const n = num(s);
  return n !== undefined && Number.isInteger(n) && n >= 1 && n <= 12 ? n : undefined;
};

/**
 * フォーム → エンジンの入力。
 * 世帯主（先頭）の生年月日が未入力なら null（計算しない）。
 * 世帯主以外は「続柄」と「生年月日」がそろった行だけを計算に含める（旧版と同じく、続柄がない行は無視）。
 */
export function formToInput(form: HouseholdForm, fiscalYear: number): HouseholdInput | null {
  const head = form.members[0];
  if (!head || head.birthDate === '') return null;
  const members: Member[] = [];
  form.members.forEach((m, i) => {
    if (i > 0 && (m.relation === '' || m.birthDate === '')) return;
    members.push({
      relation: i === 0 ? '本人' : m.relation,
      birthDate: m.birthDate,
      salaryIncome: num(m.salary),
      pensionIncome: num(m.pension),
      otherIncome: num(m.other),
      joinMonth: month(m.joinMonth),
      leaveMonth: month(m.leaveMonth),
    });
  });
  return { fiscalYear, members, allDeclared: form.allDeclared, householdRelief: form.relief };
}
