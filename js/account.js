/* ============================================================
 *  account.js — 내 계좌 (자산 + 업적 20개 + 보상 + 거래 내역)
 * ============================================================ */

const ACHIEVEMENTS = [
  { id:'first_trade',  emoji:'🎯', name:'첫 거래',      reward:100000 },
  { id:'first_sell',   emoji:'💸', name:'첫 매도',      reward:100000 },
  { id:'first_profit', emoji:'📈', name:'첫 수익',      reward:100000 },
  { id:'first_loss',   emoji:'📉', name:'첫 손실 경험', reward:100000 },
  { id:'profit_100k',  emoji:'💰', name:'10만원 수익',  reward:100000 },
  { id:'profit_500k',  emoji:'💎', name:'50만원 수익',  reward:100000 },
  { id:'profit_1m',    emoji:'🏆', name:'100만원 수익', reward:100000 },
  { id:'profit_3m',    emoji:'👑', name:'300만원 수익', reward:100000 },
  { id:'hold_3',       emoji:'📊', name:'3종목 보유',   reward:100000 },
  { id:'diversify',    emoji:'🌈', name:'5종목 분산',   reward:100000 },
  { id:'hold_7',       emoji:'🏦', name:'7종목 보유',   reward:100000 },
  { id:'trades_10',    emoji:'🔟', name:'10회 거래',    reward:100000 },
  { id:'trades_30',    emoji:'📱', name:'30회 거래',    reward:100000 },
  { id:'trades_50',    emoji:'🎪', name:'50회 거래',    reward:100000 },
  { id:'all_in',       emoji:'🎰', name:'올인',         reward:100000 },
  { id:'return_10',    emoji:'🚀', name:'수익률 10%',   reward:100000 },
  { id:'return_20',    emoji:'🔥', name:'수익률 20%',   reward:100000 },
  { id:'fav_3',        emoji:'⭐', name:'관심종목 3개', reward:100000 },
  { id:'asset_15m',    emoji:'💵', name:'총자산 1500만',reward:100000 },
  { id:'all_clear',    emoji:'🌟', name:'올 클리어',    reward:3100000 },
];
// 19개 × 10만 = 190만 + 올 클리어 310만 = 총 500만원

const Account = {
  async render() {
    const el = document.getElementById('accountContent');
    if (!el || !App.user) return;

    // 기존 유저 카운터 보정 (1회만)
    if ((App.user.tradeCount || 0) === 0 && Object.keys(App.user.holdings || {}).length > 0) {
      await this._backfillCounters();
    }

    // 보유 종목 평가
    let investTotal = 0, totalCost = 0;
    let hasProfit = false, hasLoss = false;
    const holdingsArr = [];

    for (const [code, h] of Object.entries(App.user.holdings || {})) {
      const stock = App.stocks.find(s => s.code === code);
      if (!stock || h.qty <= 0) continue;
      const currentVal = h.qty * stock.price;
      const investVal = h.qty * h.avgPrice;
      const pnl = currentVal - investVal;
      investTotal += currentVal;
      totalCost += investVal;
      if (pnl > 0) hasProfit = true;
      if (pnl < 0) hasLoss = true;
      holdingsArr.push({
        code, name: stock.name, qty: h.qty,
        avgPrice: h.avgPrice, currentPrice: stock.price,
        currentVal, pnl, pnlPct: investVal > 0 ? (pnl / investVal * 100) : 0
      });
    }
    holdingsArr.sort((a, b) => b.pnlPct - a.pnlPct);

    const totalAsset = App.user.balance + investTotal;
    const totalPnl = investTotal - totalCost;
    const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost * 100) : 0;
    const holdingCount = holdingsArr.length;

    // 업적 체크
    const earned = this._checkAll(totalPnl, totalPnlPct, holdingCount, hasProfit, hasLoss, totalAsset);
    const claimed = App.user.achievementsClaimed || [];

    el.innerHTML = `
      <!-- 공지사항 -->
      ${this._renderNotices()}

      <!-- 업적 배지 (접기) -->
      <div style="margin-bottom:14px;">
        <div onclick="Account.toggleAchievements()" style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:var(--card);border-radius:12px;box-shadow:var(--shadow);">
          <span style="font-size:14px;font-weight:700;">🏅 나의 업적 (${earned.length}/${ACHIEVEMENTS.length})</span>
          <span style="font-size:12px;color:var(--text2);">
            ${earned.filter(id => !claimed.includes(id)).length > 0 ? '<span style="color:var(--accent);font-weight:700;">보상 ' + earned.filter(id => !claimed.includes(id)).length + '개 수령 가능!</span>' : ''}
            <span id="achvToggle">▶</span>
          </span>
        </div>
        <div id="achvContent" style="display:none;margin-top:8px;">
          ${ACHIEVEMENTS.map(a => {
            const isEarned = earned.includes(a.id);
            const isClaimed = claimed.includes(a.id);
            return `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;${isEarned ? 'background:var(--card);box-shadow:var(--shadow);' : 'background:var(--bg);opacity:0.45;'}">
              <span style="font-size:22px;${isEarned ? '' : 'filter:grayscale(1);'}">${a.emoji}</span>
              <div style="flex:1;">
                <div style="font-size:13px;font-weight:700;color:${isEarned ? 'var(--text)' : 'var(--text3)'};">${a.name}</div>
                <div style="font-size:11px;color:var(--text3);">보상 ${Utils.formatWon(a.reward)}</div>
              </div>
              ${isClaimed
                ? '<span style="font-size:11px;color:var(--green);font-weight:700;">✅ 수령</span>'
                : isEarned
                  ? '<button onclick="Account.claimReward(\'' + a.id + '\',' + a.reward + ')" style="padding:5px 12px;border-radius:8px;border:none;background:var(--accent);color:#fff;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;">보상</button>'
                  : '<span style="font-size:11px;color:var(--text3);">🔒</span>'
              }
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
        <div class="info-row"><span class="info-row-label">초기 자본</span><span class="info-row-value">${Utils.formatWon(App.user.initialCapital)}</span></div>
        <div class="info-row"><span class="info-row-label">보유 현금</span><span class="info-row-value">${Utils.formatWon(App.user.balance)}</span></div>
        <div class="info-row"><span class="info-row-label">투자 평가액</span><span class="info-row-value ${Utils.dir(totalPnl)}">${Utils.formatWon(investTotal)}</span></div>
        <div class="info-row"><span class="info-row-label">보유종목 수익률</span><span class="info-row-value ${Utils.dir(totalPnl)}">${totalCost > 0 ? Utils.formatPct(totalPnlPct) : '-'}</span></div>
      </div>

      <div class="holdings-title">보유 종목 (${holdingsArr.length})</div>
      ${holdingsArr.length === 0
        ? '<div style="text-align:center;padding:24px;color:var(--text2);font-size:14px;">아직 보유한 종목이 없어요.<br>거래소에서 첫 주식을 사볼까요? 📈</div>'
        : holdingsArr.map(h => `
          <div class="holding-item" onclick="Detail.open('${h.code}')" style="cursor:pointer;">
            <div class="holding-top">
              <span class="holding-name">${Utils.esc(h.name)}</span>
              <span class="holding-pnl ${Utils.dir(h.pnl)}">${h.pnl >= 0 ? '+' : ''}${Utils.formatWon(h.pnl)} (${Utils.formatPct(h.pnlPct)})</span>
            </div>
            <div class="holding-bottom">
              <span>${h.qty}주 · 평균 ${Utils.formatWon(h.avgPrice)}</span>
              <span class="${Utils.dir(h.pnl)}">현재 ${Utils.formatWon(h.currentPrice)}</span>
            </div>
          </div>`).join('')
      }

      <!-- 거래 내역 -->
      <div style="margin-top:20px;">
        <div onclick="Account.toggleHistory()" style="cursor:pointer;font-size:16px;font-weight:800;display:flex;align-items:center;gap:6px;">
          📜 거래 내역 <span id="historyToggle" style="font-size:12px;color:var(--text2);">▶ 펼치기</span>
        </div>
        <div id="historyContent" style="display:none;margin-top:8px;"></div>
      </div>
    `;
  },

  /* 업적 전체 체크 */
  _checkAll(totalPnl, totalPnlPct, holdingCount, hasProfit, hasLoss, totalAsset) {
    const u = App.user;
    const tc = u.tradeCount || 0;
    const sc = u.sellCount || 0;
    const favCount = JSON.parse(localStorage.getItem('sl_favs') || '[]').length;
    const earned = [];

    if (tc >= 1) earned.push('first_trade');
    if (sc >= 1) earned.push('first_sell');
    if (hasProfit) earned.push('first_profit');
    if (hasLoss) earned.push('first_loss');
    if (totalPnl >= 100000) earned.push('profit_100k');
    if (totalPnl >= 500000) earned.push('profit_500k');
    if (totalPnl >= 1000000) earned.push('profit_1m');
    if (totalPnl >= 3000000) earned.push('profit_3m');
    if (holdingCount >= 3) earned.push('hold_3');
    if (holdingCount >= 5) earned.push('diversify');
    if (holdingCount >= 7) earned.push('hold_7');
    if (tc >= 10) earned.push('trades_10');
    if (tc >= 30) earned.push('trades_30');
    if (tc >= 50) earned.push('trades_50');
    if (u.balance < 100000 && holdingCount > 0) earned.push('all_in');
    if (totalPnlPct >= 10) earned.push('return_10');
    if (totalPnlPct >= 20) earned.push('return_20');
    if (favCount >= 3) earned.push('fav_3');
    if (totalAsset >= 15000000) earned.push('asset_15m');
    // 올 클리어: 위 19개 전부 달성
    if (earned.length >= 19) earned.push('all_clear');

    return earned;
  },

  /* 공지사항 렌더 */
  _noticeIdx: 0,
  _noticeOpen: false,

  _renderNotices() {
    const notices = App.notices || [];
    if (notices.length === 0) return '';

    const idx = Math.min(this._noticeIdx, notices.length - 1);
    const n = notices[idx];
    const total = notices.length;

    if (!this._noticeOpen) {
      return `<div onclick="Account._noticeOpen=true;Account.render();" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:12px 14px;background:var(--card);border-radius:12px;box-shadow:var(--shadow);margin-bottom:12px;border-left:3px solid var(--accent);">
        <span style="font-size:16px;">📢</span>
        <span style="flex:1;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">공지사항: ${Utils.esc(n.headline)}</span>
        <span style="font-size:12px;color:var(--text2);">▶</span>
      </div>`;
    }

    const expDate = new Date(n.expiresAt);
    const expStr = (expDate.getMonth()+1) + '/' + expDate.getDate();

    return `<div style="background:var(--card);border-radius:12px;box-shadow:var(--shadow);margin-bottom:12px;border-left:3px solid var(--accent);overflow:hidden;">
      <div onclick="Account._noticeOpen=false;Account.render();" style="cursor:pointer;display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--border);">
        <span style="font-size:16px;">📢</span>
        <span style="flex:1;font-size:13px;font-weight:700;">공지사항</span>
        <span style="font-size:12px;color:var(--text2);">▼</span>
      </div>
      <div style="padding:14px;">
        <div style="font-size:16px;font-weight:800;margin-bottom:6px;">${Utils.esc(n.headline)}</div>
        <div style="font-size:13px;line-height:1.7;color:#444;white-space:pre-line;">${Utils.esc(n.content)}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:8px;">~${expStr}까지</div>
      </div>
      ${total > 1 ? `<div style="display:flex;justify-content:center;align-items:center;gap:16px;padding:8px 0 12px;border-top:1px solid var(--border);">
        <button onclick="Account._noticeIdx=Math.max(0,Account._noticeIdx-1);Account.render();" style="border:none;background:none;font-size:16px;cursor:pointer;color:${idx > 0 ? 'var(--text)' : 'var(--text3)'};">◀</button>
        <span style="font-size:12px;color:var(--text2);">${idx + 1} / ${total}</span>
        <button onclick="Account._noticeIdx=Math.min(${total - 1},Account._noticeIdx+1);Account.render();" style="border:none;background:none;font-size:16px;cursor:pointer;color:${idx < total - 1 ? 'var(--text)' : 'var(--text3)'};">▶</button>
      </div>` : ''}
    </div>`;
  },

  /* 업적 토글 */
  _achvOpen: false,
  toggleAchievements() {
    this._achvOpen = !this._achvOpen;
    const el = document.getElementById('achvContent');
    const icon = document.getElementById('achvToggle');
    if (el) el.style.display = this._achvOpen ? 'block' : 'none';
    if (icon) icon.textContent = this._achvOpen ? '▼' : '▶';
  },

  /* 보상 수령 */
  async claimReward(achievementId, reward) {
    if (!App.user) return;
    const claimed = App.user.achievementsClaimed || [];
    if (claimed.includes(achievementId)) { Utils.toast('이미 수령했어요', 'error'); return; }

    Utils.showLoading(true);
    try {
      await App.db.collection(CONFIG.COLLECTIONS.USERS).doc(App.user.id).update({
        balance: firebase.firestore.FieldValue.increment(reward),
        achievementsClaimed: firebase.firestore.FieldValue.arrayUnion(achievementId)
      });

      App.user.balance += reward;
      if (!App.user.achievementsClaimed) App.user.achievementsClaimed = [];
      App.user.achievementsClaimed.push(achievementId);

      const achv = ACHIEVEMENTS.find(a => a.id === achievementId);
      Utils.toast(`${achv ? achv.emoji : '🏅'} ${achv ? achv.name : ''} 보상 ${Utils.formatWon(reward)} 수령! 🎉`, 'success');

      AppUI.updateHeader();
      this.render();
    } catch (e) {
      Utils.toast('보상 수령 실패', 'error');
    } finally {
      Utils.showLoading(false);
    }
  },

  /* 기존 유저 거래 카운터 보정 */
  async _backfillCounters() {
    try {
      const snap = await App.db.collection(CONFIG.COLLECTIONS.TRANSACTIONS)
        .where('userId', '==', App.user.id).get();
      if (snap.empty) return;
      let tradeCount = 0, sellCount = 0;
      snap.forEach(doc => { tradeCount++; if (doc.data().type === 'sell') sellCount++; });
      await App.db.collection(CONFIG.COLLECTIONS.USERS).doc(App.user.id).update({ tradeCount, sellCount });
      App.user.tradeCount = tradeCount;
      App.user.sellCount = sellCount;
    } catch (e) { console.error('카운터 보정 실패:', e); }
  },

  /* 거래 내역 토글 */
  _historyOpen: false,
  toggleHistory() {
    this._historyOpen = !this._historyOpen;
    const el = document.getElementById('historyContent');
    const icon = document.getElementById('historyToggle');
    if (this._historyOpen) {
      el.style.display = 'block'; icon.textContent = '▼ 접기';
      this.loadHistory();
    } else {
      el.style.display = 'none'; icon.textContent = '▶ 펼치기';
    }
  },

  /* 거래 내역 로드 */
  async loadHistory() {
    const el = document.getElementById('historyContent');
    if (!el || !App.user) return;
    el.innerHTML = '<div style="padding:10px;color:var(--text2);font-size:13px;">로딩 중...</div>';
    try {
      const snap = await App.db.collection(CONFIG.COLLECTIONS.TRANSACTIONS)
        .where('userId', '==', App.user.id)
        .orderBy('timestamp', 'desc').limit(20).get();
      if (snap.empty) { el.innerHTML = '<div style="padding:10px;color:var(--text3);font-size:13px;">거래 내역이 없어요</div>'; return; }
      el.innerHTML = snap.docs.map(doc => {
        const t = doc.data();
        const isBuy = t.type === 'buy';
        const time = t.timestamp ? t.timestamp.toDate() : new Date();
        const dateStr = (time.getMonth()+1) + '/' + time.getDate();
        const timeStr = time.toLocaleTimeString('ko-KR', {hour:'2-digit',minute:'2-digit'});
        return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--card);border-radius:10px;margin-bottom:4px;box-shadow:var(--shadow);">
          <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:800;color:#fff;background:${isBuy ? 'var(--up)' : 'var(--down)'};">${isBuy ? '매수' : '매도'}</div>
          <div style="flex:1;"><div style="font-size:13px;font-weight:700;">${Utils.esc(t.stockName || t.stockCode)}</div><div style="font-size:11px;color:var(--text2);">${dateStr} ${timeStr} · ${t.qty}주</div></div>
          <div style="text-align:right;"><div style="font-size:13px;font-weight:700;color:${isBuy ? 'var(--up)' : 'var(--down)'};">${Utils.formatWon(t.total)}</div><div style="font-size:11px;color:var(--text2);">1주 ${Utils.formatWon(t.price)}</div></div>
        </div>`;
      }).join('');
    } catch (e) {
      el.innerHTML = '<div style="padding:10px;color:var(--up);font-size:12px;">조회 실패 — Firestore 인덱스가 필요할 수 있어요</div>';
    }
  }
};
