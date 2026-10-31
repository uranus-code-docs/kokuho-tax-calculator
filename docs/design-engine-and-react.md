# 設計案: 計算エンジン・JSONスキーマ・React化

対象: 国保税試算アプリ（高崎市デモ → 市区町村単位で拡大）
前提資料: [takasaki-excel-analysis.md](takasaki-excel-analysis.md)（市のExcelの解析）/ [implementation-guide.md](implementation-guide.md)（旧jQuery版の解説）
状態: 設計案（未実装）。確認が必要な点は「12. 未決事項」にまとめた。

---

## 1. 設計の原則

1. **計算は純粋なTypeScript関数**にする（Reactにも jQuery にも依存しない）。Node でも動くので、テストと自動検証ができる。
2. **自治体ごとの違いは JSON（ルールセット）で表す。** コードは「部品」だけ持つ。JSONに式文字列やコードは入れない。
3. **JSONは必ず Zod で検証**してから使う。AIが作ったJSONも同じ検証を通す。
4. **公開してよいデータは `status: "published"` のみ。** 未整備・未検証の自治体は試算を出さない（推測値は出さない）。
5. **見た目は変えない。** 既存CSSをそのまま使う（既存CSSは `data-item` / `data-item-val` 属性に依存しているので、React側でも同じ属性を出力する）。
6. **Excelを正解にして自動検証**する（`tools/oracle/` の仕組みを継続して使う）。

## 2. 全体構成（レイヤー）

```
[ルールセットJSON] --Zod検証--> [計算エンジン(純TS)] --> [Reactフック(薄い接着層)] --> [UIコンポーネント]
        ↑                              ↑
   AI生成/人が確認              Excelで自動検証(HyperFormula/LibreOffice)
```

### ディレクトリ案

```
app/                              # 新Reactアプリ (Vite + React + TypeScript)
  src/
    domain/                       # 型定義だけ。依存なし
      types.ts                    #   入力・結果・年齢区分などの型
      ruleset.ts                  #   ルールセットの型 (Zod から z.infer で導出)
    schema/
      ruleset.schema.ts           #   Zod スキーマ（唯一の正）
    engine/                       # 計算エンジン。React を import しない
      calculate.ts                #   エントリ: calculate(ruleset, input)
      steps/
        ageClass.ts               #   年齢区分の判定
        income.ts                 #   収入 → 所得
        taxableBase.ts            #   課税標準（基礎控除）
        reduction.ts              #   7割/5割/2割軽減の判定
        category.ts               #   区分ごとの税額（所得割・均等割・平等割）
        cap.ts                    #   限度額
        rounding.ts               #   端数処理
    data/
      rulesets/
        index.json                #   対応自治体の一覧と status
        2026/102024.json          #   令和8年度 高崎市（団体コード102024）
    hooks/                        # React との接着層（ロジックは持たない）
      useRuleset.ts               #   JSON取得 + 検証 + 状態(loading/ready/notReady)
      useHouseholdForm.ts         #   フォームの state（世帯員の追加・削除）
      useTaxCalculation.ts        #   calculate を useMemo で呼ぶだけ
    components/
      HouseholdForm/              #   世帯員の入力
      MemberRow/
      ResultSummary/              #   国保税の合計
      CategoryBreakdown/          #   区分ごとの内訳（旧 data-item の表示）
      IncomeBreakdown/            #   被保険者ごとの課税所得の計算式
      ReductionNotice/            #   軽減の表示
      LimitNotice/                #   限度額到達の表示（alert をやめる）
      RulesetStatusBanner/        #   準備中・参考値の表示
      Disclaimer/                 #   免責
      AdSlot/                     #   広告枠（高さ固定）
    pages/
      TaxPage.tsx                 #   組み立てのみ
    styles/                       #   既存CSSを移植（変更しない）
  tests/
    golden/                       #   Excelから生成した期待値
    engine.test.ts                #   Vitest
tools/oracle/                     # 既存: Excelから期待値を作る
docs/
```

団体コードは総務省の全国地方公共団体コード（6桁）を使う。高崎市は `102024`（市のExcelのファイル名とも一致）。

## 3. Geminiの助言の評価と、このプロジェクト向けの修正

助言（ロジックをカスタムフックに分離、UIを小さなコンポーネントに分割、型定義を厳密に）は**方向は正しい**。ただしこのプロジェクトでは次の点を変える。

| 助言 | このプロジェクトでの扱い |
|---|---|
| ビジネスロジックをカスタムフックに分離 | **一段階進めて、純粋関数（`engine/`）に分離。** フックは薄い接着層にする。フックは React 上でしか動かず、Nodeでのテストや自動検証に使えないため。 |
| UIを責務ごとに小さなコンポーネントに | そのまま採用（2章の構成）。 |
| TypeScriptの型定義をしっかり | 採用。さらに **Zodで実行時検証**（JSONは外部入力なので型だけでは足りない）。 |
| （助言になし） | **ルールセットJSON**、**status管理**、**Excel照合テスト**は、自治体拡大のために必須。 |

## 4. ドメイン型（入力・結果）

```ts
// domain/types.ts
export type CategoryId = 'medical' | 'support' | 'care' | 'child';   // 医療・後期支援・介護・子ども
export type AgeClass = 'preschool' | 'under18' | 'general' | 'senior65'; // 未就学 / 18歳未満 / 一般 / 65歳以上

export interface Member {
  relation: string;               // 表示用（本人/妻/子…）
  birthDate: string;              // 'YYYY-MM-DD'（年齢区分と介護対象の判定に必須）
  salaryIncome?: number;          // 給与収入（円）
  pensionIncome?: number;         // 公的年金収入（円）
  otherIncome?: number;           // その他所得（円・必要経費控除後）
  propertyTax?: number;           // 固定資産税額（資産割がある自治体用）
  salarySpecialRelief?: boolean;  // 特例軽減該当（Excelの「特例軽減該当」）
  enrollment?: MonthMask;         // 年度途中加入・脱退（省略=年間加入）※第2段階で実装
}

/** 4月〜翌3月の12要素。true=加入。省略時は全て true */
export type MonthMask = readonly boolean[];

export interface HouseholdInput {
  fiscalYear: number;                          // 令和8年度 → 2026
  members: Member[];                           // 世帯主を先頭に。最大8人（Excel準拠）
  allDeclared: boolean;                        // 「全員申告済み」。falseだと軽減判定をしない
  householdRelief?: 'none' | 'half' | 'quarter'; // 平等割の1/2・1/4軽減（特定世帯・特定継続世帯）
  forcedReductionRate?: 0 | 0.2 | 0.5 | 0.7;   // 強制軽減（Excelの強制軽減適用）
}

export interface CalcResult {
  ok: true;
  total: number;                    // 年税額
  categories: Record<CategoryId, CategoryResult | null>; // 対象外(介護など)は null
  members: MemberResult[];          // 画面の「課税所得の計算式」用
  reduction: { rate: 0 | 0.2 | 0.5 | 0.7; judgementIncome: number; thresholds: number[] };
  warnings: Warning[];              // 限度額到達・給与850万超など
}
export type CalcFailure = { ok: false; reason: 'NO_INSURED' | 'INVALID_INPUT'; detail?: string };

export interface CategoryResult {
  insuredCount: number;
  incomeBase: number;      // 所得割の課税標準（世帯合計）
  incomeLevy: number;      // 所得割額
  assetLevy: number;       // 資産割額（率0なら0）
  perCapitaLevy: number;   // 均等割額（合計）
  perHouseholdLevy: number;// 平等割額
  subtotal: number;        // 限度額・端数処理前の合計
  capApplied: boolean;
  amount: number;          // 最終（端数処理・限度額後）
}
export interface MemberResult {
  relation: string;
  ageClass: AgeClass;
  salaryIncome: number;    // 給与所得（控除後）
  pensionIncome: number;   // 年金所得
  totalIncome: number;     // 所得計
  taxableBase: number;     // 課税標準（所得 − 基礎控除、0以上）
  careEligible: boolean;
}
export type Warning =
  | { code: 'CAP_REACHED'; category: CategoryId }
  | { code: 'SALARY_OVER_8_5M'; member: number }   // 所得金額調整控除に非対応
  | { code: 'NOT_DECLARED' };                      // 未申告のため軽減なし
```

> 現行UIは「年齢＋所得」だけ入力していたが、Excelの再現には**生年月日**が必要（未就学・18歳未満・65歳以上・介護の40〜64歳を月単位で判定するため）。「かんたん入力（年齢→概算の生年月日、所得を直接入力）」を別モードで用意する案は「12. 未決事項」に挙げた。

## 5. ルールセットJSON（スキーマ）

### 5-1. 例（高崎市・令和8年度・抜粋）

> 実装済みの正式版は [app/src/data/rulesets/2026/102024.json](../app/src/data/rulesets/2026/102024.json)、スキーマは [app/src/schema/ruleset.schema.ts](../app/src/schema/ruleset.schema.ts)。下の例は設計時のもので、実装で次の点を変えた: `rounding` ブロックは廃止（端数処理はエンジン内で Excel 準拠に固定）、各区分に `capMonthlyRounding` を追加、`ageClasses` に年齢の基準値を持たせた、`capMode` は `monthly` のみ。

```jsonc
{
  "schemaVersion": 1,
  "meta": {
    "municipalityCode": "102024",
    "municipalityName": "高崎市",
    "fiscalYear": 2026,
    "levyType": "tax",                       // "tax"=国保税 / "premium"=国保料
    "status": "draft",                        // draft | reviewed | published
    "sources": [
      { "title": "国民健康保険税の計算", "url": "https://www.city.takasaki.gunma.jp/page/3607.html", "retrievedAt": "2026-10-05" },
      { "title": "国民健康保険税試算表(Excel)", "url": "https://www.city.takasaki.gunma.jp/page/3607.html", "retrievedAt": "2026-10-05" }
    ],
    "verifiedAt": null,
    "reviewer": null
  },
  "ageClasses": { "preschoolBornAfter": "04-01", "adultAge": 18, "seniorAge": 65 },
  "basicDeduction": 430000,
  "income": {
    "salaryDeduction": [
      { "from": 0,       "round": null,                   "rate": 0, "subtract": 0 },
      { "from": 651000,  "round": null,                   "rate": 1,   "subtract": 650000 },
      { "from": 1900000, "round": { "unit": 4000, "mode": "floor" }, "rate": 0.7, "subtract": 80000 },
      { "from": 3600000, "round": { "unit": 4000, "mode": "floor" }, "rate": 0.8, "subtract": 440000 },
      { "from": 6600000, "round": null,                   "rate": 0.9, "subtract": 1100000 },
      { "from": 8500000, "round": null,                   "rate": 1,   "subtract": 1950000 }
    ],
    "pensionDeduction": {
      "under65": [
        { "from": 1,       "rate": 1.00, "subtract": 600000 },
        { "from": 1300000, "rate": 0.75, "subtract": 275000 },
        { "from": 4100000, "rate": 0.85, "subtract": 685000 },
        { "from": 7700000, "rate": 0.95, "subtract": 1455000 },
        { "from": 10000001,"rate": 1.00, "subtract": 1955000 }
      ],
      "over65": [
        { "from": 1,       "rate": 1.00, "subtract": 1100000 },
        { "from": 3300000, "rate": 0.75, "subtract": 275000 },
        { "from": 4100000, "rate": 0.85, "subtract": 685000 },
        { "from": 7700000, "rate": 0.95, "subtract": 1455000 },
        { "from": 10000001,"rate": 1.00, "subtract": 1955000 }
      ]
    },
    "salaryPensionOffset": { "perItemCap": 100000 },    // 給与所得+年金所得の併用控除
    "salarySpecialReliefFactor": 0.3                    // 特例軽減該当の世帯主以外は給与所得×0.3
  },
  "reduction": {
    "judgementPensionExtraDeduction": 150000,           // 65歳以上の年金所得から引く額（軽減判定用）
    "salaryEarnerCriteria": { "salary": 550000, "pensionUnder65": 600000, "pension65Plus": 1250000 },
    "salaryEarnerExtraPerPerson": 100000,               // (給与所得者等の人数 − 1) × この額
    "tiers": [
      { "rate": 0.7, "base": 430000, "perInsured": 0 },
      { "rate": 0.5, "base": 430000, "perInsured": 310000 },
      { "rate": 0.2, "base": 430000, "perInsured": 570000 }
    ],
    "requiresDeclaration": true
  },
  "householdRelief": {
    "half":    { "factor": 0.5,  "appliesTo": ["medical", "support", "child"] },
    "quarter": { "factor": 0.75, "appliesTo": ["medical", "support", "child"] }
  },
  "categories": [
    {
      "id": "medical", "label": "医療分",
      "incomeRate": 6.8, "assetRate": 0,
      "perCapita": { "amount": 27400, "ageMultiplier": { "preschool": 0.5 } },
      "perHousehold": 21400,
      "cap": 670000,
      "eligibility": {}
    },
    {
      "id": "support", "label": "後期高齢者支援金分",
      "incomeRate": 2.5, "assetRate": 0,
      "perCapita": { "amount": 9700, "ageMultiplier": { "preschool": 0.5 } },
      "perHousehold": 6900,
      "cap": 260000,
      "eligibility": {}
    },
    {
      "id": "care", "label": "介護分（40〜64歳）",
      "incomeRate": 2.1, "assetRate": 0,
      "perCapita": { "amount": 10600 },
      "perHousehold": 6100,
      "cap": 170000,
      "eligibility": { "minAge": 40, "maxAge": 64 },
      "householdReliefApplies": false
    },
    {
      "id": "child", "label": "子ども・子育て支援金分",
      "incomeRate": 0.3, "assetRate": 0,
      "perCapita": { "amount": 1300, "ageMultiplier": { "preschool": 0, "under18": 0 } },
      "perHousehold": 800,
      "cap": 30000,
      "eligibility": {}
    }
  ],
  "rounding": {
    "perItem":       { "unit": 1,   "mode": "floor" },   // 個人ごと・項目ごと
    "categoryTotal": { "unit": 100, "mode": "floor" }    // 区分の合計
  },
  "capMode": "monthly"        // 月ごとに min(月額, 限度額/12)
}
```

要点:
- **子ども分の均等割 1,300円** は「1,200円 + 18歳以上均等割100円」の合算（解析メモ参照）。18歳未満と未就学は倍率 0 で表す。
- 未就学の5割減（医療・支援）は `ageMultiplier`。軽減率（7/5/2割）と**掛け合わせて1回だけ切り捨て**る（Excelは `floor(額 × (1−未就学減) × (1−軽減率))`）。
- 給与所得控除は「区間ごとの `round / rate / subtract`」で、Excelの区間式（例: `floor(収入/4000)*4000*0.7−80000`）を表現する。
- 高崎市は資産割が0だが、他自治体のため `assetRate` と `propertyTax` を最初から持つ。

### 5-2. Zodスキーマ（骨子）

```ts
// schema/ruleset.schema.ts
import { z } from 'zod';

const Rounding = z.object({ unit: z.number().int().positive(), mode: z.enum(['floor', 'round', 'ceil']) });
const Bracket = z.object({
  from: z.number().nonnegative(),
  round: Rounding.nullable().optional(),
  rate: z.number().min(0).max(1),
  subtract: z.number().nonnegative(),
});
const CategoryId = z.enum(['medical', 'support', 'care', 'child']);
const AgeClass = z.enum(['preschool', 'under18', 'general', 'senior65']);

export const CategoryRule = z.object({
  id: CategoryId,
  label: z.string(),
  incomeRate: z.number().min(0).max(100),
  assetRate: z.number().min(0).max(100).default(0),
  perCapita: z.object({
    amount: z.number().nonnegative(),
    ageMultiplier: z.partialRecord(AgeClass, z.number().min(0).max(1)).optional(),
  }),
  perHousehold: z.number().nonnegative(),
  cap: z.number().positive(),
  eligibility: z.object({ minAge: z.number().int().optional(), maxAge: z.number().int().optional() }),
  householdReliefApplies: z.boolean().default(true),
});

export const RulesetSchema = z.object({
  schemaVersion: z.literal(1),
  meta: z.object({
    municipalityCode: z.string().regex(/^\d{6}$/),
    municipalityName: z.string(),
    fiscalYear: z.number().int(),
    levyType: z.enum(['tax', 'premium']),
    status: z.enum(['draft', 'reviewed', 'published']),
    sources: z.array(z.object({ title: z.string(), url: z.string().url(), retrievedAt: z.string() })).min(1),
    verifiedAt: z.string().nullable(),
    reviewer: z.string().nullable(),
  }),
  // …（ageClasses / basicDeduction / income / reduction / householdRelief / categories / rounding / capMode）
}).superRefine((r, ctx) => {
  // 例: published なら verifiedAt と reviewer が必須
  if (r.meta.status === 'published' && (!r.meta.verifiedAt || !r.meta.reviewer)) {
    ctx.addIssue({ code: 'custom', message: 'published には verifiedAt と reviewer が必要' });
  }
});

export type Ruleset = z.infer<typeof RulesetSchema>;
```

- **型は Zod から導出**する（型とスキーマの二重管理を避ける）。
- JSON Schema が必要なら `zod-to-json-schema` 等で出力し、AIへの指示や人のレビュー用に配布できる（採用前にバージョンと互換性を確認）。
- `z.partialRecord` はZodのバージョンにより API が違うので、導入時に確認すること。

## 6. 計算エンジンの設計

### 6-1. API

```ts
// engine/calculate.ts
export function calculate(rules: Ruleset, input: HouseholdInput): CalcResult | CalcFailure;
```

- **副作用なし・状態なし。** 同じ入力は必ず同じ結果。
- 金額はすべて整数の円で扱う（小数は途中の按分でのみ。必要なら `decimal.js`）。端数処理は `rounding.ts` に集約し、**JSONの `rounding` 設定に従う**（コード中に `Math.floor` を散在させない）。

### 6-2. 処理ステップ（Excelの計算シートに対応）

| # | ステップ | 内容 | Excel対応 |
|---|---|---|---|
| 1 | `ageClass` | 1/1時点で未就学/18歳未満/一般/65歳以上、介護対象(40〜64歳)、後期高齢者(75歳以上は対象外) | 計算!B列, AO5列 |
| 2 | `income` | 給与所得（控除表）、年金所得（控除表）、併用控除、その他所得 | D〜K列 |
| 3 | `taxableBase` | 所得計 − 基礎控除（0以上）。介護分用も同様 | N, O, P列 |
| 4 | `reduction` | 軽減判定所得、給与所得者等の人数、7/5/2割の判定 | Q, R, M24〜M34 |
| 5 | `category` | 区分ごとの所得割・資産割・均等割・平等割 | T〜AM列 |
| 6 | `cap` | 限度額（`capMode`で年額/月割り） | BE〜BR列 |
| 7 | `rounding` | 区分合計を100円未満切り捨て、合計 | R28, R33, R38, R43 |

各ステップは `(rules, input, prev) => next` の純粋関数にして、ステップ単位でテストできるようにする。結果オブジェクトには画面表示用の途中経過（所得割の課税標準、被保険者ごとの課税所得など）を全部載せる（旧 `data-item` 表示のため）。

### 6-3. 拡張の仕方（自治体が増えたとき）

- **データだけで済むもの**: 税率・金額・限度額・軽減の基準額・控除表・端数処理（unit/mode）・年齢条件・区分の追加（`categories` に1件足す）。
- **エンジンに部品を足すもの**（頻度は低い想定）: 4方式の資産割以外の賦課方式、独自の減免、納期（期別額）の出力、月割りの端数ルールの違い。
  部品は `kind` で区別する判別共用体（discriminated union）で増やし、**既存の自治体のJSONが壊れない**ようにする（`schemaVersion` を上げるときは移行手順を残す）。

### 6-5. 限度額の測定結果（市のExcelとの比較）

Excelの限度額の仕組み（計算シート BE〜BR列を解読）:
```
月の合計 M_m = 所得割_m + 資産割_m + 均等割_m + 平等割_m   （各項目 ROUND(円/12, 2)）
月の限度 capM = 限度額/12 を小数第2位に丸めたもの（医療分=四捨五入、支援金・介護・子ども=切り捨て）
区分の年額 = 100円未満切り捨て( ROUND( Σ_月 min(M_m, capM) , 0) )
```
- 世帯の加入状況が1年間変わらなければ、毎月同じ額なので「年額の頭打ち」と一致する。
- **年度内に40歳・65歳・75歳に達する人などがいて月ごとに被保険者が変わると、年額の頭打ちはずれる。** 1か月でも限度額に達した231件のうち、年額で頭打ちにした簡易式がExcelと違ったのは7件（`app/tests/cap-measure.test.ts`で再現可能）。差は数千円〜約2.8万円（例: 介護分 Excel 113,300円 / 年額頭打ち 141,300円）。
- したがって**エンジンは月ごとに判定する実装にした**（`engine/calculate.ts`）。ルールセットの `capMonthlyRounding` で、限度額/12 の丸め方（round/floor）を区分ごとに持つ。

### 6-4. 段階的な実装範囲

- **第1段階（実装済み・`app/`）**: ステップ1〜7を実装。限度額は**月割り**（下記の測定結果に基づく）。年度途中の加入月・脱退月（`Member.joinMonth` / `leaveMonth`）も実装済みで、Excelとの照合も済み（ゴールデン287件）。加入月はその月から、脱退月はその月は含まない。
- **第2段階**: 加入月・脱退月の入力UI（照合は済み）。1人が加入→脱退→再加入する中抜け期間はExcelも非対応（注意文のみ）なので扱わない。
- **第3段階**: 平等割の1/2・1/4軽減の根拠確認、条例減免、特定同一世帯所属者の軽減判定。

## 7. 安全な挙動（データがない・怪しいとき）

| 状況 | 挙動 |
|---|---|
| 自治体のJSONが存在しない | 「準備中」＋公式サイトへのリンク。試算は出さない |
| `status: draft` | 本番では非表示（開発時のみ表示可） |
| `status: reviewed` | 「参考値」バナーを表示して試算 |
| `status: published` | 通常表示（`verifiedAt` を画面に出す） |
| Zod検証に失敗 | 「準備中」扱い。エラーはログに出し、ユーザーには詳細を出さない |
| 年度が切り替わって新年度JSONがない | 前年度の数値で試算する場合は「前年度の税率で試算しています」と必ず表示 |
| 世帯員が全員75歳以上など加入者なし | `NO_INSURED` を返し、「国保の対象となる方がいません」と表示 |
| 限度額到達 | `alert` をやめ、画面内に常時表示する（`LimitNotice`） |

画面には常に免責を表示する（「概算です。実際の税額は市の通知書によります」）。

## 8. テスト戦略（Excelを正解にする）

```
tools/oracle/  ──(Excel + 入力パターン)──> tests/golden/<団体コード>-<年度>.json
                                                       │
app/tests/engine.test.ts  ── calculate(ruleset, 入力) と期待値を比較 ──┘
```

- **ゴールデンデータ**: `tools/oracle/compare.mjs` の仕組みで、ランダム＋境界値の入力と、Excelが出した期待値を JSON に保存する。エンジンのテスト（Vitest）はそれを読むだけなので高速。
- **境界値を意図的に入れる**: 軽減の基準額ちょうどと±1円、限度額ちょうど、年齢の切り替わり（3/31と4/1生まれ、40歳・65歳・75歳到達月）、給与所得控除の区間境界、世帯員0人・8人。
- **公式の試算例**（3607ページの3人世帯: 合計401,700円）を第1号テストにする。
- **LibreOfficeとの突き合わせ**は、新しい自治体の追加時と年度更新時にだけ実行する（遅いため）。
- **公開の条件**: 「Excelとゴールデン一致」＋「公式試算例一致（あれば）」＋「人の承認（reviewer, verifiedAt）」。

## 9. React実装の方針

### 9-1. フックは薄く

```ts
// hooks/useTaxCalculation.ts
export function useTaxCalculation(rules: Ruleset | null, input: HouseholdInput) {
  return useMemo(() => (rules ? calculate(rules, input) : null), [rules, input]);
}
```

```ts
// hooks/useHouseholdForm.ts
// members の追加/削除/更新、allDeclared、householdRelief の state だけを持つ。計算はしない。
```

```ts
// hooks/useRuleset.ts
// (municipalityCode, fiscalYear) → fetch → RulesetSchema.safeParse → status を判定して
// { state: 'loading' | 'ready' | 'notReady', rules?, reason? } を返す。
```

### 9-2. 既存の見た目を保つ

既存CSS（`style-extension.css`（[app/public/common/css/](../app/public/common/css/)））は `[data-item="医療分-4"]::before { content: attr(data-item-val) }` のような形で値を表示している。React側では**同じ `data-item` / `data-item-val` を JSX で出力**すれば、CSSを変えずに済む。
- 旧コードの DOM クローン（`.clone()`、`:eq(0)`、幅合わせ `.width()`）は、世帯員の配列を `.map()` で描画する形に置き換える（幅合わせはCSSで対応する）。
- 世帯員の追加/削除（`data-add-template` のクローン）は、`members` 配列の state で表現する。
- 入力の `name="所得:続柄"` などは、フォームの field 名として維持するか、state 管理に置き換える（見た目は同じ）。

### 9-3. 旧コードとの対応

| 旧(jQuery) | 新(React/TS) |
|---|---|
| `calcTax()`（約250行、3区分のコピペ） | `engine/calculate.ts`（区分は JSON の配列でループ） |
| 税率などのローカル変数 | ルールセットJSON |
| `$('[data-item=...]').attr('data-item-val', ...)` | JSXで `data-item-val={...}` を出力 |
| `alert('限度額を越えている')` | `LimitNotice` コンポーネント |
| `$('#form1').trigger('change')` | state の更新で自動再計算 |
| `common.js` の `numberFormat`/`price10k`/`floor100orLess` | `engine/rounding.ts` と `lib/format.ts` |

## 10. ビルドと配置

- Vite + React + TypeScript の**静的ビルド**（HTML/JS/CSS）。現行は PHP/`.htaccess` の静的サイトなので、ビルド成果物をそのまま置ける（URLは `/10/` 配下などを要確認）。
- ルールセットJSONは `app/src/data/rulesets/` に置き、ビルド時に同梱するか、`public/data/` に置いて実行時に fetch する（自治体が増えると全部同梱はサイズが膨らむため、**実行時に必要な1件だけ取得**する案を推奨）。
- 広告（`AdSlot`）は高さを固定した枠にして、レイアウトのズレを防ぐ。税額の数字の直前には置かない。

## 11. 作業の進め方（AIへの指示テンプレート）

Geminiの助言を、このプロジェクト用に直したもの。

> 以下の `docs/design-engine-and-react.md` と `docs/takasaki-excel-analysis.md` に従って実装してください。
> 1. 計算は `engine/` の純粋なTypeScript関数にし、React・DOMに依存させない。
> 2. 自治体ごとの数値・表・軽減基準は、Zodで検証するJSON（ルールセット）から読む。コードに直書きしない。
> 3. フック（`hooks/`）は state と呼び出しの接着だけにし、計算ロジックを書かない。
> 4. UIは `components/` に責務ごとに小さく分け、既存CSSが依存する `data-item` / `data-item-val` 属性を同じ名前で出力する。
> 5. 型は `any` を使わず、型は Zod から導出する。
> 6. Excelの期待値（`tests/golden/`）と一致するテストを必ず書く。

## 12. 未決事項

1. **入力モード**: Excel準拠の「生年月日＋給与収入/年金収入/その他所得」だけにするか、現行UIに近い「年齢＋所得」の簡易モードも用意するか。簡易モードは未就学・18歳未満の境界で誤差が出うる。
2. ~~第1段階の限度額~~ → **月割りに決定**（測定結果は「6-5. 限度額の測定結果」）。
3. **団体コードの扱い**: 6桁の全国地方公共団体コードで確定してよいか（旧高崎・旧吉井などの地区別税率は扱わない前提）。
4. **ルールセットの配信**: ビルド同梱か、実行時にfetchするか。
5. **平等割の1/2・1/4軽減**: 高崎市の根拠確認と、第1段階で入れるか。
6. **基礎控除（43万円）と給与所得控除（最低保障65万円）**: 令和8年度に変更がないか、高崎市の公式資料で確認が必要。
7. **React化とデータ整備の順序**: 先にエンジン＋テスト（画面なし）を作り、その後にReact UIをつなぐ順序を推奨。
