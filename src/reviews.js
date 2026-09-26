const REVIEW_FIELDS = ["comment", "suggestion"];
const EMPTY_REVIEW = { comment: "", suggestion: "" };

/**
 * @typedef {object} Review
 * @property {string} comment - コメント（指摘）。
 * @property {string} suggestion - 修正案。
 */

/**
 * @typedef {Object<number, Review>} Reviews - 字幕番号 → その字幕のコメント・修正案。
 */

/**
 * 1件の字幕のコメントか修正案を書き換えた、新しい記録を返す（元の記録は変えない）。
 *
 * @param {Reviews} reviews - 今の記録。
 * @param {number} number - 字幕番号。
 * @param {"comment" | "suggestion"} field - 書き換える欄。
 * @param {string} value - 入力された文字（空白・改行もそのまま記録する）。
 * @returns {Reviews} 書き換えた後の新しい記録。
 * @throws {TypeError} number が整数でない、または value が文字列でない場合。
 * @throws {Error} field が comment / suggestion 以外の場合（プログラムの誤り）。
 */
export function updateReview(reviews, number, field, value) {
  if (!Number.isInteger(number)) {
    throw new TypeError(`字幕番号は整数で渡してください（受け取った値: ${number}）`);
  }
  if (!REVIEW_FIELDS.includes(field)) {
    throw new Error(`欄の名前が正しくありません: 「${field}」（使える名前: ${REVIEW_FIELDS}）`);
  }
  if (typeof value !== "string") {
    throw new TypeError(`入力は文字列で渡してください（受け取った型: ${typeof value}）`);
  }
  const current = reviews[number] ?? EMPTY_REVIEW;
  return { ...reviews, [number]: { ...current, [field]: value } };
}

/**
 * 1件の字幕にコメント・修正案のどちらかが（空白以外で）書かれているかを判定する。
 *
 * @param {Review | undefined} review - 1件分の記録。記録がなければ undefined。
 * @returns {boolean} 書かれていれば true。
 */
export function isReviewed(review) {
  if (review === undefined) {
    return false;
  }
  return REVIEW_FIELDS.some((field) => review[field].trim() !== "");
}

/**
 * コメント・修正案が書かれている字幕の数を数える。
 *
 * @param {Reviews} reviews - 今の記録。
 * @returns {number} 書かれている字幕の数（両方書かれていても1件と数える）。
 */
export function countReviewedSubtitles(reviews) {
  return Object.values(reviews).filter(isReviewed).length;
}
