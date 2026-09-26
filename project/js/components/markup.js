(function (global) {
  'use strict';

  const app = (global.ShopApp = global.ShopApp || {});
  const { escapeHtml, formatYen, imageMarkup } = app.utils;

  // 関数: ページタイトルと右側操作を描画する。
  // 引数: title(String): ページ見出し, actions(String): 右側操作のHTML
  // 戻り値: 見出しHTML (String)
  function pageHeading(title, actions = '') {
    return `<div class="page-heading"><h1>${escapeHtml(title)}</h1>${actions}</div>`;
  }

  // 関数: 空状態と任意の操作を描画する。
  // 引数: title(String): 見出し, description(String): 説明, actionMarkup(String): 操作HTML
  // 戻り値: 空状態HTML (String)
  function emptyState(title, description, actionMarkup = '') {
    return `<section class="empty-state"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p>${actionMarkup}</section>`;
  }

  // 関数: 商品カードを描画する。
  // 引数: product(Object): 店舗とカテゴリを含む商品情報
  // 戻り値: 商品カードHTML (String)
  function productCard(product) {
    const stockText = product.stock === null ? '在庫数の表示なし' : product.stock > 0 ? `残り ${product.stock} 点` : '在庫切れ';
    return `<article class="product-card">
      <button class="product-card-trigger" type="button" data-action="open-product" data-id="${escapeHtml(product.id)}" aria-label="${escapeHtml(product.name)}の詳細">
        <span class="product-image-wrap">${imageMarkup(product.imageUrl, product.name, 'product-image')}${product.stock !== null ? `<span class="stock-badge">${stockText}</span>` : ''}</span>
        <span class="product-body"><span class="product-name">${escapeHtml(product.name)}</span><span class="product-meta"><span class="product-price">${formatYen(product.priceYen)}</span><span class="category-badge">${escapeHtml(product.category && product.category.name)}</span></span></span>
      </button>
      <div class="card-actions" style="padding: 0 12px 12px"><button class="button button-primary button-small button-block" type="button" data-action="add-cart" data-id="${escapeHtml(product.id)}" ${product.stock === 0 ? 'disabled' : ''}>カートに入れる</button></div>
    </article>`;
  }

  app.components = { ...(app.components || {}), pageHeading, emptyState, productCard };
})(window);
