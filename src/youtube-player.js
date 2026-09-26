const API_SCRIPT_URL = "https://www.youtube.com/iframe_api";
const API_LOAD_TIMEOUT_MS = 15000;
const MS_PER_SECOND = 1000;
// YouTube IFrame Player API の getPlayerState が返す値のうち、seekTo で移動してよい状態
const PLAYER_STATE_PLAYING = 1;
const PLAYER_STATE_PAUSED = 2;
const PLAYER_STATE_BUFFERING = 3;
const SEEKABLE_STATES = [PLAYER_STATE_PLAYING, PLAYER_STATE_PAUSED, PLAYER_STATE_BUFFERING];
const API_CONNECTION_ERROR_MESSAGE =
  "YouTubeに接続できませんでした。インターネット接続を確認してください。" +
  "社内ネットワークでYouTubeが制限されている場合は、社内の管理者にご確認ください。";
const API_TIMEOUT_ERROR_MESSAGE =
  "YouTubeのプレイヤーの準備に時間がかかりすぎたため中止しました。" +
  "しばらく待ってからページを再読み込みしてください。";

// スクリプトの読み込みとプレイヤーの作成は1ページにつき1回だけ行うため、ここで覚えておく
let apiReadyPromise = null;
let playerPromise = null;
// 動画を表示し終えたプレイヤー。再生時刻を毎回すぐに読めるよう、Promise とは別に持っておく
let videoShownPlayer = null;
let shownVideoId = null;

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
    playerPromise = createEmptyPlayer(elementId, onError);
  }
  const player = await playerPromise;
  player.cueVideoById(videoId);
  videoShownPlayer = player;
  shownVideoId = videoId;
}

/**
 * プレイヤーの再生時刻をミリ秒で返す。
 *
 * @returns {number | null} 再生時刻（ミリ秒）。まだ動画を表示していなければ null。
 */
export function getCurrentTimeMs() {
  if (videoShownPlayer === null) {
    return null;
  }
  const seconds = videoShownPlayer.getCurrentTime();
  // 読み込み直後などで数値が返らないことがあるので、そのときは「まだ分からない」として扱う
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return null;
  }
  return seconds * MS_PER_SECOND;
}

/**
 * 指定の時刻へ移動する。再生中なら続けて再生し、止まっていれば止まったままにする。
 *
 * @param {number} ms - 移動先の時刻（ミリ秒）。
 * @returns {boolean} 移動したら true。まだ動画を表示していなければ何もせず false。
 */
export function seekToMs(ms) {
  if (videoShownPlayer === null) {
    return false;
  }
  const seconds = ms / MS_PER_SECOND;
  if (SEEKABLE_STATES.includes(videoShownPlayer.getPlayerState())) {
    videoShownPlayer.seekTo(seconds, true);
    return true;
  }
  // 未再生・頭出し済み・再生終了で seekTo すると、再生が始まるか、移動が予約されるだけで
  // 再生時刻に反映されない。頭出しを開始時刻付きでやり直すと、止まったまま時刻が移動する
  videoShownPlayer.cueVideoById({ videoId: shownVideoId, startSeconds: seconds });
  return true;
}

// 動画を指定して作ると、存在しない動画のとき onReady も onError も返らず待ち続けてしまう。
// そのため動画なしで作り、onReady の後に cueVideoById で読み込む。
function createEmptyPlayer(elementId, onError) {
  return new Promise((resolve) => {
    const player = new window.YT.Player(elementId, {
      playerVars: { playsinline: 1 },
      events: {
        onReady: () => resolve(player),
        onError: (event) => onError(event.data),
      },
    });
  });
}
