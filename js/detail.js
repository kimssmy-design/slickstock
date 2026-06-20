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

      ${Chart.getHTML(stock.code)}

      ${this.renderMyHolding(stock)}
    `;

    document.getElementById('detailOverlay').classList.add('show');

    // 차트 렌더링 (DOM 삽입 후)
    setTimeout(() => Chart.draw(stock.code), 50);
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
          <div class="stat-box">
            <div class="stat-label">PER (비싼지 체크)</div>
            <div class="stat-value">${s.per ? s.per + '배' : 'N/A'}</div>
          </div>
          <div class="stat-box">
            <div class="stat-label">PER 판단</div>
            <div class="stat-value" style="font-size:12px;color:${!s.per ? 'var(--text3)' : s.per < 10 ? 'var(--down)' : s.per < 20 ? 'var(--green)' : 'var(--up)'};">${!s.per ? '-' : s.per < 10 ? '저평가 👍' : s.per < 20 ? '평균 수준' : s.per < 40 ? '기대 높음' : '매우 고평가'}</div>
          </div>
        </div>

        <!-- 접이식 용어 설명 -->
        <div style="margin-top:8px;">
          <div onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'; this.querySelector('span').textContent=this.nextElementSibling.style.display==='none'?'▶':'▼';"
               style="cursor:pointer;padding:10px 0 6px;font-size:13px;font-weight:700;color:var(--down);display:flex;align-items:center;gap:6px;">
            📚 주식 용어 쉽게 알기 <span style="font-size:10px;">▶</span>
          </div>
          <div style="display:none;">
            <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:8px;">
              <div style="font-size:14px;font-weight:800;margin-bottom:6px;">💰 PER <span style="font-weight:400;color:var(--text2);">(주가수익비율)</span></div>
              <div style="font-size:13px;line-height:1.7;color:#444;">
                <b>"이 회사 주식이 비싼 건지 싼 건지"</b> 알려주는 숫자야.<br><br>
                예를 들어 PER이 10이면, 이 회사가 <b>1년에 버는 돈의 10배</b>를 주고 주식을 사는 거야.<br><br>
                🔹 <b>PER이 낮으면</b> → 돈을 잘 버는데 주가가 저렴한 편 (가성비 👍)<br>
                🔹 <b>PER이 높으면</b> → 지금은 비싸지만 미래에 대한 기대가 큰 것<br><br>
                보통 한국 주식은 10~15배면 평균, 20 이상이면 "기대가 크다", 5 이하면 "저평가"라고 봐!
              </div>
            </div>
            <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:8px;">
              <div style="font-size:14px;font-weight:800;margin-bottom:6px;">🏠 PBR <span style="font-weight:400;color:var(--text2);">(주가순자산비율)</span></div>
              <div style="font-size:13px;line-height:1.7;color:#444;">
                <b>"회사 재산에 비해 주식이 비싼지"</b> 알려주는 숫자야.<br><br>
                회사가 가진 모든 것(건물, 현금, 기계 등)의 가치를 <b>1</b>이라고 하면:<br><br>
                🔹 <b>PBR 1 미만</b> → 회사 재산보다 주가가 싸다! (세일 중? 🏷️)<br>
                🔹 <b>PBR 1 이상</b> → 회사 재산보다 주가가 비싸다 (그만큼 미래가 기대됨)<br><br>
                은행주는 보통 PBR 0.3~0.5 / IT 기업은 PBR 3~10도 나와!
              </div>
            </div>
            <div style="background:var(--bg);border-radius:12px;padding:14px;margin-bottom:8px;">
              <div style="font-size:14px;font-weight:800;margin-bottom:6px;">📈 그 외 용어들</div>
              <div style="font-size:13px;line-height:1.7;color:#444;">
                <b>시가총액</b> = 주가 × 전체 주식 수. 회사의 "몸값"이야. 삼성전자가 400조면, 삼성을 통째로 사려면 400조가 필요하다는 뜻!<br><br>
                <b>거래량</b> = 하루에 이 주식이 몇 번 사고팔렸는지. 거래량이 많으면 사람들이 관심 있다는 뜻!<br><br>
                <b>EPS</b> = 주식 1주당 회사가 버는 돈. EPS가 높을수록 돈을 잘 버는 회사!<br><br>
                <b>전일 종가</b> = 어제 장 마감할 때 가격. 오늘 가격과 비교해서 올랐는지 내렸는지 봐!
              </div>
            </div>
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
