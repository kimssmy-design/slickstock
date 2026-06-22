/* ============================================================
 *  auth.js — 로그인 / 회원가입 / 세션 관리
 * ============================================================ */

const Auth = {
  /* 로그인 */
  async login(name, password) {
    if (!name || !password) { Utils.toast('이름과 비밀번호를 입력해주세요', 'error'); return false; }
    if (password.length !== 6) { Utils.toast('비밀번호는 6자리입니다', 'error'); return false; }

    Utils.showLoading(true);
    try {
      const hash = await Utils.sha256(password);
      const col = CONFIG.COLLECTIONS.USERS;
      const doc = await App.db.collection(col).doc(name).get();

      if (!doc.exists) {
        Utils.toast('등록되지 않은 이름이에요', 'error');
        return false;
      }

      const data = doc.data();
      if (data.passwordHash !== hash) {
        Utils.toast('비밀번호가 틀렸어요', 'error');
        return false;
      }

      // 로그인 성공
      App.user = {
        id: name,
        name: data.name || name,
        balance: data.balance || 0,
        initialCapital: data.initialCapital || CONFIG.DEFAULT_CAPITAL,
        holdings: data.holdings || {},
        tradeCount: data.tradeCount || 0,
        sellCount: data.sellCount || 0,
        createdAt: data.createdAt
      };
      localStorage.setItem('sl_user', name);
      localStorage.setItem('sl_hash', hash);
      return true;

    } catch (e) {
      console.error('로그인 오류:', e);
      Utils.toast('로그인 중 오류가 발생했어요', 'error');
      return false;
    } finally {
      Utils.showLoading(false);
    }
  },

  /* 회원가입 */
  async signup(name, password) {
    if (!name || name.trim().length < 1) { Utils.toast('이름을 입력해주세요', 'error'); return false; }
    if (!password || password.length !== 6) { Utils.toast('비밀번호는 6자리 숫자로 입력해주세요', 'error'); return false; }
    if (!/^\d{6}$/.test(password)) { Utils.toast('비밀번호는 숫자 6자리만 가능해요', 'error'); return false; }

    Utils.showLoading(true);
    try {
      const trimName = name.trim();
      const hash = await Utils.sha256(password);
      const col = CONFIG.COLLECTIONS.USERS;

      // 중복 체크
      const existing = await App.db.collection(col).doc(trimName).get();
      if (existing.exists) {
        Utils.toast('이미 등록된 이름이에요', 'error');
        return false;
      }

      // 설정에서 초기자본 가져오기
      const capital = App.config.initialCapital || CONFIG.DEFAULT_CAPITAL;

      await App.db.collection(col).doc(trimName).set({
        name: trimName,
        passwordHash: hash,
        balance: capital,
        initialCapital: capital,
        holdings: {},
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // 바로 로그인
      App.user = {
        id: trimName,
        name: trimName,
        balance: capital,
        initialCapital: capital,
        holdings: {},
        createdAt: new Date()
      };
      localStorage.setItem('sl_user', trimName);
      localStorage.setItem('sl_hash', hash);

      Utils.toast('가입 완료! 환영해요 🎉', 'success');
      return true;

    } catch (e) {
      console.error('회원가입 오류:', e);
      Utils.toast('가입 중 오류가 발생했어요', 'error');
      return false;
    } finally {
      Utils.showLoading(false);
    }
  },

  /* 자동 로그인 (세션 복원) */
  async tryAutoLogin() {
    const name = localStorage.getItem('sl_user');
    const hash = localStorage.getItem('sl_hash');
    if (!name || !hash) return false;

    try {
      const doc = await App.db.collection(CONFIG.COLLECTIONS.USERS).doc(name).get();
      if (!doc.exists) return false;
      const data = doc.data();
      if (data.passwordHash !== hash) return false;

      App.user = {
        id: name,
        name: data.name || name,
        balance: data.balance || 0,
        initialCapital: data.initialCapital || CONFIG.DEFAULT_CAPITAL,
        holdings: data.holdings || {},
        tradeCount: data.tradeCount || 0,
        sellCount: data.sellCount || 0,
        createdAt: data.createdAt
      };
      return true;
    } catch (e) {
      console.error('자동 로그인 실패:', e);
      return false;
    }
  },

  /* 로그아웃 */
  logout() {
    // Firestore 리스너 해제
    App.unsubscribers.forEach(fn => fn());
    App.unsubscribers = [];
    App.user = null;
    App.adminUnlocked = false;
    localStorage.removeItem('sl_user');
    localStorage.removeItem('sl_hash');
  },

  /* 사용자 데이터 새로고침 */
  async refreshUser() {
    if (!App.user) return;
    try {
      const doc = await App.db.collection(CONFIG.COLLECTIONS.USERS).doc(App.user.id).get();
      if (doc.exists) {
        const data = doc.data();
        App.user.balance = data.balance || 0;
        App.user.initialCapital = data.initialCapital || CONFIG.DEFAULT_CAPITAL;
        App.user.holdings = data.holdings || {};
        App.user.tradeCount = data.tradeCount || 0;
        App.user.sellCount = data.sellCount || 0;
      }
    } catch (e) {
      console.error('사용자 새로고침 오류:', e);
    }
  }
};
