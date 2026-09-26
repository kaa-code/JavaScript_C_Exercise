(function (global) {
  'use strict';
  const app = (global.ShopApp = global.ShopApp || {});
  app.utils = app.utils || {};

  // 関数: HTMLテキストとして安全に表示できるよう特殊文字を変換する。
  app.utils.escapeHtml = function (value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  };

  // 関数: 日本円を桁区切りで表示する。
  app.utils.formatYen = function (amount) {
    return `¥${Number(amount || 0).toLocaleString('ja-JP')}`;
  };
})(window);