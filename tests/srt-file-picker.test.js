import { test } from "node:test";
import assert from "node:assert/strict";

import { pickSrtFile } from "../src/srt-file-picker.js";

// ファイル名だけで判断するので、File の代わりに name を持つオブジェクトで試す
function fakeFile(name) {
  return { name };
}

// 正常系

test("srtファイルが1つならそのファイルが返る", () => {
  const file = fakeFile("字幕.srt");

  const picked = pickSrtFile([file]);

  assert.equal(picked, file);
});

test("拡張子が大文字のSRTでもそのファイルが返る", () => {
  const file = fakeFile("字幕.SRT");

  const picked = pickSrtFile([file]);

  assert.equal(picked, file);
});

// 境界値

test("ファイルが0個だと選ばれていないエラーになる", () => {
  const files = [];

  const act = () => pickSrtFile(files);

  assert.throws(act, { message: "ファイルが選ばれていません。" });
});

// 異常系

test("srt以外のファイルだとSRTを選ぶよう求めるエラーになる", () => {
  const files = [fakeFile("動画.mp4")];

  const act = () => pickSrtFile(files);

  assert.throws(act, { message: "SRT ファイル（.srt）を選んでください:「動画.mp4」" });
});

test("ファイルが2つ以上だと1つだけ選ぶよう求めるエラーになる", () => {
  const files = [fakeFile("a.srt"), fakeFile("b.srt")];

  const act = () => pickSrtFile(files);

  assert.throws(act, {
    message: "SRT ファイルは1つだけ選んでください（2個選ばれています）。",
  });
});

test("配列以外を渡すとTypeErrorになる", () => {
  const notArray = fakeFile("字幕.srt");

  const act = () => pickSrtFile(notArray);

  assert.throws(act, TypeError);
});
