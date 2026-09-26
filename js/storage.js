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

// Crianças pré-cadastradas para o berçário (Demonstração limpa sem e-mails de Google falsos)
const INITIAL_CHILDREN = [
  {
    id: 'child_liam',
    name: 'Liam Meira',
    age: '1 ano',
    turma: 'Berçário 1',
    avatar: '👶',
    parentEmail: 'gabrielmeiira@gmail.com',
    responsible: 'Gabriel Meira (Responsável)',
    phone: '(77) 99148-1170',
    notes: 'Adaptação super tranquila, muito curioso e alegre.',
    isGoogle: true
  },
  {
    id: 'child_1',
    name: 'Theo Oliveira',
    age: '1 ano e 2 meses',
    turma: 'Berçário 1',
    avatar: '👶',
    parentEmail: 'theo@exemplo.com',
    responsible: 'Mariana Oliveira (Mãe)'
  },
  {
    id: 'child_2',
    name: 'Helena Santos',
    age: '10 meses',
    turma: 'Berçário 1',
    avatar: '👧',
    parentEmail: 'helena@exemplo.com',
    responsible: 'Lucas Santos (Pai)'
  },
  {
    id: 'child_3',
    name: 'Noah Gabriel',
    age: '1 ano e 5 meses',
    turma: 'Berçário 2',
    avatar: '🧒',
    parentEmail: 'noah@exemplo.com',
    responsible: 'Camila Gabriel (Mãe)'
  },
  {
    id: 'child_4',
    name: 'Alice Souza',
    age: '8 meses',
    turma: 'Berçário 1',
    avatar: '🍼',
    parentEmail: 'alice@exemplo.com',
    responsible: 'Renata Souza (Mãe)'
  }
];

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

  notifyCloudStatus(connected) {
    this.isCloudConnected = connected;
    window.dispatchEvent(new CustomEvent('cloud:status', { detail: { connected } }));
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
          await this.seedCloudDatabase();
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
      });
    } catch (e) {
      console.warn('Erro ao conectar listener Firestore children:', e);
    }

    // 2. Rotinas Diárias (routines)
    try {
      onSnapshot(collection(db, 'routines'), (snapshot) => {
        this.notifyCloudStatus(true);
        let localRoutines = {};
        try {
          localRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES) || '{}');
        } catch {}

        snapshot.forEach(docSnap => {
          localRoutines[docSnap.id] = docSnap.data();
        });

        localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(localRoutines));
        window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'routines', routines: localRoutines } }));
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
        if (!snapshot.empty) {
          const gList = [];
          snapshot.forEach(docSnap => {
            gList.push(docSnap.data());
          });
          localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(gList));
          window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'google_accounts' } }));
        }
      }, () => {});
    } catch (e) {}

    // 5. Educadores (educators)
    try {
      onSnapshot(collection(db, 'educators'), (snapshot) => {
        if (!snapshot.empty) {
          const eduList = [];
          snapshot.forEach(docSnap => {
            eduList.push(docSnap.data());
          });
          localStorage.setItem('brinca_aprende_all_educators', JSON.stringify(eduList));
          window.dispatchEvent(new CustomEvent('storage:synced', { detail: { type: 'educators' } }));
        }
      }, () => {});
    } catch (e) {}
  }

  async seedCloudDatabase() {
    const fb = window.FirebaseModule;
    if (!fb || !fb.db) return;
    const { doc, setDoc } = fb;
    const db = fb.db;
    const todayStr = this.getTodayDateString();

    try {
      const currentChildren = this.getChildren();
      for (const child of currentChildren) {
        await setDoc(doc(db, 'children', child.id), child, { merge: true });
      }

      await setDoc(doc(db, 'google_accounts', 'gabrielmeiira@gmail.com'), {
        uid: 'google_gabrielmeiira',
        name: 'Gabriel Meira',
        email: 'gabrielmeiira@gmail.com',
        photoURL: null,
        provider: 'google.com',
        childId: 'child_liam',
        childName: 'Liam Meira',
        createdAt: new Date().toISOString()
      }, { merge: true });

      console.log('☁️ Banco de dados Cloud Firestore pronto para registros reais!');
    } catch (e) {
      console.warn('Aviso no seed do Firestore:', e);
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

  init() {
    const todayStr = this.getTodayDateString();

    try {
      const rawChildren = localStorage.getItem(STORAGE_KEYS.CHILDREN);

      // Se a base de dados já foi inicializada no navegador:
      // RESPEITA as alterações do usuário (ex: bebê descadastrado) e NUNCA recria crianças!
      if (rawChildren !== null) {
        let children = JSON.parse(rawChildren || '[]');
        let needsSave = false;

        // Limpa registros legados "Bebê de..." se existirem
        const filtered = children.filter(c => !c.name?.startsWith('Bebê de '));
        if (filtered.length !== children.length) {
          children = filtered;
          needsSave = true;
        }

        if (needsSave) {
          localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(children));
        }
        return;
      }

      // === PRIMEIRA CARGA DO SISTEMA (SEED INICIAL DE DEMONSTRAÇÃO) ===
      // Executado APENAS quando a chave de crianças ainda não existe no localStorage
      const initialChildren = INITIAL_CHILDREN;
      localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(initialChildren));

      // 1. Inicializa conta Google de Gabriel Meira vinculada inicialmente ao Liam
      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      if (!gAccounts.some(g => (g.email || '').toLowerCase().includes('gabrielmeiira'))) {
        gAccounts.unshift({
          uid: 'google_gabrielmeiira',
          name: 'Gabriel Meira',
          email: 'gabrielmeiira@gmail.com',
          photoURL: null,
          provider: 'google.com',
          childId: 'child_liam',
          childName: 'Liam Meira',
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(gAccounts));
      }

      // 2. Inicializa em usuários registrados
      const regUsers = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      if (!regUsers.some(u => (u.email || '').toLowerCase().includes('gabrielmeiira'))) {
        regUsers.unshift({
          uid: 'google_gabrielmeiira',
          name: 'Gabriel Meira',
          email: 'gabrielmeiira@gmail.com',
          role: 'parent',
          childId: 'child_liam',
          avatar: '👪',
          isGoogle: true
        });
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(regUsers));
      }

      // 3. Limpeza de rotinas fakes pré-existentes de demonstração
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
            if (window.FirebaseModule && window.FirebaseModule.db) {
              const fb = window.FirebaseModule;
              fb.deleteDoc(fb.doc(fb.db, 'routines', key)).catch(() => {});
            }
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

  getTodayDateString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
      if (r.isRegistered) return true;
      const hasMeals = Array.isArray(r.meals) && r.meals.some(m => m.acceptance || (m.description && m.description.trim() !== ''));
      const hasDiapers = Array.isArray(r.diapers?.logs) && r.diapers.logs.length > 0;
      const hasSleep = Array.isArray(r.sleep) && r.sleep.length > 0;
      const hasNote = !!(r.observations?.teacherNote && r.observations.teacherNote.trim() !== '');
      const hasMood = !!r.mood;
      return hasMeals || hasDiapers || hasSleep || hasNote || hasMood;
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

  deleteChild(id) {
    const list = this.getChildren();
    const child = list.find(c => c.id === id);
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(filtered));
    this.cloudDeleteChild(id);

    // Desvincula o bebê do responsável, mas PRESERVA a conta de login e histórico para recadastro!
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
    const cleanEmail = (email || '').toLowerCase().trim();
    try {
      const users = JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS) || '[]');
      const filteredUsers = users.filter(u => (u.email || '').toLowerCase().trim() !== cleanEmail);
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(filteredUsers));

      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      const filteredG = gAccounts.filter(g => (g.email || '').toLowerCase().trim() !== cleanEmail);
      localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(filteredG));

      const current = JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER) || 'null');
      if (current && (current.email || '').toLowerCase().trim() === cleanEmail) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
        if (window.FirebaseModule && window.FirebaseModule.auth && window.FirebaseModule.signOut) {
          window.FirebaseModule.signOut(window.FirebaseModule.auth).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Erro ao deletar usuário:', e);
    }
  }

  getAllParentAccounts() {
    const list = [];
    const emailsSeen = new Set();
    const children = this.getChildren();
    const unlinkedEmails = new Set(JSON.parse(localStorage.getItem('brinca_aprende_unlinked_emails') || '[]'));

    // 1. Contas Google
    try {
      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      gAccounts.forEach(g => {
        const clean = (g.email || '').toLowerCase().trim();
        if (clean && !emailsSeen.has(clean)) {
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
        if (clean && !emailsSeen.has(clean) && u.role === 'parent') {
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

    // 1. Contas registradas explicitamente ao autenticar com Google
    try {
      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      gAccounts.forEach(g => {
        const clean = (g.email || '').toLowerCase().trim();
        if (clean && !emailsSeen.has(clean)) {
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
    } catch (e) {
      console.warn('Erro ao ler current_user:', e);
    }

    // 5. Usuário ativo no Firebase Auth em memória se disponível
    try {
      if (window.FirebaseModule && window.FirebaseModule.auth && window.FirebaseModule.auth.currentUser) {
        const fbUser = window.FirebaseModule.auth.currentUser;
        if (fbUser && fbUser.email) {
          const clean = fbUser.email.toLowerCase().trim();
          if (!emailsSeen.has(clean)) {
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

  deleteGoogleAccount(email) {
    if (!email) return false;
    const cleanEmail = email.toLowerCase().trim();

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

    // 3. Remove ou desvincula a criança associada ao e-mail desse responsável
    try {
      const children = this.getChildren();
      const updatedChildren = children.filter(c => (c.parentEmail || '').toLowerCase().trim() !== cleanEmail);
      localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(updatedChildren));
    } catch {}

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

      // 5. Deleta do Firestore
      this.cloudDeleteGoogleAccount(cleanEmail);

      return true;
  }
}

// Instância global
window.storageService = new StorageService();
