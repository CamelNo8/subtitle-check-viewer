import { test } from "node:test";
import assert from "node:assert/strict";

import { parseSubtitleMarkup } from "../src/subtitle-markup.js";

// 正常系

test("タグのない本文は色なしのかたまり1つになる", () => {
  const text = "こんにちは";

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [[{ text: "こんにちは", color: null }]]);
});

test("fontタグの本文はその色のかたまりになる", () => {
  const text = '<font color="#FFFF00">こんにちは</font>';

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [[{ text: "こんにちは", color: "#FFFF00" }]]);
});

test("色つきと色なしが1行に混ざると2つのかたまりになる", () => {
  const text = '（三上）<font color="#00FFFF">平和だな</font>';

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [
    [
      { text: "（三上）", color: null },
      { text: "平和だな", color: "#00FFFF" },
    ],
  ]);
});

test("2行の本文は2行に分かれる", () => {
  const text = "（田村）先輩！\n（三上）ん？";

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [
    [{ text: "（田村）先輩！", color: null }],
    [{ text: "（三上）ん？", color: null }],
  ]);
});

test("色タグの中で改行すると両方の行が同じ色になる", () => {
  const text = '<font color="#FF0000">一行目\n二行目</font>';

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [
    [{ text: "一行目", color: "#FF0000" }],
    [{ text: "二行目", color: "#FF0000" }],
  ]);
});

test("bやiのタグは消えて文字だけが残る", () => {
  const text = "<b>太字</b>と<i>斜体</i>";

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [[{ text: "太字と斜体", color: null }]]);
});

test("小文字の色コードもその色になる", () => {
  const text = '<font color="#ffff00">黄色</font>';

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [[{ text: "黄色", color: "#ffff00" }]]);
});

test("シングルクォートの色指定もその色になる", () => {
  const text = "<font color='#FFFF00'>黄色</font>";

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [[{ text: "黄色", color: "#FFFF00" }]]);
});

// 境界値

test("空文字は空の配列になる", () => {
  const text = "";

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, []);
});

// 異常系

test("色名で指定した色は色なしになる", () => {
  const text = '<font color="yellow">黄色</font>';

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [[{ text: "黄色", color: null }]]);
});

test("3桁の色コードは色なしになる", () => {
  const text = '<font color="#FF0">黄色</font>';

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [[{ text: "黄色", color: null }]]);
});

test("閉じタグを忘れると本文の最後まで同じ色になる", () => {
  const text = '<font color="#FF0000">赤\nまだ赤';

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [
    [{ text: "赤", color: "#FF0000" }],
    [{ text: "まだ赤", color: "#FF0000" }],
  ]);
});

test("開きタグのない閉じタグは無視される", () => {
  const text = "白</font>のまま";

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [[{ text: "白のまま", color: null }]]);
});

test("タグではない小なり記号は文字として残る", () => {
  const text = "3 < 5";

  const lines = parseSubtitleMarkup(text);

  assert.deepEqual(lines, [[{ text: "3 < 5", color: null }]]);
});

test("文字列以外を渡すとTypeErrorになる", () => {
  const text = null;

  const act = () => parseSubtitleMarkup(text);

  assert.throws(act, TypeError);
});
