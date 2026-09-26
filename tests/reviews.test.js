import { test } from "node:test";
import assert from "node:assert/strict";

import { countReviewedSubtitles, isReviewed, updateReview } from "../src/reviews.js";

// updateReview: 正常系

test("空の記録にコメントを入れるとその番号のコメントが記録される", () => {
  const reviews = {};

  const updated = updateReview(reviews, 12, "comment", "短い");

  assert.deepEqual(updated, { 12: { comment: "短い", suggestion: "" } });
});

test("コメントがある番号に修正案を入れるとコメントは残ったまま修正案が入る", () => {
  const reviews = { 12: { comment: "短い", suggestion: "" } };

  const updated = updateReview(reviews, 12, "suggestion", "ふんっ");

  assert.deepEqual(updated, { 12: { comment: "短い", suggestion: "ふんっ" } });
});

test("改行を含む修正案は改行ごと記録される", () => {
  const reviews = {};

  const updated = updateReview(reviews, 3, "suggestion", "一行目\n二行目");

  assert.equal(updated[3].suggestion, "一行目\n二行目");
});

test("更新しても元の記録は変わらない", () => {
  const reviews = { 12: { comment: "短い", suggestion: "" } };

  updateReview(reviews, 12, "comment", "長い");

  assert.deepEqual(reviews, { 12: { comment: "短い", suggestion: "" } });
});

// updateReview: 境界値

test("空文字で上書きすると空文字として記録される", () => {
  const reviews = { 12: { comment: "短い", suggestion: "" } };

  const updated = updateReview(reviews, 12, "comment", "");

  assert.equal(updated[12].comment, "");
});

// updateReview: 異常系

test("欄の名前がcommentとsuggestion以外だとエラーになる", () => {
  const reviews = {};

  const act = () => updateReview(reviews, 12, "memo", "短い");

  assert.throws(act, /欄の名前/);
});

test("番号が整数でないとTypeErrorになる", () => {
  const reviews = {};

  const act = () => updateReview(reviews, "12", "comment", "短い");

  assert.throws(act, TypeError);
});

test("値が文字列でないとTypeErrorになる", () => {
  const reviews = {};

  const act = () => updateReview(reviews, 12, "comment", null);

  assert.throws(act, TypeError);
});

// countReviewedSubtitles: 正常系

test("コメントだけの字幕と修正案だけの字幕は2件と数える", () => {
  const reviews = {
    1: { comment: "短い", suggestion: "" },
    2: { comment: "", suggestion: "ふんっ" },
  };

  const count = countReviewedSubtitles(reviews);

  assert.equal(count, 2);
});

test("1件の字幕にコメントと修正案の両方があっても1件と数える", () => {
  const reviews = { 1: { comment: "短い", suggestion: "ふんっ" } };

  const count = countReviewedSubtitles(reviews);

  assert.equal(count, 1);
});

// countReviewedSubtitles: 境界値

test("空の記録は0件", () => {
  const reviews = {};

  const count = countReviewedSubtitles(reviews);

  assert.equal(count, 0);
});

test("空白と改行だけの入力は数えない", () => {
  const reviews = { 1: { comment: "  \n　", suggestion: "" } };

  const count = countReviewedSubtitles(reviews);

  assert.equal(count, 0);
});

test("書いた後に空文字に戻した字幕は数えない", () => {
  const reviews = updateReview(updateReview({}, 1, "comment", "短い"), 1, "comment", "");

  const count = countReviewedSubtitles(reviews);

  assert.equal(count, 0);
});

// isReviewed

test("コメントが書かれていればtrueになる", () => {
  const review = { comment: "短い", suggestion: "" };

  const reviewed = isReviewed(review);

  assert.equal(reviewed, true);
});

test("記録がなければfalseになる", () => {
  const review = undefined;

  const reviewed = isReviewed(review);

  assert.equal(reviewed, false);
});
