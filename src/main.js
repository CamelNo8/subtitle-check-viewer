import { extractVideoId } from "./youtube-url.js";
import { describePlayerError } from "./player-error-message.js";
import { showVideo } from "./youtube-player.js";
import { decodeUtf8 } from "./utf8-decoder.js";
import { parseSrt } from "./srt-parser.js";

const PLAYER_ELEMENT_ID = "player";

const videoForm = document.getElementById("video-form");
const videoUrlInput = document.getElementById("video-url");
const messageArea = document.getElementById("message");
const srtFileInput = document.getElementById("srt-file");
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
    showSrtResult(`${subtitles.length}件の字幕を読み込みました`, warnings, false);
  } catch (error) {
    showSrtResult(`${file.name}: ${error.message}`, [], true);
  }
}

// form の submit を使うと、ボタンのクリックと Enter キーの両方で読み込める
videoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadVideo(videoUrlInput.value);
});

srtFileInput.addEventListener("change", () => {
  const [file] = srtFileInput.files;
  if (file === undefined) {
    return;
  }
  loadSubtitleFile(file);
});
