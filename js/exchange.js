/* ============================================================
 *  exchange.js — 거래소 탭 (종목 리스트 + 정렬)
 * ============================================================ */

const Exchange = {
  currentSort: 'all',
  searchQuery: '',

  /* 거래소 탭 렌더링 */
  render() {
    const el = document.getElementById('exchangeContent');
    if (!el) return;

    const stocks = this.getSortedStocks();
    if (stocks.length === 0) {
      el.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--text2);">종목이 없어요. 관리자에게 문의하세요.</div>';
      return;
    }

    el.innerHTML = stocks.map(s => {
      const d = Utils.dir(s.change);
      const arrow = Utils.arrow(s.change);
      return `<div class="stock-item" onclick="Detail.open('${s.code}')">
        <div>
          <div class="stock-name">${Utils.esc(s.name)}</div>
          <div class="stock-code">${s.code}</div>
        </div>
        <div>
          <div class="stock-price ${d}">${Utils.formatWon(s.price)}</div>
          <div class="stock-change ${d}">${arrow} ${Utils.formatNum(Math.abs(s.change || 0))} (${Utils.formatPct(s.changePct)})</div>
        </div>
      </div>`;
    }).join('');
  },

  /* 정렬된 종목 배열 반환 */
  getSortedStocks() {
    let stocks = [...App.stocks];

    // 검색 필터
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      stocks = stocks.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.code.includes(q) ||
        (s.sector && s.sector.includes(q))
      );
    }

    switch (this.currentSort) {
      case 'up':
        stocks.sort((a, b) => (b.changePct || 0) - (a.changePct || 0));
        break;
      case 'down':
        stocks.sort((a, b) => (a.changePct || 0) - (b.changePct || 0));
        break;
      case 'volume':
        stocks.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        break;
      case 'price-low':
        stocks.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'price-high':
        stocks.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      case 'fav':
        const favs = JSON.parse(localStorage.getItem('sl_favs') || '[]');
        stocks = stocks.filter(s => favs.includes(s.code));
        break;
      default: // 'all' — 이름순
        stocks.sort((a, b) => a.name.localeCompare(b.name, 'ko'));
    }
    return stocks;
  },

  /* 정렬 탭 변경 */
  setSort(sort, el) {
    this.currentSort = sort;
    document.querySelectorAll('.sort-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    this.render();
  },

  /* Firestore 실시간 리스너 */
  listen() {
    const unsub = App.db.collection(CONFIG.COLLECTIONS.STOCKS)
      .onSnapshot(snap => {
        App.stocks = [];
        snap.forEach(doc => {
          App.stocks.push({ id: doc.id, ...doc.data() });
        });
        this.render();
        // 헤더 잔고 업데이트
        AppUI.updateHeader();
      }, err => {
        console.error('종목 리스너 오류:', err);
      });
    App.unsubscribers.push(unsub);
  }
};
