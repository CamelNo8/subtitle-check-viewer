// ダウンロードが始まる前に URL を消すと失敗するブラウザがあるため、少し待ってから消す
const REVOKE_DELAY_MS = 1000;

/**
 * 文字をファイルにして、ブラウザのダウンロードとして保存させる。
 *
 * @param {string} fileName - 保存するファイル名。
 * @param {string} text - ファイルの中身。
 * @param {string} mimeType - ファイルの種類（例: "text/csv"）。
 * @returns {void}
 */
export function downloadTextFile(fileName, text, mimeType) {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}
