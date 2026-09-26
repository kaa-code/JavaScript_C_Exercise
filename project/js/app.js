(function (global) {
  'use strict';

  const app = global.ShopApp;
  const components = app.components;
  const service = app.services;

  app.state = {
    screen: 'home',
    activeTabId: null,
    selectedCartId: null,
    selectedFavoriteType: 'product',
    settingsSection: 'appearance',
    storeId: null,
    menuOpen: false,
    searchExpanded: false,
    storeSearchExpanded: false,
    cartAfterPurchase: null,
    favoriteQuery: '',
    suggestedUserId: ''
  };

  app.navigate = function (screen) {
    app.state.screen = screen;
    app.state.menuOpen = false;
    app.state.cartAfterPurchase = null;
    
    if (['settings', 'account'].includes(screen)) {
      window.location.href = `${screen}.html`;
      return;
    }
    
    if (!window.location.pathname.endsWith('home.html')) {
      window.location.href = `home.html#${screen}`;
      return;
    }
    
    window.location.hash = screen === 'home' ? '' : screen;
  };

  app.renderCurrentRoute = function () {
    components.applySettings();
    const user = service.getCurrentUser();
    if (!user) return;

    const path = window.location.pathname;
    let screen = 'home';
    
    if (path.endsWith('settings.html')) screen = 'settings';
    else if (path.endsWith('account.html')) screen = 'account';
    else screen = window.location.hash.replace('#', '') || 'home';

    app.state.screen = screen;
    components.renderChrome(screen === 'account' ? 'settings' : screen);

    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    const renderers = {
      home: app.screens.renderHome,
      store: app.screens.renderStore,
      cart: app.screens.renderCart,
      checkout: app.screens.renderCheckout,
      favorites: app.screens.renderFavorites,
      orders: app.screens.renderOrders,
      settings: app.screens.renderSettings,
      account: app.screens.renderAccount
    };

    if (renderers[screen]) renderers[screen](mainContent);
  };

  function handleClick(event) {
    const target = event.target.closest('[data-action], [data-route]');
    if (!target) return;

    if (target.dataset.action === 'close-tab') {
      event.stopPropagation();
      try { service.closeShoppingTab(target.dataset.id); app.state.activeTabId = service.getShoppingTabs()[0].id; app.renderCurrentRoute(); } 
      catch (error) { components.showToast(error.message, 'error'); }
      return;
    }

    if (target.dataset.route) {
      if (target.dataset.route === 'cart' && target.dataset.cartBack) app.state.selectedCartId = null;
      app.navigate(target.dataset.route);
      return;
    }

    const user = service.getCurrentUser();
    const actions = {
      'auth-switch': () => { window.location.href = window.location.pathname.includes('register.html') ? 'index.html' : 'register.html'; },
      'suggest-id': () => { app.state.suggestedUserId = service.suggestUserId(); const input = document.getElementById('registerUserId'); if(input) input.value = app.state.suggestedUserId; },
      'toggle-search': () => { app.state.searchExpanded = !app.state.searchExpanded; service.updateShoppingTabViewState(app.state.activeTabId, { searchExpanded: app.state.searchExpanded, scrollY: global.scrollY }); app.renderCurrentRoute(); },
      'toggle-store-search': () => { app.state.storeSearchExpanded = !app.state.storeSearchExpanded; app.renderCurrentRoute(); },
      'add-tab': () => { try { const tab = service.createShoppingTab(); app.state.activeTabId = tab.id; app.state.searchExpanded = false; app.renderCurrentRoute(); } catch (error) { components.showToast(error.message, 'error'); } },
      'select-tab': () => app.screens.selectShoppingTab(target.dataset.id),
      'clear-search': () => { service.updateShoppingTab(app.state.activeTabId, { storeId: '', query: '', categoryIds: [] }); app.renderCurrentRoute(); },
      'open-product': () => components.openProduct(target.dataset.id),
      'open-store': () => { components.closeOverlay(); app.state.storeId = target.dataset.id; app.state.storeFilters = { query: '', categoryIds: [] }; app.state.storeSearchExpanded = false; app.navigate('store'); },
      'add-cart': () => { try { app.screens.addProductToCart(target.dataset.id); } catch (error) { components.showToast(error.message, 'error'); } },
      'favorite-product': () => { service.toggleFavorite('product', target.dataset.id); components.openProduct(target.dataset.id); components.showToast('お気に入りを更新しました。'); },
      'toggle-store-favorite': () => { service.toggleFavorite('store', target.dataset.id); app.renderCurrentRoute(); components.showToast('お気に入りを更新しました。'); },
      'favorite-type': () => { app.state.selectedFavoriteType = target.dataset.value; app.renderCurrentRoute(); },
      'create-cart': () => { const name = global.prompt('新しいカート名'); if (name) { service.createCart(name); app.renderCurrentRoute(); } },
      'select-cart': () => { app.state.selectedCartId = target.dataset.id; app.renderCurrentRoute(); },
      'back-carts': () => { app.state.selectedCartId = null; app.renderCurrentRoute(); },
      'rename-cart': () => { const cart = service.getCarts().find((record) => record.id === target.dataset.id); const name = global.prompt('カート名を変更', cart.name); if (name) { service.renameCart(cart.id, name); app.renderCurrentRoute(); } },
      'delete-cart': () => { if (global.confirm('このカートと中の商品を削除しますか？')) { try { service.deleteCart(target.dataset.id); app.renderCurrentRoute(); } catch (error) { components.showToast(error.message, 'error'); } } },
      quantity: () => { const current = Number(target.parentElement.querySelector('.quantity-value').textContent); try { service.updateCartItem(target.dataset.cart, target.dataset.id, current + Number(target.dataset.delta)); app.renderCurrentRoute(); } catch (error) { components.showToast(error.message, 'error'); } },
      checkout: () => { app.state.selectedCartId = target.dataset.id; app.navigate('checkout'); },
      'confirm-purchase': () => app.screens.confirmPurchase(target.dataset.id),
      'finish-home': () => { app.state.cartAfterPurchase = null; app.navigate('home'); },
      'finish-cart': () => { app.state.cartAfterPurchase = null; app.state.selectedCartId = null; app.navigate('cart'); },
      
      // 設定系アクション
      'settings-section': () => { app.state.settingsSection = target.dataset.value; app.renderCurrentRoute(); },
      theme: () => { service.updateSetting(user.id, 'themeMode', target.dataset.value); app.renderCurrentRoute(); components.applySettings(); },
      'custom-color': () => { service.updateSetting(user.id, 'customColor', target.dataset.value); app.renderCurrentRoute(); components.applySettings(); },
      'reset-setting': () => { service.resetSettings(user.id, target.dataset.key || null); app.renderCurrentRoute(); components.applySettings(); components.showToast('設定をリセットしました。'); },
      'export-data': () => { if (app.screens.exportData) app.screens.exportData(); },
      logout: () => { service.logout(); window.location.href = 'index.html'; },
      'delete-account': () => { 
        if (global.confirm('本当にアカウントを削除しますか？')) { 
          if (global.confirm('削除後はログインできません。匿名化した注文データとお気に入り/カートは保存されます。削除を確定しますか？')) { 
            service.deleteAccount(); 
            window.sessionStorage.setItem('toastMessage', 'アカウントを匿名化しました。');
            window.location.href = 'index.html'; 
          } 
        } 
      },
      'close-overlay': components.closeOverlay
    };

    actions[target.dataset.action]?.();
  }

  function handleSubmit(event) {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    form.querySelectorAll('.form-error').forEach((element) => { element.textContent = ''; });

    const handlers = {
      login: app.screens.submitLogin,
      register: app.screens.submitRegistration,
      search: app.screens.submitSearch,
      'store-search': app.screens.submitStoreSearch,
      profile: app.screens.submitProfile,
      password: app.screens.submitPassword,
      'create-cart': (target) => { const values = new FormData(target); service.createCart(values.get('name')); app.renderCurrentRoute(); components.showToast('カートを作成しました。'); }
    };

    try {
      const result = handlers[form.dataset.form]?.(form);
      if (result && typeof result.catch === 'function') result.catch((error) => components.showToast(error.message, 'error'));
    } catch (error) {
      const errorNode = form.querySelector('.form-error');
      if (errorNode) errorNode.textContent = error.message;
      else components.showToast(error.message, 'error');
    }
  }

  function handleChange(event) {
    const target = event.target;
    const user = service.getCurrentUser();
    if (!user) return;

    if (target.dataset.input === 'reduce-motion') {
      service.updateSetting(user.id, 'reduceMotion', target.checked);
      components.applySettings();
    } else if (target.dataset.input === 'custom-color') {
      service.updateSetting(user.id, 'customColor', target.value);
      app.renderCurrentRoute();
      components.applySettings();
    } else if (target.dataset.input === 'custom-color-hex') {
      if (!/^#[0-9a-f]{6}$/i.test(target.value)) {
        components.showToast('カラーコードは #RRGGBB 形式で入力してください。', 'error');
        return;
      }
      service.updateSetting(user.id, 'customColor', target.value.toLowerCase());
      app.renderCurrentRoute();
      components.applySettings();
    } else if (target.dataset.input === 'import-file') {
      if(app.screens.importFile) app.screens.importFile(target.files[0]);
    }
  }

  function handleInput(event) {
    if (event.target.dataset.input === 'favorite-search') {
      const selectionStart = event.target.selectionStart;
      app.state.favoriteQuery = event.target.value;
      app.renderCurrentRoute();
      const searchInput = document.querySelector('[data-input="favorite-search"]');
      if(searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(selectionStart, selectionStart);
      }
    }
  }

  function handleOverlayClick(event) {
    if (event.target.classList.contains('overlay-backdrop')) components.closeOverlay();
  }

  function handleKeydown(event) {
    if (event.key !== 'Escape') return;
    const overlayRoot = document.getElementById('overlayRoot');
    if (overlayRoot && overlayRoot.childElementCount) components.closeOverlay();
    else if (app.state.menuOpen) { app.state.menuOpen = false; components.renderChrome(app.state.screen); }
  }

  function initialize() {
    document.addEventListener('submit', handleSubmit);
    document.addEventListener('click', handleClick);
    document.addEventListener('change', handleChange);
    document.addEventListener('input', handleInput);
    document.addEventListener('keydown', handleKeydown);
    
    const overlayRoot = document.getElementById('overlayRoot');
    if(overlayRoot) overlayRoot.addEventListener('click', handleOverlayClick);

    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
      menuToggle.addEventListener('click', (event) => {
        event.preventDefault();
        app.state.menuOpen = !app.state.menuOpen;
        components.renderChrome(app.state.screen);
      });
    }

    window.addEventListener('hashchange', () => {
      app.renderCurrentRoute();
      const mainContent = document.getElementById('mainContent');
      if (mainContent) {
        mainContent.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });

    components.applySettings();

    const toastMsg = window.sessionStorage.getItem('toastMessage');
    if (toastMsg) { components.showToast(toastMsg); window.sessionStorage.removeItem('toastMessage'); }

    const user = service.getCurrentUser();
    const path = window.location.pathname;
    const isAuthPage = path.endsWith('index.html') || path.endsWith('register.html') || path === '/' || path.endsWith('/');

    if (!user && !isAuthPage) {
      window.location.href = 'index.html';
      return;
    }
    if (user && isAuthPage) {
      window.location.href = 'home.html';
      return;
    }

    if (isAuthPage) {
      if (path.endsWith('register.html')) {
        app.state.suggestedUserId = service.suggestUserId();
        app.screens.renderAuth('register');
      } else {
        app.screens.renderAuth('login');
      }
    } else {
      app.renderCurrentRoute();
    }
  }

  initialize();
})(window);