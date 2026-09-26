/**
 * 一覧の中の行が見えるようにするためのスクロール位置を計算する。
 *
 * @param {{ top: number, height: number }} row - 一覧の中での行の上端と高さ。
 * @param {{ scrollTop: number, height: number }} view - 今のスクロール位置と見えている高さ。
 * @returns {number | null} 新しいスクロール位置。行が全部見えていて動かす必要がなければ null。
 * @throws {TypeError} 数値でない値を含む場合。
 */
export function calculateScrollTop(row, view) {
  const values = [row.top, row.height, view.scrollTop, view.height];
  if (values.some((value) => typeof value !== "number" || Number.isNaN(value))) {
    throw new TypeError(`行と見える範囲の位置は数値で渡してください（受け取った値: ${values}）`);
  }
  const rowBottom = row.top + row.height;
  const viewBottom = view.scrollTop + view.height;
  // 行が見える範囲より高いときは下端を合わせると上端が隠れるので、上端を優先して見せる
  if (row.top < view.scrollTop || row.height > view.height) {
    return row.top;
  }
  if (rowBottom > viewBottom) {
    return rowBottom - view.height;
  }
  return null;
}
