(function (global) {
  'use strict';
  const app = (global.ShopApp = global.ShopApp || {});
  const utils = app.utils;
  const components = app.components;
  const service = app.services;
  app.screens = app.screens || {};

  app.screens.renderSettings = function (container) {
    const user = service.getCurrentUser();
    const settings = service.getSettings(user.id);
    const sections = [
      ['appearance', '表示設定'], ['security', 'セキュリティ'], ['data', 'データ管理'], ['account', 'アカウント']
    ];
    let content = '';
    
    if (app.state.settingsSection === 'appearance') {
      content = `<section class="settings-section"><h2>テーマ</h2><div class="settings-row"><span>カラーモード</span><div class="segmented-control"><button class="segmented-button ${settings.themeMode === 'light' ? 'active' : ''}" type="button" data-action="theme" data-value="light">ライト</button><button class="segmented-button ${settings.themeMode === 'dark' ? 'active' : ''}" type="button" data-action="theme" data-value="dark">ダーク</button><button class="segmented-button ${settings.themeMode === 'custom' ? 'active' : ''}" type="button" data-action="theme" data-value="custom">指定色</button></div></div><div class="settings-row"><span>アクセントカラー</span><div class="inline-actions"><div class="theme-options">${['#d45d3f', '#367b70', '#4d6fb0', '#ba7c21'].map((color) => `<button class="theme-swatch ${settings.customColor === color ? 'active' : ''}" style="--swatch:${color}" type="button" data-action="custom-color" data-value="${color}" aria-label="アクセント色 ${color}"></button>`).join('')}</div><label class="sr-only" for="customColorHex">カラーコード</label><input class="input" id="customColorHex" data-input="custom-color-hex" value="${utils.escapeHtml(settings.customColor || '#d45d3f')}" pattern="#[0-9A-Fa-f]{6}" maxlength="7" style="width: 104px; min-height: 36px; padding: 6px" aria-label="HEXカラーコード"><label class="sr-only" for="customColor">カラーピッカー</label><input class="color-input" id="customColor" type="color" value="${utils.escapeHtml(settings.customColor || '#d45d3f')}" data-input="custom-color"></div></div><div class="settings-row"><span>視差・動きの効果を減らす</span><label class="toggle-control"><input type="checkbox" data-input="reduce-motion" ${settings.reduceMotion ? 'checked' : ''} aria-label="視差効果を減らす"><span class="toggle-track"></span></label></div><div class="form-actions" style="margin-top:15px"><button class="button button-outline button-small" type="button" data-action="reset-setting" data-key="themeMode">テーマをリセット</button><button class="button button-outline button-small" type="button" data-action="reset-setting" data-key="customColor">色をリセット</button><button class="button button-outline button-small" type="button" data-action="reset-setting" data-key="reduceMotion">動きをリセット</button><button class="button button-small" type="button" data-action="reset-setting">すべてリセット</button></div></section>`;
    } else if (app.state.settingsSection === 'security') {
      content = `<section class="settings-section"><h2>パスワードの変更</h2><p class="muted small-text">学習用デモのブラウザー内認証情報を更新します。</p><form class="field-grid" data-form="password"><div class="field field-full"><label for="currentPassword">現在のパスワード</label><input class="input" id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" required></div><div class="field field-full"><label for="newPassword">新しいパスワード（8文字以上）</label><input class="input" id="newPassword" name="nextPassword" type="password" minlength="8" autocomplete="new-password" required></div><div class="field-full"><button class="button button-primary" type="submit">パスワードを変更</button><p class="form-error" aria-live="polite"></p></div></form></section>`;
    } else if (app.state.settingsSection === 'data') {
      content = `<section class="settings-section"><h2>データのバックアップ</h2><p class="muted">現在のブラウザーデータをJSONファイルに書き出します。デモ用パスワード情報も含まれます。ファイルを他人と共有しないでください。</p><button class="button button-primary" type="button" data-action="export-data">JSONを書き出す</button></section><section class="settings-section"><h2>JSONから復元</h2><p class="muted">インポートは現在のアプリデータをすべて置き換え、ログアウトします。</p><label class="button button-outline" for="importFile">JSONファイルを選ぶ</label><input id="importFile" type="file" accept="application/json,.json" data-input="import-file" hidden><p class="form-error" aria-live="polite"></p></section>`;
    } else {
      content = `<section class="settings-section"><h2>アカウント</h2><div class="settings-row"><span>表示名</span><strong>${utils.escapeHtml(user.displayName)}</strong></div><div class="settings-row"><span>ユーザーID</span><strong>${utils.escapeHtml(user.userId)}</strong></div><button class="button button-outline" type="button" data-route="account">アカウント情報を編集</button></section><section class="settings-section"><h2>ログアウト</h2><p class="muted">次回はユーザーIDとパスワードでログインします。</p><button class="button button-danger" type="button" data-action="logout">ログアウト</button></section>`;
    }
    
    container.innerHTML = `${components.pageHeading('設定')}<div class="settings-layout"><nav class="settings-nav" aria-label="設定項目">${sections.map((section) => `<button class="${app.state.settingsSection === section[0] ? 'active' : ''}" type="button" data-action="settings-section" data-value="${section[0]}">${section[1]}</button>`).join('')}</nav><div class="settings-content">${content}</div></div>`;
  };

  app.screens.renderAccount = function (container) {
    const user = service.getCurrentUser();
    container.innerHTML = `${components.pageHeading('アカウント', '<button class="button button-outline button-small" type="button" data-route="settings">← 設定に戻る</button>')}<section class="account-panel"><h2>プロフィール</h2><p class="muted small-text">ユーザーIDは変更できません。</p><form class="field-grid" data-form="profile"><div class="field"><label for="accountUserId">ユーザーID</label><input class="input" id="accountUserId" value="${utils.escapeHtml(user.userId)}" disabled></div><div class="field"><label for="accountDisplayName">表示名（10文字以内）</label><input class="input" id="accountDisplayName" name="displayName" maxlength="10" value="${utils.escapeHtml(user.displayName)}" required></div><div class="field"><label for="accountEmail">メールアドレス</label><input class="input" id="accountEmail" name="email" type="email" value="${utils.escapeHtml(user.email || '')}"></div><div class="field"><label for="accountBirthDate">生年月日</label><input class="input" id="accountBirthDate" name="birthDate" type="date" value="${utils.escapeHtml(user.birthDate || '')}"></div><div class="field"><label for="accountGender">性別</label><select class="select" id="accountGender" name="gender"><option value="" ${!user.gender ? 'selected' : ''}>回答しない</option><option value="female" ${user.gender === 'female' ? 'selected' : ''}>女性</option><option value="male" ${user.gender === 'male' ? 'selected' : ''}>男性</option><option value="other" ${user.gender === 'other' ? 'selected' : ''}>その他</option></select></div><div class="field-full"><p class="form-error" aria-live="polite"></p><button class="button button-primary" type="submit">変更を保存</button></div></form></section><section class="settings-section" style="margin-top:16px"><h2>アカウントの削除</h2><p class="muted">個人情報とログイン情報を匿名化し、統計用の注文記録は保持します。お気に入りとカートデータもJSON内に残ります。削除後は再ログインできません。</p><button class="button button-danger" type="button" data-action="delete-account">アカウントを削除</button></section>`;
  };

  app.screens.submitProfile = function (form) {
    const values = Object.fromEntries(new FormData(form).entries());
    service.updateProfile(values);
    components.showToast('アカウント情報を保存しました。');
    app.renderCurrentRoute();
  };

  app.screens.submitPassword = async function (form) {
    const values = Object.fromEntries(new FormData(form).entries());
    await service.changePassword(values.currentPassword, values.nextPassword);
    components.showToast('パスワードを変更しました。');
    app.renderCurrentRoute();
  };

  app.screens.exportData = function () {
    const data = service.getSnapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `market-lane-backup-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    components.showToast('JSONを書き出しました。');
  };

  app.screens.importFile = async function (file) {
    if (!file) return;
    try {
      service.importData(await file.text());
      window.sessionStorage.setItem('toastMessage', 'データを読み込みました。再度ログインしてください。');
      window.location.href = 'index.html';
    } catch (error) {
      components.showToast(error.message, 'error');
      app.renderCurrentRoute();
    }
  };

})(window);