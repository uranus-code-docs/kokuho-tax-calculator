import { Footer, Header, PageHead } from '../components/Layout';
import { HouseholdFormSection } from '../components/HouseholdForm';
import { Breakdown, IncomeBreakdown, ResultSummary } from '../components/Results';
import { CaveatNotice, IncompleteHint, LimitNotice, NoInsuredNotice, NoticeSection, NotReady, RulesetStatusBanner } from '../components/Notices';
import { DEFAULT_MUNICIPALITY, MUNICIPALITIES, type MunicipalityEntry } from '../data/municipalities';
import { useHouseholdForm } from '../hooks/useHouseholdForm';
import { useRuleset } from '../hooks/useRuleset';
import { useTaxCalculation } from '../hooks/useTaxCalculation';

const FISCAL_YEAR = 2026;
const DEFAULT = MUNICIPALITIES.find((m) => m.code === DEFAULT_MUNICIPALITY)!;

/** ページの組み立てだけ。ロジックは hooks / engine にある。市町村はページ（HTML）ごとに決まる */
export function TaxPage({ municipality = DEFAULT }: { municipality?: MunicipalityEntry }) {
  const ruleset = useRuleset(municipality.code, FISCAL_YEAR);
  const form = useHouseholdForm(FISCAL_YEAR);
  const rules = ruleset.state === 'ready' ? ruleset.rules : null;
  const result = useTaxCalculation(rules, form.input);
  const reiwa = FISCAL_YEAR - 2018;
  const title = `${municipality.name}の国民健康保険税の計算（令和${reiwa}年度）`;
  const hasAssetLevy = rules?.categories.some((c) => c.assetRate > 0) ?? false;

  return (
    <div className="wrap sub" id="top">
      <Header current={municipality.code} />
      <PageHead title={title} lead="国民健康保険税を計算できます。" />

      <section className="contact">
        <div className="l-container">
          <div className="form-box">
            <form id="form1" onSubmit={(e) => e.preventDefault()}>
              {ruleset.state === 'notReady' && <NotReady reason={ruleset.reason} municipalityName={municipality.name} />}
              {rules && <RulesetStatusBanner rules={rules} />}
              {rules && <CaveatNotice rules={rules} />}

              <HouseholdFormSection form={form} fiscalYear={FISCAL_YEAR} showPropertyTax={hasAssetLevy} />

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

              <NoticeSection fiscalYear={FISCAL_YEAR} rules={rules} />
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
