/* ============================================================
 *  trade.js — 매수/매도 로직 + 모달
 * ============================================================ */

const Trade = {
  mode: null,    // 'buy' | 'sell'
  stock: null,
  qty: 1,

  /* 매수 모달 열기 */
  openBuy(code) {
    if (!Utils.isMarketHours()) {
      Utils.toast('장 운영시간이 아니에요 (08:00~16:30)', 'error');
      return;
    }
    this.mode = 'buy';
    this.stock = App.stocks.find(s => s.code === code);
    if (!this.stock) return;
    this.qty = 1;
    this.renderModal();
    document.getElementById('tradeModal').classList.add('show');
  },

  /* 매도 모달 열기 */
  openSell(code) {
    if (!Utils.isMarketHours()) {
      Utils.toast('장 운영시간이 아니에요 (08:00~16:30)', 'error');
      return;
    }
    const holding = App.user.holdings[code];
    if (!holding || holding.qty <= 0) {
      Utils.toast('보유한 주식이 없어요', 'error');
      return;
    }
    this.mode = 'sell';
    this.stock = App.stocks.find(s => s.code === code);
    if (!this.stock) return;
    this.qty = 1;
    this.renderModal();
    document.getElementById('tradeModal').classList.add('show');
  },

  /* 모달 렌더링 */
  renderModal() {
    const s = this.stock;
    const isBuy = this.mode === 'buy';
    const dir = Utils.dir(s.change);
    const total = s.price * this.qty;

    // 매수: 최대 구매 가능 수량, 매도: 보유 수량
    let maxQty;
    if (isBuy) {
      maxQty = Math.floor(App.user.balance / s.price);
    } else {
      const h = App.user.holdings[s.code];
      maxQty = h ? h.qty : 0;
    }

    document.getElementById('tradeModalBody').innerHTML = `
      <div class="modal-handle"></div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <div class="modal-stock-name">${Utils.esc(s.name)}</div>
          <div style="font-size:12px;color:var(--text2);">${s.code}</div>
        </div>
        <div style="text-align:right;">
          <div class="modal-stock-price ${dir}">${Utils.formatWon(s.price)}</div>
        </div>
      </div>

      <div style="margin:20px 0 8px;text-align:center;">
        <div style="font-size:20px;font-weight:800;color:${isBuy ? 'var(--up)' : 'var(--down)'};">
          ${isBuy ? '매수' : '매도'}
        </div>
      </div>

      <div class="qty-label">수량</div>
      <div class="modal-qty">
        <button class="qty-btn" onclick="Trade.changeQty(-10)">-10</button>
        <button class="qty-btn" onclick="Trade.changeQty(-1)">−</button>
        <span class="qty-num" id="tradeQty">${this.qty}</span>
        <button class="qty-btn" onclick="Trade.changeQty(1)">+</button>
        <button class="qty-btn" onclick="Trade.changeQty(10)">+10</button>
      </div>
      <div style="text-align:center;margin-bottom:4px;">
        <span style="font-size:12px;color:var(--text2);">${isBuy ? '최대 ' + maxQty + '주 구매 가능' : '보유 ' + maxQty + '주'}</span>
        ${maxQty > 0 ? `<button style="font-size:12px;color:var(--down);background:none;border:none;font-weight:700;cursor:pointer;text-decoration:underline;" onclick="Trade.setMax(${maxQty})">전량</button>` : ''}
      </div>
      <div style="text-align:center;font-size:15px;color:var(--text2);margin:8px 0 4px;">
        총 금액 <span style="color:var(--text);font-weight:800;font-size:18px;" id="tradeTotal">${Utils.formatWon(total)}</span>
      </div>
      ${isBuy ? `<div style="text-align:center;font-size:12px;color:var(--text2);">잔고: ${Utils.formatWon(App.user.balance)}</div>` : ''}

      <div class="modal-btns">
        <button class="modal-btn ${isBuy ? 'buy' : 'sell'}" onclick="Trade.execute()">
          ${isBuy ? '매수 확인' : '매도 확인'}
        </button>
        <button class="modal-btn close" onclick="Trade.close()">취소</button>
      </div>
    `;
  },

  /* 수량 변경 */
  changeQty(delta) {
    const isBuy = this.mode === 'buy';
    let maxQty;
    if (isBuy) {
      maxQty = Math.floor(App.user.balance / this.stock.price);
    } else {
      const h = App.user.holdings[this.stock.code];
      maxQty = h ? h.qty : 0;
    }

    this.qty = Math.max(1, Math.min(maxQty, this.qty + delta));
    const qtyEl = document.getElementById('tradeQty');
    const totalEl = document.getElementById('tradeTotal');
    if (qtyEl) qtyEl.textContent = this.qty;
    if (totalEl) totalEl.textContent = Utils.formatWon(this.stock.price * this.qty);
  },

  /* 전량 설정 */
  setMax(max) {
    this.qty = max;
    const qtyEl = document.getElementById('tradeQty');
    const totalEl = document.getElementById('tradeTotal');
    if (qtyEl) qtyEl.textContent = this.qty;
    if (totalEl) totalEl.textContent = Utils.formatWon(this.stock.price * this.qty);
  },

  /* 거래 실행 */
  async execute() {
    if (!App.user || !this.stock) return;

    const isBuy = this.mode === 'buy';
    const total = this.stock.price * this.qty;

    // 유효성 검사
    if (isBuy && total > App.user.balance) {
      Utils.toast('잔고가 부족해요', 'error'); return;
    }
    if (!isBuy) {
      const h = App.user.holdings[this.stock.code];
      if (!h || h.qty < this.qty) {
        Utils.toast('보유 수량이 부족해요', 'error'); return;
      }
    }

    Utils.showLoading(true);
    try {
      const userRef = App.db.collection(CONFIG.COLLECTIONS.USERS).doc(App.user.id);
      const txRef = App.db.collection(CONFIG.COLLECTIONS.TRANSACTIONS);

      await App.db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists) throw new Error('사용자를 찾을 수 없어요');

        const userData = userDoc.data();
        const holdings = userData.holdings || {};
        let newBalance = userData.balance;

        if (isBuy) {
          // 매수
          newBalance -= total;
          if (newBalance < 0) throw new Error('잔고 부족');

          const existing = holdings[this.stock.code];
          if (existing) {
            // 평균 매수가 재계산
            const totalQty = existing.qty + this.qty;
            const totalCost = existing.qty * existing.avgPrice + total;
            holdings[this.stock.code] = {
              qty: totalQty,
              avgPrice: Math.round(totalCost / totalQty)
            };
          } else {
            holdings[this.stock.code] = {
              qty: this.qty,
              avgPrice: this.stock.price
            };
          }
        } else {
          // 매도
          newBalance += total;
          const existing = holdings[this.stock.code];
          if (!existing || existing.qty < this.qty) throw new Error('보유 수량 부족');

          const remainQty = existing.qty - this.qty;
          if (remainQty <= 0) {
            delete holdings[this.stock.code];
          } else {
            holdings[this.stock.code] = {
              qty: remainQty,
              avgPrice: existing.avgPrice
            };
          }
        }

        transaction.update(userRef, {
          balance: newBalance,
          holdings: holdings
        });
      });

      // 거래 내역 기록 (트랜잭션 밖에서)
      await txRef.add({
        userId: App.user.id,
        stockCode: this.stock.code,
        stockName: this.stock.name,
        type: isBuy ? 'buy' : 'sell',
        qty: this.qty,
        price: this.stock.price,
        total: total,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 거래 카운터 업데이트
      const counterUpdate = { tradeCount: firebase.firestore.FieldValue.increment(1) };
      if (!isBuy) counterUpdate.sellCount = firebase.firestore.FieldValue.increment(1);
      await App.db.collection(CONFIG.COLLECTIONS.USERS).doc(App.user.id).update(counterUpdate);

      // 인기 종목 집계 (매수만)
      if (isBuy) {
        try {
          const today = new Date().toISOString().split('T')[0];
          const popRef = App.db.collection(CONFIG.COLLECTIONS.CONFIG).doc('popular');
          const popDoc = await popRef.get();
          let popData = popDoc.exists ? popDoc.data() : {};
          if (popData.date !== today) popData = { date: today, counts: {} };
          popData.counts[this.stock.code] = (popData.counts[this.stock.code] || 0) + 1;
          await popRef.set(popData);
        } catch (e) { /* 인기 종목 집계 실패해도 무시 */ }
      }

      // 로컬 상태 갱신
      await Auth.refreshUser();
      // 카운터도 로컬에 반영
      App.user.tradeCount = (App.user.tradeCount || 0) + 1;
      if (!isBuy) App.user.sellCount = (App.user.sellCount || 0) + 1;

      Utils.toast(
        isBuy
          ? `${this.stock.name} ${this.qty}주 매수 완료! 🎉`
          : `${this.stock.name} ${this.qty}주 매도 완료!`,
        'success'
      );

      this.close();
      Detail.close();
      AppUI.updateHeader();
      Account.render();

    } catch (e) {
      console.error('거래 오류:', e);
      Utils.toast(e.message || '거래 중 오류가 발생했어요', 'error');
    } finally {
      Utils.showLoading(false);
    }
  },

  /* 모달 닫기 */
  close() {
    document.getElementById('tradeModal').classList.remove('show');
    this.mode = null;
    this.stock = null;
  }
};
