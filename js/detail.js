/* ============================================================
 *  detail.js — 종목 상세 페이지 (설명 + 매수/매도)
 * ============================================================ */

const Detail = {
  currentStock: null,

  /* 상세 페이지 열기 */
  open(code) {
    const stock = App.stocks.find(s => s.code === code);
    if (!stock) return;
    this.currentStock = stock;

    const dir = Utils.dir(stock.change);
    const arrow = Utils.arrow(stock.change);
    const emoji = stock.emoji || '🏢';
    const oneliner = stock.oneliner || '한국 대표 상장기업';
    const desc = stock.desc || '이 종목의 상세 정보를 준비 중이에요.';
    const keywords = stock.keywords || [];

    // 관심 종목 여부
    const favs = JSON.parse(localStorage.getItem('sl_favs') || '[]');
    const isFav = favs.includes(code);

    document.getElementById('detailHeaderName').textContent = stock.name;
    document.getElementById('detailBody').innerHTML = `
      <div class="detail-price-box">
        <div style="font-size:32px;margin-bottom:4px;">${emoji}</div>
        <div class="detail-current ${dir}">${Utils.formatWon(stock.price)}</div>
        <div class="detail-change-badge ${dir}">
          ${arrow} ${Utils.formatNum(Math.abs(stock.change || 0))} (${Utils.formatPct(stock.changePct)})
        </div>
        <button class="fav-btn ${isFav ? 'active' : ''}" onclick="Detail.toggleFav('${code}')">
          ${isFav ? '⭐ 관심종목' : '☆ 관심 추가'}
        </button>
      </div>

      <div class="detail-info-card">
        <div class="detail-info-title">💡 이 회사는 뭐하는 곳이야?</div>
        <div style="font-size:16px;font-weight:800;margin-bottom:8px;line-height:1.4;">
          "${Utils.esc(oneliner)}"
        </div>
        <div class="detail-info-text">${Utils.esc(desc)}</div>
        <div style="margin-top:12px;">
          ${keywords.map(k => `<span class="keyword-tag">#${Utils.esc(k)}</span>`).join('')}
          ${stock.sector ? `<span class="keyword-tag" style="background:var(--accent-bg);color:var(--accent);">${Utils.esc(stock.sector)}</span>` : ''}
        </div>
      </div>

      ${this.renderStats(stock)}

      ${this.renderMyHolding(stock)}
    `;

    document.getElementById('detailOverlay').classList.add('show');
  },

  /* 핵심 투자 정보 카드 */
  renderStats(s) {
    return `
      <div class="detail-info-card">
        <div class="detail-info-title">📊 핵심 투자 정보</div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:10px;">주식 고수들이 꼭 보는 숫자들!</div>
        <div class="detail-stats">
          <div class="stat-box">
            <div class="stat-label">현재가</div>
            <div class="stat-value">${Utils.formatWon(s.price)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">전일 대비</div>
            <div class="stat-value ${Utils.dir(s.change)}">${Utils.formatPct(s.changePct)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">전일 종가</div>
            <div class="stat-value">${Utils.formatWon(s.prevClose || (s.price - (s.change || 0)))}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">업종</div>
            <div class="stat-value" style="font-size:14px;">${Utils.esc(s.sector || '-')}</div>
          </div>
        </div>
        <div style="background:var(--bg);border-radius:12px;padding:12px;margin-top:4px;">
          <div style="font-size:12px;color:var(--text2);line-height:1.6;">
            💡 <b>주가가 오르면?</b> 그 회사의 가치가 올라갔다는 뜻이야. 좋은 뉴스가 나오거나, 돈을 잘 벌거나, 미래가 기대되면 올라가!
          </div>
        </div>
      </div>`;
  },

  /* 내 보유 현황 */
  renderMyHolding(s) {
    if (!App.user || !App.user.holdings[s.code]) return '';
    const h = App.user.holdings[s.code];
    const currentVal = h.qty * s.price;
    const investVal = h.qty * h.avgPrice;
    const pnl = currentVal - investVal;
    const pnlPct = investVal > 0 ? (pnl / investVal * 100) : 0;

    return `
      <div class="detail-info-card">
        <div class="detail-info-title">📦 나의 보유 현황</div>
        <div class="detail-stats">
          <div class="stat-box">
            <div class="stat-label">보유 수량</div>
            <div class="stat-value">${h.qty}주</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">평균 매수가</div>
            <div class="stat-value">${Utils.formatWon(h.avgPrice)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">평가 금액</div>
            <div class="stat-value">${Utils.formatWon(currentVal)}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">수익/손실</div>
            <div class="stat-value ${Utils.dir(pnl)}">${pnl >= 0 ? '+' : ''}${Utils.formatWon(pnl)}<br><span style="font-size:12px;">(${Utils.formatPct(pnlPct)})</span></div>
          </div>
        </div>
      </div>`;
  },

  /* 관심 종목 토글 */
  toggleFav(code) {
    let favs = JSON.parse(localStorage.getItem('sl_favs') || '[]');
    if (favs.includes(code)) {
      favs = favs.filter(c => c !== code);
      Utils.toast('관심종목에서 제거했어요');
    } else {
      favs.push(code);
      Utils.toast('관심종목에 추가했어요 ⭐');
    }
    localStorage.setItem('sl_favs', JSON.stringify(favs));
    // 버튼 갱신
    if (this.currentStock && this.currentStock.code === code) {
      this.open(code);
    }
  },

  /* 상세 페이지 닫기 */
  close() {
    document.getElementById('detailOverlay').classList.remove('show');
    this.currentStock = null;
  },

  /* 매수 버튼 */
  buy() {
    if (!this.currentStock) return;
    Trade.openBuy(this.currentStock.code);
  },

  /* 매도 버튼 */
  sell() {
    if (!this.currentStock) return;
    Trade.openSell(this.currentStock.code);
  }
};
