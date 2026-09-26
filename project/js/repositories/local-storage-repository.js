(function (global) {
  'use strict';

  const app = (global.ShopApp = global.ShopApp || {});
  const STORAGE_KEY = 'market-lane.data.v1';
  const SESSION_KEY = 'market-lane.session.v1';

  // 関数: 初期データをJSON経由で複製する。
  // 引数: seed(Object): 複製する初期データ
  // 戻り値: seedの独立した複製 (Object)
  function cloneSeed(seed) {
    return JSON.parse(JSON.stringify(seed));
  }

  // 関数: 複合キーの一覧に重複がないか調べる。
  // 引数: values(Array<String>): 比較する正規化済みキー
  // 戻り値: 全て一意ならtrue (Boolean)
  function hasUniqueValues(values) {
    return new Set(values).size === values.length;
  }

  // 関数: IDと参照先の整合性を基本検証する。
  // 引数: data(Object): 読み込みまたは取込対象の全データ
  // 戻り値: 不正箇所がなければtrue、不正ならfalse (Boolean)
  function isValidData(data) {
    const requiredArrays = ['users', 'credentials', 'userSettings', 'stores', 'storeMemberships', 'categories', 'products', 'favoriteStores', 'favoriteProducts', 'carts', 'cartItems', 'shoppingTabs', 'checkouts', 'orders', 'orderItems'];
    if (!data || data.schemaVersion !== 1 || !requiredArrays.every((key) => Array.isArray(data[key]))) return false;
    if (requiredArrays.some((key) => data[key].some((record) => !record || typeof record !== 'object' || Array.isArray(record)))) return false;
    const ids = new Set();
    const allRecords = [...data.users, ...data.stores, ...data.storeMemberships, ...data.categories, ...data.products, ...data.carts, ...data.shoppingTabs, ...data.checkouts, ...data.orders, ...data.orderItems];
    if (allRecords.some((record) => !record || typeof record.id !== 'string' || ids.has(record.id) || !ids.add(record.id))) return false;
    const userIds = new Set(data.users.map((user) => user.id));
    const storeIds = new Set(data.stores.map((store) => store.id));
    const categoryIds = new Set(data.categories.map((category) => category.id));
    const productIds = new Set(data.products.map((product) => product.id));
    const cartIds = new Set(data.carts.map((cart) => cart.id));
    const checkoutIds = new Set(data.checkouts.map((checkout) => checkout.id));
    const orderIds = new Set(data.orders.map((order) => order.id));
    const uniqueUserIds = hasUniqueValues(data.users.map((user) => String(user.userId || '').toLowerCase()));
    const uniqueStoreCodes = hasUniqueValues(data.stores.map((store) => String(store.storeCode || '').toLowerCase()));
    const uniqueCredentials = hasUniqueValues(data.credentials.map((credential) => credential.userId));
    const uniqueMemberships = hasUniqueValues(data.storeMemberships.map((membership) => `${membership.userId}:${membership.storeId}`));
    const uniqueFavoriteStores = hasUniqueValues(data.favoriteStores.map((favorite) => `${favorite.userId}:${favorite.storeId}`));
    const uniqueFavoriteProducts = hasUniqueValues(data.favoriteProducts.map((favorite) => `${favorite.userId}:${favorite.productId}`));
    const uniqueCartItems = hasUniqueValues(data.cartItems.map((item) => `${item.cartId}:${item.productId}`));
    return data.credentials.every((record) => userIds.has(record.userId))
      && uniqueUserIds && data.users.every((user) => typeof user.userId === 'string' && /^[a-zA-Z0-9]+$/.test(user.userId) && typeof user.displayName === 'string' && [...user.displayName].length > 0 && [...user.displayName].length <= 10)
      && uniqueStoreCodes && data.stores.every((store) => typeof store.storeCode === 'string' && /^[a-zA-Z0-9]+$/.test(store.storeCode))
      && uniqueCredentials && uniqueMemberships && uniqueFavoriteStores && uniqueFavoriteProducts && uniqueCartItems
      && data.userSettings.every((record) => userIds.has(record.userId))
      && data.storeMemberships.every((record) => userIds.has(record.userId) && storeIds.has(record.storeId))
      && data.products.every((product) => storeIds.has(product.storeId) && (!product.categoryId || categoryIds.has(product.categoryId)) && Number.isInteger(product.priceYen) && product.priceYen >= 0 && (product.stock === null || (Number.isInteger(product.stock) && product.stock >= 0)))
      && data.favoriteStores.every((record) => userIds.has(record.userId) && storeIds.has(record.storeId))
      && data.favoriteProducts.every((record) => userIds.has(record.userId) && productIds.has(record.productId))
      && data.carts.every((record) => userIds.has(record.userId))
      && data.cartItems.every((record) => cartIds.has(record.cartId) && productIds.has(record.productId) && Number.isInteger(record.quantity) && record.quantity > 0)
      && data.shoppingTabs.every((record) => userIds.has(record.userId))
      && data.users.every((user) => data.shoppingTabs.filter((tab) => tab.userId === user.id).length <= 2)
      && data.checkouts.every((record) => userIds.has(record.userId))
      && data.orders.every((record) => checkoutIds.has(record.checkoutId) && storeIds.has(record.storeId) && Number.isInteger(record.totalYen) && record.totalYen >= 0)
      && data.orderItems.every((record) => orderIds.has(record.orderId) && productIds.has(record.productId) && Number.isInteger(record.unitPriceYenSnapshot) && record.unitPriceYenSnapshot >= 0 && Number.isInteger(record.quantity) && record.quantity > 0);
  }

  // 関数: 保存済みデータを読み込み、なければ初期値を保存する。
  // 引数: なし
  // 戻り値: アプリの全データ (Object)
  function load() {
    try {
      const stored = global.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidData(parsed)) return parsed;
      }
      const initialData = cloneSeed(global.ShopSeed);
      save(initialData);
      return initialData;
    } catch (error) {
      console.error('データを読み込めませんでした。', error);
      return cloneSeed(global.ShopSeed);
    }
  }

  // 関数: アプリデータをlocalStorageに保存する。
  // 引数: data(Object): 保存する全データ
  // 戻り値: 保存が成功した場合true (Boolean)
  function save(data) {
    if (!isValidData(data)) throw new Error('保存データの形式が正しくありません。');
    global.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  }

  // 関数: セッション中のユーザーIDを取得する。
  // 引数: なし
  // 戻り値: セッションのユーザーID、未ログインならnull (String|null)
  function getSession() {
    return global.localStorage.getItem(SESSION_KEY);
  }

  // 関数: セッション中のユーザーIDを保存する。
  // 引数: userId(String|null): ログインしたユーザーID、またはnull
  // 戻り値: なし
  function setSession(userId) {
    if (userId) global.localStorage.setItem(SESSION_KEY, userId);
    else global.localStorage.removeItem(SESSION_KEY);
  }

  app.repository = { load, save, getSession, setSession, isValidData, storageKey: STORAGE_KEY };
})(window);