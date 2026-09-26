(function (global) {
  'use strict';
  const app = (global.ShopApp = global.ShopApp || {});
  const utils = app.utils;
  const service = app.services;
  app.screens = app.screens || {};

  // 関数: ログイン画面または登録画面を描画する。
  app.screens.renderAuth = function (mode, message = '') {
    const authScreen = document.getElementById('authScreen');
    if (!authScreen) return;

    const isRegister = mode === 'register';
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
    const error = message ? `<p class="form-error" role="alert">${utils.escapeHtml(message)}</p>` : '<p class="form-error" aria-live="polite"></p>';
    
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

    if (isRegister && app.state.suggestedUserId) {
      document.getElementById('registerUserId').value = app.state.suggestedUserId;
    }
  };

  // 関数: ログインフォームを検証してログインする。
  app.screens.submitLogin = async function (form) {
    const values = new FormData(form);
    try {
      await service.login(values.get('userId'), values.get('password'));
      window.location.href = 'home.html';
    } catch (error) {
      app.screens.renderAuth('login', error.message);
      document.getElementById('loginUserId').value = values.get('userId');
      document.getElementById('loginPassword').focus();
    }
  };

  // 関数: 登録フォームを検証してアカウントと初期カートを作る。
  app.screens.submitRegistration = async function (form) {
    const values = new FormData(form);
    const profile = Object.fromEntries(values.entries());
    try {
      await service.register(profile);
      // 画面遷移後もToastを表示するためSessionStorageを利用
      window.sessionStorage.setItem('toastMessage', 'アカウントを作成しました。');
      window.location.href = 'home.html';
    } catch (error) {
      app.screens.renderAuth('register', error.message);
      const saved = Object.fromEntries(values.entries());
      const authScreen = document.getElementById('authScreen');
      Object.entries(saved).forEach(([key, value]) => {
        const field = authScreen.querySelector(`[name="${key}"]`);
        if (field && field.type !== 'password') field.value = value;
      });
      document.getElementById('registerPassword')?.focus();
    }
  };
  
// --- (home-screens.js の末尾部分) ---
  
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
      // 同じハッシュ内で完了画面へ移行するため、強制再描画を行う
      app.renderCurrentRoute();
    } catch (error) {
      components.showToast(error.message, 'error');
    }
  };
})(window);