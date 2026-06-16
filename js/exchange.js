/* ============================================================
 *  exchange.js — 거래소 탭 (종목 리스트 + 정렬 + 스마트 스케줄)
 *  읽기 최적화: 전체 로드 1회 + 캐시 갱신 (1 read/refresh)
 * ============================================================ */

const Exchange = {
  currentSort: 'all',
  searchQuery: '',
  _timer: null,

  /* ── 전체 종목 로드 (84 reads, 로그인 시 1회) ── */
  async loadFull() {
    try {
      const snap = await App.db.collection(CONFIG.COLLECTIONS.STOCKS).get();
      App.stocks = [];
      snap.forEach(doc => App.stocks.push({ id: doc.id, ...doc.data() }));
      this.render();
      AppUI.updateHeader();
    } catch (e) {
      console.error('종목 로드 오류:', e);
    }
  },

  /* ── 캐시에서 가격만 갱신 (1 read) ── */
  async refreshFromCache() {
    try {
      const doc = await App.db.collection(CONFIG.COLLECTIONS.CONFIG).doc('priceCache').get();
      if (!doc.exists) return;
      const prices = doc.data().prices || {};

      App.stocks.forEach(s => {
        const p = prices[s.code];
        if (p) {
          s.price = p.price;
          s.prevClose = p.prevClose;
          s.change = p.change;
          s.changePct = p.changePct;
          if (p.volume) s.volume = p.volume;
        }
      });

      this.render();
      AppUI.updateHeader();
      // 차트 캐시 초기화
      if (typeof Chart !== 'undefined') Chart.cache = {};
    } catch (e) {
      console.error('캐시 갱신 오류:', e);
    }
  },

  /* ── 스마트 스케줄 시작 ── */
  startSmartRefresh() {
    this.loadFull();
    this._scheduleNext();
  },

  _scheduleNext() {
    if (this._timer) clearTimeout(this._timer);

    const schedule = Utils.getRefreshSchedule();

    if (schedule.mode === 'sleep') {
      // 수면 모드: 30분마다 스케줄 재확인만
      AppUI.showSleepMode(true);
      this._timer = setTimeout(() => this._scheduleNext(), 30 * 60000);
      return;
    }

    AppUI.showSleepMode(false);
    const ms = schedule.interval * 60000;

    this._timer = setTimeout(async () => {
      await this.refreshFromCache();
      this._scheduleNext();
    }, ms);
  },

  stopRefresh() {
    if (this._timer) clearTimeout(this._timer);
  },

  /* ── 거래소 탭 렌더링 ── */
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
      default:
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
  }
};
