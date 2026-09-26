const CONTACT_RESEARCHER = "研究者に連絡してください。";

// YouTube IFrame Player API の onError が返すエラーコードごとの説明
const MESSAGES_BY_CODE = {
  2: "YouTubeが動画IDを受け付けませんでした。URLをもう一度コピーして貼り付けてください。",
  5:
    "ブラウザで動画を再生できませんでした。ページを再読み込みしてください。" +
    "直らない場合は Chrome など別のブラウザでお試しください。",
  100: "動画が見つかりません。削除または非公開になった可能性があります。" + CONTACT_RESEARCHER,
  101:
    "この動画は、所有者が他のサイトでの再生を許可していないため再生できません。" +
    CONTACT_RESEARCHER,
  150:
    // 存在しない動画でも 150 が返ることがあるため、削除・非公開の可能性も伝える
    "この動画は、埋め込み禁止・年齢制限などの設定、または削除・非公開により、" +
    "他のサイトでは再生できません。" +
    CONTACT_RESEARCHER,
};
const UNKNOWN_ERROR_MESSAGE = "原因不明のエラーで動画を再生できませんでした。" + CONTACT_RESEARCHER;

/**
 * YouTubeプレイヤーのエラーコードを、企業の方向けの日本語メッセージにする。
 *
 * @param {number} code - プレイヤーの onError で受け取ったエラーコード。
 * @returns {string} 原因と対処を書いたメッセージ。末尾にエラーコードを付ける。
 * @throws {TypeError} code が数値でない場合。
 */
export function describePlayerError(code) {
  if (typeof code !== "number") {
    throw new TypeError(`エラーコードは数値で渡してください（受け取った型: ${typeof code}）`);
  }
  const description = MESSAGES_BY_CODE[code] ?? UNKNOWN_ERROR_MESSAGE;
  return `${description}（エラーコード: ${code}）`;
}
