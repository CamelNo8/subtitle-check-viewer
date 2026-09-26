import { extractVideoId } from "./youtube-url.js";
import { describePlayerError } from "./player-error-message.js";
import { getCurrentTimeMs, seekToMs, showVideo } from "./youtube-player.js";
import { decodeUtf8 } from "./utf8-decoder.js";
import { parseSrt } from "./srt-parser.js";
import { pickSrtFile } from "./srt-file-picker.js";
import { findActiveSubtitles } from "./active-subtitles.js";
import { renderSubtitleBar } from "./subtitle-bar.js";
import { highlightSubtitleRows, renderSubtitleList } from "./subtitle-list.js";
import { calculateScrollTop } from "./scroll-position.js";

const PLAYER_ELEMENT_ID = "player";
const NO_VIDEO_MESSAGE = "先に YouTube の URL を貼り付けてください。";

const videoForm = document.getElementById("video-form");
const videoUrlInput = document.getElementById("video-url");
const messageArea = document.getElementById("message");
const srtFileInput = document.getElementById("srt-file");
const srtDropZone = document.getElementById("srt-drop-zone");
// 字幕を表示する右側の欄全体でドラッグを受け付ける（点線の枠の外の結果表示の上でもよい）
const subtitlePanel = document.getElementById("subtitle-panel");
const srtStatus = document.getElementById("srt-status");
const srtWarningList = document.getElementById("srt-warnings");
const subtitleBar = document.getElementById("subtitle-bar");
const subtitleListSection = document.getElementById("subtitle-list-section");
const subtitleListScroll = document.getElementById("subtitle-list-scroll");
const subtitleListBody = document.getElementById("subtitle-list-body");
const followPlaybackCheckbox = document.getElementById("follow-playback");

// 読み込んだ SRT の字幕と、字幕欄に今出している字幕
let loadedSubtitles = [];
let shownSubtitles = [];

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
    showSubtitleList(subtitles);
    showSrtResult(`${file.name}: ${subtitles.length}件の字幕を読み込みました`, warnings, false);
  } catch (error) {
    showSubtitleList([]);
    showSrtResult(`${file.name}: ${error.message}`, [], true);
  }
}

// 字幕を保持して一覧を作り直す。字幕がなければ一覧を隠し、選択の枠を大きな表示に戻す
function showSubtitleList(subtitles) {
  loadedSubtitles = subtitles;
  renderSubtitleList(subtitleListBody, subtitles);
  const hasSubtitles = subtitles.length > 0;
  subtitleListSection.hidden = !hasSubtitles;
  subtitlePanel.classList.toggle("has-subtitles", hasSubtitles);
}

function isSameSubtitles(left, right) {
  return left.length === right.length && left.every((subtitle, index) => subtitle === right[index]);
}

// 一覧の上の見出し行（固定表示）に隠れない範囲で、行が見えるようにスクロールする
function scrollRowIntoView(row) {
  const headerHeight = subtitleListScroll.querySelector("thead").offsetHeight;
  const rowTop =
    row.getBoundingClientRect().top -
    subtitleListScroll.getBoundingClientRect().top +
    subtitleListScroll.scrollTop;
  const scrollTop = calculateScrollTop(
    { top: rowTop - headerHeight, height: row.offsetHeight },
    {
      scrollTop: subtitleListScroll.scrollTop,
      height: subtitleListScroll.clientHeight - headerHeight,
    },
  );
  if (scrollTop !== null) {
    subtitleListScroll.scrollTop = scrollTop;
  }
}

function showActiveSubtitles(activeSubtitles) {
  renderSubtitleBar(subtitleBar, activeSubtitles);
  const firstActiveRow = highlightSubtitleRows(subtitleListBody, loadedSubtitles, activeSubtitles);
  if (followPlaybackCheckbox.checked && firstActiveRow !== null) {
    scrollRowIntoView(firstActiveRow);
  }
}

// 描画のたびに再生時刻を読み、表示すべき字幕が変わったときだけ字幕欄と一覧を更新する
function updateActiveSubtitles() {
  const timeMs = getCurrentTimeMs();
  const activeSubtitles = timeMs === null ? [] : findActiveSubtitles(loadedSubtitles, timeMs);
  if (!isSameSubtitles(activeSubtitles, shownSubtitles)) {
    showActiveSubtitles(activeSubtitles);
    shownSubtitles = activeSubtitles;
  }
  requestAnimationFrame(updateActiveSubtitles);
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

// 行のどこをクリックしても、その字幕の開始時刻へ移動する
subtitleListBody.addEventListener("click", (event) => {
  const row = event.target.closest("tr[data-index]");
  if (row === null) {
    return;
  }
  const subtitle = loadedSubtitles[Number(row.dataset.index)];
  if (!seekToMs(subtitle.startMs)) {
    showMessage(NO_VIDEO_MESSAGE);
  }
});

// 追従を ON にしたら、すぐ今の行を見える位置に出す
followPlaybackCheckbox.addEventListener("change", () => {
  const firstActiveRow = subtitleListBody.querySelector("tr.is-active");
  if (followPlaybackCheckbox.checked && firstActiveRow !== null) {
    scrollRowIntoView(firstActiveRow);
  }
});

requestAnimationFrame(updateActiveSubtitles);
