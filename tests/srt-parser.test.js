import { test } from "node:test";
import assert from "node:assert/strict";

import { parseSrt } from "../src/srt-parser.js";

// 実SRTの形を再現した短い見本（改行は LF、最後に空行なし）
function srt(...lines) {
  return lines.join("\n");
}

// 正常系

test("字幕1件から番号と時刻と本文が取れる", () => {
  const text = srt("1", "00:01:02,345 --> 00:01:04,500", "こんにちは");

  const { subtitles } = parseSrt(text);

  assert.deepEqual(subtitles, [{ number: 1, startMs: 62345, endMs: 64500, text: "こんにちは" }]);
});

test("字幕が複数件あるとファイルの順番どおりに並ぶ", () => {
  const text = srt(
    "1",
    "00:00:01,000 --> 00:00:02,000",
    "一つ目",
    "",
    "2",
    "00:00:03,000 --> 00:00:04,000",
    "二つ目",
  );

  const { subtitles } = parseSrt(text);

  assert.deepEqual(
    subtitles.map((subtitle) => subtitle.text),
    ["一つ目", "二つ目"],
  );
});

test("本文が2行あると改行でつながった本文になる", () => {
  const text = srt("1", "00:00:01,000 --> 00:00:02,000", "（田村）先輩！", "（三上）ん？");

  const { subtitles } = parseSrt(text);

  assert.equal(subtitles[0].text, "（田村）先輩！\n（三上）ん？");
});

test("fontタグ付きの本文はタグを残したままになる", () => {
  const text = srt("1", "00:00:01,000 --> 00:00:03,500", '<font color="#FFFF00">こんにちは</font>');

  const { subtitles } = parseSrt(text);

  assert.equal(subtitles[0].text, '<font color="#FFFF00">こんにちは</font>');
});

test("BOM付きの文字列でも1件目の番号が読める", () => {
  const text = "﻿" + srt("1", "00:00:01,000 --> 00:00:02,000", "本文");

  const { subtitles } = parseSrt(text);

  assert.equal(subtitles[0].number, 1);
});

test("改行がCRLFでも本文に復帰文字が残らない", () => {
  const text = ["1", "00:00:01,000 --> 00:00:02,000", "一行目", "二行目", ""].join("\r\n");

  const { subtitles } = parseSrt(text);

  assert.equal(subtitles[0].text, "一行目\n二行目");
});

test("字幕の間の空行が2つあっても余分な字幕ができない", () => {
  const text = srt(
    "1",
    "00:00:01,000 --> 00:00:02,000",
    "一つ目",
    "",
    "",
    "2",
    "00:00:03,000 --> 00:00:04,000",
    "二つ目",
  );

  const { subtitles } = parseSrt(text);

  assert.equal(subtitles.length, 2);
});

test("番号が飛んでいても警告にならない", () => {
  const text = srt(
    "128",
    "00:00:01,000 --> 00:00:02,000",
    "一つ目",
    "",
    "130",
    "00:00:03,000 --> 00:00:04,000",
    "二つ目",
  );

  const { warnings } = parseSrt(text);

  assert.deepEqual(warnings, []);
});

// 境界値

test("本文がない字幕は本文が空文字の字幕になる", () => {
  const text = srt(
    "22",
    "00:01:16,200 --> 00:01:17,920",
    "",
    "",
    "23",
    "00:01:19,580 --> 00:01:20,980",
    "（岡本）これから使うやつ！",
  );

  const { subtitles } = parseSrt(text);

  assert.deepEqual(subtitles[0], { number: 22, startMs: 76200, endMs: 77920, text: "" });
});

test("開始と終了が同じだと表示時間0秒の警告が出る", () => {
  const text = srt("163", "00:07:31,468 --> 00:07:31,468", "（のび太）30分後ってあと1分しかない");

  const { warnings } = parseSrt(text);

  assert.deepEqual(warnings, ["163番: 表示時間が0秒です"]);
});

test("終了が開始より前だと警告が出る", () => {
  const text = srt("48", "00:00:25,634 --> 00:00:25,594", "（のび太）うわぁぁぁっ!");

  const { warnings } = parseSrt(text);

  assert.deepEqual(warnings, ["48番: 終了時刻が開始時刻より前です"]);
});

test("空文字を渡すと字幕が1件もないエラーになる", () => {
  const text = "";

  const act = () => parseSrt(text);

  assert.throws(act, {
    message: "字幕が1件もありません。SRT ファイルの中身を確認してください。",
  });
});

test("空行だけを渡すと字幕が1件もないエラーになる", () => {
  const text = "\n\n  \n";

  const act = () => parseSrt(text);

  assert.throws(act, {
    message: "字幕が1件もありません。SRT ファイルの中身を確認してください。",
  });
});

// 異常系

test("番号の行が数字でないと番号が読めないエラーになる", () => {
  const text = srt(
    "1",
    "00:00:01,000 --> 00:00:02,000",
    "一つ目",
    "",
    "二",
    "00:00:03,000 --> 00:00:04,000",
    "二つ目",
  );

  const act = () => parseSrt(text);

  assert.throws(act, /2番目の字幕の番号が読めません:「二」/);
});

test("時刻の行が崩れていると時刻が読めないエラーになる", () => {
  const text = srt(
    "85",
    "（森本）00:04:45,580 --> 00:04:50,29",
    "（森本）とにかく添削だけはするな。",
  );

  const act = () => parseSrt(text);

  assert.throws(act, {
    message:
      "85番の字幕の時刻が読めません:「（森本）00:04:45,580 --> 00:04:50,29」。" +
      "「00:00:01,000 --> 00:00:03,500」の形に直してください。",
  });
});

test("時刻の分が60以上だと時刻が読めないエラーになる", () => {
  const text = srt("1", "00:60:00,000 --> 00:60:01,000", "本文");

  const act = () => parseSrt(text);

  assert.throws(act, /1番の字幕の時刻が読めません/);
});

test("時刻の秒が60以上だと時刻が読めないエラーになる", () => {
  const text = srt("1", "00:00:60,000 --> 00:00:61,000", "本文");

  const act = () => parseSrt(text);

  assert.throws(act, /1番の字幕の時刻が読めません/);
});

test("番号の後に時刻の行がないと時刻が読めないエラーになる", () => {
  const text = srt("7");

  const act = () => parseSrt(text);

  assert.throws(act, /7番の字幕の時刻が読めません/);
});

test("同じ番号が2回出てくると重複のエラーになる", () => {
  const text = srt(
    "5",
    "00:00:01,000 --> 00:00:02,000",
    "一つ目",
    "",
    "5",
    "00:00:03,000 --> 00:00:04,000",
    "二つ目",
  );

  const act = () => parseSrt(text);

  assert.throws(act, {
    message: "字幕番号 5 が重複しています。SRT の番号が重ならないように直してください。",
  });
});

test("文字列以外を渡すとTypeErrorになる", () => {
  const text = null;

  const act = () => parseSrt(text);

  assert.throws(act, TypeError);
});
