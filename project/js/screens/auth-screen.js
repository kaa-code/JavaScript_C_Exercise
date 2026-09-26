(function (global) {
  'use strict';

  const app = (global.ShopApp = global.ShopApp || {});

  // 関数: ログインまたは新規登録画面を描画する。
  // 引数: context(Object): 認証画面状態、対象DOM、サービス、HTMLエスケープ関数
  // 戻り値: なし
  function render(context) {
    const { state, authScreen, menuToggle, service, escapeHtml } = context;
    const isRegister = state.authMode === 'register';
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
    authScreen.hidden = false;
    menuToggle.hidden = true;
    authScreen.innerHTML = `
      <section class="auth-panel">
        <a class="brand-lockup auth-logo" href="index.html" aria-label="Market Lane"><span class="brand-mark">M</span><span class="brand-name">Market Lane</span></a>
        <h1>${isRegister ? '新規登録' : 'ログイン'}</h1>
        <form class="auth-form" data-form="${isRegister ? 'register' : 'login'}" novalidate>
          <div class="field-grid">${registrationFields}</div>
          ${error}
          <button class="button button-primary button-block" type="submit">${isRegister ? 'アカウントを作成' : 'ログイン'}</button>
        </form>
        <p class="auth-switch">${isRegister ? 'すでにアカウントをお持ちですか？' : 'はじめて利用しますか？'} <a href="${isRegister ? 'index.html' : 'register.html'}">${isRegister ? 'ログイン' : '新規登録'}</a></p>
        <p class="footer-note">学習用デモです。実サービスでは利用できません。</p>
      </section>`;
    if (isRegister) document.getElementById('registerUserId').value = state.suggestedUserId || service.suggestUserId();
  }

  app.screens = { ...(app.screens || {}), auth: { render } };
})(window);
