/* ============================================================
 *  chart.js — 주가 차트 (주간 / 월간 / 연간)
 *  Canvas API로 직접 그리기 (외부 라이브러리 없음)
 * ============================================================ */

const Chart = {
  currentPeriod: 'week',
  cache: {},  // { "005930_week": [prices...] }

  /* 차트 HTML 삽입용 */
  getHTML(stockCode) {
    return `
      <div class="chart-card">
        <div class="chart-tabs">
          <button class="chart-tab active" data-period="week" onclick="Chart.switchPeriod('${stockCode}','week',this)">1주</button>
          <button class="chart-tab" data-period="month" onclick="Chart.switchPeriod('${stockCode}','month',this)">1개월</button>
          <button class="chart-tab" data-period="year" onclick="Chart.switchPeriod('${stockCode}','year',this)">1년</button>
        </div>
        <div class="chart-wrap">
          <canvas id="priceChart" width="760" height="320"></canvas>
          <div class="chart-range" id="chartRange"></div>
        </div>
        <div class="chart-summary" id="chartSummary"></div>
      </div>`;
  },

  /* 기간 전환 */
  switchPeriod(code, period, el) {
    this.currentPeriod = period;
    document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    this.draw(code);
  },

  /* 차트 그리기 메인 */
  draw(stockCode) {
    const stock = App.stocks.find(s => s.code === stockCode);
    if (!stock) return;

    const canvas = document.getElementById('priceChart');
    if (!canvas) return;

    const prices = this.generateHistory(stock, this.currentPeriod);
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // 고해상도 캔버스
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = 160 * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = '160px';
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = 160;
    const padL = 8, padR = 8, padT = 16, padB = 24;

    ctx.clearRect(0, 0, w, h);

    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || 1;

    const firstPrice = prices[0];
    const lastPrice = prices[prices.length - 1];
    const isUp = lastPrice >= firstPrice;
    const color = isUp ? '#FF3B30' : '#007AFF';

    // 보조선 (가로 3줄)
    ctx.strokeStyle = 'rgba(0,0,0,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const gy = padT + ((h - padT - padB) / 2) * i;
      ctx.beginPath();
      ctx.moveTo(padL, gy);
      ctx.lineTo(w - padR, gy);
      ctx.stroke();
    }

    // 메인 라인
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const points = [];
    prices.forEach((p, i) => {
      const x = padL + (i / (prices.length - 1)) * (w - padL - padR);
      const y = padT + (1 - (p - min) / range) * (h - padT - padB);
      points.push({ x, y });
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 그라디언트 채우기
    const last = points[points.length - 1];
    ctx.lineTo(last.x, h - padB);
    ctx.lineTo(points[0].x, h - padB);
    ctx.closePath();

    const grad = ctx.createLinearGradient(0, padT, 0, h - padB);
    grad.addColorStop(0, color + '18');
    grad.addColorStop(1, color + '02');
    ctx.fillStyle = grad;
    ctx.fill();

    // 현재가 점
    ctx.beginPath();
    ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(last.x, last.y, 6, 0, Math.PI * 2);
    ctx.strokeStyle = color + '40';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 범위 표시
    const rangeEl = document.getElementById('chartRange');
    if (rangeEl) {
      rangeEl.innerHTML = `
        <span>최저 ${Utils.formatWon(min)}</span>
        <span>최고 ${Utils.formatWon(max)}</span>`;
    }

    // 요약
    const diff = lastPrice - firstPrice;
    const diffPct = firstPrice > 0 ? (diff / firstPrice * 100) : 0;
    const periodLabel = { week: '1주일', month: '1개월', year: '1년' }[this.currentPeriod];
    const dir = Utils.dir(diff);

    const summaryEl = document.getElementById('chartSummary');
    if (summaryEl) {
      summaryEl.innerHTML = `
        <span style="color:var(--text2);">${periodLabel} 변동</span>
        <span class="${dir}" style="font-weight:800;">
          ${diff >= 0 ? '+' : ''}${Utils.formatWon(diff)} (${Utils.formatPct(diffPct)})
        </span>`;
    }
  },

  /* 시뮬레이션 히스토리 데이터 생성 */
  generateHistory(stock, period) {
    const key = stock.code + '_' + period;
    if (this.cache[key]) return this.cache[key];

    const days = { week: 5, month: 22, year: 250 }[period];
    const currentPrice = stock.price;

    // 종목코드 기반 시드 (일관된 차트)
    let seed = 0;
    for (let i = 0; i < stock.code.length; i++) {
      seed = seed * 31 + stock.code.charCodeAt(i);
    }
    const seededRandom = () => {
      seed = (seed * 16807 + 0) % 2147483647;
      return (seed & 0x7FFFFFFF) / 0x7FFFFFFF;
    };

    // 기간별 변동성
    const volatility = { week: 0.015, month: 0.02, year: 0.025 }[period];

    // 현재가에서 역추적
    const prices = new Array(days);
    prices[days - 1] = currentPrice;

    for (let i = days - 2; i >= 0; i--) {
      const change = (seededRandom() - 0.48) * volatility * 2;
      prices[i] = Math.round(prices[i + 1] / (1 + change));
    }

    this.cache[key] = prices;
    return prices;
  }
};
