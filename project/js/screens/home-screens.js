(function (global) {
  'use strict';
  const app = (global.ShopApp = global.ShopApp || {});
  const utils = app.utils;
  const components = app.components;
  const service = app.services;
  app.screens = app.screens || {};

  app.screens.renderHome = function (container) {
    const data = service.getSnapshot();
    const tabs = service.getShoppingTabs();
    if (!tabs.length) {
      const created = service.createShoppingTab();
      app.state.activeTabId = created.id;
      return app.screens.renderHome(container);
    }
    if (!tabs.some((tab) => tab.id === app.state.activeTabId)) {
      app.state.activeTabId = tabs[0].id;
      app.state.searchExpanded = Boolean(tabs[0].viewState && tabs[0].viewState.searchExpanded);
    }
    const activeTab = tabs.find((tab) => tab.id === app.state.activeTabId);
    const criteria = { storeId: '', query: '', categoryIds: [], ...(activeTab.searchCriteria || {}) };
    const filteredProducts = service.searchProducts(criteria);
    const storeOptions = data.stores.filter((store) => store.status === 'active').map((store) => `<option value="${utils.escapeHtml(store.name)}">`).join('');
    const categoryFilters = data.categories.map((category) => `<label class="check-option"><input type="checkbox" name="categoryIds" value="${utils.escapeHtml(category.id)}" ${criteria.categoryIds.includes(category.id) ? 'checked' : ''}>${utils.escapeHtml(category.name)}</label>`).join('');
    
    const sections = data.stores.filter((store) => store.status === 'active' && (!criteria.storeId || criteria.storeId === store.id)).map((store) => {
      const products = filteredProducts.filter((product) => product.storeId === store.id);
      if (!products.length) return '';
      return `<section class="store-section"><div class="store-heading"><button class="store-title-button" type="button" data-action="open-store" data-id="${utils.escapeHtml(store.id)}">${utils.escapeHtml(store.name)} <span aria-hidden="true">↗</span></button></div><div class="product-row">${products.map(components.renderProductCard).join('')}</div></section>`;
    }).join('');
    
    container.innerHTML = `
      ${components.pageHeading('ショッピング', '<span class="status-badge">税込価格</span>')}
      <section class="browser-frame" aria-label="ショッピング">
        <div class="browser-tabbar"><div class="browser-tab-controls" aria-hidden="true"><span></span><span></span><span></span></div><div class="tab-list" role="tablist" aria-label="ショッピングタブ">${tabs.map((tab, index) => `<span class="tab-item ${tab.id === activeTab.id ? 'active' : ''}"><button id="shopping-tab-${index + 1}" class="tab-button ${tab.id === activeTab.id ? 'active' : ''}" type="button" role="tab" aria-selected="${tab.id === activeTab.id}" aria-controls="shopping-panel" data-action="select-tab" data-id="${utils.escapeHtml(tab.id)}">${utils.escapeHtml(tab.label)}</button>${tabs.length > 1 ? `<button class="tab-close" type="button" data-action="close-tab" data-id="${utils.escapeHtml(tab.id)}" aria-label="${utils.escapeHtml(tab.label)}を閉じる">×</button>` : ''}</span>`).join('')}${tabs.length < 2 ? '<button class="tab-button tab-add" type="button" data-action="add-tab" aria-label="ショッピングタブを追加">+</button>' : ''}</div></div>
        <div id="shopping-panel" class="browser-panel" role="tabpanel" aria-labelledby="shopping-tab-${tabs.findIndex((tab) => tab.id === activeTab.id) + 1}">
          <div class="tab-panel-heading"><span class="muted small-text">${filteredProducts.length} 商品</span></div>
          <section class="search-area"><button class="search-toggle" type="button" data-action="toggle-search" aria-expanded="${app.state.searchExpanded}"><span class="search-toggle-label"><span class="search-icon" aria-hidden="true"></span>検索</span><span aria-hidden="true">${app.state.searchExpanded ? '−' : '+'}</span></button>
            ${app.state.searchExpanded ? `<form class="search-form" data-form="search"><div class="field"><label for="shopFilter">店舗</label><input class="input" id="shopFilter" name="storeName" list="storeOptions" placeholder="すべての店舗" value="${utils.escapeHtml(data.stores.find((store) => store.id === criteria.storeId)?.name || '')}"><datalist id="storeOptions"><option value="すべて" label="すべての店舗"></option>${storeOptions}</datalist></div><div class="field"><label for="productQuery">商品名・説明</label><input class="input" id="productQuery" name="query" value="${utils.escapeHtml(criteria.query)}" placeholder="例: 柑橘、焙煎"></div><div class="field"><span class="field-label">カテゴリ（複数選択可）</span><div class="check-row">${categoryFilters || '<span class="muted small-text">カテゴリはありません</span>'}</div></div><button class="button button-primary" type="submit">検索する</button></form>` : ''}
          </section>
          ${sections || components.emptyState('商品が見つかりません', '検索条件を変えるか、条件をクリアしてもう一度お試しください。', '<button class="button button-outline" type="button" data-action="clear-search">条件をクリア</button>')}
        </div>
      </section>`;
  };

  app.screens.renderStore = function (container) {
    const data = service.getSnapshot();
    const store = data.stores.find((record) => record.id === app.state.storeId);
    if (!store) { app.navigate('home'); return; }
    const filters = app.state.storeFilters || { query: '', categoryIds: [] };
    const products = service.searchProducts({ ...filters, storeId: store.id });
    const categories = data.categories.map((category) => `<label class="check-option"><input type="checkbox" name="storeCategoryIds" value="${utils.escapeHtml(category.id)}" ${filters.categoryIds.includes(category.id) ? 'checked' : ''}>${utils.escapeHtml(category.name)}</label>`).join('');
    
    container.innerHTML = `
      <div class="inline-actions" style="margin-bottom: 18px"><button class="button button-outline button-small" type="button" data-route="home">← ショッピングへ戻る</button></div>
      <section class="store-page-hero"><div class="store-page-copy"><h1>${utils.escapeHtml(store.name)}</h1><p>${utils.escapeHtml(store.description)}</p><button class="button button-primary button-small" type="button" data-action="toggle-store-favorite" data-id="${utils.escapeHtml(store.id)}">${service.isFavorite('store', store.id) ? '♥ お気に入り済み' : '♡ お気に入りに入れる'}</button><div class="store-info-line">${store.address ? `<span>${utils.escapeHtml(store.address)}</span>` : ''}${store.phone ? `<span>${utils.escapeHtml(store.phone)}</span>` : ''}</div></div><div class="store-page-image">${components.imageMarkup(store.imageUrl, store.name, 'store-cover')}</div></section>
      <div class="section-heading"><h2>この店の商品</h2><span class="muted small-text">${products.length} 商品</span></div>
      <section class="search-area"><button class="search-toggle" type="button" data-action="toggle-store-search" aria-expanded="${app.state.storeSearchExpanded}"><span class="search-toggle-label"><span class="search-icon" aria-hidden="true"></span>商品を検索</span><span aria-hidden="true">${app.state.storeSearchExpanded ? '−' : '+'}</span></button>${app.state.storeSearchExpanded ? `<form class="search-form" data-form="store-search"><div class="field"><label for="storeQuery">商品名・説明</label><input class="input" id="storeQuery" name="query" value="${utils.escapeHtml(filters.query)}"></div><div class="field"><span class="field-label">カテゴリ</span><div class="check-row">${categories}</div></div><button class="button button-primary" type="submit">検索する</button></form>` : ''}</section>
      ${products.length ? `<div class="product-row store-product-row">${products.map(components.renderProductCard).join('')}</div>` : components.emptyState('該当する商品がありません', '検索語やカテゴリを変更してください。')}`;
  };

  app.screens.renderCart = function (container) {
    const carts = service.getCarts();
    if (app.state.selectedCartId && !carts.some((cart) => cart.id === app.state.selectedCartId)) app.state.selectedCartId = null;
    
    if (!app.state.selectedCartId) {
      const cards = carts.map((cart) => {
        const items = service.getCartItems(cart.id);
        const count = items.reduce((total, item) => total + item.quantity, 0);
        const total = items.reduce((sum, item) => sum + item.lineTotalYen, 0);
        return `<article class="cart-list-item"><div><span class="muted small-text">商品 ${count} 点</span><div class="cart-list-title">${utils.escapeHtml(cart.name)}</div><span class="muted small-text">${utils.formatYen(total)}</span></div><button class="button button-outline button-small" type="button" data-action="rename-cart" data-id="${utils.escapeHtml(cart.id)}">名前を変更</button><button class="button button-primary button-small" type="button" data-action="select-cart" data-id="${utils.escapeHtml(cart.id)}">カートを開く →</button><button class="text-button" type="button" data-action="delete-cart" data-id="${utils.escapeHtml(cart.id)}">削除</button></article>`;
      }).join('');
      container.innerHTML = `${components.pageHeading('カート')}<div class="list-stack">${cards || components.emptyState('カートを作成しましょう', 'カート名を入力して作成できます。')}<form class="inline-input" data-form="create-cart"><label class="sr-only" for="newCartName">新しいカート名</label><input class="input" id="newCartName" name="name" maxlength="24" placeholder="カート名を入力" required><button class="button button-outline" type="submit">作成</button></form></div>`;
      return;
    }
    
    const cart = carts.find((record) => record.id === app.state.selectedCartId);
    const items = service.getCartItems(cart.id);
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.lineTotalYen, 0);
    const itemRows = items.map((item) => `<article class="cart-row">${components.imageMarkup(item.imageUrl, item.name, 'cart-row-image')}<div><p class="cart-row-name">${utils.escapeHtml(item.name)}</p><p class="muted small-text">${utils.escapeHtml(item.store.name)} · ${utils.formatYen(item.priceYen)}</p><span class="product-price">${utils.formatYen(item.lineTotalYen)}</span></div><div class="quantity-control"><button class="quantity-button" type="button" data-action="quantity" data-id="${utils.escapeHtml(item.id)}" data-cart="${utils.escapeHtml(cart.id)}" data-delta="-1" aria-label="${utils.escapeHtml(item.name)}の数量を減らす">−</button><span class="quantity-value">${item.quantity}</span><button class="quantity-button" type="button" data-action="quantity" data-id="${utils.escapeHtml(item.id)}" data-cart="${utils.escapeHtml(cart.id)}" data-delta="1" aria-label="${utils.escapeHtml(item.name)}の数量を増やす">＋</button></div></article>`).join('');
    container.innerHTML = `${components.pageHeading(cart.name, '<button class="button button-outline button-small" type="button" data-action="back-carts">← カート一覧</button>')}<p class="muted">${itemCount} 点</p>${itemRows ? `<div class="list-stack">${itemRows}</div><div class="cart-summary"><div class="cart-summary-inner"><div class="total-line"><span>商品合計（${itemCount}点）</span><strong>${utils.formatYen(total)}</strong></div><button class="button button-primary button-block" type="button" data-action="checkout" data-id="${utils.escapeHtml(cart.id)}" ${items.length ? '' : 'disabled'}>購入内容を確認する</button></div></div>` : components.emptyState('このカートは空です', 'ショッピングから商品を追加してください。', '<button class="button button-primary" type="button" data-route="home">商品を探す</button>')}`;
  };

  app.screens.renderCheckout = function (container) {
    if (app.state.cartAfterPurchase) {
      container.innerHTML = `${components.pageHeading('購入が完了しました')}<section class="empty-state"><p>注文番号: ${utils.escapeHtml(app.state.cartAfterPurchase.checkout.id)}</p><div class="empty-state-actions"><button class="button button-primary" type="button" data-action="finish-home">ホームへ</button><button class="button button-outline" type="button" data-action="finish-cart">カートを見る</button></div></section>`;
      return;
    }
    const cart = service.getCarts().find((record) => record.id === app.state.selectedCartId);
    if (!cart) { app.navigate('cart'); return; }
    const items = service.getCartItems(cart.id);
    const total = items.reduce((sum, item) => sum + item.lineTotalYen, 0);
    container.innerHTML = `${components.pageHeading('購入内容の確認', '<button class="button button-outline button-small" type="button" data-route="cart" data-cart-back="true">← カートに戻る</button>')}<section class="settings-section"><div class="panel-heading" style="justify-content:space-between"><h2>${utils.escapeHtml(cart.name)}</h2><span class="muted small-text">模擬購入</span></div><div class="list-stack">${items.map((item) => `<div class="order-item-line"><span>${utils.escapeHtml(item.name)} × ${item.quantity}</span><strong>${utils.formatYen(item.lineTotalYen)}</strong></div>`).join('')}</div><div class="total-line" style="margin-top:18px;padding-top:15px;border-top:1px solid var(--line)"><span>合計（税込）</span><strong>${utils.formatYen(total)}</strong></div><button class="button button-primary button-block" type="button" data-action="confirm-purchase" data-id="${utils.escapeHtml(cart.id)}" ${items.length ? '' : 'disabled'}>購入を確定する</button></section>`;
  };

  app.screens.renderFavorites = function (container) {
    const data = service.getSnapshot();
    const isProduct = app.state.selectedFavoriteType === 'product';
    const query = (app.state.favoriteQuery || '').trim().toLocaleLowerCase('ja');
    const entries = isProduct
      ? data.favoriteProducts.filter((item) => item.userId === service.getCurrentUser().id).map((item) => data.products.find((product) => product.id === item.productId)).filter(Boolean).filter((product) => `${product.name} ${product.description || ''}`.toLocaleLowerCase('ja').includes(query)).map((product) => ({ ...product, store: data.stores.find((store) => store.id === product.storeId), category: data.categories.find((category) => category.id === product.categoryId) }))
      : data.favoriteStores.filter((item) => item.userId === service.getCurrentUser().id).map((item) => data.stores.find((store) => store.id === item.storeId)).filter(Boolean).filter((store) => `${store.name} ${store.description || ''}`.toLocaleLowerCase('ja').includes(query));
    const body = isProduct
      ? entries.length ? `<div class="product-row">${entries.map(components.renderProductCard).join('')}</div>` : components.emptyState('お気に入りの商品はありません', '商品詳細からハートを押すと、ここに保存されます。')
      : entries.length ? `<div class="list-stack">${entries.map((store) => `<article class="store-card-row">${components.imageMarkup(store.imageUrl, store.name, '')}<div><h3>${utils.escapeHtml(store.name)}</h3><p class="muted small-text">${utils.escapeHtml(store.description)}</p></div><button class="button button-outline button-small" type="button" data-action="open-store" data-id="${utils.escapeHtml(store.id)}">店舗を見る</button></article>`).join('')}</div>` : components.emptyState('お気に入りの店舗はありません', '店舗ページからお気に入りに登録できます。');
    container.innerHTML = `${components.pageHeading('お気に入り')}<div class="toolbar" style="justify-content:space-between;gap:14px;margin-bottom:18px"><div class="segmented-control" role="tablist"><button class="segmented-button ${isProduct ? 'active' : ''}" type="button" role="tab" aria-selected="${isProduct}" data-action="favorite-type" data-value="product">商品</button><button class="segmented-button ${!isProduct ? 'active' : ''}" type="button" role="tab" aria-selected="${!isProduct}" data-action="favorite-type" data-value="store">店舗</button></div><label class="field" style="width:min(330px,100%)"><span class="sr-only">お気に入りを検索</span><input class="input" data-input="favorite-search" value="${utils.escapeHtml(app.state.favoriteQuery || '')}" placeholder="名前や説明で検索"></label></div>${body}`;
  };

  app.screens.renderOrders = function (container) {
    const history = service.getOrderHistory();
    const content = history.map((checkout) => `<article class="order-card"><div class="panel-heading" style="justify-content:space-between"><strong>${new Date(checkout.createdAt).toLocaleString('ja-JP')}</strong><span class="status-badge">模擬購入</span></div>${checkout.orders.map((order) => `<div class="order-store">${utils.escapeHtml(order.store && order.store.name)} <span class="muted">· ${utils.formatYen(order.totalYen)}</span></div>${order.items.map((item) => `<div class="order-item-line"><span>${utils.escapeHtml(item.productNameSnapshot)} × ${item.quantity}</span><span>${utils.formatYen(item.unitPriceYenSnapshot * item.quantity)}</span></div>`).join('')}`).join('')}</article>`).join('');
    container.innerHTML = `${components.pageHeading('購入履歴')}${content || components.emptyState('購入履歴はまだありません', '購入した商品がここに表示されます。', '<button class="button button-primary" type="button" data-route="home">商品を探す</button>')}`;
  };

  // アクション処理ハンドラ
  app.screens.submitSearch = function (form) {
    const values = new FormData(form);
    const data = service.getSnapshot();
    const storeName = String(values.get('storeName') || '').trim();
    const store = storeName && storeName !== 'すべて' ? data.stores.find((record) => record.name === storeName) : null;
    if (storeName && storeName !== 'すべて' && !store) throw new Error('候補から店舗を選ぶか、「すべて」を指定してください。');
    const updated = service.updateShoppingTab(app.state.activeTabId, { storeId: store ? store.id : '', query: values.get('query'), categoryIds: values.getAll('categoryIds') });
    app.state.activeTabId = updated.id;
    app.state.searchExpanded = true;
    app.renderCurrentRoute();
  };

  app.screens.submitStoreSearch = function (form) {
    const values = new FormData(form);
    app.state.storeFilters = { query: values.get('query'), categoryIds: values.getAll('storeCategoryIds') };
    app.renderCurrentRoute();
  };

  app.screens.selectShoppingTab = function (tabId) {
    const tabs = service.getShoppingTabs();
    const currentTab = tabs.find((tab) => tab.id === app.state.activeTabId);
    if (currentTab) service.updateShoppingTabViewState(currentTab.id, { scrollY: global.scrollY, searchExpanded: app.state.searchExpanded });
    const nextTab = tabs.find((tab) => tab.id === tabId);
    if (!nextTab) return;
    app.state.activeTabId = nextTab.id;
    app.state.searchExpanded = Boolean(nextTab.viewState && nextTab.viewState.searchExpanded);
    app.renderCurrentRoute();
    global.requestAnimationFrame(() => global.scrollTo({ top: Number(nextTab.viewState && nextTab.viewState.scrollY) || 0, behavior: 'auto' }));
  };

  app.screens.addProductToCart = function (productId) {
    const cart = service.getOrCreateCart();
    service.addToCart(cart.id, productId, 1);
    components.closeOverlay();
    components.showToast('カートに追加しました。');
    if (app.state.screen === 'cart') app.renderCurrentRoute();
    else components.renderChrome(app.state.screen);
  };

  app.screens.confirmPurchase = function (cartId) {
    try {
      app.state.cartAfterPurchase = service.purchaseCart(cartId);
      app.navigate('checkout');
    } catch (error) {
      components.showToast(error.message, 'error');
    }
  };
})(window);