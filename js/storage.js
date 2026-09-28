/**
 * Storage Service - Brinca e Aprende Agenda Berçário
 * Gerencia persistência local (localStorage) de crianças, rotinas diárias e estoque de higiene.
 */

const STORAGE_KEYS = {
  CHILDREN: 'brinca_aprende_children',
  ROUTINES: 'brinca_aprende_routines',
  CURRENT_USER: 'brinca_aprende_current_user',
  USERS: 'brinca_aprende_registered_users'
};

// Nenhuma criança fake pré-cadastrada - o sistema reflete estritamente o banco de dados
const INITIAL_CHILDREN = [];

// Modelo padrão de rotina diária em branco para novo registro
function getDefaultRoutine(childId, dateStr) {
  return {
    childId: childId,
    date: dateStr,
    isRegistered: false, // Flag que indica se a educadora já iniciou ou salvou a rotina
    hygiene: {
      pomada: { ok: true, name: 'Pomada' },
      fralda: { ok: true, name: 'Fralda' },
      lenco: { ok: true, name: 'Lenço Umedecido' },
      shampoo: { ok: true, name: 'Shampoo' },
      condicionador: { ok: true, name: 'Condicionador' },
      sabonete: { ok: true, name: 'Sabonete' },
      faltaObservacao: ''
    },
    meals: [
      { id: 'm1', name: 'Café da manhã', time: '08:00', icon: '☀️', acceptance: null, description: '' },
      { id: 'm2', name: 'Leite', time: '09:30', icon: '🍼', acceptance: null, description: '' },
      { id: 'm3', name: 'Almoço', time: '11:00', icon: '🍲', acceptance: null, description: '' },
      { id: 'm4', name: 'Lanche da tarde', time: '13:00', icon: '🍎', acceptance: null, description: '' },
      { id: 'm5', name: 'Leite', time: '14:30', icon: '🍼', acceptance: null, description: '' },
      { id: 'm6', name: 'Lanche final', time: '16:30', icon: '🍪', acceptance: null, description: '' }
    ],
    diapers: {
      count: 0,
      logs: []
    },
    sleep: [],
    medication: {
      hasMedication: false,
      details: '',
      temperature: '36.5 ºC (Normal)'
    },
    mood: null,
    observations: {
      teacherNote: '',
      teacherName: ''
    },
    updatedAt: null
  };
}

class StorageService {
  constructor() {
    this.isCloudConnected = false;
    this.init();
    this.initTimeSync();
    this.setupFirestoreSync();
  }

  setupFirestoreSync() {
    if (window.FirebaseModule && window.FirebaseModule.db) {
      this.startFirestoreListeners();
    } else {
      window.addEventListener('firebase:ready', () => {
        this.startFirestoreListeners();
      });
    }
  }

  getDb() {
    return window.FirebaseModule?.db || null;
  }

  notifyCloudStatus(connected, message = '') {
    this.isCloudConnected = connected;
    window.dispatchEvent(new CustomEvent('cloud:status', { detail: { connected, message } }));
  }

  startFirestoreListeners() {
    const fb = window.FirebaseModule;
    if (!fb || !fb.db) return;
    const db = fb.db;
    const { collection, onSnapshot } = fb;

    // 1. Crianças (children)
    try {
      onSnapshot(collection(db, 'children'), async (snapshot) => {
        this.notifyCloudStatus(true);
        if (snapshot.empty) {
          localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify([]));
          window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'children', data: [] } }));
          return;
        }

        const cloudChildren = [];
        snapshot.forEach(docSnap => {
          cloudChildren.push(docSnap.data());
        });

        localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(cloudChildren));
        window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'children', data: cloudChildren } }));
      }, (err) => {
        console.warn('Aviso de conexão Firestore (children):', err.message);
        this.notifyCloudStatus(false, err.message);
      });
    } catch (e) {
      console.warn('Erro ao conectar listener Firestore children:', e);
    }

    // 2. Rotinas Diárias (routines)
    try {
      onSnapshot(collection(db, 'routines'), (snapshot) => {
        this.notifyCloudStatus(true);
        const liveRoutines = {};
        snapshot.forEach(docSnap => {
          liveRoutines[docSnap.id] = docSnap.data();
        });

        localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(liveRoutines));
        window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'routines', routines: liveRoutines } }));
      }, (err) => {
        console.warn('Aviso de conexão Firestore (routines):', err.message);
      });
    } catch (e) {
      console.warn('Erro ao conectar listener Firestore routines:', e);
    }

    // 3. Contas Desvinculadas (unlinked_accounts)
    try {
      onSnapshot(collection(db, 'unlinked_accounts'), (snapshot) => {
        const unlinked = [];
        snapshot.forEach(docSnap => {
          unlinked.push(docSnap.id.toLowerCase().trim());
        });
        localStorage.setItem('brinca_aprende_unlinked_emails', JSON.stringify(unlinked));
        window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'unlinked' } }));
      }, () => {});
    } catch (e) {}

    // 4. Contas Google (google_accounts)
    try {
      onSnapshot(collection(db, 'google_accounts'), (snapshot) => {
        const gList = [];
        snapshot.forEach(docSnap => {
          gList.push(docSnap.data());
        });
        localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(gList));
        window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'google_accounts' } }));
      }, () => {});
    } catch (e) {}

    // 5. Educadores (educators)
    try {
      onSnapshot(collection(db, 'educators'), (snapshot) => {
        const eduList = [];
        snapshot.forEach(docSnap => {
          eduList.push(docSnap.data());
        });
        localStorage.setItem('brinca_aprende_all_educators', JSON.stringify(eduList));
        window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'educators' } }));
      }, () => {});
    } catch (e) {}

    // 6. Usuários Registrados (users)
    try {
      onSnapshot(collection(db, 'users'), (snapshot) => {
        const uList = [];
        snapshot.forEach(docSnap => {
          uList.push(docSnap.data());
        });
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(uList));
        window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'users', data: uList } }));
      }, (err) => {
        console.warn('Aviso de conexão Firestore (users):', err.message);
      });
    } catch (e) {}

    // 7. Contas Excluídas Definitivamente (deleted_accounts)
    try {
      onSnapshot(collection(db, 'deleted_accounts'), (snapshot) => {
        const dList = [];
        snapshot.forEach(docSnap => {
          dList.push(docSnap.id.toLowerCase().trim());
        });
        localStorage.setItem('brinca_aprende_deleted_accounts', JSON.stringify(dList));
        window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'deleted_accounts' } }));
      }, () => {});
    } catch (e) {}
  }

  // Limpa todo o cache de dados do admin no localStorage e busca dados frescos direto do Firestore
  async clearAdminStorageAndFetchLive() {
    localStorage.removeItem(STORAGE_KEYS.CHILDREN);
    localStorage.removeItem(STORAGE_KEYS.ROUTINES);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    localStorage.removeItem('brinca_aprende_google_accounts');
    localStorage.removeItem('brinca_aprende_all_educators');
    localStorage.removeItem('brinca_aprende_unlinked_emails');

    let fb = window.FirebaseModule;
    if (!fb || !fb.db) {
      await new Promise(resolve => {
        if (window.FirebaseModule && window.FirebaseModule.db) return resolve();
        const onReady = () => {
          window.removeEventListener('firebase:ready', onReady);
          resolve();
        };
        window.addEventListener('firebase:ready', onReady);
        setTimeout(resolve, 2500);
      });
      fb = window.FirebaseModule;
    }

    if (!fb || !fb.db) {
      this.notifyCloudStatus(false, 'Módulo Firebase não conectado');
      return { success: false, reason: 'offline' };
    }

    try {
      const db = fb.db;
      const { collection, getDocs } = fb;

      // Children
      const childSnap = await getDocs(collection(db, 'children'));
      const liveChildren = [];
      childSnap.forEach(d => liveChildren.push(d.data()));
      localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(liveChildren));

      // Google Accounts
      const gSnap = await getDocs(collection(db, 'google_accounts'));
      const liveG = [];
      gSnap.forEach(d => liveG.push(d.data()));
      localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(liveG));

      // Educators
      const eduSnap = await getDocs(collection(db, 'educators'));
      const liveEdu = [];
      eduSnap.forEach(d => liveEdu.push(d.data()));
      localStorage.setItem('brinca_aprende_all_educators', JSON.stringify(liveEdu));

      // Users
      const uSnap = await getDocs(collection(db, 'users'));
      const liveUsers = [];
      uSnap.forEach(d => liveUsers.push(d.data()));
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(liveUsers));

      // Routines
      const rotSnap = await getDocs(collection(db, 'routines'));
      const liveRoutines = {};
      rotSnap.forEach(d => { liveRoutines[d.id] = d.data(); });
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(liveRoutines));

      // Deleted Accounts (para garantir que contas apagadas não retornem)
      try {
        const delSnap = await getDocs(collection(db, 'deleted_accounts'));
        const liveDel = [];
        delSnap.forEach(d => liveDel.push(d.id.toLowerCase().trim()));
        localStorage.setItem('brinca_aprende_deleted_accounts', JSON.stringify(liveDel));
      } catch {}

      // Unlinked Accounts
      try {
        const unlinkSnap = await getDocs(collection(db, 'unlinked_accounts'));
        const liveUnlink = [];
        unlinkSnap.forEach(d => liveUnlink.push(d.id.toLowerCase().trim()));
        localStorage.setItem('brinca_aprende_unlinked_emails', JSON.stringify(liveUnlink));
      } catch {}

      this.notifyCloudStatus(true);
      window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'all' } }));
      return { success: true };
    } catch (err) {
      console.warn('Erro ao consultar banco Cloud Firestore:', err.message);
      this.notifyCloudStatus(false, err.message);
      return { success: false, error: err.message };
    }
  }

  async cloudSaveChild(child) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        await fb.setDoc(fb.doc(fb.db, 'children', child.id), child, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao salvar criança no Firestore:', e);
    }
  }

  async cloudDeleteChild(childId) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        await fb.deleteDoc(fb.doc(fb.db, 'children', childId));
      }
    } catch (e) {
      console.warn('Erro ao deletar criança no Firestore:', e);
    }
  }

  async cloudSaveRoutine(childId, dateStr, routineData) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        await fb.setDoc(fb.doc(fb.db, 'routines', `${childId}_${dateStr}`), routineData, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao salvar rotina no Firestore:', e);
    }
  }

  async cloudUnlinkParent(email) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        const clean = email.toLowerCase().trim();
        await fb.setDoc(fb.doc(fb.db, 'unlinked_accounts', clean), {
          email: clean,
          unlinkedAt: new Date().toISOString()
        }, { merge: true });

        await fb.setDoc(fb.doc(fb.db, 'google_accounts', clean), {
          childId: null,
          childName: null
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao desvincular no Firestore:', e);
    }
  }

  async cloudRelinkParent(email, childId, childName) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        const clean = email.toLowerCase().trim();
        await fb.deleteDoc(fb.doc(fb.db, 'unlinked_accounts', clean));

        await fb.setDoc(fb.doc(fb.db, 'google_accounts', clean), {
          childId: childId || null,
          childName: childName || null
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao revincular no Firestore:', e);
    }
  }

  async cloudSaveEducator(educator) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        const clean = (educator.email || '').toLowerCase().trim();
        await fb.setDoc(fb.doc(fb.db, 'educators', clean), educator, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao salvar educador no Firestore:', e);
    }
  }

  async cloudDeleteEducator(email) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        const clean = email.toLowerCase().trim();
        await fb.deleteDoc(fb.doc(fb.db, 'educators', clean));
      }
    } catch (e) {
      console.warn('Erro ao deletar educador no Firestore:', e);
    }
  }

  async cloudDeleteGoogleAccount(email) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        const clean = email.toLowerCase().trim();
        await fb.deleteDoc(fb.doc(fb.db, 'google_accounts', clean));
        await fb.deleteDoc(fb.doc(fb.db, 'unlinked_accounts', clean));
      }
    } catch (e) {
      console.warn('Erro ao deletar conta Google no Firestore:', e);
    }
  }

  async cloudSaveGoogleAccount(account) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db && account && account.email) {
        const clean = account.email.toLowerCase().trim();
        await fb.setDoc(fb.doc(fb.db, 'google_accounts', clean), account, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao salvar conta Google no Firestore:', e);
    }
  }

  async cloudSaveUser(user) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db && user && user.email) {
        const clean = user.email.toLowerCase().trim();
        await fb.setDoc(fb.doc(fb.db, 'users', clean), user, { merge: true });
      }
    } catch (e) {
      console.warn('Erro ao salvar usuário no Firestore:', e);
    }
  }

  async cloudDeleteUser(email) {
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db && email) {
        const clean = email.toLowerCase().trim();
        await fb.deleteDoc(fb.doc(fb.db, 'users', clean));
      }
    } catch (e) {
      console.warn('Erro ao deletar usuário no Firestore:', e);
    }
  }

  async cloudDeleteChildRoutines(childId) {
    if (!childId) return;
    try {
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        const { collection, getDocs, deleteDoc, doc } = fb;
        const snap = await getDocs(collection(fb.db, 'routines'));
        const deletePromises = [];
        snap.forEach(d => {
          const data = d.data();
          if (data.childId === childId || d.id.startsWith(`${childId}_`)) {
            deletePromises.push(deleteDoc(doc(fb.db, 'routines', d.id)));
          }
        });
        await Promise.all(deletePromises);
      }
    } catch (e) {
      console.warn('Erro ao deletar rotinas da criança no Firestore:', e);
    }
  }

  deleteLocalChildRoutines(childId) {
    if (!childId) return;
    try {
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES) || '{}');
      let changed = false;
      for (const key of Object.keys(allRoutines)) {
        if (key.startsWith(`${childId}_`) || allRoutines[key]?.childId === childId) {
          delete allRoutines[key];
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(allRoutines));
      }
    } catch {}
  }

  async cloudMarkAccountDeleted(email) {
    if (!email) return;
    const clean = email.toLowerCase().trim();
    try {
      const deleted = JSON.parse(localStorage.getItem('brinca_aprende_deleted_accounts') || '[]');
      if (!deleted.includes(clean)) {
        deleted.push(clean);
        localStorage.setItem('brinca_aprende_deleted_accounts', JSON.stringify(deleted));
      }
      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        await fb.setDoc(fb.doc(fb.db, 'deleted_accounts', clean), {
          email: clean,
          deletedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn('Erro ao marcar conta como excluída no Firestore:', e);
    }
  }

  async cloudUnmarkAccountDeleted(email) {
    if (!email) return;
    const clean = email.toLowerCase().trim();
    try {
      const deleted = JSON.parse(localStorage.getItem('brinca_aprende_deleted_accounts') || '[]');
      const filtered = deleted.filter(e => e !== clean);
      localStorage.setItem('brinca_aprende_deleted_accounts', JSON.stringify(filtered));

      const fb = window.FirebaseModule;
      if (fb && fb.db) {
        await fb.deleteDoc(fb.doc(fb.db, 'deleted_accounts', clean));
      }
    } catch {}
  }

  init() {
    try {
      // Limpeza de crianças fake legadas se existirem no localStorage
      const rawChildren = localStorage.getItem(STORAGE_KEYS.CHILDREN);
      if (rawChildren !== null) {
        let children = JSON.parse(rawChildren || '[]');
        const filtered = children.filter(c => c.id !== 'child_1' && c.id !== 'child_2' && c.id !== 'child_3' && c.id !== 'child_4' && !c.name?.startsWith('Bebê de '));
        if (filtered.length !== children.length) {
          localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(filtered));
        }
      }

      // Limpeza de rotinas fakes pré-existentes de demonstração
      try {
        const storedRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES) || '{}');
        let routinesCleaned = false;
        for (const [key, rot] of Object.entries(storedRoutines)) {
          if (!rot.isRegistered ||
              rot.observations?.teacherNote?.includes('piscina de bolinhas') ||
              rot.observations?.teacherNote?.includes('blocos pedagógicos') ||
              rot.hygiene?.faltaObservacao?.includes('trazer novo pacote de fraldas')) {
            delete storedRoutines[key];
            routinesCleaned = true;
          }
        }
        if (routinesCleaned) {
          localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(storedRoutines));
        }
      } catch {}
    } catch (e) {
      console.warn('Erro ao inicializar StorageService:', e);
    }
  }


  // Sincronização de Data e Hora com a Internet (previne conflitos caso o relógio do aparelho esteja errado)
  initTimeSync() {
    this.timeOffset = 0;
    this._lastKnownToday = null;
    try {
      const savedOffset = localStorage.getItem('brinca_aprende_network_time_offset');
      if (savedOffset !== null) {
        this.timeOffset = parseInt(savedOffset, 10) || 0;
      }
    } catch {}

    // Sincronização inicial imediata
    this.syncNetworkTime();

    // Re-sincroniza ao recuperar conexão com a internet ou focar a aba
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.syncNetworkTime());
      window.addEventListener('focus', () => this.syncNetworkTime());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.syncNetworkTime();
        }
      });
      // Verificação periódica a cada 10 minutos
      setInterval(() => this.syncNetworkTime(), 10 * 60 * 1000);
    }
  }

  async syncNetworkTime() {
    try {
      // Método 1: Leitura do header Date HTTP do servidor (ultra rápido, sem CORS, hora exata do servidor)
      const res = await fetch(window.location.origin + window.location.pathname + '?_nt=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store'
      });
      const serverDateStr = res.headers.get('date');
      if (serverDateStr) {
        const serverTime = new Date(serverDateStr).getTime();
        if (!isNaN(serverTime)) {
          this.applyTimeOffset(serverTime - Date.now());
          return;
        }
      }
    } catch (e) {
      // Fallback para API pública
    }

    try {
      // Método 2: API pública de horário mundial (TimeAPI para America/Sao_Paulo)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const resApi = await fetch('https://timeapi.io/api/time/current/zone?timeZone=America/Sao_Paulo', {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (resApi.ok) {
        const data = await resApi.json();
        if (data && data.dateTime) {
          const apiTime = new Date(data.dateTime).getTime();
          if (!isNaN(apiTime)) {
            this.applyTimeOffset(apiTime - Date.now());
            return;
          }
        }
      }
    } catch (e) {
      // Mantém offset atual do localStorage
    }
  }

  applyTimeOffset(offsetMs) {
    this.timeOffset = offsetMs;
    try {
      localStorage.setItem('brinca_aprende_network_time_offset', String(offsetMs));
      localStorage.setItem('brinca_aprende_last_time_sync', String(Date.now()));
    } catch {}

    const currentToday = this.getTodayDateString();
    if (!this._lastKnownToday) {
      this._lastKnownToday = currentToday;
    } else if (this._lastKnownToday !== currentToday) {
      this._lastKnownToday = currentToday;
      window.dispatchEvent(new CustomEvent('time:day_changed', { detail: { today: currentToday } }));
    }
    window.dispatchEvent(new CustomEvent('time:synced', { detail: { today: currentToday, offset: offsetMs } }));
  }

  getNetworkNow() {
    return new Date(Date.now() + (this.timeOffset || 0));
  }

  formatDateInBrazil(dateObj) {
    try {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return formatter.format(dateObj); // Retorna 'YYYY-MM-DD'
    } catch (e) {
      const offset = -3 * 60; // UTC-3 em minutos
      const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
      const brDate = new Date(utc + (offset * 60000));
      const y = brDate.getFullYear();
      const m = String(brDate.getMonth() + 1).padStart(2, '0');
      const d = String(brDate.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  getTodayDateString() {
    return this.formatDateInBrazil(this.getNetworkNow());
  }

  // Obtém a data de cadastro da criança (garante que a família não possa navegar antes desta data)
  getChildRegistrationDate(childId) {
    const child = this.getChildById(childId);
    const today = this.getTodayDateString();
    if (!child) return today;

    // 1. dataCadastro ou createdAt explícito no bebê (YYYY-MM-DD)
    if (child.dataCadastro && /^\d{4}-\d{2}-\d{2}$/.test(child.dataCadastro)) {
      return child.dataCadastro;
    }
    if (child.createdAt) {
      const d = child.createdAt.split('T')[0];
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        child.dataCadastro = d;
        return d;
      }
    }

    // 2. Data de cadastro na conta do responsável
    if (child.parentEmail) {
      try {
        const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
        const u = users.find(x => (x.email || '').toLowerCase().trim() === child.parentEmail.toLowerCase().trim());
        if (u && u.createdAt) {
          const d = u.createdAt.split('T')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
            child.dataCadastro = d;
            child.createdAt = child.createdAt || d;
            this.updateChild(child.id, { dataCadastro: d, createdAt: d });
            return d;
          }
        }
      } catch {}
    }

    // 3. ID do bebê com timestamp (ex: child_1727...)
    if (typeof child.id === 'string' && child.id.startsWith('child_')) {
      const ts = parseInt(child.id.replace('child_', ''), 10);
      if (!isNaN(ts) && ts > 1600000000000 && ts < 2500000000000) {
        const d = this.formatDateInBrazil(new Date(ts));
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
          child.dataCadastro = d;
          child.createdAt = child.createdAt || d;
          this.updateChild(child.id, { dataCadastro: d, createdAt: d });
          return d;
        }
      }
    }

    // 4. Registro mais antigo já lançado na rotina desta criança
    try {
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES) || '{}');
      let earliest = null;
      for (const key of Object.keys(allRoutines)) {
        if (key.startsWith(`${childId}_`)) {
          const datePart = key.slice(childId.length + 1);
          if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            if (!earliest || datePart < earliest) {
              earliest = datePart;
            }
          }
        }
      }
      if (earliest) {
        child.dataCadastro = earliest;
        child.createdAt = child.createdAt || earliest;
        this.updateChild(child.id, { dataCadastro: earliest, createdAt: earliest });
        return earliest;
      }
    } catch {}

    // 5. Bebê novo sem data: inicializa com a data oficial da internet de hoje e persiste
    child.dataCadastro = today;
    child.createdAt = child.createdAt || today;
    this.updateChild(child.id, { dataCadastro: today, createdAt: today });
    return today;
  }

  getChildren() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CHILDREN)) || INITIAL_CHILDREN;
    } catch {
      return INITIAL_CHILDREN;
    }
  }

  getChildById(id) {
    const list = this.getChildren();
    return list.find(c => c.id === id) || list[0];
  }

  getChildByParentEmail(email) {
    if (!email) return null;
    const list = this.getChildren();
    return list.find(c => c.parentEmail && c.parentEmail.toLowerCase() === email.toLowerCase()) || null;
  }

  addChild(child) {
    const list = this.getChildren();
    child.id = child.id || ('child_' + Date.now());
    // Garante que a data de cadastro é gravada com a data oficial da internet
    const today = this.getTodayDateString();
    child.dataCadastro = child.dataCadastro || today;
    child.createdAt = child.createdAt || today;
    list.push(child);
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(list));
    this.cloudSaveChild(child);
    return child;
  }

  hasRoutine(childId, dateStr) {
    try {
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES)) || {};
      const key = `${childId}_${dateStr}`;
      const r = allRoutines[key];
      if (!r) return false;
      const hasMeals = Array.isArray(r.meals) && r.meals.some(m => m.acceptance || (m.description && m.description.trim() !== ''));
      const hasDiapers = Array.isArray(r.diapers?.logs) && r.diapers.logs.length > 0;
      const hasSleep = Array.isArray(r.sleep) && r.sleep.length > 0;
      const hasNote = !!(r.observations?.teacherNote && r.observations.teacherNote.trim() !== '');
      const hasMood = !!(r.mood && (r.mood.label || r.mood.emoji));
      const hasMedication = !!(r.medication?.hasMedication && r.medication?.details && r.medication.details.trim() !== '');
      const hasHygieneNotes = !!(r.hygiene?.faltaObservacao && r.hygiene.faltaObservacao.trim() !== '');
      return hasMeals || hasDiapers || hasSleep || hasNote || hasMood || hasMedication || hasHygieneNotes;
    } catch {
      return false;
    }
  }

  getRoutine(childId, dateStr) {
    try {
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES)) || {};
      const key = `${childId}_${dateStr}`;
      if (allRoutines[key]) {
        return allRoutines[key];
      }
      return getDefaultRoutine(childId, dateStr);
    } catch {
      return getDefaultRoutine(childId, dateStr);
    }
  }

  saveRoutine(childId, dateStr, routineData) {
    try {
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES)) || {};
      const key = `${childId}_${dateStr}`;
      routineData.isRegistered = true;
      routineData.updatedAt = new Date().toISOString();
      allRoutines[key] = routineData;
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(allRoutines));
      this.cloudSaveRoutine(childId, dateStr, routineData);
      return true;
    } catch (e) {
      console.error('Erro ao salvar rotina:', e);
      return false;
    }
  }

  updateChild(id, updatedFields) {
    const list = this.getChildren();
    const idx = list.findIndex(c => c.id === id);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...updatedFields };
      localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(list));
      this.cloudSaveChild(list[idx]);
      return list[idx];
    }
    return null;
  }

  async deleteChild(id) {
    const list = this.getChildren();
    const child = list.find(c => c.id === id);
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(filtered));

    // Exclui todas as rotinas deste bebê localmente e no Firestore
    this.deleteLocalChildRoutines(id);
    await this.cloudDeleteChildRoutines(id);
    await this.cloudDeleteChild(id);

    // Desvincula o bebê do responsável, mas PRESERVA a conta de login para recadastro
    if (child && child.parentEmail) {
      this.unlinkChildFromParent(child.parentEmail);
    }
    return true;
  }

  unlinkChildFromParent(email) {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();

    // 1. Registra nos e-mails desvinculados para garantir que nada re-vincule sem ação explícita
    try {
      const unlinked = JSON.parse(localStorage.getItem('brinca_aprende_unlinked_emails') || '[]');
      if (!unlinked.includes(cleanEmail)) {
        unlinked.push(cleanEmail);
        localStorage.setItem('brinca_aprende_unlinked_emails', JSON.stringify(unlinked));
      }
    } catch {}

    // 2. Atualiza nos usuários registrados locais
    try {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const updated = users.map(u => {
        if ((u.email || '').toLowerCase().trim() === cleanEmail) {
          return { ...u, childId: null, needsChildRegistration: true };
        }
        return u;
      });
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(updated));
    } catch {}

    // 3. Atualiza na lista de contas Google
    try {
      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      const updatedG = gAccounts.map(g => {
        if ((g.email || '').toLowerCase().trim() === cleanEmail) {
          return { ...g, childId: null, childName: null };
        }
        return g;
      });
      localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(updatedG));
    } catch {}

    // 4. Atualiza na sessão ativa se for o usuário atual
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
      if (current && (current.email || '').toLowerCase().trim() === cleanEmail) {
        current.childId = null;
        current.needsChildRegistration = true;
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(current));
      }
    } catch {}

    // 5. Sincroniza desvinculação no Firestore
    this.cloudUnlinkParent(cleanEmail);
  }

  relinkBabyToParent({ email, parentName, babyName, babyAge, turma, avatar, phone, notes }) {
    if (!email || !babyName) return null;
    const cleanEmail = email.toLowerCase().trim();
    const cleanParentName = (parentName || 'Responsável').trim();
    const isGoogle = cleanEmail.includes('gabrielmeiira') || cleanEmail.endsWith('@gmail.com');

    // Remove dos e-mails desvinculados
    try {
      const unlinked = JSON.parse(localStorage.getItem('brinca_aprende_unlinked_emails') || '[]');
      const filteredUnlinked = unlinked.filter(e => e.toLowerCase().trim() !== cleanEmail);
      localStorage.setItem('brinca_aprende_unlinked_emails', JSON.stringify(filteredUnlinked));
    } catch {}

    // 1. Adiciona o bebê na creche (já sincroniza com Firestore internamente via addChild)
    const newChild = this.addChild({
      name: babyName.trim(),
      age: babyAge ? babyAge.trim() : '1 ano',
      turma: turma || 'Berçário 1',
      avatar: avatar || '👶',
      parentEmail: cleanEmail,
      responsible: `${cleanParentName} (Responsável)`,
      phone: phone ? phone.trim() : '',
      notes: notes ? notes.trim() : '',
      isGoogle: isGoogle
    });

    // 2. Vincula à conta nos usuários registrados locais
    try {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const existingUser = users.find(u => (u.email || '').toLowerCase().trim() === cleanEmail);
      if (existingUser) {
        existingUser.childId = newChild.id;
        existingUser.needsChildRegistration = false;
        if (cleanParentName) existingUser.name = cleanParentName;
      } else {
        users.push({
          uid: 'user_' + Date.now(),
          name: cleanParentName,
          email: cleanEmail,
          role: 'parent',
          childId: newChild.id,
          avatar: '👪',
          isGoogle: isGoogle
        });
      }
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    } catch {}

    // 3. Vincula na lista de contas Google se for Google
    try {
      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      const existingG = gAccounts.find(g => (g.email || '').toLowerCase().trim() === cleanEmail);
      if (existingG) {
        existingG.childId = newChild.id;
        existingG.childName = newChild.name;
        if (cleanParentName) existingG.name = cleanParentName;
      } else if (isGoogle) {
        gAccounts.push({
          uid: 'google_' + Date.now(),
          name: cleanParentName,
          email: cleanEmail,
          photoURL: null,
          provider: 'google.com',
          childId: newChild.id,
          childName: newChild.name,
          createdAt: new Date().toISOString()
        });
      }
      localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(gAccounts));
    } catch {}

    // 4. Atualiza a sessão atual se for esse usuário
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
      if (current && (current.email || '').toLowerCase().trim() === cleanEmail) {
        current.childId = newChild.id;
        current.needsChildRegistration = false;
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(current));
      }
    } catch {}

    // 5. Sincroniza revinculação no Firestore
    this.cloudRelinkParent(cleanEmail, newChild.id, newChild.name);

    return newChild;
  }

  deleteParentUser(email) {
    return this.deleteGoogleAccount(email);
  }

  getAllParentAccounts() {
    const list = [];
    const emailsSeen = new Set();
    const children = this.getChildren();
    const unlinkedEmails = new Set(JSON.parse(localStorage.getItem('brinca_aprende_unlinked_emails') || '[]'));
    const deletedEmails = new Set(JSON.parse(localStorage.getItem('brinca_aprende_deleted_accounts') || '[]'));

    // 1. Contas Google
    try {
      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      gAccounts.forEach(g => {
        const clean = (g.email || '').toLowerCase().trim();
        if (clean && !deletedEmails.has(clean) && !emailsSeen.has(clean)) {
          emailsSeen.add(clean);
          const child = !unlinkedEmails.has(clean) ? children.find(c => (c.parentEmail || '').toLowerCase().trim() === clean) : null;
          list.push({
            name: g.name || 'Responsável',
            email: g.email.trim(),
            provider: 'google.com',
            photoURL: g.photoURL || null,
            isGoogle: true,
            linkedChild: child || null
          });
        }
      });
    } catch {}

    // 2. Usuários cadastrados em USERS
    try {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      users.forEach(u => {
        const clean = (u.email || '').toLowerCase().trim();
        if (clean && !deletedEmails.has(clean) && !emailsSeen.has(clean) && u.role === 'parent') {
          emailsSeen.add(clean);
          const isGoogle = u.isGoogle || clean.includes('gabrielmeiira') || clean.endsWith('@gmail.com');
          const child = !unlinkedEmails.has(clean) ? children.find(c => (c.parentEmail || '').toLowerCase().trim() === clean) : null;
          list.push({
            name: u.name || 'Responsável',
            email: u.email.trim(),
            provider: isGoogle ? 'google.com' : 'password',
            photoURL: u.photoURL || null,
            isGoogle: isGoogle,
            linkedChild: child || null
          });
        }
      });
    } catch {}

    return list;
  }

  getEducators() {
    const defaultList = (window.FirebaseModule && window.FirebaseModule.AUTHORIZED_CAREGIVERS) || [
      { email: "admin@brincaeaprende.com.br", name: "Tia Carol (Educadora)", role: "admin", avatar: "👩‍🏫", turma: "Berçário 1 e 2" },
      { email: "diretoria@brincaeaprende.com.br", name: "Diretoria Brinca e Aprende", role: "admin", avatar: "🏫", turma: "Coordenação Geral" }
    ];
    try {
      const stored = localStorage.getItem('brinca_aprende_all_educators');
      if (stored) {
        return JSON.parse(stored);
      }
      localStorage.setItem('brinca_aprende_all_educators', JSON.stringify(defaultList));
      return defaultList;
    } catch {
      return defaultList;
    }
  }

  addEducator(educator) {
    const list = this.getEducators();
    const cleanEmail = (educator.email || '').toLowerCase().trim();
    const filtered = list.filter(e => e.email.toLowerCase().trim() !== cleanEmail);
    filtered.push(educator);
    localStorage.setItem('brinca_aprende_all_educators', JSON.stringify(filtered));

    if (educator.password) {
      const passMap = JSON.parse(localStorage.getItem('brinca_aprende_educators_pass') || '{}');
      passMap[cleanEmail] = educator.password;
      localStorage.setItem('brinca_aprende_educators_pass', JSON.stringify(passMap));
    }
    this.cloudSaveEducator(educator);
    return educator;
  }

  deleteEducator(email) {
    const cleanEmail = (email || '').toLowerCase().trim();
    const list = this.getEducators();
    const filtered = list.filter(e => e.email.toLowerCase().trim() !== cleanEmail);
    localStorage.setItem('brinca_aprende_all_educators', JSON.stringify(filtered));

    // Também limpa listas legadas se existirem
    const customList = JSON.parse(localStorage.getItem('brinca_aprende_custom_educators') || '[]');
    localStorage.setItem('brinca_aprende_custom_educators', JSON.stringify(customList.filter(e => e.email.toLowerCase().trim() !== cleanEmail)));

    const passMap = JSON.parse(localStorage.getItem('brinca_aprende_educators_pass') || '{}');
    delete passMap[cleanEmail];
    localStorage.setItem('brinca_aprende_educators_pass', JSON.stringify(passMap));
    this.cloudDeleteEducator(cleanEmail);
    return true;
  }

  // ==========================================================================
  // GESTÃO DE CONTAS GOOGLE / FIREBASE
  // ==========================================================================
  getGoogleAccounts() {
    const list = [];
    const emailsSeen = new Set();

    // Contas excluídas permanentemente não devem ressuscitar
    const deletedAccounts = JSON.parse(localStorage.getItem('brinca_aprende_deleted_accounts') || '[]');
    const deletedEmails = new Set(deletedAccounts.map(d => (d.email || '').toLowerCase().trim()));

    // 1. Contas registradas explicitamente ao autenticar com Google
    try {
      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      gAccounts.forEach(g => {
        const clean = (g.email || '').toLowerCase().trim();
        if (clean && !emailsSeen.has(clean) && !deletedEmails.has(clean)) {
          emailsSeen.add(clean);
          list.push({
            uid: g.uid || 'g_' + Math.random().toString(36).substr(2, 9),
            name: g.name || 'Usuário Google',
            email: g.email.trim(),
            photoURL: g.photoURL || null,
            provider: 'google.com',
            createdAt: g.createdAt || new Date().toISOString()
          });
        }
      });
    } catch (e) {
      console.warn('Erro ao ler google_accounts:', e);
    }

    // 2. Usuários cadastrados com isGoogle ou conta Google ou e-mail Gmail
    try {
      const regUsers = JSON.parse(localStorage.getItem('brinca_aprende_registered_users') || '[]');
      regUsers.forEach(u => {
        const clean = (u.email || '').toLowerCase().trim();
        if (deletedEmails.has(clean)) return;
        const isGoogle = u.isGoogle || 
                         (u.provider && u.provider.includes('google')) || 
                         (u.uid && u.uid.length > 20) || 
                         clean.endsWith('@gmail.com') ||
                         !!u.photoURL;
        if (clean && isGoogle && !emailsSeen.has(clean)) {
          emailsSeen.add(clean);
          list.push({
            uid: u.uid || 'reg_' + Math.random().toString(36).substr(2, 9),
            name: u.name || 'Usuário Google',
            email: u.email.trim(),
            photoURL: u.photoURL || null,
            provider: 'google.com',
            createdAt: u.createdAt || new Date().toISOString()
          });
        }
      });
    } catch (e) {
      console.warn('Erro ao ler registered_users:', e);
    }

    // 3. Crianças cadastradas cujo pai/mãe tem e-mail do Google / Gmail ou conta Google
    try {
      const children = this.getChildren();
      children.forEach(c => {
        const pEmail = (c.parentEmail || '').toLowerCase().trim();
        if (deletedEmails.has(pEmail)) return;
        const isDemo = c.id === 'child_1' || c.id === 'child_2' || c.id === 'child_3' || c.id === 'child_4' || pEmail.endsWith('@exemplo.com');
        if (isDemo) return;

        const isGoogle = c.isGoogle || pEmail.endsWith('@gmail.com') || pEmail.includes('gabrielmeiira');
        if (pEmail && isGoogle && !emailsSeen.has(pEmail)) {
          emailsSeen.add(pEmail);
          list.push({
            uid: 'child_parent_' + c.id,
            name: c.responsible ? c.responsible.replace(/\s*\(Responsável\)/i, '').trim() : 'Responsável',
            email: c.parentEmail.trim(),
            photoURL: null,
            provider: 'google.com',
            createdAt: new Date().toISOString()
          });
        }
      });
    } catch (e) {
      console.warn('Erro ao verificar responsáveis com Google:', e);
    }

    // 4. Usuário atual na sessão local se autenticado com Google
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
      if (current && current.email) {
        const clean = current.email.toLowerCase().trim();
        if (!deletedEmails.has(clean)) {
          const isGoogle = current.isGoogle || 
                           current.photoURL || 
                           clean.endsWith('@gmail.com') || 
                           clean.includes('gabrielmeiira') ||
                           (current.provider && current.provider.includes('google'));
          if (isGoogle && !emailsSeen.has(clean)) {
            emailsSeen.add(clean);
            list.push({
              uid: current.uid || 'current_user',
              name: current.name || 'Usuário Google',
              email: current.email.trim(),
              photoURL: current.photoURL || null,
              provider: 'google.com',
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {
      console.warn('Erro ao ler current_user:', e);
    }

    // 5. Usuário ativo no Firebase Auth em memória se disponível
    try {
      if (window.FirebaseModule && window.FirebaseModule.auth && window.FirebaseModule.auth.currentUser) {
        const fbUser = window.FirebaseModule.auth.currentUser;
        if (fbUser && fbUser.email) {
          const clean = fbUser.email.toLowerCase().trim();
          if (!deletedEmails.has(clean) && !emailsSeen.has(clean)) {
            emailsSeen.add(clean);
            list.push({
              uid: fbUser.uid,
              name: fbUser.displayName || 'Usuário Google',
              email: fbUser.email.trim(),
              photoURL: fbUser.photoURL || null,
              provider: 'google.com',
              createdAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (e) {}

    // Enriquece cada conta com o bebê vinculado (se houver)
    const allChildren = this.getChildren();
    const unlinkedEmails = new Set(JSON.parse(localStorage.getItem('brinca_aprende_unlinked_emails') || '[]'));

    return list.map(item => {
      const cleanEmail = item.email.toLowerCase().trim();
      const isExplicitlyUnlinked = unlinkedEmails.has(cleanEmail);

      const linkedChild = !isExplicitlyUnlinked
        ? allChildren.find(c => (c.parentEmail || '').toLowerCase().trim() === cleanEmail)
        : null;

      return {
        ...item,
        linkedChild: linkedChild || null
      };
    });
  }

  async deleteGoogleAccount(email) {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();

    // 0. Marca globalmente no Firestore e localStorage como conta deletada para não ressuscitar por snapshots
    await this.cloudMarkAccountDeleted(cleanEmail);

    // 1. Remove da lista de contas google
    try {
      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      const filtered = gAccounts.filter(g => (g.email || '').toLowerCase().trim() !== cleanEmail);
      localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(filtered));
    } catch {}

    // 2. Remove da lista de usuários registrados
    try {
      const regUsers = JSON.parse(localStorage.getItem('brinca_aprende_registered_users') || '[]');
      const filtered = regUsers.filter(u => (u.email || '').toLowerCase().trim() !== cleanEmail);
      localStorage.setItem('brinca_aprende_registered_users', JSON.stringify(filtered));
    } catch {}

    // 2.1 Remove de unlinked emails se estava lá
    try {
      const unlinked = JSON.parse(localStorage.getItem('brinca_aprende_unlinked_emails') || '[]');
      const filtered = unlinked.filter(e => (e || '').toLowerCase().trim() !== cleanEmail);
      localStorage.setItem('brinca_aprende_unlinked_emails', JSON.stringify(filtered));
    } catch {}

    // 3. Remove os bebês associados a esse e-mail e APAGA TODAS AS SUAS ROTINAS (Local e Firestore)
    try {
      const children = this.getChildren();
      const childrenToDelete = children.filter(c => (c.parentEmail || '').toLowerCase().trim() === cleanEmail);
      
      for (const child of childrenToDelete) {
        this.deleteLocalChildRoutines(child.id);
        await this.cloudDeleteChildRoutines(child.id);
        await this.cloudDeleteChild(child.id);
      }

      const remainingChildren = children.filter(c => (c.parentEmail || '').toLowerCase().trim() !== cleanEmail);
      localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(remainingChildren));
    } catch (e) {
      console.error('Erro ao deletar bebês vinculados e rotinas:', e);
    }

    // 4. Se for o usuário conectado no momento neste navegador, encerra a sessão
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
      if (current && current.email && current.email.toLowerCase().trim() === cleanEmail) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        if (window.FirebaseModule && window.FirebaseModule.auth && window.FirebaseModule.signOut) {
          window.FirebaseModule.signOut(window.FirebaseModule.auth).catch(() => {});
        }
      }
    } catch {}

    // 5. Deleta do Firestore (google_accounts, unlinked_accounts e users)
    await this.cloudDeleteGoogleAccount(cleanEmail);
    await this.cloudDeleteUser(cleanEmail);

    window.dispatchEvent(new CustomEvent('storage:synced'));
    return true;
  }
}

// Instância global
window.storageService = new StorageService();
