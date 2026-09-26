/**
 * ある時刻に表示すべき字幕を探す。
 * 「開始時刻 ≦ 時刻 ＜ 終了時刻」の字幕を表示するので、長さ0秒や終了が開始より前の字幕は出ない。
 *
 * @param {import("./srt-parser.js").Subtitle[]} subtitles - parseSrt が返した字幕の一覧。
 * @param {number} timeMs - 再生時刻（ミリ秒）。
 * @returns {import("./srt-parser.js").Subtitle[]} 表示すべき字幕（ファイル順）。
 * @throws {TypeError} subtitles が配列でない、または timeMs が数値でない（NaN を含む）場合。
 */
export function findActiveSubtitles(subtitles, timeMs) {
  if (!Array.isArray(subtitles)) {
    throw new TypeError(`字幕の一覧は配列で渡してください（受け取った型: ${typeof subtitles}）`);
  }
  if (typeof timeMs !== "number" || Number.isNaN(timeMs)) {
    throw new TypeError(`再生時刻はミリ秒の数値で渡してください（受け取った値: ${timeMs}）`);
  }
  return subtitles.filter(({ startMs, endMs }) => startMs <= timeMs && timeMs < endMs);
}
