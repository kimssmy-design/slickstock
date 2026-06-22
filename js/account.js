/* ============================================================
 *  account.js — 내 계좌 탭 (자산 + 업적 + 거래 내역)
 * ============================================================ */

/* ── 업적 정의 (12개) ── */
const ACHIEVEMENTS = [
  { id:'first_trade', emoji:'🎯', name:'첫 거래', desc:'첫 번째 주식 거래 완료!' },
  { id:'first_sell',  emoji:'💸', name:'첫 매도', desc:'처음으로 주식을 팔았어요' },
  { id:'first_profit',emoji:'📈', name:'첫 수익', desc:'보유 종목에서 수익 발생!' },
  { id:'profit_100k', emoji:'💰', name:'10만원 수익', desc:'보유종목 수익 10만원 돌파!' },
  { id:'profit_500k', emoji:'💎', name:'50만원 수익', desc:'보유종목 수익 50만원 돌파!' },
  { id:'profit_1m',   emoji:'🏆', name:'100만원 수익', desc:'보유종목 수익 100만원 돌파!' },
  { id:'hold_3',      emoji:'📊', name:'3종목 보유', desc:'3가지 종목 보유 중!' },
  { id:'diversify',   emoji:'🌈', name:'분산투자', desc:'5종목 이상 보유!' },
  { id:'trades_10',   emoji:'🔟', name:'10회 거래', desc:'거래 10회 달성!' },
  { id:'trades_20',   emoji:'📱', name:'20회 거래', desc:'거래 20회 달성!' },
  { id:'all_in',      emoji:'🎰', name:'올인', desc:'잔고 10만원 미만! 대담해!' },
  { id:'return_10',   emoji:'🚀', name:'수익률 10%', desc:'보유종목 수익률 10%!' },
];

const Account = {
  async render() {
    const el = document.getElementById('accountContent');
    if (!el || !App.user) return;

    // 기존 유저 카운터 보정 (1회만 실행)
    if ((App.user.tradeCount || 0) === 0) {
      await this._backfillCounters();
    }

    // 보유 종목 평가
    let investTotal = 0;
    let totalCost = 0;
    const holdingsArr = [];

    for (const [code, h] of Object.entries(App.user.holdings || {})) {
      const stock = App.stocks.find(s => s.code === code);
      if (!stock || h.qty <= 0) continue;

      const currentVal = h.qty * stock.price;
      const investVal = h.qty * h.avgPrice;
      const pnl = currentVal - investVal;
      const pnlPct = investVal > 0 ? (pnl / investVal * 100) : 0;
      investTotal += currentVal;
      totalCost += investVal;

      holdingsArr.push({
        code, name: stock.name, qty: h.qty,
        avgPrice: h.avgPrice, currentPrice: stock.price,
        currentVal, pnl, pnlPct
      });
    }

    holdingsArr.sort((a, b) => b.pnlPct - a.pnlPct);

    const totalAsset = App.user.balance + investTotal;
    const totalPnl = investTotal - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost * 100) : 0;

    // 업적 체크
    const earnedBadges = this.checkAchievements(totalPnl, totalPnlPct);

    el.innerHTML = `
      <!-- 업적 배지 -->
      <div style="margin-bottom:12px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:8px;">🏅 나의 업적 (${earnedBadges.length}/${ACHIEVEMENTS.length})</div>
        <div style="display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;">
          ${ACHIEVEMENTS.map(a => {
            const earned = earnedBadges.includes(a.id);
            return `<div title="${a.desc}" style="min-width:64px;text-align:center;padding:8px 6px;border-radius:12px;${earned ? 'background:var(--card);box-shadow:var(--shadow);' : 'background:var(--bg);opacity:0.4;'}">
              <div style="font-size:24px;${earned ? '' : 'filter:grayscale(1);'}">${a.emoji}</div>
              <div style="font-size:10px;font-weight:600;margin-top:2px;color:${earned ? 'var(--text)' : 'var(--text3)'};">${a.name}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <!-- 총 자산 -->
      <div class="account-summary">
        <div class="account-label">총 자산</div>
        <div class="account-total">${Utils.formatWon(totalAsset)}</div>
        <div class="account-profit ${Utils.dir(totalPnl)}">
          ${totalCost > 0 ? (totalPnl >= 0 ? '+' : '') + Utils.formatWon(totalPnl) + ' (' + Utils.formatPct(totalPnlPct) + ')' : '보유 종목 없음'}
        </div>
      </div>

      <div class="info-card">
        <div class="info-row">
          <span class="info-row-label">초기 자본</span>
          <span class="info-row-value">${Utils.formatWon(App.user.initialCapital)}</span>
        </div>
        <div class="info-row">
          <span class="info-row-label">보유 현금</span>
          <span class="info-row-value">${Utils.formatWon(App.user.balance)}</span>
        </div>
        <div class="info-row">
          <span class="info-row-label">투자 평가액</span>
          <span class="info-row-value ${Utils.dir(totalPnl)}">${Utils.formatWon(investTotal)}</span>
        </div>
        <div class="info-row">
          <span class="info-row-label">보유종목 수익률</span>
          <span class="info-row-value ${Utils.dir(totalPnl)}">${totalCost > 0 ? Utils.formatPct(totalPnlPct) : '-'}</span>
        </div>
      </div>

      <!-- 보유 종목 -->
      <div class="holdings-title">보유 종목 (${holdingsArr.length})</div>
      ${holdingsArr.length === 0
        ? '<div style="text-align:center;padding:24px;color:var(--text2);font-size:14px;">아직 보유한 종목이 없어요.<br>거래소에서 첫 주식을 사볼까요? 📈</div>'
        : holdingsArr.map(h => `
          <div class="holding-item" onclick="Detail.open('${h.code}')" style="cursor:pointer;">
            <div class="holding-top">
              <span class="holding-name">${Utils.esc(h.name)}</span>
              <span class="holding-pnl ${Utils.dir(h.pnl)}">
                ${h.pnl >= 0 ? '+' : ''}${Utils.formatWon(h.pnl)} (${Utils.formatPct(h.pnlPct)})
              </span>
            </div>
            <div class="holding-bottom">
              <span>${h.qty}주 · 평균 ${Utils.formatWon(h.avgPrice)}</span>
              <span class="${Utils.dir(h.pnl)}">현재 ${Utils.formatWon(h.currentPrice)}</span>
            </div>
          </div>`).join('')
      }

      <!-- 거래 내역 (접기) -->
      <div style="margin-top:20px;">
        <div onclick="Account.toggleHistory()" style="cursor:pointer;font-size:16px;font-weight:800;display:flex;align-items:center;gap:6px;">
          📜 거래 내역 <span id="historyToggle" style="font-size:12px;color:var(--text2);">▶ 펼치기</span>
        </div>
        <div id="historyContent" style="display:none;margin-top:8px;"></div>
      </div>
    `;
  },

  /* 기존 유저 거래 카운터 보정 (1회만) */
  async _backfillCounters() {
    try {
      const snap = await App.db.collection(CONFIG.COLLECTIONS.TRANSACTIONS)
        .where('userId', '==', App.user.id)
        .get();

      if (snap.empty) return;

      let tradeCount = 0;
      let sellCount = 0;
      snap.forEach(doc => {
        tradeCount++;
        if (doc.data().type === 'sell') sellCount++;
      });

      // Firestore에 저장
      await App.db.collection(CONFIG.COLLECTIONS.USERS).doc(App.user.id).update({
        tradeCount: tradeCount,
        sellCount: sellCount
      });

      // 로컬에도 반영
      App.user.tradeCount = tradeCount;
      App.user.sellCount = sellCount;
      console.log('카운터 보정 완료:', tradeCount, '거래,', sellCount, '매도');
    } catch (e) {
      console.error('카운터 보정 실패:', e);
    }
  },

  /* 업적 체크 */
  checkAchievements(totalPnl, totalPnlPct) {
    const u = App.user;
    const h = u.holdings || {};
    const holdingCount = Object.values(h).filter(v => v.qty > 0).length;
    const tc = u.tradeCount || 0;
    const sc = u.sellCount || 0;
    const earned = [];

    if (tc >= 1) earned.push('first_trade');
    if (sc >= 1) earned.push('first_sell');
    if (totalPnl > 0) earned.push('first_profit');
    if (totalPnl >= 100000) earned.push('profit_100k');
    if (totalPnl >= 500000) earned.push('profit_500k');
    if (totalPnl >= 1000000) earned.push('profit_1m');
    if (holdingCount >= 3) earned.push('hold_3');
    if (holdingCount >= 5) earned.push('diversify');
    if (tc >= 10) earned.push('trades_10');
    if (tc >= 20) earned.push('trades_20');
    if (u.balance < 100000 && holdingCount > 0) earned.push('all_in');
    if (totalPnlPct >= 10) earned.push('return_10');

    return earned;
  },

  /* 거래 내역 토글 */
  _historyOpen: false,
  toggleHistory() {
    this._historyOpen = !this._historyOpen;
    const el = document.getElementById('historyContent');
    const icon = document.getElementById('historyToggle');
    if (this._historyOpen) {
      el.style.display = 'block';
      icon.textContent = '▼ 접기';
      this.loadHistory();
    } else {
      el.style.display = 'none';
      icon.textContent = '▶ 펼치기';
    }
  },

  /* 거래 내역 로드 (최근 20건) */
  async loadHistory() {
    const el = document.getElementById('historyContent');
    if (!el || !App.user) return;
    el.innerHTML = '<div style="padding:10px;color:var(--text2);font-size:13px;">로딩 중...</div>';

    try {
      const snap = await App.db.collection(CONFIG.COLLECTIONS.TRANSACTIONS)
        .where('userId', '==', App.user.id)
        .orderBy('timestamp', 'desc')
        .limit(20)
        .get();

      if (snap.empty) {
        el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:13px;">거래 내역이 없어요</div>';
        return;
      }

      el.innerHTML = snap.docs.map(doc => {
        const t = doc.data();
        const isBuy = t.type === 'buy';
        const time = t.timestamp ? t.timestamp.toDate() : new Date();
        const dateStr = (time.getMonth()+1) + '/' + time.getDate();
        const timeStr = time.toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});

        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--card);border-radius:10px;margin-bottom:4px;box-shadow:var(--shadow);">
          <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;background:${isBuy ? 'var(--up)' : 'var(--down)'};">
            ${isBuy ? '매수' : '매도'}
          </div>
          <div style="flex:1;">
            <div style="font-size:13px;font-weight:700;">${Utils.esc(t.stockName || t.stockCode)}</div>
            <div style="font-size:11px;color:var(--text2);">${dateStr} ${timeStr} · ${t.qty}주</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;font-weight:700;color:${isBuy ? 'var(--up)' : 'var(--down)'};">${Utils.formatWon(t.total)}</div>
            <div style="font-size:11px;color:var(--text2);">@${Utils.formatWon(t.price)}</div>
          </div>
        </div>`;
      }).join('');

    } catch (e) {
      console.error('거래 내역 로드 오류:', e);
      el.innerHTML = '<div style="padding:10px;color:var(--up);font-size:12px;">조회 실패 — Firestore 인덱스가 필요할 수 있어요</div>';
    }
  }
};
