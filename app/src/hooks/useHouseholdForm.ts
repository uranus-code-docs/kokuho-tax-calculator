import { useCallback, useMemo, useRef, useState } from 'react';
import { emptyMember, formToInput, type MemberForm } from '../domain/formToInput';
import type { HouseholdInput, HouseholdRelief } from '../domain/types';

const MAX_MEMBERS = 8;

/** フォームの状態だけを持つ。計算はしない（計算は engine） */
export function useHouseholdForm(fiscalYear: number) {
  const nextId = useRef(1);
  const [members, setMembers] = useState<MemberForm[]>([emptyMember(0, '本人')]);
  const [allDeclared, setAllDeclared] = useState(true);
  const [relief, setRelief] = useState<HouseholdRelief>('none');
  const [showEnrollment, setShowEnrollment] = useState(false);

  const addMember = useCallback(() => {
    setMembers((ms) => (ms.length >= MAX_MEMBERS ? ms : [...ms, emptyMember(nextId.current++)]));
  }, []);
  const removeMember = useCallback((id: number) => {
    setMembers((ms) => ms.filter((m, i) => i === 0 || m.id !== id));
  }, []);
  const updateMember = useCallback((id: number, patch: Partial<MemberForm>) => {
    setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }, []);

  const input: HouseholdInput | null = useMemo(
    () => formToInput({ members, allDeclared, relief }, fiscalYear),
    [members, allDeclared, relief, fiscalYear],
  );

  return {
    members,
    allDeclared,
    relief,
    showEnrollment,
    canAdd: members.length < MAX_MEMBERS,
    addMember,
    removeMember,
    updateMember,
    setAllDeclared,
    setRelief,
    setShowEnrollment,
    input,
  };
}
