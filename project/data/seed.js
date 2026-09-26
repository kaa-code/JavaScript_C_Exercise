(function (global) {
  'use strict';

  global.ShopSeed = {
    schemaVersion: 1,
    users: [],
    credentials: [],
    userSettings: [],
    stores: [
      { id: 'sto-001', storeCode: 'komorebi', name: '菓子工房 木漏れ日', description: '季節の果実と国産素材で、毎日少しずつ焼いています。', phone: '03-5555-0134', address: '東京都台東区蔵前 2-4-8', imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=900&q=85', status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'sto-002', storeCode: 'roastery', name: '北坂ロースタリー', description: '産地ごとの個性を楽しめる、小さな自家焙煎店。', phone: null, address: '東京都世田谷区北沢 1-12-3', imageUrl: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=900&q=85', status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'sto-003', storeCode: 'midoritea', name: '茶舗 みどり', description: '山の空気と一緒に届く、静岡の茶葉をお届けします。', phone: null, address: '静岡県静岡市葵区紺屋町 6-2', imageUrl: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=900&q=85', status: 'active', createdAt: '2026-09-01T00:00:00.000Z' }
    ],
    storeMemberships: [],
    categories: [
      { id: 'cat-001', name: '焼き菓子' },
      { id: 'cat-002', name: 'コーヒー' },
      { id: 'cat-003', name: 'お茶' },
      { id: 'cat-004', name: 'パン' }
    ],
    products: [
      { id: 'prd-001', storeId: 'sto-001', categoryId: 'cat-001', name: 'レモンのバターケーキ', description: '瀬戸内レモンの皮をすりおろし、発酵バターと合わせて焼き上げました。', imageUrl: 'https://images.unsplash.com/photo-1519915028121-7d3463d20b13?auto=format&fit=crop&w=900&q=85', priceYen: 520, stock: 8, status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'prd-002', storeId: 'sto-001', categoryId: 'cat-001', name: '焦がしキャラメルタルト', description: 'ほろ苦いキャラメルと香ばしいアーモンドのタルトです。', imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85', priceYen: 680, stock: 5, status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'prd-003', storeId: 'sto-001', categoryId: 'cat-004', name: '塩バターロール', description: '外はさっくり、中はもっちり。朝食にぴったりです。', imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=900&q=85', priceYen: 280, stock: null, status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'prd-004', storeId: 'sto-002', categoryId: 'cat-002', name: 'エチオピア イルガチェフェ', description: '白い花のような香りと、柑橘を思わせる明るい酸味。中浅煎り。', imageUrl: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=900&q=85', priceYen: 1480, stock: 16, status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'prd-005', storeId: 'sto-002', categoryId: 'cat-002', name: '季節のブレンド', description: 'ミルクにもよく合う、甘く丸みのある定番ブレンド。', imageUrl: 'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=900&q=85', priceYen: 1180, stock: 20, status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'prd-006', storeId: 'sto-002', categoryId: 'cat-004', name: 'コーヒーと楽しむスコーン', description: '全粒粉ときび糖の素朴なスコーン。', imageUrl: 'https://images.unsplash.com/photo-1426869981800-95ebf51ce900?auto=format&fit=crop&w=900&q=85', priceYen: 360, stock: 10, status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'prd-007', storeId: 'sto-003', categoryId: 'cat-003', name: '山あいの煎茶', description: '深い緑とやわらかな甘み。二煎目までゆっくり楽しめます。', imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=900&q=85', priceYen: 980, stock: null, status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'prd-008', storeId: 'sto-003', categoryId: 'cat-003', name: '柚子ほうじ茶', description: '焙じ茶の香ばしさに柚子の香りを添えたティーバッグ。', imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=85', priceYen: 760, stock: 24, status: 'active', createdAt: '2026-09-01T00:00:00.000Z' },
      { id: 'prd-009', storeId: 'sto-003', categoryId: 'cat-003', name: '抹茶のひとくち羊羹', description: '抹茶の風味を閉じ込めた、小さな食べきり羊羹です。', imageUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=85', priceYen: 420, stock: 18, status: 'active', createdAt: '2026-09-01T00:00:00.000Z' }
    ],
    favoriteStores: [],
    favoriteProducts: [],
    carts: [],
    cartItems: [],
    shoppingTabs: [],
    checkouts: [],
    orders: [],
    orderItems: []
  };
})(window);