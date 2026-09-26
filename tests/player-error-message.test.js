import { test } from "node:test";
import assert from "node:assert/strict";

import { describePlayerError } from "../src/player-error-message.js";

// 正常系

test("エラーコード2はURLの貼り直しを案内するメッセージになる", () => {
  const code = 2;

  const message = describePlayerError(code);

  assert.equal(
    message,
    "YouTubeが動画IDを受け付けませんでした。URLをもう一度コピーして貼り付けてください。（エラーコード: 2）",
  );
});

test("エラーコード5は再読み込みと別ブラウザを案内するメッセージになる", () => {
  const code = 5;

  const message = describePlayerError(code);

  assert.equal(
    message,
    "ブラウザで動画を再生できませんでした。ページを再読み込みしてください。" +
      "直らない場合は Chrome など別のブラウザでお試しください。（エラーコード: 5）",
  );
});

test("エラーコード100は削除または非公開を知らせるメッセージになる", () => {
  const code = 100;

  const message = describePlayerError(code);

  assert.equal(
    message,
    "動画が見つかりません。削除または非公開になった可能性があります。" +
      "研究者に連絡してください。（エラーコード: 100）",
  );
});

test("エラーコード101は所有者が埋め込みを許可していないことを知らせるメッセージになる", () => {
  const code = 101;

  const message = describePlayerError(code);

  assert.equal(
    message,
    "この動画は、所有者が他のサイトでの再生を許可していないため再生できません。" +
      "研究者に連絡してください。（エラーコード: 101）",
  );
});

test("エラーコード150はYouTubeの設定で再生できないことを知らせるメッセージになる", () => {
  const code = 150;

  const message = describePlayerError(code);

  assert.equal(
    message,
    "この動画は、YouTubeの設定（埋め込み禁止・年齢制限など）により他のサイトでは再生できません。" +
      "研究者に連絡してください。（エラーコード: 150）",
  );
});

// 異常系

test("表に無いエラーコードは原因不明のメッセージにそのコードが入る", () => {
  const code = 999;

  const message = describePlayerError(code);

  assert.equal(
    message,
    "原因不明のエラーで動画を再生できませんでした。研究者に連絡してください。（エラーコード: 999）",
  );
});

test("数値以外を渡すとTypeErrorになる", () => {
  const code = undefined;

  const act = () => describePlayerError(code);

  assert.throws(act, TypeError);
});
