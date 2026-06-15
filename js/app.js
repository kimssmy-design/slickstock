/* ============================================================
 *  app.js — 메인 앱 컨트롤러 (초기화, 라우팅, UI 갱신)
 * ============================================================ */

const AppUI = {
  currentTab: 'exchange',
  isSignupMode: false,

  /* ── 앱 초기화 ── */
  async init() {
    // Firebase 초기화
    firebase.initializeApp(firebaseConfig);
    App.db = firebase.firestore();

    // 설정 로드
    try {
      const cfgDoc = await App.db.collection(CONFIG.COLLECTIONS.CONFIG).doc('settings').get();
      if (cfgDoc.exists) {
        const d = cfgDoc.data();
        App.config.adminPin = d.adminPin || CONFIG.DEFAULT_ADMIN_PIN;
        App.config.initialCapital = d.initialCapital || CONFIG.DEFAULT_CAPITAL;
        App.config.marketOverride = d.marketOverride != null ? d.marketOverride : null;
      }
    } catch (e) {
      console.error('설정 로드 실패:', e);
    }

    // 자동 로그인 시도
    Utils.showLoading(true);
    const autoLogin = await Auth.tryAutoLogin();
    Utils.showLoading(false);

    if (autoLogin) {
      this.enterApp();
    } else {
      document.getElementById('loginPage').classList.remove('hidden');
    }

    // 이벤트 바인딩
    this.bindEvents();
  },

  /* ── 이벤트 바인딩 ── */
  bindEvents() {
    // 로그인/회원가입 폼
    document.getElementById('authBtn').addEventListener('click', () => this.handleAuth());
    document.getElementById('pwInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAuth();
    });

    // 로그인 ↔ 회원가입 전환
    document.getElementById('toggleAuth').addEventListener('click', () => {
      this.isSignupMode = !this.isSignupMode;
      document.getElementById('authBtn').textContent = this.isSignupMode ? '회원가입' : '로그인';
      document.getElementById('toggleAuthLabel').textContent = this.isSignupMode ? '이미 계정이 있다면?' : '처음이라면?';
      document.getElementById('toggleAuth').textContent = this.isSignupMode ? '로그인' : '회원가입';
    });

    // 정렬 탭
    document.querySelectorAll('.sort-tab').forEach(tab => {
      tab.addEventListener('click', () => Exchange.setSort(tab.dataset.sort, tab));
    });
  },

  /* ── 로그인/회원가입 처리 ── */
  async handleAuth() {
    const name = document.getElementById('nameInput').value.trim();
    const pw = document.getElementById('pwInput').value;

    let success;
    if (this.isSignupMode) {
      success = await Auth.signup(name, pw);
    } else {
      success = await Auth.login(name, pw);
    }

    if (success) this.enterApp();
  },

  /* ── 앱 진입 ── */
  enterApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').style.display = 'block';

    // 헤더 업데이트
    this.updateHeader();
    this.updateMarketStatus();

    // Firestore 리스너 시작
    Exchange.listen();

    // 사용자 데이터 실시간 리스너
    const userUnsub = App.db.collection(CONFIG.COLLECTIONS.USERS)
      .doc(App.user.id)
      .onSnapshot(doc => {
        if (doc.exists) {
          const d = doc.data();
          App.user.balance = d.balance || 0;
          App.user.holdings = d.holdings || {};
          App.user.initialCapital = d.initialCapital || CONFIG.DEFAULT_CAPITAL;
          this.updateHeader();
          if (this.currentTab === 'account') Account.render();
        }
      });
    App.unsubscribers.push(userUnsub);

    // 시장 상태 주기적 업데이트 (1분마다)
    this._marketTimer = setInterval(() => this.updateMarketStatus(), 60000);

    // 실시간 시세 자동 연동 (5분마다)
    if (PriceFetch.isConfigured()) {
      PriceFetch.startAutoFetch(5);
    }

    // 기본 탭 렌더
    this.switchTab('account');

    // 공지 팝업 (다신 보지 않기 체크)
    if (!localStorage.getItem('sl_notice_dismissed')) {
      document.getElementById('noticePopup').classList.add('show');
    }
  },

  /* ── 공지 팝업 닫기 ── */
  closeNotice(neverAgain) {
    document.getElementById('noticePopup').classList.remove('show');
    if (neverAgain) {
      localStorage.setItem('sl_notice_dismissed', 'true');
    }
  },

  /* ── 로그아웃 ── */
  logout() {
    if (this._marketTimer) clearInterval(this._marketTimer);
    PriceFetch.stopAutoFetch();
    Auth.logout();
    document.getElementById('mainApp').style.display = 'none';
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('nameInput').value = '';
    document.getElementById('pwInput').value = '';
    this.isSignupMode = false;
    document.getElementById('authBtn').textContent = '로그인';
    document.getElementById('toggleAuthLabel').textContent = '처음이라면?';
    document.getElementById('toggleAuth').textContent = '회원가입';
  },

  /* ── 탭 전환 ── */
  switchTab(tab, el) {
    this.currentTab = tab;

    // 페이지 전환
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-' + tab).classList.add('active');

    // 탭바 활성화
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    if (el) {
      el.classList.add('active');
    } else {
      document.querySelector(`.tab-item[data-tab="${tab}"]`)?.classList.add('active');
    }

    // 헤더 타이틀
    const titles = { exchange: '거래소', account: '내 계좌', ranking: '랭킹', admin: '관리자' };
    document.getElementById('headerTitle').textContent = titles[tab];

    // 탭별 렌더링
    switch (tab) {
      case 'exchange': Exchange.render(); break;
      case 'account': Account.render(); break;
      case 'ranking': Ranking.render(); break;
      case 'admin': Admin.render(); break;
    }
  },

  /* ── 관리자 탭 (PIN 체크) ── */
  handleAdminTab(el) {
    if (App.adminUnlocked) {
      this.switchTab('admin', el);
    } else {
      Admin.openPin(() => this.switchTab('admin', el));
    }
  },

  /* ── 헤더 업데이트 ── */
  updateHeader() {
    if (!App.user) return;
    const nameEl = document.getElementById('headerUserName');
    const balEl = document.getElementById('headerBalance');
    if (nameEl) nameEl.textContent = App.user.name;
    if (balEl) balEl.textContent = Utils.formatWon(App.user.balance);
  },

  /* ── 시장 상태 표시 업데이트 ── */
  updateMarketStatus() {
    App.marketOpen = Utils.isMarketHours();
    const dot = document.getElementById('marketDot');
    const label = document.getElementById('marketLabel');
    if (dot && label) {
      if (App.marketOpen) {
        dot.className = 'market-dot open';
        label.textContent = '장 운영중 · 16:30 마감';
      } else {
        dot.className = 'market-dot closed';
        label.textContent = '장 마감';
      }
    }
  }
};

/* ── 앱 시작 ── */
document.addEventListener('DOMContentLoaded', () => AppUI.init());
