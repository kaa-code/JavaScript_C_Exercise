// ===================================================
// 理工祭メニューアプリ ひな形
// ===================================================

// ===== データ =====
// ★ 自分のメニューに書き換えよう
let menuData = [
  { id: 1, name: 'メニューA', price: 300, category: '食べ物', image: '', soldOut: false },
  { id: 2, name: 'メニューB', price: 200, category: '飲み物', image: '', soldOut: false },
  { id: 3, name: 'メニューC', price: 150, category: '飲み物', image: '', soldOut: false },
];

let nextId = menuData.length + 1;

// ===== カード一覧を描画する関数 =====
// 第3回: 条件分岐でバッジを出し分けよう
// 第4回: menuData を連想配列の配列に書き換えよう
// 第5回: createCard(item) 関数に切り出そう
// 第6回: フィルタボタンのクリック処理を追記しよう
// 第7回: createElement に書き換えて削除ボタンを追加しよう
// 第8回: 追加フォーム・完売ボタンのイベントを実装しよう
// 第9回: saveData / loadData を実装しよう
// 第10回: 天気APIを追加しよう
function renderCards() {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '';

  for (let i = 0; i < menuData.length; i++) {
    const item = menuData[i];

    // ★ 第3回: 値段でバッジを出し分けよう（条件分岐）
    // const badge = /*ここを書く*/

    grid.innerHTML += `
      <div class="menu-card" data-category="${item.category}">
        <div class="card-body">
          <p class="card-name">${item.name}</p>
          <p class="card-price">¥${item.price}</p>
          <span class="card-category">${item.category}</span>
          <!-- ★ badge をここに表示しよう -->
        </div>
      </div>
    `;
  }
}

// ===== 初期表示 =====
renderCards();
