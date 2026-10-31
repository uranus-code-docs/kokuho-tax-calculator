import type { CalcSuccess } from '../domain/types';
import type { Ruleset } from '../schema/ruleset.schema';
import { yen } from '../lib/format';

/** 限度額に達した区分の表示（旧版の alert の代わりに、画面内に常時表示する） */
export function LimitNotice({ result, rules }: { result: CalcSuccess; rules: Ruleset }) {
  const reached = result.warnings.flatMap((w) => (w.code === 'CAP_REACHED' ? [w.category] : []));
  if (reached.length === 0) return null;
  return (
    <div className="app-notice" role="status">
      {reached.map((id) => {
        const c = rules.categories.find((x) => x.id === id)!;
        return (
          <p key={id}>
            {c.label}は、年税額の限度額（{yen(c.cap)}円）を超えているため、限度額で計算しています。
          </p>
        );
      })}
    </div>
  );
}

export function RulesetStatusBanner({ rules }: { rules: Ruleset }) {
  const { status, municipalityName, fiscalYear } = rules.meta;
  if (status === 'published') return null;
  const label = status === 'draft' ? '確認中（試験版）' : '参考値';
  return (
    <div className="app-notice app-notice--status" role="status">
      <p>
        {municipalityName}の令和{fiscalYear - 2018}年度の計算ルールは<strong>{label}</strong>です。実際の税額と異なる場合があります。
      </p>
    </div>
  );
}

export function NotReady({ reason, municipalityName }: { reason: string; municipalityName: string }) {
  return (
    <div className="app-notice" role="status">
      <p>
        {municipalityName}の試算は準備中です。{reason === 'INVALID' && '（データの検証に失敗したため表示できません）'}
        詳しくは市の公式サイトをご確認ください。
      </p>
    </div>
  );
}

export function IncompleteHint() {
  return (
    <div className="app-notice app-notice--info" role="status">
      <p>世帯主の生年月日を入力すると、計算結果が表示されます。</p>
    </div>
  );
}

export function NoInsuredNotice() {
  return (
    <div className="app-notice" role="status">
      <p>国民健康保険の対象となる方がいません（75歳以上の方は後期高齢者医療制度の対象です）。</p>
    </div>
  );
}

export function NoticeSection({ fiscalYear }: { fiscalYear: number }) {
  return (
    <>
      <div className="c-head" id="notice">
        <h2 className="c-head__ttl">
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>ご注意</span>
        </h2>
      </div>
      <div className="formset">
        <div className="formset__txt">
          <ul className="list-ol">
            <li>生年月日は必ず入力してください。（年齢区分や、介護分の対象の判定に使います。）</li>
            <li>給与収入は、源泉徴収票の支払金額を入力してください。</li>
            <li>年金収入（公的年金）は、源泉徴収票の支払金額を入力してください。（遺族年金、障害年金は除いてください。）</li>
            <li>その他所得の営業、農業、その他の事業、不動産等は、必要経費を除いた所得金額を合計して入力してください。</li>
            <li>前年（令和{fiscalYear - 2018 - 1}年）の1月〜12月の収入や所得を入力してください。</li>
          </ul>
          <ul className="list-notes">
            <li>医療分、支援金分、介護分、子ども分の各税額は、100円未満は切り捨てです。</li>
            <li>40歳から64歳の人は介護分が掛かります。</li>
            <li>所得に応じた7割・5割・2割の軽減は、「全員申告済み」の場合に判定します。</li>
            <li>年度の途中で加入・脱退した場合は、月割りで計算します。</li>
            <li>給与収入850万円超えの所得金額調整控除は対応していません。</li>
            <li>公的年金以外の合計所得が1,000万円を超えた場合は対応していません。</li>
            <li>特定同一世帯所属者（旧国保被保険者）の軽減判定及び条例減免には対応していません。</li>
            <li>この計算は分離譲渡所得等の申告がある場合には使えません。</li>
            <li>計算式では一部の金額を見やすくするため簡略化した金額で表示しています。</li>
            <li>計算結果は概算となります。実際の税額と違う場合があります。</li>
            <li>
              この計算機は、高崎市ウェブサイトの
              <a href="https://www.city.takasaki.gunma.jp/page/3608.html" target="_blank" rel="noreferrer">
                国民健康保険税の算定
              </a>
              、および
              <a href="https://www.city.takasaki.gunma.jp/page/3607.html" target="_blank" rel="noreferrer">
                国民健康保険税の計算
              </a>
              を参考に作られています。
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
