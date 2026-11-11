import type { MemberForm } from '../domain/formToInput';
import type { HouseholdRelief } from '../domain/types';
import type { useHouseholdForm } from '../hooks/useHouseholdForm';
import { HelpBalloon } from './HelpBalloon';
import { HELP } from './helpTexts';

type FormApi = ReturnType<typeof useHouseholdForm>;

const RELATIONS = ['妻（夫）', '子', '父母', 'その他'];
const MONTHS = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3];

function Label({ htmlFor, help, children }: { htmlFor: string; help: string; children: string }) {
  return (
    <label className="formset__input-child-label" htmlFor={htmlFor}>
      <span>
        {children}
        <HelpBalloon label={children} text={help} />
      </span>
    </label>
  );
}

function NumberField(props: { id: string; label: string; help: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="formset__input-child">
      <Label htmlFor={props.id} help={props.help}>{props.label}</Label>
      <div className="formset__input-child-body">
        <input id={props.id} type="number" inputMode="numeric" min={0} value={props.value} onChange={(e) => props.onChange(e.target.value)} />
        <span className="item--unit">{props.unit}</span>
      </div>
    </div>
  );
}

function MonthSelect(props: { id: string; label: string; help: string; blank: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="formset__input-child">
      <Label htmlFor={props.id} help={props.help}>{props.label}</Label>
      <div className="formset__input-child-body">
        <label className="select select--full-size">
          <select id={props.id} value={props.value} onChange={(e) => props.onChange(e.target.value)}>
            <option value="">{props.blank}</option>
            {MONTHS.map((m) => (
              <option key={m} value={m}>
                {m}月
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function MemberBlock({ m, index, form }: { m: MemberForm; index: number; form: FormApi }) {
  const set = (patch: Partial<MemberForm>) => form.updateMember(m.id, patch);
  const id = (k: string) => `m${m.id}-${k}`;
  const isHead = index === 0;
  return (
    <div className="formset__item style--like-adminLTE member-block">
      {/* 1行目: 続柄・生年月日・給与収入・削除（既存の「続柄」行と同じレイアウト） */}
      <div className="formset__input member-row">
        <div className="formset__input-child">
          <Label htmlFor={id('relation')} help={HELP.relation}>続柄</Label>
          <div className="formset__input-child-body">
            {isHead ? (
              <input id={id('relation')} type="text" value="本人" size={90} readOnly />
            ) : (
              <label className="select">
                <select id={id('relation')} value={m.relation} onChange={(e) => set({ relation: e.target.value })}>
                  <option value="">続柄</option>
                  {RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        </div>
        <div className="formset__input-child">
          <Label htmlFor={id('birth')} help={HELP.birthDate}>生年月日</Label>
          <div className="formset__input-child-body">
            <input id={id('birth')} type="date" value={m.birthDate} min="1900-01-01" onChange={(e) => set({ birthDate: e.target.value })} />
          </div>
        </div>
        <NumberField id={id('salary')} label="給与収入" help={HELP.salary} unit="円" value={m.salary} onChange={(v) => set({ salary: v })} />
        <div className="formset__input-child align--center">
          {!isHead && (
            <button type="button" className="input-add" onClick={() => form.removeMember(m.id)}>
              <i className="ion-android-cancel icon-del"></i>
              <span>削除</span>
            </button>
          )}
        </div>
      </div>
      {/* 2行目: 年金収入・その他所得 */}
      <div className="formset__input member-row">
        <NumberField id={id('pension')} label="年金収入" help={HELP.pension} unit="円" value={m.pension} onChange={(v) => set({ pension: v })} />
        <NumberField id={id('other')} label="その他所得" help={HELP.other} unit="円" value={m.other} onChange={(v) => set({ other: v })} />
      </div>
      {/* 3行目（必要な人だけ）: 年度途中の加入月・脱退月 */}
      {form.showEnrollment && (
        <div className="formset__input member-row">
          <MonthSelect id={id('join')} label="加入月" help={HELP.joinMonth} blank="4月から" value={m.joinMonth} onChange={(v) => set({ joinMonth: v })} />
          <MonthSelect id={id('leave')} label="脱退月" help={HELP.leaveMonth} blank="3月まで" value={m.leaveMonth} onChange={(v) => set({ leaveMonth: v })} />
        </div>
      )}
    </div>
  );
}

export function HouseholdFormSection({ form, fiscalYear }: { form: FormApi; fiscalYear: number }) {
  return (
    <>
      <div className="c-head">
        <h2 className="c-head__ttl">
          <i className="fa-solid fa-pen-to-square"></i>
          <span>所得</span>
        </h2>
      </div>

      <div className="formset">
        {form.members.map((m, i) => (
          <MemberBlock key={m.id} m={m} index={i} form={form} />
        ))}

        <div className="formset__item style--like-adminLTE">
          <div className="formset__input formset__ui">
            <button type="button" className="input-add" onClick={form.addMember} disabled={!form.canAdd}>
              <i className="ion-android-add icon-add"></i>
              <span>追加</span>
            </button>
          </div>
        </div>

        <div className="formset__item style--like-adminLTE">
          <div className="formset__input member-row member-row--2">
            <div className="formset__input-child">
              <label className="formset__input-child-label" htmlFor="household-declared">
                <span>
                  所得の申告状況
                  <HelpBalloon label="所得の申告状況" text={HELP.declared} />
                </span>
              </label>
              <div className="formset__input-child-body">
                <label className="select select--full-size">
                  <select id="household-declared" value={form.allDeclared ? 'yes' : 'no'} onChange={(e) => form.setAllDeclared(e.target.value === 'yes')}>
                    <option value="yes">全員申告済み</option>
                    <option value="no">未申告者有り</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="formset__input-child">
              <label className="formset__input-child-label" htmlFor="household-relief">
                <span>
                  平等割の軽減
                  <HelpBalloon label="平等割の軽減" text={HELP.relief} />
                </span>
              </label>
              <div className="formset__input-child-body">
                <label className="select select--full-size">
                  <select id="household-relief" value={form.relief} onChange={(e) => form.setRelief(e.target.value as HouseholdRelief)}>
                    <option value="none">軽減なし</option>
                    <option value="half">1/2軽減</option>
                    <option value="quarter">1/4軽減</option>
                  </select>
                </label>
              </div>
            </div>
          </div>
          <label className="member-block__check">
            <input type="checkbox" checked={form.showEnrollment} onChange={(e) => form.setShowEnrollment(e.target.checked)} /> 年度の途中で加入・脱退した人がいる
          </label>
        </div>

        <div className="formset__txt">
          <ul className="list-notes">
            <li>前年（令和{fiscalYear - 2018 - 1}年）の1月〜12月の収入や所得を入力してください。</li>
            <li>「生年月日」は必ず入力してください。世帯主以外は「続柄」と「生年月日」を入力した人だけが計算されます。</li>
            <li>
              「<i className="ion-android-add icon-add"></i> <span>追加</span>」ボタンで入力欄を増やせます。
            </li>
            <li>
              <a href="#notice">下記の注意書きもお読みください。</a>
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
