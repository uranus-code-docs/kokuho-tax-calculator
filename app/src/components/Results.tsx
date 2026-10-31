import type { CalcSuccess, CategoryId, CategoryResult } from '../domain/types';
import type { Ruleset } from '../schema/ruleset.schema';
import { man, yen } from '../lib/format';

/** 既存CSS（style-extension.css）が data-item 名で値を表示するため、同じ名前を使う */
const PREFIX: Record<CategoryId, string> = { medical: '医療分', support: '支援金分', care: '介護分', child: '子ども分' };
const CATEGORY_ORDER: CategoryId[] = ['medical', 'support', 'care', 'child'];
const REDUCTION_LABEL: Record<number, string> = { 0: '軽減なし', 0.2: '２割軽減', 0.5: '５割軽減', 0.7: '７割軽減' };

const Plus = () => <i className="icon-math icon-math-plus">＋</i>;
const Equal = () => <i className="icon-math icon-math-equal">＝</i>;

export function ResultSummary({ result, allDeclared }: { result: CalcSuccess; allDeclared: boolean }) {
  const c = result.categories;
  return (
    <>
      <div className="c-head">
        <h2 className="c-head__ttl">
          <i className="fa-solid fa-calculator"></i>
          <span>計算結果</span>
        </h2>
      </div>
      <div className="formset">
        <div className="formset__item formset__item--head head--fill">
          <div className="formset__ttl">
            <span>国保税</span>
          </div>
        </div>
        <div className="formset__item formset__item--thick">
          <div className="formset__ttl">
            <span>年税額</span>
          </div>
          <div className="formset__input">
            <div className="c-equation">
              <span className="item--result" data-item="国保税" data-item-val={yen(result.total)}>
                円
              </span>
              <Equal />
              {CATEGORY_ORDER.map((id, i) => (
                <span key={id} className="c-equation__term">
                  {i > 0 && <Plus />}
                  <span>{c[id].label.replace(/（.*）/, '')}</span>
                  <span className="item--result" data-item={PREFIX[id]} data-item-val={yen(c[id].amount)}>
                    円
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="formset__item formset__item--thin">
          <div className="formset__ttl">
            <span>国保加入者数</span>
          </div>
          <div className="formset__input">
            <span data-item="医療分-6" data-item-val={result.reduction.insuredCount}>
              人
            </span>
          </div>
        </div>
        <div className="formset__item formset__item--thin">
          <div className="formset__ttl">
            <span>軽減該当</span>
          </div>
          <div className="formset__input">
            {REDUCTION_LABEL[result.reduction.rate]}
            {!allDeclared && <small>（未申告者がいるため、所得に応じた軽減は判定されません）</small>}
          </div>
        </div>
      </div>
    </>
  );
}

function CategoryBlock(props: { cat: CategoryResult; rules: Ruleset; result: CalcSuccess; startNo: number }) {
  const { cat, rules, result, startNo } = props;
  const p = PREFIX[cat.id];
  const catRule = rules.categories.find((c) => c.id === cat.id)!;
  const [n1, n2, n3] = [startNo, startNo + 1, startNo + 2];
  const unitTimesCount = cat.perCapitaUnit * cat.headcount;
  return (
    <div className="formset">
      <div className="formset__item formset__item--thick">
        <div className="formset__ttl">
          <span>{cat.label}</span>
        </div>
        <div className="formset__input">
          <div className="c-equation">
            <span className="item--result" data-item={`${p}-9`} data-item-val={yen(cat.amount)}>
              円
            </span>
            <Equal />
            <span>（{n1}）所得割額</span>
            <Plus />
            <span>（{n2}）均等割額</span>
            <Plus />
            <span>（{n3}）平等割額</span>
          </div>
        </div>
      </div>

      <div className="formset__item formset__item--thin">
        <div className="formset__ttl">
          <span>（{n1}）所得割額</span>
        </div>
        <div className="formset__input">
          <div className="c-equation">
            <span className="item--result" data-item={`${p}-4`} data-item-val={yen(cat.incomeLevy)}>
              円
            </span>
            <Equal />
            <span className="c-equation__inline-stack" data-item={`${p}課税所得`}>
              {cat.memberIndexes.length === 0 ? (
                <span>対象者なし</span>
              ) : (
                cat.memberIndexes.map((k) => {
                  const m = result.members[k]!;
                  return (
                    <span key={k} data-item={`${p}課税所得の計算`}>
                      <span data-item="課税所得の計算の続柄" data-item-val={m.relation}></span>
                      <span className="item--result" data-item="課税所得の計算の小計" data-item-val={man(m.taxableBase)}>
                        万円
                      </span>
                      <i>（</i>
                      <span>所得</span>
                      <span data-item={`${p}-1`} data-item-val={man(m.totalIncome)}>
                        万円
                      </span>
                      <i className="icon-math icon-math-minus">－</i>
                      <span>基礎控除</span>
                      <span data-item={`${p}-2`} data-item-val={man(rules.basicDeduction)}>
                        万円
                      </span>
                      <i>）</i>
                    </span>
                  );
                })
              )}
            </span>
            <i className="icon-math icon-math-times">×</i>
            <span data-item={`${p}-3`} data-item-val={catRule.incomeRate}>
              ％
            </span>
          </div>
        </div>
      </div>

      <div className="formset__item formset__item--thin">
        <div className="formset__ttl">
          <span>（{n2}）均等割額</span>
        </div>
        <div className="formset__input">
          <div className="c-equation">
            <span className="item--result" data-item={`${p}-7`} data-item-val={yen(cat.perCapitaLevy)}>
              円
            </span>
            <Equal />
            <span data-item={`${p}-5`} data-item-val={yen(cat.perCapitaUnit)}>
              円（1人当たり）
            </span>
            <i className="icon-math icon-math-times">×</i>
            <span data-item={`${p}-6`} data-item-val={cat.headcount}>
              名
            </span>
          </div>
          {unitTimesCount !== cat.perCapitaLevy && <small className="app-note">※年齢（未就学児・18歳未満）や加入月による調整後の合計です</small>}
        </div>
      </div>

      <div className="formset__item formset__item--thin">
        <div className="formset__ttl">
          <span>（{n3}）平等割額</span>
        </div>
        <div className="formset__input">
          <div className="c-equation">
            <span className="item--result" data-item={`${p}-8`} data-item-val={yen(cat.perHouseholdLevy)}>
              円
            </span>
            <span>（1世帯当たり）</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Breakdown({ result, rules }: { result: CalcSuccess; rules: Ruleset }) {
  return (
    <>
      <div className="c-head">
        <h2 className="c-head__ttl">
          <i className="fa-regular fa-paste"></i>
          <span>計算の内訳</span>
        </h2>
      </div>
      {CATEGORY_ORDER.map((id, i) => (
        <CategoryBlock key={id} cat={result.categories[id]} rules={rules} result={result} startNo={i * 3 + 1} />
      ))}
    </>
  );
}

/** 収入 → 所得 の計算結果（給与所得控除・公的年金等控除の適用後） */
export function IncomeBreakdown({ result }: { result: CalcSuccess }) {
  return (
    <div className="formset">
      <div className="formset__item formset__item--thick">
        <div className="formset__ttl">
          <span>所得の計算</span>
        </div>
        <div className="formset__input">
          {result.members.map((m, i) => (
            <div key={i} className="c-equation income-row">
              <span>{m.relation}</span>
              <span className="item--result">{yen(m.totalIncome)}円</span>
              <Equal />
              <span>給与所得 {yen(m.salaryIncome)}円</span>
              <Plus />
              <span>年金所得 {yen(m.pensionIncome)}円</span>
              <Plus />
              <span>その他 {yen(m.totalIncome - m.salaryIncome - m.pensionIncome)}円</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
