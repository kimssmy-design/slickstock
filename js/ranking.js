/* ============================================================
 *  ranking.js — 수익률 랭킹 탭
 * ============================================================ */

const Ranking = {
  async render() {
    const el = document.getElementById('rankingContent');
    if (!el) return;

    try {
      // 모든 사용자 데이터 가져오기
      const snap = await App.db.collection(CONFIG.COLLECTIONS.USERS).get();
      const users = [];

      snap.forEach(doc => {
        const data = doc.data();
        const holdings = data.holdings || {};
        let totalCost = 0;    // 매수 원가 합계
        let totalValue = 0;   // 현재 평가액 합계

        for (const [code, h] of Object.entries(holdings)) {
          const stock = App.stocks.find(s => s.code === code);
          if (stock && h.qty > 0) {
            totalCost += h.qty * h.avgPrice;
            totalValue += h.qty * stock.price;
          }
        }

        // 보유 종목 수익률 (시드머니/추가금 무관, 순수 주가 상승률)
        const pnl = totalValue - totalCost;
        const pnlPct = totalCost > 0 ? (pnl / totalCost * 100) : 0;

        users.push({
          name: data.name || doc.id,
          totalValue,
          totalCost,
          pnl,
          pnlPct,
          holdingCount: Object.keys(holdings).length,
          isMe: App.user && doc.id === App.user.id
        });
      });

      // 수익률 순으로 정렬
      users.sort((a, b) => b.pnlPct - a.pnlPct);

      if (users.length === 0) {
        el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2);">아직 참가자가 없어요</div>';
        return;
      }

      // 포디엄 (1~3위)
      let podiumHtml = '';
      if (users.length >= 3) {
        const medals = ['🥇', '🥈', '🥉'];
        const orders = [
          { idx: 1, cls: 'second' },
          { idx: 0, cls: 'first' },
          { idx: 2, cls: 'third' }
        ];
        podiumHtml = `<div class="rank-podium">
          ${orders.map(o => {
            const u = users[o.idx];
            return `<div class="podium-item ${o.cls} ${u.isMe ? 'me' : ''}">
              <div class="podium-medal">${medals[o.idx]}</div>
              <div class="podium-name">${Utils.esc(u.name)}</div>
              <div class="podium-rate ${Utils.dir(u.pnlPct)}">${Utils.formatPct(u.pnlPct)}</div>
            </div>`;
          }).join('')}
        </div>`;
      }

      // 4위 이하 리스트 (또는 3명 미만일 때 전체)
      const startIdx = users.length >= 3 ? 3 : 0;
      const listHtml = users.slice(startIdx).map((u, i) => {
        const rank = startIdx + i + 1;
        return `<div class="rank-item ${u.isMe ? 'me' : ''}">
          <div class="rank-num">${rank}</div>
          <div class="rank-info">
            <div class="rank-name">${Utils.esc(u.name)} ${u.isMe ? '(나)' : ''}</div>
            <div class="rank-total">${u.totalCost > 0 ? Utils.formatWon(u.pnl) : '미투자'}</div>
          </div>
          <div class="rank-rate ${Utils.dir(u.pnlPct)}">${Utils.formatPct(u.pnlPct)}</div>
        </div>`;
      }).join('');

      el.innerHTML = `
        <div style="text-align:center;padding:8px 0 4px;">
          <div style="font-size:14px;color:var(--text2);">슬쩍 모의투자 수익률 랭킹</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px;">보유 종목 평가손익 기준 (시드머니 무관)</div>
        </div>
        ${podiumHtml}
        ${listHtml}
      `;

    } catch (e) {
      console.error('랭킹 로드 오류:', e);
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text2);">랭킹을 불러오지 못했어요</div>';
    }
  }
};
