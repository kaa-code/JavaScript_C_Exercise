(function (global) {
  'use strict';

  const app = global.ShopApp;
  const service = app.services;
  const repository = app.repository;
  const state = {
    screen: 'login',
    authMode: 'login',
    activeTabId: null,
    selectedCartId: null,
    selectedFavoriteType: 'product',
    settingsSection: 'appearance',
    storeId: null,
    productId: null,
    menuOpen: false,
    searchExpanded: false,
    message: '',
    messageType: 'error',
    cartAfterPurchase: null
  };

  const authScreen = document.getElementById('authScreen');
  const storefront = document.getElementById('storefront');
  const header = document.getElementById('siteHeader');
  const mainContent = document.getElementById('mainContent');
  const sideMenu = document.getElementById('sideMenu');
  const menuToggle = document.getElementById('menuToggle');
  const overlayRoot = document.getElementById('overlayRoot');
  const toastRegion = document.getElementById('toastRegion');

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

  // 関数: アプリ全体の配色と動き設定をDOMへ適用する。
  // 引数: なし
  // 戻り値: なし
  function applySettings() {
    const user = service.getCurrentUser();
    const root = document.documentElement;
    if (!user) {
      root.removeAttribute('data-theme');
      root.removeAttribute('data-reduce-motion');
      return;
    }
    const settings = service.getSettings(user.id);
    root.dataset.theme = settings.themeMode === 'dark' ? 'dark' : settings.themeMode === 'custom' ? 'custom' : 'light';
    root.dataset.reduceMotion = String(Boolean(settings.reduceMotion));
    root.style.setProperty('--user-accent', settings.customColor || '#d45d3f');
  }

  // 関数: ログイン画面または登録画面を描画する。
  // 引数: なし
  // 戻り値: なし
  function renderAuth() {
    const isRegister = state.authMode === 'register';
    authScreen.hidden = false;
    storefront.hidden = true;
    menuToggle.hidden = true;
    const registrationFields = isRegister ? `
      <div class="field field-full">
        <label for="registerUserId">ユーザーID</label>
        <div class="inline-input"><input class="input" id="registerUserId" name="userId" autocomplete="username" pattern="[A-Za-z0-9]+" required><button class="button button-outline" type="button" data-action="suggest-id">提案</button></div>
        <span class="help-text small-text">半角英数字のみ。アカウント作成後は変更できません。</span>
      </div>
      <div class="field"><label for="displayName">表示名</label><input class="input" id="displayName" name="displayName" maxlength="10" required autocomplete="nickname"></div>
      <div class="field"><label for="registerPassword">パスワード</label><input class="input" id="registerPassword" name="password" type="password" minlength="8" required autocomplete="new-password"></div>
      <div class="field"><label for="registerEmail">メールアドレス <span class="muted">任意</span></label><input class="input" id="registerEmail" name="email" type="email" autocomplete="email"></div>
      <div class="field"><label for="birthDate">生年月日 <span class="muted">任意</span></label><input class="input" id="birthDate" name="birthDate" type="date" autocomplete="bday"></div>
      <div class="field"><label for="gender">性別 <span class="muted">任意</span></label><select class="select" id="gender" name="gender"><option value="">回答しない</option><option value="female">女性</option><option value="male">男性</option><option value="other">その他</option></select></div>
    ` : `
      <div class="field"><label for="loginUserId">ユーザーID</label><input class="input" id="loginUserId" name="userId" autocomplete="username" required></div>
      <div class="field"><label for="loginPassword">パスワード</label><input class="input" id="loginPassword" name="password" type="password" autocomplete="current-password" required></div>
    `;
    const error = state.message ? `<p class="form-error" role="alert">${escapeHtml(state.message)}</p>` : '<p class="form-error" aria-live="polite"></p>';
    authScreen.innerHTML = `
      <section class="auth-panel">
        <a class="brand-lockup auth-logo" href="#" aria-label="Market Lane"><span class="brand-mark">M</span><span class="brand-name">Market Lane</span></a>
        <h1>${isRegister ? '新規登録' : 'ログイン'}</h1>
        <form class="auth-form" data-form="${isRegister ? 'register' : 'login'}" novalidate>
          <div class="field-grid">${registrationFields}</div>
          ${error}
          <button class="button button-primary button-block" type="submit">${isRegister ? 'アカウントを作成' : 'ログイン'}</button>
        </form>
        <p class="auth-switch">${isRegister ? 'すでにアカウントをお持ちですか？' : 'はじめて利用しますか？'} <button type="button" data-action="auth-switch">${isRegister ? 'ログイン' : '新規登録'}</button></p>
        <p class="footer-note">学習用デモです。実サービスでは利用できません。</p>
      </section>`;
    if (isRegister) document.getElementById('registerUserId').value = state.suggestedUserId || service.suggestUserId();
  }

  // 関数: 共通ヘッダーとアプリ内メニューを描画する。
  // 引数: なし
  // 戻り値: なし
  function renderChrome() {
    const user = service.getCurrentUser();
    const carts = service.getCarts();
    const cartCount = carts.reduce((count, cart) => count + service.getCartItems(cart.id).reduce((sum, item) => sum + item.quantity, 0), 0);
    header.innerHTML = `
      <a class="brand-lockup" href="#" data-route="home" aria-label="Market Lane ホーム"><span class="brand-mark">M</span><span class="brand-name">Market Lane</span></a>
      <div class="header-actions"><span class="header-user">${escapeHtml(user && user.displayName)}</span><button class="button button-outline button-small" type="button" data-route="cart" aria-label="カート、商品数 ${cartCount}">カート <span class="status-badge">${cartCount}</span></button></div>`;
    const links = [
      ['home', '⌂', 'ホーム'], ['cart', '▣', 'カート'], ['favorites', '♡', 'お気に入り'], ['orders', '◷', '購入履歴'], ['settings', '⚙', '設定']
    ];
    sideMenu.innerHTML = `${links.map((link) => `<button class="menu-link ${state.screen === link[0] ? 'active' : ''}" type="button" data-route="${link[0]}"><span class="menu-link-icon" aria-hidden="true">${link[1]}</span>${link[2]}</button>`).join('')}<button class="menu-link" type="button" data-action="logout"><span class="menu-link-icon" aria-hidden="true">↪</span>ログアウト</button>`;
    sideMenu.hidden = !state.menuOpen;
    menuToggle.hidden = false;
    menuToggle.setAttribute('aria-expanded', String(state.menuOpen));
    menuToggle.setAttribute('aria-label', state.menuOpen ? 'メニューを閉じる' : 'メニューを開く');
  }

  // 関数: 商品カードを描画する。
  // 引数: product(Object): 店舗とカテゴリを含む商品情報
  // 戻り値: 商品カードHTML (String)
  function renderProductCard(product) {
    const stockText = product.stock === null ? '在庫数の表示なし' : product.stock > 0 ? `残り ${product.stock} 点` : '在庫切れ';
    return `<article class="product-card">
      <button class="product-card-trigger" type="button" data-action="open-product" data-id="${escapeHtml(product.id)}" aria-label="${escapeHtml(product.name)}の詳細">
        <span class="product-image-wrap">${imageMarkup(product.imageUrl, product.name, 'product-image')}${product.stock !== null ? `<span class="stock-badge">${stockText}</span>` : ''}</span>
        <span class="product-body"><span class="product-name">${escapeHtml(product.name)}</span><span class="product-meta"><span class="product-price">${formatYen(product.priceYen)}</span><span class="category-badge">${escapeHtml(product.category && product.category.name)}</span></span></span>
      </button>
      <div class="card-actions" style="padding: 0 12px 12px"><button class="button button-primary button-small button-block" type="button" data-action="add-cart" data-id="${escapeHtml(product.id)}" ${product.stock === 0 ? 'disabled' : ''}>カートに入れる</button></div>
    </article>`;
  }

  // 関数: 検索フォームと商品一覧を含むホーム画面を描画する。
  // 引数: なし
  // 戻り値: なし
  function renderHome() {
    const data = service.getSnapshot();
    const tabs = service.getShoppingTabs();
    if (!tabs.length) {
      const created = service.createShoppingTab();
      state.activeTabId = created.id;
      return renderHome();
    }
    if (!tabs.some((tab) => tab.id === state.activeTabId)) {
      state.activeTabId = tabs[0].id;
      state.searchExpanded = Boolean(tabs[0].viewState && tabs[0].viewState.searchExpanded);
    }
    const activeTab = tabs.find((tab) => tab.id === state.activeTabId);
    const criteria = { storeId: '', query: '', categoryIds: [], ...(activeTab.searchCriteria || {}) };
    const filteredProducts = service.searchProducts(criteria);
    const storeOptions = data.stores.filter((store) => store.status === 'active').map((store) => `<option value="${escapeHtml(store.name)}">`).join('');
    const categoryFilters = data.categories.map((category) => `<label class="check-option"><input type="checkbox" name="categoryIds" value="${escapeHtml(category.id)}" ${criteria.categoryIds.includes(category.id) ? 'checked' : ''}>${escapeHtml(category.name)}</label>`).join('');
    const sections = data.stores.filter((store) => store.status === 'active' && (!criteria.storeId || criteria.storeId === store.id)).map((store) => {
      const products = filteredProducts.filter((product) => product.storeId === store.id);
      if (!products.length) return '';
      return `<section class="store-section"><div class="store-heading"><button class="store-title-button" type="button" data-action="open-store" data-id="${escapeHtml(store.id)}">${escapeHtml(store.name)} <span aria-hidden="true">↗</span></button></div><div class="product-row">${products.map(renderProductCard).join('')}</div></section>`;
    }).join('');
    mainContent.innerHTML = `
      ${pageHeading('ショッピング', '<span class="status-badge">税込価格</span>')}
      <section class="browser-frame" aria-label="ショッピング">
        <div class="browser-tabbar"><div class="browser-tab-controls" aria-hidden="true"><span></span><span></span><span></span></div><div class="tab-list" role="tablist" aria-label="ショッピングタブ">${tabs.map((tab, index) => `<span class="tab-item ${tab.id === activeTab.id ? 'active' : ''}"><button id="shopping-tab-${index + 1}" class="tab-button ${tab.id === activeTab.id ? 'active' : ''}" type="button" role="tab" aria-selected="${tab.id === activeTab.id}" aria-controls="shopping-panel" data-action="select-tab" data-id="${escapeHtml(tab.id)}">${escapeHtml(tab.label)}</button>${tabs.length > 1 ? `<button class="tab-close" type="button" data-action="close-tab" data-id="${escapeHtml(tab.id)}" aria-label="${escapeHtml(tab.label)}を閉じる">×</button>` : ''}</span>`).join('')}${tabs.length < 2 ? '<button class="tab-button tab-add" type="button" data-action="add-tab" aria-label="ショッピングタブを追加">+</button>' : ''}</div></div>
        <div id="shopping-panel" class="browser-panel" role="tabpanel" aria-labelledby="shopping-tab-${tabs.findIndex((tab) => tab.id === activeTab.id) + 1}">
          <div class="tab-panel-heading"><span class="muted small-text">${filteredProducts.length} 商品</span></div>
          <section class="search-area"><button class="search-toggle" type="button" data-action="toggle-search" aria-expanded="${state.searchExpanded}"><span class="search-toggle-label"><span class="search-icon" aria-hidden="true"></span>検索</span><span aria-hidden="true">${state.searchExpanded ? '−' : '+'}</span></button>
            ${state.searchExpanded ? `<form class="search-form" data-form="search"><div class="field"><label for="shopFilter">店舗</label><input class="input" id="shopFilter" name="storeName" list="storeOptions" placeholder="すべての店舗" value="${escapeHtml(data.stores.find((store) => store.id === criteria.storeId)?.name || '')}"><datalist id="storeOptions"><option value="すべて" label="すべての店舗"></option>${storeOptions}</datalist></div><div class="field"><label for="productQuery">商品名・説明</label><input class="input" id="productQuery" name="query" value="${escapeHtml(criteria.query)}" placeholder="例: 柑橘、焙煎"></div><div class="field"><span class="field-label">カテゴリ（複数選択可）</span><div class="check-row">${categoryFilters || '<span class="muted small-text">カテゴリはありません</span>'}</div></div><button class="button button-primary" type="submit">検索する</button></form>` : ''}
          </section>
          ${sections || emptyState('商品が見つかりません', '検索条件を変えるか、条件をクリアしてもう一度お試しください。', '<button class="button button-outline" type="button" data-action="clear-search">条件をクリア</button>')}
        </div>
      </section>`;
  }

  // 関数: 店舗ページと店舗内検索を描画する。
  // 引数: なし
  // 戻り値: なし
  function renderStore() {
    const data = service.getSnapshot();
    const store = data.stores.find((record) => record.id === state.storeId);
    if (!store) return navigate('home');
    const filters = state.storeFilters || { query: '', categoryIds: [] };
    const products = service.searchProducts({ ...filters, storeId: store.id });
    const categories = data.categories.map((category) => `<label class="check-option"><input type="checkbox" name="storeCategoryIds" value="${escapeHtml(category.id)}" ${filters.categoryIds.includes(category.id) ? 'checked' : ''}>${escapeHtml(category.name)}</label>`).join('');
    mainContent.innerHTML = `
      <div class="inline-actions" style="margin-bottom: 18px"><button class="button button-outline button-small" type="button" data-route="home">← ショッピングへ戻る</button></div>
      <section class="store-page-hero"><div class="store-page-copy"><h1>${escapeHtml(store.name)}</h1><p>${escapeHtml(store.description)}</p><button class="button button-primary button-small" type="button" data-action="toggle-store-favorite" data-id="${escapeHtml(store.id)}">${service.isFavorite('store', store.id) ? '♥ お気に入り済み' : '♡ お気に入りに入れる'}</button><div class="store-info-line">${store.address ? `<span>${escapeHtml(store.address)}</span>` : ''}${store.phone ? `<span>${escapeHtml(store.phone)}</span>` : ''}</div></div><div class="store-page-image">${imageMarkup(store.imageUrl, store.name, 'store-cover')}</div></section>
      <div class="section-heading"><h2>この店の商品</h2><span class="muted small-text">${products.length} 商品</span></div>
      <section class="search-area"><button class="search-toggle" type="button" data-action="toggle-store-search" aria-expanded="${state.storeSearchExpanded}"><span class="search-toggle-label"><span class="search-icon" aria-hidden="true"></span>商品を検索</span><span aria-hidden="true">${state.storeSearchExpanded ? '−' : '+'}</span></button>${state.storeSearchExpanded ? `<form class="search-form" data-form="store-search"><div class="field"><label for="storeQuery">商品名・説明</label><input class="input" id="storeQuery" name="query" value="${escapeHtml(filters.query)}"></div><div class="field"><span class="field-label">カテゴリ</span><div class="check-row">${categories}</div></div><button class="button button-primary" type="submit">検索する</button></form>` : ''}</section>
      ${products.length ? `<div class="product-row store-product-row">${products.map(renderProductCard).join('')}</div>` : emptyState('該当する商品がありません', '検索語やカテゴリを変更してください。')}`;
  }

  // 関数: カート一覧または選択されたカートの内容を描画する。
  // 引数: なし
  // 戻り値: なし
  function renderCart() {
    const carts = service.getCarts();
    if (state.selectedCartId && !carts.some((cart) => cart.id === state.selectedCartId)) state.selectedCartId = null;
    if (!state.selectedCartId) {
      const cards = carts.map((cart) => {
        const items = service.getCartItems(cart.id);
        const count = items.reduce((total, item) => total + item.quantity, 0);
        const total = items.reduce((sum, item) => sum + item.lineTotalYen, 0);
        return `<article class="cart-list-item"><div><span class="muted small-text">商品 ${count} 点</span><div class="cart-list-title">${escapeHtml(cart.name)}</div><span class="muted small-text">${formatYen(total)}</span></div><button class="button button-outline button-small" type="button" data-action="rename-cart" data-id="${escapeHtml(cart.id)}">名前を変更</button><button class="button button-primary button-small" type="button" data-action="select-cart" data-id="${escapeHtml(cart.id)}">カートを開く →</button><button class="text-button" type="button" data-action="delete-cart" data-id="${escapeHtml(cart.id)}">削除</button></article>`;
      }).join('');
      mainContent.innerHTML = `${pageHeading('カート')}<div class="list-stack">${cards || emptyState('カートを作成しましょう', 'カート名を入力して作成できます。')}<form class="inline-input" data-form="create-cart"><label class="sr-only" for="newCartName">新しいカート名</label><input class="input" id="newCartName" name="name" maxlength="24" placeholder="カート名を入力" required><button class="button button-outline" type="submit">作成</button></form></div>`;
      return;
    }
    const cart = carts.find((record) => record.id === state.selectedCartId);
    const items = service.getCartItems(cart.id);
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.lineTotalYen, 0);
    const itemRows = items.map((item) => `<article class="cart-row">${imageMarkup(item.imageUrl, item.name, 'cart-row-image')}<div><p class="cart-row-name">${escapeHtml(item.name)}</p><p class="muted small-text">${escapeHtml(item.store.name)} · ${formatYen(item.priceYen)}</p><span class="product-price">${formatYen(item.lineTotalYen)}</span></div><div class="quantity-control"><button class="quantity-button" type="button" data-action="quantity" data-id="${escapeHtml(item.id)}" data-cart="${escapeHtml(cart.id)}" data-delta="-1" aria-label="${escapeHtml(item.name)}の数量を減らす">−</button><span class="quantity-value">${item.quantity}</span><button class="quantity-button" type="button" data-action="quantity" data-id="${escapeHtml(item.id)}" data-cart="${escapeHtml(cart.id)}" data-delta="1" aria-label="${escapeHtml(item.name)}の数量を増やす">＋</button></div></article>`).join('');
    mainContent.innerHTML = `${pageHeading(cart.name, '<button class="button button-outline button-small" type="button" data-action="back-carts">← カート一覧</button>')}<p class="muted">${itemCount} 点</p>${itemRows ? `<div class="list-stack">${itemRows}</div><div class="cart-summary"><div class="cart-summary-inner"><div class="total-line"><span>商品合計（${itemCount}点）</span><strong>${formatYen(total)}</strong></div><button class="button button-primary button-block" type="button" data-action="checkout" data-id="${escapeHtml(cart.id)}" ${items.length ? '' : 'disabled'}>購入内容を確認する</button></div></div>` : emptyState('このカートは空です', 'ショッピングから商品を追加してください。', '<button class="button button-primary" type="button" data-route="home">商品を探す</button>')}`;
  }

  // 関数: カートの購入確認または購入完了を描画する。
  // 引数: なし
  // 戻り値: なし
  function renderCheckout() {
    if (state.cartAfterPurchase) {
      mainContent.innerHTML = `${pageHeading('購入が完了しました')}<section class="empty-state"><p>注文番号: ${escapeHtml(state.cartAfterPurchase.checkout.id)}</p><div class="empty-state-actions"><button class="button button-primary" type="button" data-action="finish-home">ホームへ</button><button class="button button-outline" type="button" data-action="finish-cart">カートを見る</button></div></section>`;
      return;
    }
    const cart = service.getCarts().find((record) => record.id === state.selectedCartId);
    if (!cart) return navigate('cart');
    const items = service.getCartItems(cart.id);
    const total = items.reduce((sum, item) => sum + item.lineTotalYen, 0);
    mainContent.innerHTML = `${pageHeading('購入内容の確認', '<button class="button button-outline button-small" type="button" data-route="cart" data-cart-back="true">← カートに戻る</button>')}<section class="settings-section"><div class="panel-heading" style="justify-content:space-between"><h2>${escapeHtml(cart.name)}</h2><span class="muted small-text">模擬購入</span></div><div class="list-stack">${items.map((item) => `<div class="order-item-line"><span>${escapeHtml(item.name)} × ${item.quantity}</span><strong>${formatYen(item.lineTotalYen)}</strong></div>`).join('')}</div><div class="total-line" style="margin-top:18px;padding-top:15px;border-top:1px solid var(--line)"><span>合計（税込）</span><strong>${formatYen(total)}</strong></div><button class="button button-primary button-block" type="button" data-action="confirm-purchase" data-id="${escapeHtml(cart.id)}" ${items.length ? '' : 'disabled'}>購入を確定する</button></section>`;
  }

  // 関数: 商品または店舗のお気に入り一覧を描画する。
  // 引数: なし
  // 戻り値: なし
  function renderFavorites() {
    const data = service.getSnapshot();
    const isProduct = state.selectedFavoriteType === 'product';
    const query = (state.favoriteQuery || '').trim().toLocaleLowerCase('ja');
    const entries = isProduct
      ? data.favoriteProducts.filter((item) => item.userId === service.getCurrentUser().id).map((item) => data.products.find((product) => product.id === item.productId)).filter(Boolean).filter((product) => `${product.name} ${product.description || ''}`.toLocaleLowerCase('ja').includes(query)).map((product) => ({ ...product, store: data.stores.find((store) => store.id === product.storeId), category: data.categories.find((category) => category.id === product.categoryId) }))
      : data.favoriteStores.filter((item) => item.userId === service.getCurrentUser().id).map((item) => data.stores.find((store) => store.id === item.storeId)).filter(Boolean).filter((store) => `${store.name} ${store.description || ''}`.toLocaleLowerCase('ja').includes(query));
    const body = isProduct
      ? entries.length ? `<div class="product-row">${entries.map(renderProductCard).join('')}</div>` : emptyState('お気に入りの商品はありません', '商品詳細からハートを押すと、ここに保存されます。')
      : entries.length ? `<div class="list-stack">${entries.map((store) => `<article class="store-card-row">${imageMarkup(store.imageUrl, store.name, '')}<div><h3>${escapeHtml(store.name)}</h3><p class="muted small-text">${escapeHtml(store.description)}</p></div><button class="button button-outline button-small" type="button" data-action="open-store" data-id="${escapeHtml(store.id)}">店舗を見る</button></article>`).join('')}</div>` : emptyState('お気に入りの店舗はありません', '店舗ページからお気に入りに登録できます。');
    mainContent.innerHTML = `${pageHeading('お気に入り')}<div class="toolbar" style="justify-content:space-between;gap:14px;margin-bottom:18px"><div class="segmented-control" role="tablist"><button class="segmented-button ${isProduct ? 'active' : ''}" type="button" role="tab" aria-selected="${isProduct}" data-action="favorite-type" data-value="product">商品</button><button class="segmented-button ${!isProduct ? 'active' : ''}" type="button" role="tab" aria-selected="${!isProduct}" data-action="favorite-type" data-value="store">店舗</button></div><label class="field" style="width:min(330px,100%)"><span class="sr-only">お気に入りを検索</span><input class="input" data-input="favorite-search" value="${escapeHtml(state.favoriteQuery || '')}" placeholder="名前や説明で検索"></label></div>${body}`;
  }

  // 関数: 注文を購入日時の新しい順に描画する。
  // 引数: なし
  // 戻り値: なし
  function renderOrders() {
    const history = service.getOrderHistory();
    const content = history.map((checkout) => `<article class="order-card"><div class="panel-heading" style="justify-content:space-between"><strong>${new Date(checkout.createdAt).toLocaleString('ja-JP')}</strong><span class="status-badge">模擬購入</span></div>${checkout.orders.map((order) => `<div class="order-store">${escapeHtml(order.store && order.store.name)} <span class="muted">· ${formatYen(order.totalYen)}</span></div>${order.items.map((item) => `<div class="order-item-line"><span>${escapeHtml(item.productNameSnapshot)} × ${item.quantity}</span><span>${formatYen(item.unitPriceYenSnapshot * item.quantity)}</span></div>`).join('')}`).join('')}</article>`).join('');
    mainContent.innerHTML = `${pageHeading('購入履歴')}${content || emptyState('購入履歴はまだありません', '購入した商品がここに表示されます。', '<button class="button button-primary" type="button" data-route="home">商品を探す</button>')}`;
  }

  // 関数: UI設定またはセキュリティ設定画面を描画する。
  // 引数: なし
  // 戻り値: なし
  function renderSettings() {
    const user = service.getCurrentUser();
    const settings = service.getSettings(user.id);
    const sections = [
      ['appearance', '表示設定'], ['security', 'セキュリティ'], ['data', 'データ管理'], ['account', 'アカウント']
    ];
    let content = '';
    if (state.settingsSection === 'appearance') {
      content = `<section class="settings-section"><h2>テーマ</h2><div class="settings-row"><span>カラーモード</span><div class="segmented-control"><button class="segmented-button ${settings.themeMode === 'light' ? 'active' : ''}" type="button" data-action="theme" data-value="light">ライト</button><button class="segmented-button ${settings.themeMode === 'dark' ? 'active' : ''}" type="button" data-action="theme" data-value="dark">ダーク</button><button class="segmented-button ${settings.themeMode === 'custom' ? 'active' : ''}" type="button" data-action="theme" data-value="custom">指定色</button></div></div><div class="settings-row"><span>アクセントカラー</span><div class="inline-actions"><div class="theme-options">${['#d45d3f', '#367b70', '#4d6fb0', '#ba7c21'].map((color) => `<button class="theme-swatch ${settings.customColor === color ? 'active' : ''}" style="--swatch:${color}" type="button" data-action="custom-color" data-value="${color}" aria-label="アクセント色 ${color}"></button>`).join('')}</div><label class="sr-only" for="customColorHex">カラーコード</label><input class="input" id="customColorHex" data-input="custom-color-hex" value="${escapeHtml(settings.customColor || '#d45d3f')}" pattern="#[0-9A-Fa-f]{6}" maxlength="7" style="width: 104px; min-height: 36px; padding: 6px" aria-label="HEXカラーコード"><label class="sr-only" for="customColor">カラーピッカー</label><input class="color-input" id="customColor" type="color" value="${escapeHtml(settings.customColor || '#d45d3f')}" data-input="custom-color"></div></div><div class="settings-row"><span>視差・動きの効果を減らす</span><label class="toggle-control"><input type="checkbox" data-input="reduce-motion" ${settings.reduceMotion ? 'checked' : ''} aria-label="視差効果を減らす"><span class="toggle-track"></span></label></div><div class="form-actions" style="margin-top:15px"><button class="button button-outline button-small" type="button" data-action="reset-setting" data-key="themeMode">テーマをリセット</button><button class="button button-outline button-small" type="button" data-action="reset-setting" data-key="customColor">色をリセット</button><button class="button button-outline button-small" type="button" data-action="reset-setting" data-key="reduceMotion">動きをリセット</button><button class="button button-small" type="button" data-action="reset-setting">すべてリセット</button></div></section>`;
    } else if (state.settingsSection === 'security') {
      content = `<section class="settings-section"><h2>パスワードの変更</h2><p class="muted small-text">学習用デモのブラウザー内認証情報を更新します。</p><form class="field-grid" data-form="password"><div class="field field-full"><label for="currentPassword">現在のパスワード</label><input class="input" id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field field-full"><label for="newPassword">新しいパスワード（8文字以上）</label><input class="input" id="newPassword" name="nextPassword" type="password" minlength="8" autocomplete="new-password" required></div><div class="field-full"><button class="button button-primary" type="submit">パスワードを変更</button><p class="form-error" aria-live="polite"></p></div></form></section>`;
    } else if (state.settingsSection === 'data') {
      content = `<section class="settings-section"><h2>データのバックアップ</h2><p class="muted">現在のブラウザーデータをJSONファイルに書き出します。デモ用パスワード情報も含まれます。ファイルを他人と共有しないでください。</p><button class="button button-primary" type="button" data-action="export-data">JSONを書き出す</button></section><section class="settings-section"><h2>JSONから復元</h2><p class="muted">インポートは現在のアプリデータをすべて置き換え、ログアウトします。</p><label class="button button-outline" for="importFile">JSONファイルを選ぶ</label><input id="importFile" type="file" accept="application/json,.json" data-input="import-file" hidden><p class="form-error" aria-live="polite"></p></section></section>`;
    } else {
      content = `<section class="settings-section"><h2>アカウント</h2><div class="settings-row"><span>表示名</span><strong>${escapeHtml(user.displayName)}</strong></div><div class="settings-row"><span>ユーザーID</span><strong>${escapeHtml(user.userId)}</strong></div><button class="button button-outline" type="button" data-route="account">アカウント情報を編集</button></section><section class="settings-section"><h2>ログアウト</h2><p class="muted">次回はユーザーIDとパスワードでログインします。</p><button class="button button-danger" type="button" data-action="logout">ログアウト</button></section>`;
    }
    mainContent.innerHTML = `${pageHeading('設定')}<div class="settings-layout"><nav class="settings-nav" aria-label="設定項目">${sections.map((section) => `<button class="${state.settingsSection === section[0] ? 'active' : ''}" type="button" data-action="settings-section" data-value="${section[0]}">${section[1]}</button>`).join('')}</nav><div class="settings-content">${content}</div></div>`;
  }

  // 関数: アカウント情報編集画面を描画する。
  // 引数: なし
  // 戻り値: なし
  function renderAccount() {
    const user = service.getCurrentUser();
    mainContent.innerHTML = `${pageHeading('アカウント', '<button class="button button-outline button-small" type="button" data-route="settings">← 設定に戻る</button>')}<section class="account-panel"><h2>プロフィール</h2><p class="muted small-text">ユーザーIDは変更できません。</p><form class="field-grid" data-form="profile"><div class="field"><label for="accountUserId">ユーザーID</label><input class="input" id="accountUserId" value="${escapeHtml(user.userId)}" disabled></div><div class="field"><label for="accountDisplayName">表示名（10文字以内）</label><input class="input" id="accountDisplayName" name="displayName" maxlength="10" value="${escapeHtml(user.displayName)}" required></div><div class="field"><label for="accountEmail">メールアドレス</label><input class="input" id="accountEmail" name="email" type="email" value="${escapeHtml(user.email || '')}"></div><div class="field"><label for="accountBirthDate">生年月日</label><input class="input" id="accountBirthDate" name="birthDate" type="date" value="${escapeHtml(user.birthDate || '')}"></div><div class="field"><label for="accountGender">性別</label><select class="select" id="accountGender" name="gender"><option value="" ${!user.gender ? 'selected' : ''}>回答しない</option><option value="female" ${user.gender === 'female' ? 'selected' : ''}>女性</option><option value="male" ${user.gender === 'male' ? 'selected' : ''}>男性</option><option value="other" ${user.gender === 'other' ? 'selected' : ''}>その他</option></select></div><div class="field-full"><p class="form-error" aria-live="polite"></p><button class="button button-primary" type="submit">変更を保存</button></div></form></section><section class="settings-section" style="margin-top:16px"><h2>アカウントの削除</h2><p class="muted">個人情報とログイン情報を匿名化し、統計用の注文記録は保持します。お気に入りとカートデータもJSON内に残ります。削除後は再ログインできません。</p><button class="button button-danger" type="button" data-action="delete-account">アカウントを削除</button></section>`;
  }

  // 関数: 現在のアプリ画面を選択して描画する。
  // 引数: なし
  // 戻り値: なし
  function render() {
    applySettings();
    const user = service.getCurrentUser();
    if (!user) {
      state.authMode = state.screen === 'register' ? 'register' : 'login';
      renderAuth();
      return;
    }
    authScreen.hidden = true;
    storefront.hidden = false;
    renderChrome();
    const renderers = {
      home: renderHome, store: renderStore, cart: renderCart, checkout: renderCheckout,
      favorites: renderFavorites, orders: renderOrders, settings: renderSettings, account: renderAccount
    };
    (renderers[state.screen] || renderHome)();
  }

  // 関数: 指定画面へ移動し、必要な表示状態を更新する。
  // 引数: screen(String): 遷移先画面キー
  // 戻り値: なし
  function navigate(screen) {
    state.screen = screen;
    state.menuOpen = false;
    state.message = '';
    state.cartAfterPurchase = null;
    render();
    mainContent.focus({ preventScroll: true });
    global.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // 関数: 画面下部に自動で消える通知を表示する。
  // 引数: message(String): 表示する内容, type(String): 'error'または'success'
  // 戻り値: なし
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.setAttribute('role', 'status');
    toast.textContent = message;
    toastRegion.append(toast);
    global.setTimeout(() => toast.remove(), 3000);
  }

  // 関数: 商品詳細ボトムシートを開く。
  // 引数: productId(String): 表示する商品ID
  // 戻り値: なし
  function openProduct(productId) {
    const data = service.getSnapshot();
    const product = data.products.find((record) => record.id === productId);
    if (!product) return;
    const store = data.stores.find((record) => record.id === product.storeId);
    const category = data.categories.find((record) => record.id === product.categoryId);
    const favorite = service.isFavorite('product', product.id);
    overlayRoot.innerHTML = `<div class="overlay-backdrop" data-action="backdrop-close"><section class="bottom-sheet" role="dialog" aria-modal="true" aria-labelledby="productTitle"><div class="sheet-grab-zone" data-action="sheet-grab"><span class="sheet-grab"></span></div><div class="sheet-heading"><button class="close-button" type="button" data-action="close-overlay" aria-label="閉じる">×</button></div><div class="detail-image-wrap">${imageMarkup(product.imageUrl, product.name, 'detail-image')}</div><div class="detail-body"><h2 id="productTitle">${escapeHtml(product.name)}</h2><button class="text-button" style="justify-self:start" type="button" data-action="open-store" data-id="${escapeHtml(store.id)}">${escapeHtml(store.name)} → 店舗ページ</button><div class="product-meta"><span class="detail-price">${formatYen(product.priceYen)}</span><span class="category-badge">${escapeHtml(category && category.name)}</span></div><p class="detail-description">${escapeHtml(product.description || '商品説明はありません。')}</p><p class="muted small-text">${product.stock === null ? '在庫数の表示なし' : product.stock > 0 ? `在庫 ${product.stock} 点` : '在庫切れ'}</p><div class="sheet-actions"><button class="button button-outline" type="button" data-action="favorite-product" data-id="${escapeHtml(product.id)}" aria-label="お気に入り">${favorite ? '♥' : '♡'}</button><button class="button button-outline" type="button" data-action="close-overlay">閉じる</button><button class="button button-primary" type="button" data-action="add-cart" data-id="${escapeHtml(product.id)}" ${product.stock === 0 ? 'disabled' : ''}>カートに入れる</button></div></div></section></div>`;
    const sheet = overlayRoot.querySelector('.bottom-sheet');
    sheet.addEventListener('pointerdown', startSheetDrag);
    sheet.addEventListener('pointerup', finishSheetDrag);
    sheet.addEventListener('pointercancel', finishSheetDrag);
  }

  // 関数: 商品詳細シートのドラッグ開始位置を記録する。
  // 引数: event(PointerEvent): ポインターイベント
  // 戻り値: なし
  function startSheetDrag(event) {
    if (!event.target.closest('.sheet-grab-zone')) return;
    state.dragStartY = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  // 関数: 下向きドラッグ距離を測り、しきい値を超えたらシートを閉じる。
  // 引数: event(PointerEvent): ポインターイベント
  // 戻り値: なし
  function finishSheetDrag(event) {
    if (state.dragStartY === undefined) return;
    const distance = event.clientY - state.dragStartY;
    state.dragStartY = undefined;
    if (distance > 90) closeOverlay();
  }

  // 関数: 開いているボトムシートを閉じる。
  // 引数: なし
  // 戻り値: なし
  function closeOverlay() {
    overlayRoot.replaceChildren();
  }

  // 関数: ショッピングタブを切り替え、各タブの検索表示とスクロールを復元する。
  // 引数: tabId(String): 切替先タブID
  // 戻り値: なし
  function selectShoppingTab(tabId) {
    const tabs = service.getShoppingTabs();
    const currentTab = tabs.find((tab) => tab.id === state.activeTabId);
    if (currentTab) service.updateShoppingTabViewState(currentTab.id, { scrollY: global.scrollY, searchExpanded: state.searchExpanded });
    const nextTab = tabs.find((tab) => tab.id === tabId);
    if (!nextTab) return;
    state.activeTabId = nextTab.id;
    state.searchExpanded = Boolean(nextTab.viewState && nextTab.viewState.searchExpanded);
    renderHome();
    global.requestAnimationFrame(() => global.scrollTo({ top: Number(nextTab.viewState && nextTab.viewState.scrollY) || 0, behavior: 'auto' }));
  }

  // 関数: ログインフォームを検証してログインする。
  // 引数: form(HTMLFormElement): ログインフォーム
  // 戻り値: なし (Promise<undefined>)
  async function submitLogin(form) {
    const values = new FormData(form);
    try {
      await service.login(values.get('userId'), values.get('password'));
      state.screen = 'home';
      state.message = '';
      render();
    } catch (error) {
      state.message = error.message;
      renderAuth();
      document.getElementById('loginUserId').value = values.get('userId');
      document.getElementById('loginPassword').focus();
    }
  }

  // 関数: 登録フォームを検証してアカウントと初期カートを作る。
  // 引数: form(HTMLFormElement): 登録フォーム
  // 戻り値: なし (Promise<undefined>)
  async function submitRegistration(form) {
    const values = new FormData(form);
    const profile = Object.fromEntries(values.entries());
    try {
      await service.register(profile);
      state.screen = 'home';
      state.activeTabId = service.getShoppingTabs()[0]?.id;
      state.message = '';
      render();
      showToast('アカウントを作成しました。');
    } catch (error) {
      state.message = error.message;
      const saved = Object.fromEntries(values.entries());
      renderAuth();
      Object.entries(saved).forEach(([key, value]) => {
        const field = authScreen.querySelector(`[name="${key}"]`);
        if (field && field.type !== 'password') field.value = value;
      });
      document.getElementById('registerPassword')?.focus();
    }
  }

  // 関数: 検索フォームの店舗名とカテゴリをIDに変換してタブへ保存する。
  // 引数: form(HTMLFormElement): 検索フォーム
  // 戻り値: なし
  function submitSearch(form) {
    const values = new FormData(form);
    const data = service.getSnapshot();
    const storeName = String(values.get('storeName') || '').trim();
    const store = storeName && storeName !== 'すべて' ? data.stores.find((record) => record.name === storeName) : null;
    if (storeName && storeName !== 'すべて' && !store) throw new Error('候補から店舗を選ぶか、「すべて」を指定してください。');
    const categoryIds = values.getAll('categoryIds');
    const updated = service.updateShoppingTab(state.activeTabId, { storeId: store ? store.id : '', query: values.get('query'), categoryIds });
    state.activeTabId = updated.id;
    state.searchExpanded = true;
    render();
  }

  // 関数: 店舗ページ用の商品検索条件を更新する。
  // 引数: form(HTMLFormElement): 店舗内検索フォーム
  // 戻り値: なし
  function submitStoreSearch(form) {
    const values = new FormData(form);
    state.storeFilters = { query: values.get('query'), categoryIds: values.getAll('storeCategoryIds') };
    renderStore();
  }

  // 関数: プロフィールフォームを更新する。
  // 引数: form(HTMLFormElement): プロフィールフォーム
  // 戻り値: なし
  function submitProfile(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      service.updateProfile(values);
      showToast('アカウント情報を保存しました。');
      render();
    } catch (error) {
      form.querySelector('.form-error').textContent = error.message;
    }
  }

  // 関数: パスワード変更フォームを処理する。
  // 引数: form(HTMLFormElement): パスワード変更フォーム
  // 戻り値: なし (Promise<undefined>)
  async function submitPassword(form) {
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      await service.changePassword(values.currentPassword, values.nextPassword);
      showToast('パスワードを変更しました。');
      renderSettings();
    } catch (error) {
      form.querySelector('.form-error').textContent = error.message;
    }
  }

  // 関数: 指定フォームのsubmitイベントを振り分ける。
  // 引数: event(Event): submitイベント
  // 戻り値: なし
  function handleSubmit(event) {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    form.querySelectorAll('.form-error').forEach((element) => { element.textContent = ''; });
    const handlers = {
      login: submitLogin, register: submitRegistration, search: submitSearch,
      'store-search': submitStoreSearch, profile: submitProfile, password: submitPassword,
      'create-cart': (target) => { const values = new FormData(target); service.createCart(values.get('name')); renderCart(); showToast('カートを作成しました。'); }
    };
    try {
      const result = handlers[form.dataset.form]?.(form);
      if (result && typeof result.catch === 'function') result.catch((error) => showToast(error.message, 'error'));
    } catch (error) {
      const errorNode = form.querySelector('.form-error');
      if (errorNode) errorNode.textContent = error.message;
      else showToast(error.message, 'error');
    }
  }

  // 関数: 商品を現在の既定カートへ追加して画面を更新する。
  // 引数: productId(String): 追加する商品ID
  // 戻り値: なし
  function addProductToCart(productId) {
    const cart = service.getOrCreateCart();
    service.addToCart(cart.id, productId, 1);
    closeOverlay();
    showToast('カートに追加しました。');
    if (state.screen === 'cart') renderCart();
    else renderChrome();
  }

  // 関数: カートを購入し、在庫エラーまたは完了状態を表示する。
  // 引数: cartId(String): 購入するカートID
  // 戻り値: なし
  function confirmPurchase(cartId) {
    try {
      state.cartAfterPurchase = service.purchaseCart(cartId);
      state.screen = 'checkout';
      render();
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  // 関数: データをJSONファイルとしてダウンロードする。
  // 引数: なし
  // 戻り値: なし
  function exportData() {
    const data = service.getSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `market-lane-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast('JSONを書き出しました。');
  }

  // 関数: JSONファイルを検証して読み込む。
  // 引数: file(File): 利用者が選択したJSONファイル
  // 戻り値: なし (Promise<undefined>)
  async function importFile(file) {
    if (!file) return;
    try {
      service.importData(await file.text());
      state.screen = 'login';
      state.authMode = 'login';
      state.activeTabId = null;
      render();
      showToast('データを読み込みました。再度ログインしてください。');
    } catch (error) {
      showToast(error.message, 'error');
      renderSettings();
    }
  }

  // 関数: クリック操作をdata属性に基づいて処理する。
  // 引数: event(Event): clickイベント
  // 戻り値: なし
  function handleClick(event) {
    const target = event.target.closest('[data-action], [data-route]');
    if (!target) return;
    if (target.dataset.action === 'close-tab') {
      event.stopPropagation();
      try { service.closeShoppingTab(target.dataset.id); state.activeTabId = service.getShoppingTabs()[0].id; render(); } catch (error) { showToast(error.message, 'error'); }
      return;
    }
    if (target.dataset.route) {
      if (target.dataset.route === 'cart' && target.dataset.cartBack) state.selectedCartId = null;
      navigate(target.dataset.route);
      return;
    }
    const actions = {
      'auth-switch': () => { state.authMode = state.authMode === 'login' ? 'register' : 'login'; state.screen = state.authMode; state.message = ''; renderAuth(); },
      'suggest-id': () => { state.suggestedUserId = service.suggestUserId(); document.getElementById('registerUserId').value = state.suggestedUserId; },
      'toggle-menu': () => { state.menuOpen = !state.menuOpen; renderChrome(); },
      'toggle-search': () => { state.searchExpanded = !state.searchExpanded; service.updateShoppingTabViewState(state.activeTabId, { searchExpanded: state.searchExpanded, scrollY: global.scrollY }); renderHome(); },
      'toggle-store-search': () => { state.storeSearchExpanded = !state.storeSearchExpanded; renderStore(); },
      'add-tab': () => { try { const tab = service.createShoppingTab(); state.activeTabId = tab.id; state.searchExpanded = false; renderHome(); } catch (error) { showToast(error.message, 'error'); } },
      'select-tab': () => selectShoppingTab(target.dataset.id),
      'clear-search': () => { service.updateShoppingTab(state.activeTabId, { storeId: '', query: '', categoryIds: [] }); renderHome(); },
      'open-product': () => openProduct(target.dataset.id),
      'open-store': () => { closeOverlay(); state.storeId = target.dataset.id; state.storeFilters = { query: '', categoryIds: [] }; state.storeSearchExpanded = false; navigate('store'); },
      'add-cart': () => { try { addProductToCart(target.dataset.id); } catch (error) { showToast(error.message, 'error'); } },
      'favorite-product': () => { service.toggleFavorite('product', target.dataset.id); openProduct(target.dataset.id); showToast('お気に入りを更新しました。'); },
      'toggle-store-favorite': () => { service.toggleFavorite('store', target.dataset.id); renderStore(); showToast('お気に入りを更新しました。'); },
      'favorite-type': () => { state.selectedFavoriteType = target.dataset.value; renderFavorites(); },
      'create-cart': () => { const name = global.prompt('新しいカート名'); if (name) { service.createCart(name); renderCart(); } },
      'select-cart': () => { state.selectedCartId = target.dataset.id; renderCart(); },
      'back-carts': () => { state.selectedCartId = null; renderCart(); },
      'rename-cart': () => { const cart = service.getCarts().find((record) => record.id === target.dataset.id); const name = global.prompt('カート名を変更', cart.name); if (name) { service.renameCart(cart.id, name); renderCart(); } },
      'delete-cart': () => { if (global.confirm('このカートと中の商品を削除しますか？')) { try { service.deleteCart(target.dataset.id); renderCart(); } catch (error) { showToast(error.message, 'error'); } } },
      quantity: () => { const current = Number(target.parentElement.querySelector('.quantity-value').textContent); try { service.updateCartItem(target.dataset.cart, target.dataset.id, current + Number(target.dataset.delta)); renderCart(); } catch (error) { showToast(error.message, 'error'); } },
      checkout: () => { state.selectedCartId = target.dataset.id; navigate('checkout'); },
      'confirm-purchase': () => confirmPurchase(target.dataset.id),
      'finish-home': () => { state.cartAfterPurchase = null; navigate('home'); },
      'finish-cart': () => { state.cartAfterPurchase = null; state.selectedCartId = null; navigate('cart'); },
      'settings-section': () => { state.settingsSection = target.dataset.value; renderSettings(); },
      theme: () => { const user = service.getCurrentUser(); service.updateSetting(user.id, 'themeMode', target.dataset.value); renderSettings(); applySettings(); },
      'custom-color': () => { const user = service.getCurrentUser(); service.updateSetting(user.id, 'customColor', target.dataset.value); renderSettings(); applySettings(); },
      'reset-setting': () => { const user = service.getCurrentUser(); service.resetSettings(user.id, target.dataset.key || null); renderSettings(); applySettings(); showToast('設定をリセットしました。'); },
      'export-data': exportData,
      logout: () => { service.logout(); state.screen = 'login'; state.authMode = 'login'; state.menuOpen = false; render(); },
      'delete-account': () => { if (global.confirm('本当にアカウントを削除しますか？')) { if (global.confirm('削除後はログインできません。匿名化した注文データとお気に入り/カートは保存されます。削除を確定しますか？')) { service.deleteAccount(); state.screen = 'login'; state.authMode = 'login'; render(); showToast('アカウントを匿名化しました。'); } } },
      'close-overlay': closeOverlay
    };
    actions[target.dataset.action]?.();
  }

  // 関数: 表示中の画面に応じてフォーム以外の入力変更を保存する。
  // 引数: event(Event): changeイベント
  // 戻り値: なし
  function handleChange(event) {
    const target = event.target;
    if (target.dataset.input === 'reduce-motion') {
      service.updateSetting(service.getCurrentUser().id, 'reduceMotion', target.checked);
      applySettings();
    } else if (target.dataset.input === 'custom-color') {
      service.updateSetting(service.getCurrentUser().id, 'customColor', target.value);
      renderSettings();
      applySettings();
    } else if (target.dataset.input === 'custom-color-hex') {
      if (!/^#[0-9a-f]{6}$/i.test(target.value)) {
        showToast('カラーコードは #RRGGBB 形式で入力してください。', 'error');
        return;
      }
      service.updateSetting(service.getCurrentUser().id, 'customColor', target.value.toLowerCase());
      renderSettings();
      applySettings();
    } else if (target.dataset.input === 'import-file') {
      importFile(target.files[0]);
    }
  }

  // 関数: お気に入り検索入力に応じて一覧を更新する。
  // 引数: event(Event): inputイベント
  // 戻り値: なし
  function handleInput(event) {
    if (event.target.dataset.input === 'favorite-search') {
      const selectionStart = event.target.selectionStart;
      state.favoriteQuery = event.target.value;
      renderFavorites();
      const searchInput = mainContent.querySelector('[data-input="favorite-search"]');
      searchInput.focus();
      searchInput.setSelectionRange(selectionStart, selectionStart);
    }
  }

  // 関数: ボトムシート背景をクリックした場合だけシートを閉じる。
  // 引数: event(Event): clickイベント
  // 戻り値: なし
  function handleOverlayClick(event) {
    if (event.target.classList.contains('overlay-backdrop')) closeOverlay();
  }

  // 関数: Escapeキーでシートまたはメニューを閉じる。
  // 引数: event(KeyboardEvent): キーボードイベント
  // 戻り値: なし
  function handleKeydown(event) {
    if (event.key !== 'Escape') return;
    if (overlayRoot.childElementCount) closeOverlay();
    else if (state.menuOpen) { state.menuOpen = false; renderChrome(); }
  }

  // 関数: アプリ全体のイベントを登録し、保存済みセッションから起動する。
  // 引数: なし
  // 戻り値: なし
  function initialize() {
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('click', handleClick);
    document.addEventListener('change', handleChange);
    document.addEventListener('input', handleInput);
    overlayRoot.addEventListener('click', handleOverlayClick);
    menuToggle.addEventListener('click', (event) => { event.preventDefault(); state.menuOpen = !state.menuOpen; renderChrome(); });
    document.addEventListener('keydown', handleKeydown);
    state.screen = service.getCurrentUser() ? 'home' : 'login';
    render();
  }

  initialize();
})(window);