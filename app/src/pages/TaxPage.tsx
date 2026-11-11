import { Footer, Header, PageHead } from '../components/Layout';
import { HouseholdFormSection } from '../components/HouseholdForm';
import { Breakdown, IncomeBreakdown, ResultSummary } from '../components/Results';
import { IncompleteHint, LimitNotice, NoInsuredNotice, NoticeSection, NotReady, RulesetStatusBanner } from '../components/Notices';
import { useHouseholdForm } from '../hooks/useHouseholdForm';
import { useRuleset } from '../hooks/useRuleset';
import { useTaxCalculation } from '../hooks/useTaxCalculation';

const MUNICIPALITY = { code: '102024', name: '高崎市' };
const FISCAL_YEAR = 2026;

/** ページの組み立てだけ。ロジックは hooks / engine にある */
export function TaxPage() {
  const ruleset = useRuleset(MUNICIPALITY.code, FISCAL_YEAR);
  const form = useHouseholdForm(FISCAL_YEAR);
  const rules = ruleset.state === 'ready' ? ruleset.rules : null;
  const result = useTaxCalculation(rules, form.input);
  const reiwa = FISCAL_YEAR - 2018;
  const title = `${MUNICIPALITY.name}の国民健康保険税の計算（令和${reiwa}年度）`;

  return (
    <div className="wrap sub" id="top">
      <Header />
      <PageHead title={title} lead="国民健康保険税を計算できます。" />

      <section className="contact">
        <div className="l-container">
          <div className="form-box">
            <form id="form1" onSubmit={(e) => e.preventDefault()}>
              {ruleset.state === 'notReady' && <NotReady reason={ruleset.reason} municipalityName={MUNICIPALITY.name} />}
              {rules && <RulesetStatusBanner rules={rules} />}

              <HouseholdFormSection form={form} fiscalYear={FISCAL_YEAR} />

              {rules && !form.input && <IncompleteHint />}
              {result && !result.ok && result.reason === 'NO_INSURED' && <NoInsuredNotice />}
              {rules && result && result.ok && (
                <>
                  <ResultSummary result={result} allDeclared={form.allDeclared} />
                  <LimitNotice result={result} rules={rules} />
                  <Breakdown result={result} rules={rules} />
                  <IncomeBreakdown result={result} />
                </>
              )}

              <NoticeSection fiscalYear={FISCAL_YEAR} />
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
