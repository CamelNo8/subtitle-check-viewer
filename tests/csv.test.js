import { test } from "node:test";
import assert from "node:assert/strict";

import { formatCsv, parseCsv } from "../src/csv.js";

// formatCsv: 正常系

test("表を渡すと欄をカンマ・行をCRLFで区切った文字になる", () => {
  const rows = [
    ["a", "b"],
    ["c", "d"],
  ];

  const text = formatCsv(rows);

  assert.equal(text, "a,b\r\nc,d\r\n");
});

test("カンマを含む欄はダブルクォートで囲まれる", () => {
  const rows = [["00:00:01,000", "x"]];

  const text = formatCsv(rows);

  assert.equal(text, '"00:00:01,000",x\r\n');
});

test("ダブルクォートを含む欄は囲まれて中のダブルクォートが2つになる", () => {
  const rows = [['<font color="#FFFF00">']];

  const text = formatCsv(rows);

  assert.equal(text, '"<font color=""#FFFF00"">"\r\n');
});

test("改行を含む欄は囲まれて改行はそのまま残る", () => {
  const rows = [["一行目\n二行目"]];

  const text = formatCsv(rows);

  assert.equal(text, '"一行目\n二行目"\r\n');
});

// formatCsv: 境界値

test("空の欄は何も書かれない", () => {
  const rows = [["a", "", "b"]];

  const text = formatCsv(rows);

  assert.equal(text, "a,,b\r\n");
});

test("行が0件なら空文字になる", () => {
  const text = formatCsv([]);

  assert.equal(text, "");
});

// formatCsv: 異常系

test("文字列でない欄を渡すとTypeErrorになる", () => {
  const rows = [["a", 1]];

  assert.throws(() => formatCsv(rows), TypeError);
});

// parseCsv: 正常系

test("CRLFで区切られたCSVを読むと表になる", () => {
  const text = "a,b\r\nc,d\r\n";

  const rows = parseCsv(text);

  assert.deepEqual(rows, [
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("LFだけで区切られたCSVも同じ表になる", () => {
  const text = "a,b\nc,d\n";

  const rows = parseCsv(text);

  assert.deepEqual(rows, [
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("囲まれた欄の中のカンマ・二重のダブルクォート・改行は元の文字に戻る", () => {
  const text = '"1,000","say ""hi""","一行目\r\n二行目"\r\n';

  const rows = parseCsv(text);

  assert.deepEqual(rows, [["1,000", 'say "hi"', "一行目\r\n二行目"]]);
});

test("formatCsvで作った文字を読むと元の表に戻る", () => {
  const original = [
    ["番号", "字幕"],
    ["1", '<font color="#FFFF00">こん,にちは</font>\n（拍手）'],
    ["2", ""],
  ];

  const rows = parseCsv(formatCsv(original));

  assert.deepEqual(rows, original);
});

// parseCsv: 境界値

test("最後に改行がなくても最後の行を読む", () => {
  const text = "a,b\r\nc,d";

  const rows = parseCsv(text);

  assert.deepEqual(rows, [
    ["a", "b"],
    ["c", "d"],
  ]);
});

test("空文字を読むと空の表になる", () => {
  const rows = parseCsv("");

  assert.deepEqual(rows, []);
});

test("空の欄は空文字として読む", () => {
  const rows = parseCsv("a,,b");

  assert.deepEqual(rows, [["a", "", "b"]]);
});

// parseCsv: 異常系

test("ダブルクォートが閉じていないとErrorになる", () => {
  const text = 'a,"bc\r\n';

  assert.throws(() => parseCsv(text), /「"」が閉じていません/);
});

test("文字列でないものを渡すとTypeErrorになる", () => {
  assert.throws(() => parseCsv(null), TypeError);
});
