import { extractVideoId } from "./youtube-url.js";
import { describePlayerError } from "./player-error-message.js";
import { showVideo } from "./youtube-player.js";
import { decodeUtf8 } from "./utf8-decoder.js";
import { parseSrt } from "./srt-parser.js";
import { pickSrtFile } from "./srt-file-picker.js";

const PLAYER_ELEMENT_ID = "player";

const videoForm = document.getElementById("video-form");
const videoUrlInput = document.getElementById("video-url");
const messageArea = document.getElementById("message");
const srtFileInput = document.getElementById("srt-file");
const srtDropZone = document.getElementById("srt-drop-zone");
// 字幕を表示する右側の欄全体でドラッグを受け付ける（点線の枠の外の結果表示の上でもよい）
const subtitlePanel = document.getElementById("subtitle-panel");
const srtStatus = document.getElementById("srt-status");
const srtWarningList = document.getElementById("srt-warnings");

function showMessage(text) {
  messageArea.textContent = text;
}

async function loadVideo(url) {
  showMessage("");
  let videoId;
  try {
    videoId = extractVideoId(url);
  } catch (error) {
    // URL が不正なときは今の動画を残したまま、直し方を表示する
    showMessage(error.message);
    return;
  }
  try {
    await showVideo(PLAYER_ELEMENT_ID, videoId, (code) => showMessage(describePlayerError(code)));
  } catch (error) {
    showMessage(error.message);
  }
}

function showSrtResult(text, warnings, isError) {
  srtStatus.textContent = text;
  srtStatus.classList.toggle("is-error", isError);
  srtWarningList.replaceChildren(
    ...warnings.map((warning) => {
      const item = document.createElement("li");
      item.textContent = warning;
      return item;
    }),
  );
}

async function loadSubtitleFile(file) {
  try {
    const { subtitles, warnings } = parseSrt(decodeUtf8(await file.arrayBuffer()));
    showSrtResult(`${file.name}: ${subtitles.length}件の字幕を読み込みました`, warnings, false);
  } catch (error) {
    showSrtResult(`${file.name}: ${error.message}`, [], true);
  }
}

function handleSrtFiles(files) {
  let file;
  try {
    file = pickSrtFile(files);
  } catch (error) {
    showSrtResult(error.message, [], true);
    return;
  }
  loadSubtitleFile(file);
}

// 入力欄が1つだけの form は、ボタンがなくても Enter で submit される
videoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadVideo(videoUrlInput.value);
});

// 貼り付けた瞬間は入力欄の値がまだ変わっていないので、貼り付けた文字そのものを読み込む
videoUrlInput.addEventListener("paste", (event) => {
  loadVideo(event.clipboardData.getData("text"));
});

srtFileInput.addEventListener("change", () => {
  const files = Array.from(srtFileInput.files);
  // 選択画面をキャンセルしたときは何もしない
  if (files.length === 0) {
    return;
  }
  handleSrtFiles(files);
  // 同じファイルを選び直しても change が起きるように空にしておく
  srtFileInput.value = "";
});

// dragover の既定の動作を止めないと drop が起きない
subtitlePanel.addEventListener("dragover", (event) => {
  event.preventDefault();
  srtDropZone.classList.add("is-dragover");
});

// 欄の中の子要素へ移っただけのときは、枠の色を戻さない
subtitlePanel.addEventListener("dragleave", (event) => {
  if (subtitlePanel.contains(event.relatedTarget)) {
    return;
  }
  srtDropZone.classList.remove("is-dragover");
});

subtitlePanel.addEventListener("drop", (event) => {
  event.preventDefault();
  srtDropZone.classList.remove("is-dragover");
  handleSrtFiles(Array.from(event.dataTransfer.files));
});

// 枠の外に落としたとき、ブラウザがファイルを開いて画面が切り替わらないようにする
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());
