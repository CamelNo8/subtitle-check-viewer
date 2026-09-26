import { extractVideoId } from "./youtube-url.js";
import { describePlayerError } from "./player-error-message.js";
import { showVideo } from "./youtube-player.js";

const PLAYER_ELEMENT_ID = "player";

const videoForm = document.getElementById("video-form");
const videoUrlInput = document.getElementById("video-url");
const messageArea = document.getElementById("message");

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

// form の submit を使うと、ボタンのクリックと Enter キーの両方で読み込める
videoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadVideo(videoUrlInput.value);
});
