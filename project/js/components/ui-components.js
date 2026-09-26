(function (global) {
  'use strict';
  const app = (global.ShopApp = global.ShopApp || {});
  const utils = app.utils;
  app.components = app.components || {};

  app.components.imageMarkup = function (url, alt, className) {
    const safeUrl = /^https:\/\//i.test(url || '') ? url : '';
    return safeUrl
      ? `<img class="${className}" src="${utils.escapeHtml(safeUrl)}" alt="${utils.escapeHtml(alt)}" loading="lazy">`
      : `<div class="image-placeholder ${className}" role="img" aria-label="${utils.escapeHtml(alt)}"></div>`;
  };

  app.components.pageHeading = function (title, actions = '') {
    return `<div class="page-heading"><h1>${utils.escapeHtml(title)}</h1>${actions}</div>`;
  };

  app.components.emptyState = function (title, description, actionMarkup = '') {
    return `<section class="empty-state"><h2>${utils.escapeHtml(title)}</h2><p>${utils.escapeHtml(description)}</p>${actionMarkup}</section>`;
  };

  app.components.showToast = function (message, type = 'success') {
    const toastRegion = document.getElementById('toastRegion');
    if (!toastRegion) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toastRegion.append(toast);
    global.setTimeout(() => toast.remove(), 3000);
  };

  app.components.applySettings = function () {
    const service = app.services;
    const user = service.getCurrentUser();
    const root = document.documentElement;
    if (!user) return;
    const settings = service.getSettings(user.id);
    root.dataset.theme = settings.themeMode === 'dark' ? 'dark' : settings.themeMode === 'custom' ? 'custom' : 'light';
    root.dataset.reduceMotion = String(Boolean(settings.reduceMotion));
    root.style.setProperty('--user-accent', settings.customColor || '#d45d3f');
  };

  // 関数: 共通ヘッダーとアプリ内メニューを描画する。
  app.components.renderChrome = function (activeRoute) {
    const service = app.services;
    const user = service.getCurrentUser();
    const header = document.getElementById('siteHeader');
    const sideMenu = document.getElementById('sideMenu');
    const menuToggle = document.getElementById('menuToggle');
    if (!header || !sideMenu || !menuToggle || !user) return;

    const carts = service.getCarts();
    const cartCount = carts.reduce((count, cart) => count + service.getCartItems(cart.id).reduce((sum, item) => sum + item.quantity, 0), 0);
    
    header.innerHTML = `
      <a class="brand-lockup" href="#" data-route="home" aria-label="Market Lane ホーム"><span class="brand-mark">M</span><span class="brand-name">Market Lane</span></a>
      <div class="header-actions"><span class="header-user">${utils.escapeHtml(user.displayName)}</span><button class="button button-outline button-small" type="button" data-route="cart" aria-label="カート、商品数 ${cartCount}">カート <span class="status-badge">${cartCount}</span></button></div>`;
    
    const links = [
      ['home', '⌂', 'ホーム'], ['cart', '▣', 'カート'], ['favorites', '♡', 'お気に入り'], ['orders', '◷', '購入履歴'], ['settings', '⚙', '設定']
    ];
    
    sideMenu.innerHTML = `${links.map((link) => `<button class="menu-link ${activeRoute === link[0] ? 'active' : ''}" type="button" data-route="${link[0]}"><span class="menu-link-icon" aria-hidden="true">${link[1]}</span>${link[2]}</button>`).join('')}<button class="menu-link" type="button" data-action="logout"><span class="menu-link-icon" aria-hidden="true">↪</span>ログアウト</button>`;
    
    sideMenu.hidden = !app.state.menuOpen;
    menuToggle.hidden = false;
    menuToggle.setAttribute('aria-expanded', String(app.state.menuOpen));
    menuToggle.setAttribute('aria-label', app.state.menuOpen ? 'メニューを閉じる' : 'メニューを開く');
  };

  // 関数: 商品カードを描画する。
  app.components.renderProductCard = function (product) {
    const stockText = product.stock === null ? '在庫数の表示なし' : product.stock > 0 ? `残り ${product.stock} 点` : '在庫切れ';
    return `<article class="product-card">
      <button class="product-card-trigger" type="button" data-action="open-product" data-id="${utils.escapeHtml(product.id)}" aria-label="${utils.escapeHtml(product.name)}の詳細">
        <span class="product-image-wrap">${app.components.imageMarkup(product.imageUrl, product.name, 'product-image')}${product.stock !== null ? `<span class="stock-badge">${stockText}</span>` : ''}</span>
        <span class="product-body"><span class="product-name">${utils.escapeHtml(product.name)}</span><span class="product-meta"><span class="product-price">${utils.formatYen(product.priceYen)}</span><span class="category-badge">${utils.escapeHtml(product.category && product.category.name)}</span></span></span>
      </button>
      <div class="card-actions" style="padding: 0 12px 12px"><button class="button button-primary button-small button-block" type="button" data-action="add-cart" data-id="${utils.escapeHtml(product.id)}" ${product.stock === 0 ? 'disabled' : ''}>カートに入れる</button></div>
    </article>`;
  };

  // ボトムシート関連
  app.components.openProduct = function (productId) {
    const service = app.services;
    const data = service.getSnapshot();
    const product = data.products.find((record) => record.id === productId);
    if (!product) return;
    const store = data.stores.find((record) => record.id === product.storeId);
    const category = data.categories.find((record) => record.id === product.categoryId);
    const favorite = service.isFavorite('product', product.id);
    const overlayRoot = document.getElementById('overlayRoot');
    
    overlayRoot.innerHTML = `<div class="overlay-backdrop" data-action="backdrop-close"><section class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="productTitle"><div class="sheet-grab-zone" data-action="sheet-grab"><span class="sheet-grab"></span></div><div class="sheet-heading"><button class="close-button" type="button" data-action="close-overlay" aria-label="閉じる">×</button></div><div class="detail-image-wrap">${app.components.imageMarkup(product.imageUrl, product.name, 'detail-image')}</div><div class="detail-body"><h2 id="productTitle">${utils.escapeHtml(product.name)}</h2><button class="text-button" style="justify-self:start" type="button" data-action="open-store" data-id="${utils.escapeHtml(store.id)}">${utils.escapeHtml(store.name)} → 店舗ページ</button><div class="product-meta"><span class="detail-price">${utils.formatYen(product.priceYen)}</span><span class="category-badge">${utils.escapeHtml(category && category.name)}</span></div><p class="detail-description">${utils.escapeHtml(product.description || '商品説明はありません。')}</p><p class="muted small-text">${product.stock === null ? '在庫数の表示なし' : product.stock > 0 ? `在庫 ${product.stock} 点` : '在庫切れ'}</p><div class="sheet-actions"><button class="button button-outline" type="button" data-action="favorite-product" data-id="${utils.escapeHtml(product.id)}" aria-label="お気に入り">${favorite ? '♥' : '♡'}</button><button class="button button-outline" type="button" data-action="close-overlay">閉じる</button><button class="button button-primary" type="button" data-action="add-cart" data-id="${utils.escapeHtml(product.id)}" ${product.stock === 0 ? 'disabled' : ''}>カートに入れる</button></div></div></section></div>`;
    
    const sheet = overlayRoot.querySelector('.bottom-sheet');
    sheet.addEventListener('pointerdown', startSheetDrag);
    sheet.addEventListener('pointerup', finishSheetDrag);
    sheet.addEventListener('pointercancel', finishSheetDrag);
  };

  app.components.closeOverlay = function () {
    document.getElementById('overlayRoot').replaceChildren();
  };

  function startSheetDrag(event) {
    if (!event.target.closest('.sheet-grab-zone')) return;
    app.state.dragStartY = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function finishSheetDrag(event) {
    if (app.state.dragStartY === undefined) return;
    const distance = event.clientY - app.state.dragStartY;
    app.state.dragStartY = undefined;
    if (distance > 90) app.components.closeOverlay();
  }
})(window);