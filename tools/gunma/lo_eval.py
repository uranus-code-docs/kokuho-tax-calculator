"""市町村のExcelに入力値を入れて再計算し、指定セルの値を読み出す（LibreOffice UNO）。

LibreOffice 同梱の Python で実行する:
  C:\\LibreOffice\\program\\python.exe lo_eval.py <job.json> <result.json>

job.json:
  { "file": "xlsx/2026-102059.xlsx",
    "reset": ["記入用!B5:Q20", ...],            # 各ケースの前に空にする範囲
    "cases": [ { "set": { "記入用!B5": 12345, "記入用!C5": "×" } } ],
    "outputs": ["記入用!A24", ...] }
result.json:  [[出力値...], ...]（ケース順）
"""
import datetime
import json
import os
import subprocess
import sys
import time

import uno
from com.sun.star.beans import PropertyValue

SOFFICE = r"C:\LibreOffice\program\soffice.exe"
PIPE = "kokuho_lo_eval"


def prop(name, value):
    p = PropertyValue()
    p.Name, p.Value = name, value
    return p


def connect():
    local = uno.getComponentContext()
    resolver = local.ServiceManager.createInstanceWithContext("com.sun.star.bridge.UnoUrlResolver", local)
    url = f"uno:pipe,name={PIPE};urp;StarOffice.ComponentContext"
    for _ in range(60):
        try:
            return resolver.resolve(url)
        except Exception:
            time.sleep(0.5)
    raise RuntimeError("LibreOffice に接続できません")


def split(ref):
    sheet, addr = ref.rsplit("!", 1)
    return sheet.strip("'"), addr


def main(job_path, out_path):
    job = json.load(open(job_path, encoding="utf-8"))
    profile = "file:///" + os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "lo-profile")).replace("\\", "/")
    proc = subprocess.Popen([SOFFICE, "--headless", "--norestore", "--nologo", f"-env:UserInstallation={profile}", f"--accept=pipe,name={PIPE};urp;"])
    try:
        ctx = connect()
        desktop = ctx.ServiceManager.createInstanceWithContext("com.sun.star.frame.Desktop", ctx)
        url = uno.systemPathToFileUrl(os.path.abspath(job["file"]))
        # ReadOnly で開くとセルを空にする操作が効かないため、通常で開く（保存はしない）
        doc = desktop.loadComponentFromURL(url, "_blank", 0, (prop("Hidden", True),))
        sheets = doc.Sheets

        def rng(ref):
            s, a = split(ref)
            return sheets.getByName(s).getCellRangeByName(a)

        # 日付はブックの基準日（1900年起算 / 1904年起算）に合わせてシリアル値にする: {"date": "YYYY-MM-DD"}
        nd = doc.NullDate
        null_date = datetime.date(nd.Year, nd.Month, nd.Day)

        def to_serial(iso):
            return (datetime.date.fromisoformat(iso) - null_date).days

        def input_cells(ref):
            r = rng(ref)
            a = r.getRangeAddress()
            cells = []
            for row in range(a.EndRow - a.StartRow + 1):
                for col in range(a.EndColumn - a.StartColumn + 1):
                    c = r.getCellByPosition(col, row)
                    if c.getType().value != "FORMULA":
                        cells.append(c)
            return cells

        resets = [input_cells(ref) for ref in job.get("reset", [])]

        out = []
        for case in job["cases"]:
            doc.lockControllers()
            doc.enableAutomaticCalculation(False)
            # 前のケースの入力を消す。保護されたシートでは clearContents が効かないため、数式以外のセルを1つずつ空にする
            for r in resets:
                for c in r:
                    c.setFormula("")
            for ref, v in case["set"].items():
                c = rng(ref)
                if v is None:
                    c.clearContents(1 | 2 | 4)
                elif isinstance(v, dict) and "date" in v:
                    c.setValue(to_serial(v["date"]))
                elif isinstance(v, (int, float)):
                    c.setValue(v)
                else:
                    c.setString(str(v))
            doc.enableAutomaticCalculation(True)
            doc.calculateAll()
            doc.unlockControllers()
            row = []
            for ref in job["outputs"]:
                c = rng(ref)
                t = c.getType().value  # EMPTY, VALUE, TEXT, FORMULA
                if t == "FORMULA":
                    r = c.FormulaResultType2  # com.sun.star.sheet.FormulaResult: VALUE=1, STRING=2, ERROR=4
                    row.append(c.getValue() if r == 1 else ("#ERR " + c.getString() if r == 4 else c.getString()))
                elif t == "VALUE":
                    row.append(c.getValue())
                else:
                    row.append(c.getString())
            out.append(row)
        doc.close(True)
        json.dump(out, open(out_path, "w", encoding="utf-8"), ensure_ascii=False)
    finally:
        try:
            desktop.terminate()
        except Exception:
            pass
        time.sleep(1)
        proc.kill()


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
