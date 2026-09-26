(function (global) {
  'use strict';

  const app = (global.ShopApp = global.ShopApp || {});

  // 関数: 検索フォームと店舗商品一覧を含むホーム画面を描画する。
  // 引数: context(Object): 画面状態、サービス、DOM、共通部品
  // 戻り値: なし
  function renderHome(context) {
    const { state, service, mainContent, components, utils } = context;
    const { escapeHtml } = utils;
    const { pageHeading, emptyState, productCard } = components;
    const data = service.getSnapshot();
    const tabs = service.getShoppingTabs();
    if (!tabs.length) {
      const created = service.createShoppingTab();
      state.activeTabId = created.id;
      return renderHome(context);
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
      return `<section class="store-section"><div class="store-heading"><button class="store-title-button" type="button" data-action="open-store" data-id="${escapeHtml(store.id)}">${escapeHtml(store.name)} <span aria-hidden="true">↗</span></button></div><div class="product-row">${products.map(productCard).join('')}</div></section>`;
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
  // 引数: context(Object): 店舗ID、検索状態、サービス、DOM、共通部品
  // 戻り値: なし
  function renderStore(context) {
    const { state, service, mainContent, components, utils, navigate } = context;
    const { escapeHtml, imageMarkup, formatYen } = utils;
    const { pageHeading, emptyState, productCard } = components;
    const data = service.getSnapshot();
    const store = data.stores.find((record) => record.id === state.storeId);
    if (!store) return navigate('home');
    const filters = state.storeFilters || { query: '', categoryIds: [] };
    const products = service.searchProducts({ ...filters, storeId: store.id });
    const categories = data.categories.map((category) => `<label class="check-option"><input type="checkbox" name="storeCategoryIds" value="${escapeHtml(category.id)}" ${filters.categoryIds.includes(category.id) ? 'checked' : ''}>${escapeHtml(category.name)}</label>`).join('');
    mainContent.innerHTML = `
      <div class="inline-actions" style="margin-bottom: 18px"><a class="button button-outline button-small" href="home.html">← ショッピングへ戻る</a></div>
      <section class="store-page-hero"><div class="store-page-copy"><h1>${escapeHtml(store.name)}</h1><p>${escapeHtml(store.description)}</p><button class="button button-primary button-small" type="button" data-action="toggle-store-favorite" data-id="${escapeHtml(store.id)}">${service.isFavorite('store', store.id) ? '♥ お気に入り済み' : '♡ お気に入りに入れる'}</button><div class="store-info-line">${store.address ? `<span>${escapeHtml(store.address)}</span>` : ''}${store.phone ? `<span>${escapeHtml(store.phone)}</span>` : ''}</div></div><div class="store-page-image">${imageMarkup(store.imageUrl, store.name, 'store-cover')}</div></section>
      <div class="section-heading"><h2>この店の商品</h2><span class="muted small-text">${products.length} 商品</span></div>
      <section class="search-area"><button class="search-toggle" type="button" data-action="toggle-store-search" aria-expanded="${state.storeSearchExpanded}"><span class="search-toggle-label"><span class="search-icon" aria-hidden="true"></span>商品を検索</span><span aria-hidden="true">${state.storeSearchExpanded ? '−' : '+'}</span></button>${state.storeSearchExpanded ? `<form class="search-form" data-form="store-search"><div class="field"><label for="storeQuery">商品名・説明</label><input class="input" id="storeQuery" name="query" value="${escapeHtml(filters.query)}"></div><div class="field"><span class="field-label">カテゴリ</span><div class="check-row">${categories}</div></div><button class="button button-primary" type="submit">検索する</button></form>` : ''}</section>
      ${products.length ? `<div class="product-row store-product-row">${products.map(productCard).join('')}</div>` : emptyState('該当する商品がありません', '検索語やカテゴリを変更してください。')}`;
  }

  app.screens = { ...(app.screens || {}), shopping: { renderHome, renderStore } };
})(window);
