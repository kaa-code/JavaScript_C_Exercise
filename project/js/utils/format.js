(function (global) {
  'use strict';

  const app = (global.ShopApp = global.ShopApp || {});

  // 関数: HTMLテキストとして安全に表示できるよう特殊文字を変換する。
  // 引数: value(String|Number|null): 変換対象
  // 戻り値: HTMLエスケープ済み文字列 (String)
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  }

  // 関数: 日本円を桁区切りで表示する。
  // 引数: amount(Number): 表示する金額
  // 戻り値: 円記号と桁区切りを含む文字列 (String)
  function formatYen(amount) {
    return `¥${Number(amount || 0).toLocaleString('ja-JP')}`;
  }

  // 関数: 商品または店舗画像の安全なimg要素を作る。
  // 引数: url(String): 画像URL, alt(String): 画像の代替テキスト, className(String): CSSクラス
  // 戻り値: 画像要素のHTML (String)
  function imageMarkup(url, alt, className) {
    const safeUrl = /^https:\/\//i.test(url || '') ? url : '';
    return safeUrl
      ? `<img class="${className}" src="${escapeHtml(safeUrl)}" alt="${escapeHtml(alt)}" loading="lazy">`
      : `<div class="image-placeholder ${className}" role="img" aria-label="${escapeHtml(alt)}"></div>`;
  }

  app.utils = { ...(app.utils || {}), escapeHtml, formatYen, imageMarkup };
})(window);
