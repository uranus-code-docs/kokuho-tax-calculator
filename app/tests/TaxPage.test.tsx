// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { TaxPage } from '../src/pages/TaxPage';
import { formToInput, emptyMember } from '../src/domain/formToInput';
import { MUNICIPALITIES } from '../src/data/municipalities';

afterEach(cleanup);

const val = (c: HTMLElement, item: string) => c.querySelector(`[data-item="${item}"]`)?.getAttribute('data-item-val');
const change = (c: HTMLElement, sel: string, value: string) => {
  const el = c.querySelector(sel);
  if (!el) throw new Error(`not found: ${sel}`);
  fireEvent.change(el, { target: { value } });
};

describe('TaxPage（画面）', () => {
  it('公式の計算例を入力すると 401,700円 が表示される（旧版と同じ data-item 属性で出力）', async () => {
    const { container, findByText } = render(<TaxPage />);
    await findByText(/参考値/); // ルールセットの読み込み（Zod検証つき）が終わるまで待つ
    expect(container.textContent).toContain('世帯主の生年月日を入力すると');

    change(container, '#m0-birth', '1983-06-01');
    change(container, '#m0-other', '2500000');
    fireEvent.click(container.ownerDocument.evaluate("//button[contains(., '追加')]", container, null, 9, null).singleNodeValue!);
    fireEvent.click(container.ownerDocument.evaluate("//button[contains(., '追加')]", container, null, 9, null).singleNodeValue!);
    change(container, '#m1-relation', '妻（夫）');
    change(container, '#m1-birth', '1987-06-01');
    change(container, '#m2-relation', '子');
    change(container, '#m2-birth', '2013-06-01');

    await waitFor(() => expect(val(container, '国保税')).toBe('401,700'));
    expect(val(container, '医療分')).toBe('244,300');
    expect(val(container, '支援金分')).toBe('87,700');
    expect(val(container, '介護分')).toBe('60,100');
    expect(val(container, '子ども分')).toBe('9,600');
    // 内訳（旧版の data-item 規約）
    expect(val(container, '医療分-4')).toBe('140,760');
    expect(val(container, '医療分-7')).toBe('82,200');
    expect(val(container, '医療分-8')).toBe('21,400');
    expect(val(container, '子ども分-7')).toBe('2,600');
    expect(container.textContent).toContain('軽減なし');
  });

  it('75歳以上だけの世帯は「対象の方がいません」と表示する', async () => {
    const { container, findByText } = render(<TaxPage />);
    await findByText(/参考値/);
    change(container, '#m0-birth', '1940-01-01');
    await findByText(/国民健康保険の対象となる方がいません/);
    expect(val(container, '国保税')).toBeUndefined();
  });
});

describe('群馬県の市町村のページ', () => {
  const muni = (code: string) => MUNICIPALITIES.find((m) => m.code === code)!;

  it('高崎市は注意書き（市町村ごと）を出さず、メニューに35市町村のリンクがある', async () => {
    const { container, findByText } = render(<TaxPage />);
    await findByText(/参考値/);
    expect(container.textContent).not.toContain('の計算についてのご注意');
    expect(container.querySelectorAll('.nav-drawer__item a[href$=".html"]')).toHaveLength(35);
    expect(container.querySelector('a[aria-current="page"]')?.textContent).toBe('高崎市');
  });

  it('安中市（資産割あり）は固定資産税額の入力欄があり、資産割が計算に入る', async () => {
    const { container, findByText } = render(<TaxPage municipality={muni('102113')} />);
    await findByText(/確認中（試験版）/);
    expect(container.querySelector('h1')?.textContent).toContain('安中市');
    expect(container.textContent).toContain('資産割があります');
    change(container, '#m0-birth', '1980-06-01');
    change(container, '#m0-other', '3000000');
    change(container, '#m0-property', '100000');
    // 医療分の資産割 = 100,000円 × 24% = 24,000円
    await waitFor(() => expect(val(container, '医療分資産割')).toBe('24,000'));
  });

  it('情報が不足している昭和村は、県の資料による・限度額を仮定した、などの注意書きを出す', async () => {
    const { container, findByText } = render(<TaxPage municipality={muni('104485')} />);
    await findByText(/確認中（試験版）/);
    const t = container.textContent!;
    expect(t).toContain('昭和村の計算についてのご注意');
    expect(t).toContain('群馬県の資料');
    expect(t).toContain('子ども・子育て支援金分は、昭和村のホームページで確認できていない');
    expect(t).toContain('課税限度額は、国の基準額');
  });
});

describe('「?」ヘルプのバルーン', () => {
  it('クリックで開き、Escape・外側クリックで閉じる。アイコンは既存の .icon-help を使う', async () => {
    const { container, findByText, queryByRole, getByRole } = render(<TaxPage />);
    await findByText(/参考値/);
    const icon = getByRole('button', { name: '生年月日のヘルプ' });
    expect(icon.className).toContain('icon-help');
    expect(queryByRole('tooltip')).toBeNull();

    fireEvent.click(icon);
    expect(getByRole('tooltip').textContent).toContain('介護分（40〜64歳）');
    expect(icon.getAttribute('aria-expanded')).toBe('true');

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(queryByRole('tooltip')).toBeNull();

    fireEvent.click(icon);
    expect(queryByRole('tooltip')).not.toBeNull();
    fireEvent.pointerDown(container.querySelector('h1')!);
    expect(queryByRole('tooltip')).toBeNull();
  });
});

describe('formToInput（フォーム → エンジン入力）', () => {
  const base = { allDeclared: true, relief: 'none' as const };
  it('世帯主の生年月日がなければ null', () => {
    expect(formToInput({ ...base, members: [emptyMember(0, '本人')] }, 2026)).toBeNull();
  });
  it('世帯主以外は続柄と生年月日がそろった行だけ含める。空欄は undefined', () => {
    const members = [
      { ...emptyMember(0, '本人'), birthDate: '1980-01-01', other: '1000000' },
      { ...emptyMember(1, '子'), birthDate: '' },
      { ...emptyMember(2, ''), birthDate: '2010-01-01' },
      { ...emptyMember(3, '妻（夫）'), birthDate: '1982-02-02', joinMonth: '7' },
    ];
    const input = formToInput({ ...base, members }, 2026)!;
    expect(input.members.map((m) => m.relation)).toEqual(['本人', '妻（夫）']);
    expect(input.members[0]).toMatchObject({ otherIncome: 1_000_000, salaryIncome: undefined });
    expect(input.members[1]).toMatchObject({ joinMonth: 7 });
  });
});
