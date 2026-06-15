/* ============================================================
 *  admin.js — 관리자 패널 (PIN, 회원관리, 종목관리, 시장제어)
 * ============================================================ */

const Admin = {
  pinCode: '',

  /* ── PIN 모달 ── */
  openPin(callback) {
    this.pinCode = '';
    this._pinCallback = callback;
    this.updatePinDots();
    document.getElementById('pinOverlay').classList.add('show');
  },

  closePin() {
    document.getElementById('pinOverlay').classList.remove('show');
    this.pinCode = '';
  },

  pinInput(n) {
    if (this.pinCode.length >= 6) return;
    this.pinCode += n;
    this.updatePinDots();

    if (this.pinCode.length === 6) {
      setTimeout(() => {
        if (this.pinCode === App.config.adminPin) {
          App.adminUnlocked = true;
          this.closePin();
          if (this._pinCallback) this._pinCallback();
        } else {
          // 에러 애니메이션
          document.querySelectorAll('.pin-dot').forEach(d => {
            d.classList.remove('filled');
            d.classList.add('error');
          });
          Utils.toast('비밀번호가 틀렸어요', 'error');
          setTimeout(() => { this.pinCode = ''; this.updatePinDots(); }, 500);
        }
      }, 150);
    }
  },

  pinDelete() {
    this.pinCode = this.pinCode.slice(0, -1);
    this.updatePinDots();
  },

  updatePinDots() {
    document.querySelectorAll('.pin-dot').forEach((d, i) => {
      d.classList.remove('filled', 'error');
      if (i < this.pinCode.length) d.classList.add('filled');
    });
  },

  /* ── 관리자 탭 렌더링 ── */
  async render() {
    const el = document.getElementById('adminContent');
    if (!el) return;

    // 설정 로드
    await this.loadConfig();

    const marketStatus = Utils.isMarketHours();
    const override = App.config.marketOverride;
    let marketLabel = marketStatus ? '🟢 장 운영중' : '🔴 장 마감';
    if (override === true) marketLabel = '🟡 강제 개장';
    if (override === false) marketLabel = '🟡 강제 폐장';

    el.innerHTML = `
      <!-- 시장 제어 -->
      <div class="admin-card">
        <div class="admin-card-title">⚡ 시장 제어</div>
        <div style="text-align:center;margin-bottom:10px;font-size:15px;font-weight:700;">${marketLabel}</div>
        <div style="display:flex;gap:8px;">
          <button class="admin-btn" style="flex:1;background:var(--green);" onclick="Admin.setMarket(true)">장 열기</button>
          <button class="admin-btn red" style="flex:1;" onclick="Admin.setMarket(false)">장 닫기</button>
          <button class="admin-btn" style="flex:1;background:var(--text2);" onclick="Admin.setMarket(null)">자동</button>
        </div>
        <div style="margin-top:8px;">
          <button class="admin-btn blue" style="width:100%;" onclick="Admin.updatePrices()">
            ${PriceFetch.isConfigured() ? '📡 실시간 시세 가져오기' : '📡 주가 업데이트 (시뮬레이션)'}
          </button>
        </div>
        ${PriceFetch.isConfigured()
          ? '<div style="font-size:12px;color:var(--green);margin-top:6px;">✅ 실시간 시세 연동 활성화 (5분 자동)</div>'
          : '<div style="font-size:12px;color:var(--text2);margin-top:6px;">⚠️ config.js에 Google Sheets URL을 설정하면 실시간 연동됩니다</div>'
        }
        ${PriceFetch.lastUpdate
          ? '<div style="font-size:11px;color:var(--text3);margin-top:2px;">마지막 업데이트: ' + PriceFetch.lastUpdate.toLocaleTimeString('ko-KR') + '</div>'
          : ''
        }
      </div>

      <!-- 초기 데이터 로드 -->
      <div class="admin-card">
        <div class="admin-card-title">📦 초기 데이터</div>
        <div style="display:flex;gap:8px;">
          <button class="admin-btn" style="flex:1;" onclick="Admin.loadInitialStocks()">종목 데이터 로드 (${STOCK_DATA.length}개)</button>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-top:6px;">처음 세팅할 때만 사용. 기존 종목은 덮어쓰지 않아요.</div>
      </div>

      <!-- 회원 관리 -->
      <div class="admin-card" id="adminUsers">
        <div class="admin-card-title">👥 회원 관리</div>
        <div style="text-align:center;padding:10px;color:var(--text2);">로딩 중...</div>
      </div>

      <!-- 종목 관리 -->
      <div class="admin-card">
        <div class="admin-card-title">📊 종목 관리 (${App.stocks.length}개)</div>
        <div style="display:flex;gap:8px;margin-bottom:10px;">
          <button class="admin-btn" style="flex:1;" onclick="Admin.showAddStock()">종목 추가</button>
          <button class="admin-btn red" style="flex:1;" onclick="Admin.showRemoveStock()">종목 삭제</button>
        </div>
        <div id="adminStockForm"></div>
      </div>

      <!-- 초기 자본 설정 -->
      <div class="admin-card">
        <div class="admin-card-title">💰 초기 자본 설정</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <span style="font-size:14px;color:var(--text2);">신규 가입 시</span>
          <input type="number" id="initialCapitalInput" value="${App.config.initialCapital}"
            style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);font-size:16px;font-weight:700;font-family:inherit;">
          <button class="admin-btn orange" onclick="Admin.saveInitialCapital()">저장</button>
        </div>
      </div>

      <!-- 관리자 PIN 변경 -->
      <div class="admin-card">
        <div class="admin-card-title">🔒 관리자 PIN 변경</div>
        <div style="display:flex;align-items:center;gap:10px;">
          <input type="password" id="newPinInput" maxlength="6" inputmode="numeric" placeholder="새 PIN 6자리"
            style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--border);background:var(--bg);font-size:16px;font-family:inherit;">
          <button class="admin-btn orange" onclick="Admin.savePin()">변경</button>
        </div>
      </div>
    `;

    // 회원 목록 비동기 로드
    this.loadUsers();
  },

  /* 설정 로드 */
  async loadConfig() {
    try {
      const doc = await App.db.collection(CONFIG.COLLECTIONS.CONFIG).doc('settings').get();
      if (doc.exists) {
        const d = doc.data();
        App.config.adminPin = d.adminPin || CONFIG.DEFAULT_ADMIN_PIN;
        App.config.initialCapital = d.initialCapital || CONFIG.DEFAULT_CAPITAL;
        App.config.marketOverride = d.marketOverride != null ? d.marketOverride : null;
      }
    } catch (e) {
      console.error('설정 로드 오류:', e);
    }
  },

  /* 회원 목록 로드 */
  async loadUsers() {
    const el = document.getElementById('adminUsers');
    if (!el) return;

    try {
      const snap = await App.db.collection(CONFIG.COLLECTIONS.USERS).get();
      const users = [];
      snap.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });

      el.innerHTML = `
        <div class="admin-card-title">👥 회원 관리 (${users.length}명)</div>
        ${users.map(u => `
          <div class="admin-user-row">
            <div>
              <div class="admin-user-name">${Utils.esc(u.name || u.id)}</div>
              <div class="admin-user-bal">잔고 ${Utils.formatWon(u.balance)}</div>
            </div>
            <div style="display:flex;gap:6px;">
              <button class="admin-btn" style="background:var(--down);padding:6px 10px;font-size:12px;" onclick="Admin.resetPassword('${Utils.esc(u.id)}')">비번</button>
              <button class="admin-btn orange" onclick="Admin.giveCapital('${Utils.esc(u.id)}')">추가금</button>
              <button class="admin-btn red" onclick="Admin.resetUser('${Utils.esc(u.id)}')">초기화</button>
            </div>
          </div>`).join('')}
      `;
    } catch (e) {
      el.innerHTML = '<div class="admin-card-title">👥 회원 관리</div><div style="color:var(--text2);padding:10px;">로드 실패</div>';
    }
  },

  /* 추가금 지급 */
  async giveCapital(userId) {
    const amount = prompt(`${userId}에게 추가금 지급 (원):`, '1000000');
    if (!amount || isNaN(Number(amount))) return;

    Utils.showLoading(true);
    try {
      await App.db.collection(CONFIG.COLLECTIONS.USERS).doc(userId).update({
        balance: firebase.firestore.FieldValue.increment(Number(amount))
      });
      Utils.toast(`${userId}에게 ${Utils.formatWon(Number(amount))} 지급 완료`, 'success');
      this.loadUsers();
      if (App.user && App.user.id === userId) await Auth.refreshUser();
    } catch (e) {
      Utils.toast('지급 실패: ' + e.message, 'error');
    } finally {
      Utils.showLoading(false);
    }
  },

  /* 사용자 초기화 */
  async resetUser(userId) {
    if (!confirm(`${userId}의 잔고와 보유종목을 모두 초기화할까요?`)) return;

    Utils.showLoading(true);
    try {
      await App.db.collection(CONFIG.COLLECTIONS.USERS).doc(userId).update({
        balance: App.config.initialCapital,
        holdings: {}
      });
      Utils.toast(`${userId} 초기화 완료`, 'success');
      this.loadUsers();
      if (App.user && App.user.id === userId) await Auth.refreshUser();
    } catch (e) {
      Utils.toast('초기화 실패', 'error');
    } finally {
      Utils.showLoading(false);
    }
  },

  /* 비밀번호 재설정 */
  async resetPassword(userId) {
    const newPw = prompt(`${userId}의 새 비밀번호 (숫자 6자리):`, '');
    if (!newPw) return;
    if (!/^\d{6}$/.test(newPw)) {
      Utils.toast('숫자 6자리로 입력해주세요', 'error');
      return;
    }

    Utils.showLoading(true);
    try {
      const hash = await Utils.sha256(newPw);
      await App.db.collection(CONFIG.COLLECTIONS.USERS).doc(userId).update({
        passwordHash: hash
      });
      Utils.toast(`${userId} 비밀번호 변경 완료`, 'success');
    } catch (e) {
      Utils.toast('비밀번호 변경 실패', 'error');
    } finally {
      Utils.showLoading(false);
    }
  },

  /* 시장 제어 */
  async setMarket(override) {
    try {
      await App.db.collection(CONFIG.COLLECTIONS.CONFIG).doc('settings').set(
        { marketOverride: override },
        { merge: true }
      );
      App.config.marketOverride = override;
      AppUI.updateMarketStatus();
      this.render();
      Utils.toast(
        override === true ? '장이 열렸어요!' :
        override === false ? '장이 닫혔어요' :
        '자동 모드로 전환', 'success'
      );
    } catch (e) {
      Utils.toast('시장 제어 실패', 'error');
    }
  },

  /* 초기 자본 저장 */
  async saveInitialCapital() {
    const val = Number(document.getElementById('initialCapitalInput').value);
    if (!val || val < 100000) { Utils.toast('최소 10만원 이상 설정해주세요', 'error'); return; }

    try {
      await App.db.collection(CONFIG.COLLECTIONS.CONFIG).doc('settings').set(
        { initialCapital: val },
        { merge: true }
      );
      App.config.initialCapital = val;
      Utils.toast('초기 자본 저장 완료', 'success');
    } catch (e) {
      Utils.toast('저장 실패', 'error');
    }
  },

  /* PIN 변경 */
  async savePin() {
    const pin = document.getElementById('newPinInput').value;
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      Utils.toast('6자리 숫자로 입력해주세요', 'error'); return;
    }
    try {
      await App.db.collection(CONFIG.COLLECTIONS.CONFIG).doc('settings').set(
        { adminPin: pin },
        { merge: true }
      );
      App.config.adminPin = pin;
      Utils.toast('PIN 변경 완료', 'success');
    } catch (e) {
      Utils.toast('PIN 변경 실패', 'error');
    }
  },

  /* ── 종목 추가 폼 ── */
  showAddStock() {
    document.getElementById('adminStockForm').innerHTML = `
      <div style="background:var(--bg);border-radius:12px;padding:14px;margin-top:8px;">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;">종목 추가</div>
        <input id="addStockCode" placeholder="종목코드 (예: 005930)" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-bottom:6px;font-family:inherit;background:#fff;">
        <input id="addStockName" placeholder="종목명 (예: 삼성전자)" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-bottom:6px;font-family:inherit;background:#fff;">
        <input id="addStockPrice" type="number" placeholder="현재가 (예: 69900)" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-bottom:6px;font-family:inherit;background:#fff;">
        <input id="addStockEmoji" placeholder="이모지 (예: 📱)" maxlength="4" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-bottom:6px;font-family:inherit;background:#fff;">
        <textarea id="addStockDesc" placeholder="한줄 설명" rows="2" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border);margin-bottom:8px;font-family:inherit;resize:none;background:#fff;"></textarea>
        <button class="admin-btn" style="width:100%;" onclick="Admin.addStock()">추가하기</button>
      </div>`;
  },

  async addStock() {
    const code = document.getElementById('addStockCode').value.trim();
    const name = document.getElementById('addStockName').value.trim();
    const price = Number(document.getElementById('addStockPrice').value);
    const emoji = document.getElementById('addStockEmoji').value.trim() || '🏢';
    const oneliner = document.getElementById('addStockDesc').value.trim() || '';

    if (!code || !name || !price) { Utils.toast('필수 항목을 입력해주세요', 'error'); return; }

    Utils.showLoading(true);
    try {
      await App.db.collection(CONFIG.COLLECTIONS.STOCKS).doc(code).set({
        code, name, price, emoji, oneliner,
        desc: oneliner,
        prevClose: price,
        change: 0, changePct: 0,
        volume: 0,
        keywords: [],
        sector: '',
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      Utils.toast(`${name} 추가 완료`, 'success');
      document.getElementById('adminStockForm').innerHTML = '';
    } catch (e) {
      Utils.toast('종목 추가 실패', 'error');
    } finally {
      Utils.showLoading(false);
    }
  },

  /* 종목 삭제 */
  showRemoveStock() {
    const list = App.stocks.map(s =>
      `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:13px;">${Utils.esc(s.name)} (${s.code})</span>
        <button class="admin-btn red" style="padding:4px 10px;font-size:12px;" onclick="Admin.removeStock('${s.code}','${Utils.esc(s.name)}')">삭제</button>
      </div>`
    ).join('');

    document.getElementById('adminStockForm').innerHTML = `
      <div style="background:var(--bg);border-radius:12px;padding:14px;margin-top:8px;max-height:300px;overflow-y:auto;">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;">종목 삭제</div>
        ${list}
      </div>`;
  },

  async removeStock(code, name) {
    if (!confirm(`${name}(${code})을 삭제할까요?`)) return;
    try {
      await App.db.collection(CONFIG.COLLECTIONS.STOCKS).doc(code).delete();
      Utils.toast(`${name} 삭제 완료`, 'success');
      this.showRemoveStock();
    } catch (e) {
      Utils.toast('삭제 실패', 'error');
    }
  },

  /* ── 초기 종목 데이터 Firestore 로드 ── */
  async loadInitialStocks() {
    if (!confirm(`${STOCK_DATA.length}개 종목을 Firestore에 로드할까요?\n(기존 동일 코드 종목은 건너뜁니다)`)) return;

    Utils.showLoading(true);
    let added = 0, skipped = 0;

    try {
      const batch = App.db.batch();
      const existing = new Set();

      // 기존 종목 코드 수집
      const snap = await App.db.collection(CONFIG.COLLECTIONS.STOCKS).get();
      snap.forEach(doc => existing.add(doc.id));

      for (const s of STOCK_DATA) {
        if (existing.has(s.code)) { skipped++; continue; }

        const ref = App.db.collection(CONFIG.COLLECTIONS.STOCKS).doc(s.code);
        batch.set(ref, {
          code: s.code,
          name: s.name,
          price: s.price,
          prevClose: s.price,
          change: 0,
          changePct: 0,
          volume: 0,
          emoji: s.emoji || '🏢',
          oneliner: s.oneliner || '',
          desc: s.desc || '',
          keywords: s.keywords || [],
          sector: s.sector || '',
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        added++;
      }

      if (added > 0) await batch.commit();

      // 설정도 초기화
      const cfgRef = App.db.collection(CONFIG.COLLECTIONS.CONFIG).doc('settings');
      const cfgDoc = await cfgRef.get();
      if (!cfgDoc.exists) {
        await cfgRef.set({
          adminPin: CONFIG.DEFAULT_ADMIN_PIN,
          initialCapital: CONFIG.DEFAULT_CAPITAL,
          marketOverride: null
        });
      }

      Utils.toast(`${added}개 추가, ${skipped}개 건너뜀`, 'success');
    } catch (e) {
      console.error('초기 데이터 로드 오류:', e);
      Utils.toast('데이터 로드 실패: ' + e.message, 'error');
    } finally {
      Utils.showLoading(false);
    }
  },

  /* ── 실시간 주가 업데이트 ── */
  async updatePrices() {
    if (App.stocks.length === 0) {
      Utils.toast('종목이 없어요. 먼저 데이터를 로드해주세요.', 'error');
      return;
    }

    Utils.showLoading(true);

    // Google Sheets 연동이 설정된 경우 → 실시간 시세
    if (PriceFetch.isConfigured()) {
      try {
        const count = await PriceFetch.fetchPrices();
        if (count && count > 0) {
          Utils.toast(count + '개 종목 실시간 시세 반영! 📡', 'success');
          this.render();
        } else {
          Utils.toast('시세를 가져오지 못했어요. URL을 확인해주세요.', 'error');
        }
      } catch (e) {
        Utils.toast('시세 연동 실패: ' + e.message, 'error');
      } finally {
        Utils.showLoading(false);
      }
      return;
    }

    // 미설정 → 시뮬레이션 (랜덤 변동)
    try {
      // 시뮬레이션: 각 종목에 -5% ~ +5% 랜덤 변동 적용
      const batch = App.db.batch();

      for (const stock of App.stocks) {
        const volatility = (Math.random() - 0.48) * 0.06; // 살짝 상승 편향
        const newPrice = Math.round(stock.price * (1 + volatility));
        const prevClose = stock.price;
        const change = newPrice - prevClose;
        const changePct = prevClose > 0 ? (change / prevClose * 100) : 0;

        const ref = App.db.collection(CONFIG.COLLECTIONS.STOCKS).doc(stock.code);
        batch.update(ref, {
          price: newPrice,
          prevClose: prevClose,
          change: change,
          changePct: Math.round(changePct * 100) / 100,
          volume: Math.floor(Math.random() * 5000000) + 100000,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }

      await batch.commit();
      Utils.toast('주가 업데이트 완료! 📡', 'success');

    } catch (e) {
      console.error('주가 업데이트 오류:', e);
      Utils.toast('업데이트 실패: ' + e.message, 'error');
    } finally {
      Utils.showLoading(false);
    }
  }
};
