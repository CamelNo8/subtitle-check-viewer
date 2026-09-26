const API_SCRIPT_URL = "https://www.youtube.com/iframe_api";
const API_LOAD_TIMEOUT_MS = 15000;
const API_CONNECTION_ERROR_MESSAGE =
  "YouTubeに接続できませんでした。インターネット接続を確認してください。" +
  "社内ネットワークでYouTubeが制限されている場合は、社内の管理者にご確認ください。";
const API_TIMEOUT_ERROR_MESSAGE =
  "YouTubeのプレイヤーの準備に時間がかかりすぎたため中止しました。" +
  "しばらく待ってからページを再読み込みしてください。";

// スクリプトの読み込みとプレイヤーの作成は1ページにつき1回だけ行うため、ここで覚えておく
let apiReadyPromise = null;
let playerPromise = null;

/**
 * YouTube IFrame Player API のスクリプトを読み込む。2回目以降は1回目の結果を返す。
 *
 * @returns {Promise<void>} API が使えるようになったら完了する。
 * @throws {Error} 接続できない場合、または15秒以内に準備ができない場合（原因ごとに別のメッセージ）。
 */
export function loadYoutubeApi() {
  if (apiReadyPromise !== null) {
    return apiReadyPromise;
  }
  apiReadyPromise = new Promise((resolve, reject) => {
    const timeoutId = setTimeout(
      () => reject(new Error(API_TIMEOUT_ERROR_MESSAGE)),
      API_LOAD_TIMEOUT_MS,
    );
    // IFrame Player API は準備ができるとこの名前のグローバル関数を呼ぶ決まりになっている
    window.onYouTubeIframeAPIReady = () => {
      clearTimeout(timeoutId);
      resolve();
    };
    const script = document.createElement("script");
    script.src = API_SCRIPT_URL;
    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error(API_CONNECTION_ERROR_MESSAGE));
    };
    document.head.append(script);
  });
  return apiReadyPromise;
}

/**
 * 動画をプレイヤーに表示する。1回目はプレイヤーを作り、2回目以降は同じプレイヤーで動画を差し替える。
 * 自動再生はしない。
 *
 * @param {string} elementId - プレイヤーに置き換える要素の id。1回目の呼び出しでだけ使う。
 * @param {string} videoId - 表示する動画のID。
 * @param {(code: number) => void} onError - プレイヤーがエラーを出したときに呼ぶ関数。1回目の呼び出しでだけ使う。
 * @returns {Promise<void>} 動画の表示を指示し終えたら完了する。
 * @throws {Error} API の読み込みに失敗した場合（loadYoutubeApi と同じ）。
 */
export async function showVideo(elementId, videoId, onError) {
  await loadYoutubeApi();
  if (playerPromise === null) {
    playerPromise = createPlayer(elementId, videoId, onError);
    await playerPromise;
    return;
  }
  const player = await playerPromise;
  player.cueVideoById(videoId);
}

// 準備ができる前に動画を差し替えると失敗するため、onReady まで待ってから完了する
function createPlayer(elementId, videoId, onError) {
  return new Promise((resolve) => {
    const player = new window.YT.Player(elementId, {
      videoId,
      playerVars: { playsinline: 1 },
      events: {
        onReady: () => resolve(player),
        onError: (event) => onError(event.data),
      },
    });
  });
}
