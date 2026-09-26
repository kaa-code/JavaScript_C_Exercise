(function (global) {
  'use strict';

  const app = (global.ShopApp = global.ShopApp || {});

  // 関数: UUID対応環境ではUUID、非対応環境では乱数を使ってIDを作る。
  // 引数: prefix(String): IDの種類を表す接頭辞
  // 戻り値: 一意性を期待できる文字列ID (String)
  function createId(prefix) {
    const randomPart = global.crypto && typeof global.crypto.randomUUID === 'function'
      ? global.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    return `${prefix}-${randomPart}`;
  }

  // 関数: ブラウザー内デモ用のパスワード表現を作る。
  // 引数: password(String): 入力されたパスワード
  // 戻り値: 保存用の接頭辞付き文字列 (Promise<String>)
  async function encodePassword(password) {
    const bytes = new TextEncoder().encode(password);
    if (global.crypto && global.crypto.subtle) {
      const digest = await global.crypto.subtle.digest('SHA-256', bytes);
      const encoded = Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
      return `sha256:${encoded}`;
    }
    return `demo:${Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('')}`;
  }

  // 関数: 登録用IDが英数字だけか検証する。
  // 引数: userId(String): 検証するユーザーID
  // 戻り値: 英数字のみならtrue (Boolean)
  function isValidUserId(userId) {
    return /^[a-zA-Z0-9]+$/.test(userId);
  }

  // 関数: アカウントデータを検証して作成する。
  // 引数: profile(Object): 登録フォームの値
  // 戻り値: 作成されたユーザー (Promise<Object>)
  async function register(profile) {
    const data = app.repository.load();
    const userId = profile.userId.trim();
    const displayName = profile.displayName.trim();
    if (!isValidUserId(userId)) throw new Error('ユーザーIDは半角英数字で入力してください。');
    if (data.users.some((user) => user.userId.toLowerCase() === userId.toLowerCase())) throw new Error('このユーザーIDは既に使われています。');
    if (!displayName || [...displayName].length > 10) throw new Error('表示名は1〜10文字で入力してください。');
    if (profile.password.length < 8) throw new Error('パスワードは8文字以上で入力してください。');
    const user = {
      id: createId('usr'), userId, displayName,
      email: profile.email.trim() || null,
      birthDate: profile.birthDate || null,
      gender: profile.gender || null,
      createdAt: new Date().toISOString(), status: 'active'
    };
    data.users.push(user);
    data.credentials.push({ userId: user.id, passwordHash: await encodePassword(profile.password) });
    data.userSettings.push({ userId: user.id, themeMode: 'light', customColor: '#d45d3f', reduceMotion: false });
    const cart = { id: createId('car'), userId: user.id, name: 'いつものカート', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.carts.push(cart);
    data.shoppingTabs.push({ id: createId('tab'), userId: user.id, label: 'ショッピング 1', searchCriteria: { storeId: '', query: '', categoryIds: [] }, viewState: { scrollY: 0 }, createdAt: new Date().toISOString() });
    app.repository.save(data);
    app.repository.setSession(user.id);
    return user;
  }

  // 関数: ユーザーIDとパスワードを照合してログインする。
  // 引数: userId(String): 登録済みユーザーID, password(String): 入力パスワード
  // 戻り値: 認証されたユーザー (Promise<Object>)
  async function login(userId, password) {
    const data = app.repository.load();
    const user = data.users.find((record) => record.userId.toLowerCase() === userId.trim().toLowerCase() && record.status === 'active');
    const credential = user && data.credentials.find((record) => record.userId === user.id);
    if (!user || !credential || credential.passwordHash !== await encodePassword(password)) throw new Error('ユーザーIDまたはパスワードが正しくありません。');
    app.repository.setSession(user.id);
    ensureUserDefaults(data, user.id);
    return user;
  }

  // 関数: 利用者に必要な初期カートと閲覧タブを補う。
  // 引数: data(Object): アプリデータ, userId(String): 対象ユーザーID
  // 戻り値: 更新された場合はデータを保存 (undefined)
  function ensureUserDefaults(data, userId) {
    let changed = false;
    if (!data.carts.some((cart) => cart.userId === userId)) {
      data.carts.push({ id: createId('car'), userId, name: 'いつものカート', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      changed = true;
    }
    if (!data.shoppingTabs.some((tab) => tab.userId === userId)) {
      data.shoppingTabs.push({ id: createId('tab'), userId, label: 'ショッピング 1', searchCriteria: { storeId: '', query: '', categoryIds: [] }, viewState: { scrollY: 0 }, createdAt: new Date().toISOString() });
      changed = true;
    }
    if (changed) app.repository.save(data);
  }

  // 関数: 現在のセッションに対応する有効ユーザーを返す。
  // 引数: なし
  // 戻り値: ログイン中ユーザー、未ログインならnull (Object|null)
  function getCurrentUser() {
    const userId = app.repository.getSession();
    if (!userId) return null;
    return app.repository.load().users.find((user) => user.id === userId && user.status === 'active') || null;
  }

  // 関数: 画面描画用に現在の全データを読み取る。
  // 引数: なし
  // 戻り値: アプリデータのスナップショット (Object)
  function getSnapshot() {
    return app.repository.load();
  }

  // 関数: 現在のログインセッションを終了する。
  // 引数: なし
  // 戻り値: なし
  function logout() {
    app.repository.setSession(null);
  }

  // 関数: 重複しない候補ユーザーIDを生成する。
  // 引数: なし
  // 戻り値: 未使用のユーザーID (String)
  function suggestUserId() {
    const data = app.repository.load();
    let suggestion = '';
    do {
      suggestion = `user${Math.random().toString(36).slice(2, 8)}`;
    } while (data.users.some((user) => user.userId.toLowerCase() === suggestion.toLowerCase()));
    return suggestion;
  }

  // 関数: 検索条件に一致する販売中の商品を取得する。
  // 引数: filters(Object): 店舗ID、文字列、カテゴリID配列を含む検索条件
  // 戻り値: 店舗情報を付加した商品一覧 (Array<Object>)
  function searchProducts(filters = {}) {
    const data = app.repository.load();
    const query = (filters.query || '').trim().toLocaleLowerCase('ja');
    const categoryIds = filters.categoryIds || [];
    return data.products.filter((product) => {
      if (product.status !== 'active' || (filters.storeId && product.storeId !== filters.storeId)) return false;
      if (query && !`${product.name} ${product.description || ''}`.toLocaleLowerCase('ja').includes(query)) return false;
      if (categoryIds.length && !categoryIds.includes(product.categoryId)) return false;
      return true;
    }).map((product) => ({ ...product, store: data.stores.find((store) => store.id === product.storeId), category: data.categories.find((category) => category.id === product.categoryId) }));
  }

  // 関数: 指定ユーザーが商品または店舗をお気に入り登録したか調べる。
  // 引数: kind(String): 'product'または'store', targetId(String): 商品/店舗ID
  // 戻り値: 登録済みならtrue (Boolean)
  function isFavorite(kind, targetId) {
    const data = app.repository.load();
    const user = getCurrentUser();
    if (!user) return false;
    const records = kind === 'store' ? data.favoriteStores : data.favoriteProducts;
    const key = kind === 'store' ? 'storeId' : 'productId';
    return records.some((record) => record.userId === user.id && record[key] === targetId);
  }

  // 関数: 商品または店舗のお気に入り状態を切り替える。
  // 引数: kind(String): 'product'または'store', targetId(String): 商品/店舗ID
  // 戻り値: 登録後の状態 (Boolean)
  function toggleFavorite(kind, targetId) {
    const data = app.repository.load();
    const user = getCurrentUser();
    if (!user) throw new Error('ログインしてください。');
    const records = kind === 'store' ? data.favoriteStores : data.favoriteProducts;
    const key = kind === 'store' ? 'storeId' : 'productId';
    const index = records.findIndex((record) => record.userId === user.id && record[key] === targetId);
    if (index >= 0) records.splice(index, 1);
    else records.push({ userId: user.id, [key]: targetId, createdAt: new Date().toISOString() });
    app.repository.save(data);
    return index < 0;
  }

  // 関数: ユーザーのカート一覧を取得する。
  // 引数: なし
  // 戻り値: 作成日時の古い順のカート一覧 (Array<Object>)
  function getCarts() {
    const user = getCurrentUser();
    return user ? app.repository.load().carts.filter((cart) => cart.userId === user.id) : [];
  }

  // 関数: ユーザーの既定カートを取得し、なければ作成する。
  // 引数: なし
  // 戻り値: 既定カート (Object)
  function getOrCreateCart() {
    const user = getCurrentUser();
    if (!user) throw new Error('ログインしてください。');
    const existing = getCarts();
    if (existing.length) return existing[0];
    return createCart('いつものカート');
  }

  // 関数: 名前付きカートを作成する。
  // 引数: name(String): カート名
  // 戻り値: 作成したカート (Object)
  function createCart(name) {
    const user = getCurrentUser();
    if (!user) throw new Error('ログインしてください。');
    const cartName = name.trim();
    if (!cartName || cartName.length > 24) throw new Error('カート名は1〜24文字で入力してください。');
    const data = app.repository.load();
    const cart = { id: createId('car'), userId: user.id, name: cartName, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    data.carts.push(cart);
    app.repository.save(data);
    return cart;
  }

  // 関数: 指定カートに商品を追加する。
  // 引数: cartId(String): 対象カートID, productId(String): 商品ID, quantity(Number): 追加数
  // 戻り値: 更新後のカート商品数 (Number)
  function addToCart(cartId, productId, quantity = 1) {
    const user = getCurrentUser();
    const data = app.repository.load();
    const cart = data.carts.find((record) => record.id === cartId && record.userId === user.id);
    const product = data.products.find((record) => record.id === productId && record.status === 'active');
    if (!cart || !product) throw new Error('カートまたは商品が見つかりません。');
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('数量を確認してください。');
    const item = data.cartItems.find((record) => record.cartId === cartId && record.productId === productId);
    const nextQuantity = (item ? item.quantity : 0) + quantity;
    if (product.stock !== null && nextQuantity > product.stock) throw new Error('在庫数を超えて追加できません。');
    if (item) item.quantity = nextQuantity;
    else data.cartItems.push({ cartId, productId, quantity });
    cart.updatedAt = new Date().toISOString();
    app.repository.save(data);
    return nextQuantity;
  }

  // 関数: カート明細の数量を更新または削除する。
  // 引数: cartId(String): 対象カートID, productId(String): 商品ID, quantity(Number): 新しい数量
  // 戻り値: なし
  function updateCartItem(cartId, productId, quantity) {
    const user = getCurrentUser();
    const data = app.repository.load();
    if (!data.carts.some((cart) => cart.id === cartId && cart.userId === user.id)) throw new Error('カートが見つかりません。');
    const index = data.cartItems.findIndex((item) => item.cartId === cartId && item.productId === productId);
    if (index < 0) return;
    if (quantity <= 0) data.cartItems.splice(index, 1);
    else {
      const product = data.products.find((record) => record.id === productId);
      if (product.stock !== null && quantity > product.stock) throw new Error('在庫数を超えています。');
      data.cartItems[index].quantity = quantity;
    }
    app.repository.save(data);
  }

  // 関数: カートの名前を更新する。
  // 引数: cartId(String): 対象カートID, name(String): 新しいカート名
  // 戻り値: なし
  function renameCart(cartId, name) {
    const user = getCurrentUser();
    const data = app.repository.load();
    const cart = data.carts.find((record) => record.id === cartId && record.userId === user.id);
    if (!cart) throw new Error('カートが見つかりません。');
    const nextName = name.trim();
    if (!nextName || nextName.length > 24) throw new Error('カート名は1〜24文字で入力してください。');
    cart.name = nextName;
    cart.updatedAt = new Date().toISOString();
    app.repository.save(data);
  }

  // 関数: カートと明細を削除する。
  // 引数: cartId(String): 削除するカートID
  // 戻り値: なし
  function deleteCart(cartId) {
    const user = getCurrentUser();
    const data = app.repository.load();
    const cart = data.carts.find((record) => record.id === cartId && record.userId === user.id);
    if (!cart) throw new Error('カートが見つかりません。');
    if (data.carts.filter((record) => record.userId === user.id).length <= 1) throw new Error('最後のカートは削除できません。');
    data.carts = data.carts.filter((record) => record.id !== cartId);
    data.cartItems = data.cartItems.filter((record) => record.cartId !== cartId);
    app.repository.save(data);
  }

  // 関数: カート内の商品と現在の商品情報を結合する。
  // 引数: cartId(String): 対象カートID
  // 戻り値: 商品・数量・小計を含むカート表示データ (Array<Object>)
  function getCartItems(cartId) {
    const data = app.repository.load();
    return data.cartItems.filter((item) => item.cartId === cartId).map((item) => {
      const product = data.products.find((record) => record.id === item.productId);
      if (!product) return null;
      return { ...product, quantity: item.quantity, lineTotalYen: product.priceYen * item.quantity, store: data.stores.find((store) => store.id === product.storeId) };
    }).filter(Boolean);
  }

  // 関数: 在庫を検証し、店舗別注文を作成してカートを消す。
  // 引数: cartId(String): 購入するカートID
  // 戻り値: 作成されたチェックアウトと店舗別注文 (Object)
  function purchaseCart(cartId) {
    const user = getCurrentUser();
    const data = app.repository.load();
    const cart = data.carts.find((record) => record.id === cartId && record.userId === user.id);
    if (!cart) throw new Error('カートが見つかりません。');
    const cartItems = data.cartItems.filter((item) => item.cartId === cartId);
    if (!cartItems.length) throw new Error('カートに商品がありません。');
    for (const item of cartItems) {
      const product = data.products.find((record) => record.id === item.productId && record.status === 'active');
      if (!product) throw new Error('販売終了または削除された商品が含まれています。');
      if (product.stock !== null && item.quantity > product.stock) throw new Error(`${product.name}の在庫が不足しています。`);
    }
    const now = new Date().toISOString();
    const checkout = { id: createId('chk'), userId: user.id, createdAt: now, status: 'completed', currency: 'JPY' };
    const storeGroups = new Map();
    cartItems.forEach((item) => {
      const product = data.products.find((record) => record.id === item.productId);
      const group = storeGroups.get(product.storeId) || [];
      group.push({ item, product });
      storeGroups.set(product.storeId, group);
    });
    data.checkouts.push(checkout);
    for (const [storeId, items] of storeGroups) {
      const order = { id: createId('ord'), checkoutId: checkout.id, storeId, status: 'placed', totalYen: items.reduce((total, entry) => total + entry.product.priceYen * entry.item.quantity, 0) };
      data.orders.push(order);
      items.forEach(({ item, product }) => {
        data.orderItems.push({ id: createId('oit'), orderId: order.id, productId: product.id, productNameSnapshot: product.name, unitPriceYenSnapshot: product.priceYen, quantity: item.quantity });
        if (product.stock !== null) product.stock -= item.quantity;
      });
    }
    data.carts = data.carts.filter((record) => record.id !== cartId);
    data.cartItems = data.cartItems.filter((record) => record.cartId !== cartId);
    app.repository.save(data);
    return { checkout, orders: data.orders.filter((order) => order.checkoutId === checkout.id) };
  }

  // 関数: ログイン中ユーザーの購入履歴を新しい順に取得する。
  // 引数: なし
  // 戻り値: 店舗別注文と注文明細を含む履歴 (Array<Object>)
  function getOrderHistory() {
    const data = app.repository.load();
    const user = getCurrentUser();
    if (!user) return [];
    return data.checkouts.filter((checkout) => checkout.userId === user.id).sort((first, second) => second.createdAt.localeCompare(first.createdAt)).map((checkout) => ({
      ...checkout,
      orders: data.orders.filter((order) => order.checkoutId === checkout.id).map((order) => ({ ...order, store: data.stores.find((store) => store.id === order.storeId), items: data.orderItems.filter((item) => item.orderId === order.id) }))
    }));
  }

  // 関数: ログインユーザーのプロフィールを更新する。
  // 引数: profile(Object): 更新する表示名、メール、生年月日、性別
  // 戻り値: 更新したユーザー (Object)
  function updateProfile(profile) {
    const user = getCurrentUser();
    const data = app.repository.load();
    const record = data.users.find((entry) => entry.id === user.id);
    const displayName = profile.displayName.trim();
    if (!displayName || [...displayName].length > 10) throw new Error('表示名は1〜10文字で入力してください。');
    if (profile.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email.trim())) throw new Error('メールアドレスの形式を確認してください。');
    Object.assign(record, { displayName, email: profile.email.trim() || null, birthDate: profile.birthDate || null, gender: profile.gender || null });
    app.repository.save(data);
    return record;
  }

  // 関数: アカウント情報を匿名化し、注文と関連データを保持する。
  // 引数: なし
  // 戻り値: なし
  function deleteAccount() {
    const user = getCurrentUser();
    if (!user) throw new Error('ログインしてください。');
    const data = app.repository.load();
    const record = data.users.find((entry) => entry.id === user.id);
    record.userId = `deleted${user.id.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}`;
    record.displayName = '削除済みユーザー';
    record.email = null;
    record.birthDate = null;
    record.gender = null;
    record.status = 'deleted';
    data.credentials = data.credentials.filter((credential) => credential.userId !== user.id);
    app.repository.save(data);
    app.repository.setSession(null);
  }

  // 関数: ログイン中ユーザーのデモ用パスワードを変更する。
  // 引数: currentPassword(String): 現在のパスワード, nextPassword(String): 新しいパスワード
  // 戻り値: なし (Promise<undefined>)
  async function changePassword(currentPassword, nextPassword) {
    const user = getCurrentUser();
    if (!user) throw new Error('ログインしてください。');
    if (nextPassword.length < 8) throw new Error('新しいパスワードは8文字以上で入力してください。');
    const data = app.repository.load();
    const credential = data.credentials.find((record) => record.userId === user.id);
    if (!credential || credential.passwordHash !== await encodePassword(currentPassword)) throw new Error('現在のパスワードが正しくありません。');
    credential.passwordHash = await encodePassword(nextPassword);
    app.repository.save(data);
  }

  // 関数: ユーザーのテーマと視差設定を取得する。
  // 引数: userId(String): 対象ユーザーID
  // 戻り値: 保存設定または初期設定 (Object)
  function getSettings(userId) {
    const data = app.repository.load();
    return data.userSettings.find((settings) => settings.userId === userId) || { userId, themeMode: 'light', customColor: '#d45d3f', reduceMotion: false };
  }

  // 関数: ユーザー設定の一項目を更新する。
  // 引数: userId(String): 対象ユーザーID, key(String): 設定キー, value(Any): 設定値
  // 戻り値: 更新後の設定 (Object)
  function updateSetting(userId, key, value) {
    const allowed = new Set(['themeMode', 'customColor', 'reduceMotion']);
    if (!allowed.has(key)) throw new Error('変更できない設定です。');
    const data = app.repository.load();
    let settings = data.userSettings.find((entry) => entry.userId === userId);
    if (!settings) {
      settings = { userId, themeMode: 'light', customColor: '#d45d3f', reduceMotion: false };
      data.userSettings.push(settings);
    }
    settings[key] = value;
    app.repository.save(data);
    return settings;
  }

  // 関数: UI設定を初期値へ戻す。
  // 引数: userId(String): 対象ユーザーID, key(String|null): 個別項目、またはnullで全項目
  // 戻り値: 初期化後の設定 (Object)
  function resetSettings(userId, key = null) {
    const data = app.repository.load();
    let settings = data.userSettings.find((entry) => entry.userId === userId);
    if (!settings) {
      settings = { userId, themeMode: 'light', customColor: '#d45d3f', reduceMotion: false };
      data.userSettings.push(settings);
    }
    const defaults = { themeMode: 'light', customColor: '#d45d3f', reduceMotion: false };
    if (key && Object.hasOwn(defaults, key)) settings[key] = defaults[key];
    else Object.assign(settings, defaults);
    app.repository.save(data);
    return settings;
  }

  // 関数: 新しいショッピングタブを作成する。
  // 引数: なし
  // 戻り値: 作成されたタブ (Object)
  function createShoppingTab() {
    const user = getCurrentUser();
    const data = app.repository.load();
    const tabs = data.shoppingTabs.filter((tab) => tab.userId === user.id);
    if (tabs.length >= 2) throw new Error('v1.0ではショッピングタブは2つまでです。');
    const tab = { id: createId('tab'), userId: user.id, label: `ショッピング ${tabs.length + 1}`, searchCriteria: { storeId: '', query: '', categoryIds: [] }, viewState: { scrollY: 0 }, createdAt: new Date().toISOString() };
    data.shoppingTabs.push(tab);
    app.repository.save(data);
    return tab;
  }

  // 関数: ショッピングタブの検索条件を保存する。
  // 引数: tabId(String): 対象タブID, criteria(Object): 保存する検索条件
  // 戻り値: 更新されたタブ (Object)
  function updateShoppingTab(tabId, criteria) {
    const user = getCurrentUser();
    const data = app.repository.load();
    const tab = data.shoppingTabs.find((record) => record.id === tabId && record.userId === user.id);
    if (!tab) throw new Error('タブが見つかりません。');
    tab.searchCriteria = { storeId: criteria.storeId || '', query: criteria.query || '', categoryIds: criteria.categoryIds || [] };
    app.repository.save(data);
    return tab;
  }

  // 関数: 閲覧タブの一時表示状態を保存する。
  // 引数: tabId(String): 対象タブID, viewState(Object): スクロール位置などの状態
  // 戻り値: なし
  function updateShoppingTabViewState(tabId, viewState) {
    const user = getCurrentUser();
    const data = app.repository.load();
    const tab = data.shoppingTabs.find((record) => record.id === tabId && record.userId === user.id);
    if (!tab) return;
    tab.viewState = { ...tab.viewState, ...viewState };
    app.repository.save(data);
  }

  // 関数: ショッピングタブを閉じる。ただし最後の1件は維持する。
  // 引数: tabId(String): 閉じるタブID
  // 戻り値: なし
  function closeShoppingTab(tabId) {
    const user = getCurrentUser();
    const data = app.repository.load();
    const tabs = data.shoppingTabs.filter((tab) => tab.userId === user.id);
    if (tabs.length <= 1) throw new Error('最後のショッピングタブは閉じられません。');
    data.shoppingTabs = data.shoppingTabs.filter((tab) => !(tab.id === tabId && tab.userId === user.id));
    app.repository.save(data);
  }

  // 関数: ログインユーザーに属するショッピングタブを取得する。
  // 引数: なし
  // 戻り値: 作成順のタブ一覧 (Array<Object>)
  function getShoppingTabs() {
    const user = getCurrentUser();
    return user ? app.repository.load().shoppingTabs.filter((tab) => tab.userId === user.id) : [];
  }

  // 関数: 全データを検証してlocalStorageへインポートする。
  // 引数: jsonText(String): 読み込んだJSONテキスト
  // 戻り値: なし
  function importData(jsonText) {
    let data;
    try { data = JSON.parse(jsonText); } catch { throw new Error('JSONファイルを読み取れません。'); }
    if (!app.repository.isValidData(data)) throw new Error('データの形式またはID参照に問題があります。');
    app.repository.save(data);
    app.repository.setSession(null);
  }

  app.services = {
    createId, register, login, getCurrentUser, getSnapshot, logout, suggestUserId, searchProducts,
    isFavorite, toggleFavorite, getCarts, getOrCreateCart, createCart, addToCart, updateCartItem,
    renameCart, deleteCart, getCartItems, purchaseCart, getOrderHistory,
    updateProfile, deleteAccount, changePassword, getSettings, updateSetting, resetSettings,
    createShoppingTab, getShoppingTabs, updateShoppingTab, updateShoppingTabViewState, closeShoppingTab, importData
  };
})(window);