import { test } from "node:test";
import assert from "node:assert/strict";

import { buildReviewCsv, makeReviewCsvFileName, restoreReviews } from "../src/review-csv.js";

const BOM = "﻿";
const HEADER = "番号,開始時刻,終了時刻,字幕,コメント,修正案\r\n";

const subtitles = [
  { number: 1, startMs: 1000, endMs: 3500, text: "こんにちは" },
  { number: 2, startMs: 4000, endMs: 6000, text: "（拍手）" },
];

// buildReviewCsv: 正常系

test("字幕2件のうち1件にコメントがあるとBOMと見出しと2行のCSVになる", () => {
  const reviews = { 1: { comment: "短い", suggestion: "こんにちは！" } };

  const csv = buildReviewCsv(subtitles, reviews);

  assert.equal(
    csv,
    BOM +
      HEADER +
      '1,"00:00:01,000","00:00:03,500",こんにちは,短い,こんにちは！\r\n' +
      '2,"00:00:04,000","00:00:06,000",（拍手）,,\r\n',
  );
});

test("色タグと複数行の本文はそのままCSVに入る", () => {
  const tagged = [
    { number: 5, startMs: 0, endMs: 1000, text: '<font color="#FF0000">赤</font>\n二行目' },
  ];

  const csv = buildReviewCsv(tagged, {});

  assert.ok(csv.includes('"<font color=""#FF0000"">赤</font>\n二行目"'));
});

// buildReviewCsv: 境界値

test("字幕が0件ならBOMと見出しだけになる", () => {
  const csv = buildReviewCsv([], {});

  assert.equal(csv, BOM + HEADER);
});

// restoreReviews: 正常系

test("書き出したCSVを読み込むと元のコメント・修正案に戻る", () => {
  const reviews = {
    1: { comment: "短い", suggestion: "こんにちは！" },
    2: { comment: "", suggestion: "（大きな拍手）" },
  };
  const csvText = buildReviewCsv(subtitles, reviews).slice(BOM.length);

  const restored = restoreReviews(csvText, subtitles);

  assert.deepEqual(restored, { reviews, warnings: [] });
});

test("列の順番が入れ替わっていても見出しの名前で読める", () => {
  const csvText = "修正案,コメント,字幕,番号\r\n案,指摘,こんにちは,1\r\n";

  const { reviews } = restoreReviews(csvText, subtitles);

  assert.deepEqual(reviews, { 1: { comment: "指摘", suggestion: "案" } });
});

// restoreReviews: 境界値

test("コメント・修正案が両方空の行は記録に入らない", () => {
  const csvText = HEADER + "1,,,こんにちは,,\r\n2,,,（拍手）,,\r\n";

  const { reviews } = restoreReviews(csvText, subtitles);

  assert.deepEqual(reviews, {});
});

test("最後に空行があっても無視する", () => {
  const csvText = HEADER + "1,,,こんにちは,短い,\r\n2,,,（拍手）,,\r\n\r\n";

  const { warnings } = restoreReviews(csvText, subtitles);

  assert.deepEqual(warnings, []);
});

test("SRTとCSVの字幕数が違うと警告が出る", () => {
  const csvText = HEADER + "1,,,こんにちは,短い,\r\n";

  const { warnings } = restoreReviews(csvText, subtitles);

  assert.deepEqual(warnings, [
    "字幕の数が合いません（SRT 2件、CSV 1件）。SRT と CSV の組み合わせを確かめてください。",
  ]);
});

test("SRTにない番号のコメントは戻さず警告が出る", () => {
  const csvText = HEADER + "1,,,こんにちは,,\r\n3,,,さようなら,指摘,\r\n";

  const restored = restoreReviews(csvText, subtitles);

  assert.deepEqual(restored, {
    reviews: {},
    warnings: ["3番は SRT にないため、コメント・修正案を戻していません。"],
  });
});

test("字幕の中身がSRTと違う行はコメントを戻して警告が出る", () => {
  const csvText = HEADER + "1,,,こんばんは,短い,\r\n2,,,（拍手）,,\r\n";

  const restored = restoreReviews(csvText, subtitles);

  assert.deepEqual(restored, {
    reviews: { 1: { comment: "短い", suggestion: "" } },
    warnings: ["1番: 字幕の中身が SRT と違います。"],
  });
});

// restoreReviews: 異常系

test("見出しにコメントの列がないとErrorになる", () => {
  const csvText = "番号,字幕,修正案\r\n1,こんにちは,\r\n";

  assert.throws(
    () => restoreReviews(csvText, subtitles),
    /このアプリで書き出した CSV ではないようです（見出しに「コメント」がありません）。/,
  );
});

test("列の数が見出しと合わない行があるとErrorになる", () => {
  const csvText = HEADER + "1,,,こんにちは\r\n";

  assert.throws(
    () => restoreReviews(csvText, subtitles),
    /2行目の列の数が見出しと合いません（見出し 6列、2行目 4列）。/,
  );
});

test("ダブルクォートが閉じていないとErrorになる", () => {
  const csvText = HEADER + '1,,,"こんにちは,,\r\n';

  assert.throws(() => restoreReviews(csvText, subtitles), /「"」が閉じていません/);
});

test("番号が整数でないとErrorになる", () => {
  const csvText = HEADER + "abc,,,こんにちは,,\r\n";

  assert.throws(() => restoreReviews(csvText, subtitles), /2行目の番号が読めません:「abc」。/);
});

test("同じ番号が2回あるとErrorになる", () => {
  const csvText = HEADER + "1,,,こんにちは,,\r\n1,,,こんにちは,,\r\n";

  assert.throws(() => restoreReviews(csvText, subtitles), /番号 1 が2回あります。/);
});

test("見出しの行しかないとErrorになる", () => {
  assert.throws(() => restoreReviews(HEADER, subtitles), /字幕の行がありません。/);
});

test("空のファイルだとErrorになる", () => {
  assert.throws(() => restoreReviews("", subtitles), /字幕の行がありません。/);
});

// makeReviewCsvFileName

test("入力した名前の後ろに_check.csvが付く", () => {
  const fileName = makeReviewCsvFileName("山田");

  assert.equal(fileName, "山田_check.csv");
});

test("名前の前後の空白は取り除かれる", () => {
  const fileName = makeReviewCsvFileName("  山田  ");

  assert.equal(fileName, "山田_check.csv");
});

test("名前が空白だけだとErrorになる", () => {
  assert.throws(() => makeReviewCsvFileName("   "), /ファイル名を入力してください。/);
});

test("ファイル名に使えない文字を含むとErrorになる", () => {
  assert.throws(
    () => makeReviewCsvFileName("山田/2"),
    /ファイル名に使えない文字が入っています:「\/」/,
  );
});

test("名前が文字列でないとTypeErrorになる", () => {
  assert.throws(() => makeReviewCsvFileName(null), TypeError);
});
