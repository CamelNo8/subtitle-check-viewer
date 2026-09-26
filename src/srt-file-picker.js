const SRT_EXTENSION = ".srt";

/**
 * ドラッグ・選択されたファイルの中から、読み込む SRT ファイルを1つ選ぶ。
 * ファイル名の拡張子だけで判断する（中身が SRT の形かは parseSrt が確かめる）。
 *
 * @param {File[]} files - ドラッグ・選択されたファイルの配列。
 * @returns {File} 読み込む SRT ファイル。
 * @throws {TypeError} files が配列でない場合。
 * @throws {Error} ファイルが0個・2個以上、または拡張子が .srt でない場合。
 */
export function pickSrtFile(files) {
  if (!Array.isArray(files)) {
    throw new TypeError(`ファイルは配列で渡してください（受け取った型: ${typeof files}）`);
  }
  if (files.length === 0) {
    throw new Error("ファイルが選ばれていません。");
  }
  if (files.length > 1) {
    throw new Error(`SRT ファイルは1つだけ選んでください（${files.length}個選ばれています）。`);
  }
  const [file] = files;
  if (!file.name.toLowerCase().endsWith(SRT_EXTENSION)) {
    throw new Error(`SRT ファイル（.srt）を選んでください:「${file.name}」`);
  }
  return file;
}
