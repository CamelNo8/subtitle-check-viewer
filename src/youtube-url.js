const YOUTUBE_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com"];
const SHORT_URL_HOST = "youtu.be";
// youtube.com/<種類>/<動画ID> の形で動画IDを持つパスの種類
const VIDEO_ID_PATH_TYPES = ["embed", "shorts"];
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const EXAMPLE_VIDEO_URL = "https://www.youtube.com/watch?v=xxxxxxxxxxx";

/**
 * YouTubeのURLから動画IDを取り出す。
 *
 * @param {string} url - 利用者が貼り付けたYouTubeのURL。前後の空白は無視する。
 * @returns {string} 11文字の動画ID。
 * @throws {TypeError} url が文字列でない場合。
 * @throws {Error} URLから動画IDを読み取れない場合（原因ごとに別のメッセージ）。
 */
export function extractVideoId(url) {
  if (typeof url !== "string") {
    throw new TypeError(`URLは文字列で渡してください（受け取った型: ${typeof url}）`);
  }
  const trimmedUrl = url.trim();
  if (trimmedUrl === "") {
    throw new Error("YouTubeのURLを入力してください。");
  }

  const parsedUrl = parseUrl(trimmedUrl);
  if (!isYoutubeHost(parsedUrl.hostname)) {
    throw new Error(
      `YouTube以外のURLです: 「${trimmedUrl}」。youtube.com または youtu.be のURLを貼り付けてください。`,
    );
  }
  const candidateId = findCandidateId(parsedUrl);
  if (candidateId === null) {
    throw new Error(
      `動画のURLではありません: 「${trimmedUrl}」。` +
        `見たい動画を開いた状態のURL（例: ${EXAMPLE_VIDEO_URL}）を貼り付けてください。`,
    );
  }
  if (!VIDEO_ID_PATTERN.test(candidateId)) {
    throw new Error(
      `URLの動画ID「${candidateId}」が正しくありません（英数字と - _ の11文字のはずです）。` +
        "URLが途中で切れていないか確認し、もう一度コピーしてください。",
    );
  }
  return candidateId;
}

function parseUrl(text) {
  try {
    return new URL(text);
  } catch {
    // URL の形でない入力は、利用者向けの説明つきエラーに置き換える
    throw new Error(
      `URLとして読み取れません: 「${text}」。` +
        "YouTubeの動画ページのアドレス欄にあるURL（https:// から始まるもの）をそのまま貼り付けてください。",
    );
  }
}

function isYoutubeHost(hostname) {
  return hostname === SHORT_URL_HOST || YOUTUBE_HOSTS.includes(hostname);
}

// 動画IDが入っているはずの部分を取り出す。形が正しいかはまだ見ない。
// 動画を指すURLでなければ null を返す。
function findCandidateId(parsedUrl) {
  const pathSegments = parsedUrl.pathname.split("/").filter((segment) => segment !== "");

  if (parsedUrl.hostname === SHORT_URL_HOST) {
    return pathSegments[0] ?? null;
  }
  if (pathSegments[0] === "watch") {
    return parsedUrl.searchParams.get("v");
  }
  if (VIDEO_ID_PATH_TYPES.includes(pathSegments[0])) {
    return pathSegments[1] ?? null;
  }
  return null;
}
