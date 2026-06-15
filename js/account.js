/* ============================================================
 *  account.js — 내 계좌 탭
 * ============================================================ */

const Account = {
  render() {
    const el = document.getElementById('accountContent');
    if (!el || !App.user) return;

    // 보유 종목 평가
    let investTotal = 0;
    const holdingsArr = [];

    for (const [code, h] of Object.entries(App.user.holdings)) {
      const stock = App.stocks.find(s => s.code === code);
      if (!stock || h.qty <= 0) continue;

      const currentVal = h.qty * stock.price;
      const investVal = h.qty * h.avgPrice;
      const pnl = currentVal - investVal;
      const pnlPct = investVal > 0 ? (pnl / investVal * 100) : 0;
      investTotal += currentVal;

      holdingsArr.push({
        code, name: stock.name, qty: h.qty,
        avgPrice: h.avgPrice, currentPrice: stock.price,
        currentVal, pnl, pnlPct
      });
    }

    // 정렬: 수익률 높은 순
    holdingsArr.sort((a, b) => b.pnlPct - a.pnlPct);

    const totalAsset = App.user.balance + investTotal;
    const totalPnl = totalAsset - App.user.initialCapital;
    const totalPnlPct = App.user.initialCapital > 0
      ? (totalPnl / App.user.initialCapital * 100) : 0;

    el.innerHTML = `
      <div class="account-summary">
        <div class="account-label">총 자산</div>
        <div class="account-total">${Utils.formatWon(totalAsset)}</div>
        <div class="account-profit ${Utils.dir(totalPnl)}">
          ${totalPnl >= 0 ? '+' : ''}${Utils.formatWon(totalPnl)} (${Utils.formatPct(totalPnlPct)})
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
          <span class="info-row-label">총 수익률</span>
          <span class="info-row-value ${Utils.dir(totalPnl)}">${Utils.formatPct(totalPnlPct)}</span>
        </div>
      </div>

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
    `;
  }
};
