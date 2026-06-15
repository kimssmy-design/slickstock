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
        let investTotal = 0;

        for (const [code, h] of Object.entries(holdings)) {
          const stock = App.stocks.find(s => s.code === code);
          if (stock && h.qty > 0) {
            investTotal += h.qty * stock.price;
          }
        }

        const totalAsset = (data.balance || 0) + investTotal;
        const initial = data.initialCapital || CONFIG.DEFAULT_CAPITAL;
        const pnl = totalAsset - initial;
        const pnlPct = initial > 0 ? (pnl / initial * 100) : 0;

        users.push({
          name: data.name || doc.id,
          totalAsset,
          pnl,
          pnlPct,
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
            <div class="rank-total">${Utils.formatWon(u.totalAsset)}</div>
          </div>
          <div class="rank-rate ${Utils.dir(u.pnlPct)}">${Utils.formatPct(u.pnlPct)}</div>
        </div>`;
      }).join('');

      el.innerHTML = `
        <div style="text-align:center;padding:8px 0 4px;font-size:14px;color:var(--text2);">
          슬쩍 모의투자 수익률 랭킹
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
