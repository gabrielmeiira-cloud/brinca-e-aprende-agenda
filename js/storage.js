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

// Modelo padrão de rotina diária
function getDefaultRoutine(childId, dateStr) {
  return {
    childId: childId,
    date: dateStr,
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
      { id: 'm1', name: 'Café da manhã', time: '08:00', icon: '☀️', acceptance: 'otimo', description: 'Frutinha (mamão) e mingau de aveia' },
      { id: 'm2', name: 'Leite', time: '09:30', icon: '🍼', acceptance: 'otimo', description: 'Mamadeira de 180ml' },
      { id: 'm3', name: 'Almoço', time: '11:00', icon: '🍲', acceptance: 'bom', description: 'Arroz, feijão, caldinho de carne e abobrinha' },
      { id: 'm4', name: 'Lanche da tarde', time: '13:00', icon: '🍎', acceptance: 'otimo', description: 'Banana amassadinha com farelo de aveia' },
      { id: 'm5', name: 'Leite', time: '14:30', icon: '🍼', acceptance: 'otimo', description: 'Mamadeira de 150ml' },
      { id: 'm6', name: 'Lanche final', time: '16:30', icon: '🍪', acceptance: 'bom', description: 'Biscoitinho de polvilho artesanal e água de coco' }
    ],
    diapers: {
      count: 4,
      logs: [
        { time: '08:30', type: 'Xixi', ointment: true },
        { time: '11:20', type: 'Xixi e Cocô', ointment: true },
        { time: '14:15', type: 'Xixi', ointment: true },
        { time: '16:30', type: 'Xixi', ointment: true }
      ]
    },
    sleep: [
      { period: 'Manhã', time: '09:45 às 10:45', quality: 'Tranquilo (dormiu bem)' },
      { period: 'Tarde', time: '14:45 às 16:00', quality: 'Descansou bastante' }
    ],
    medication: {
      hasMedication: false,
      details: 'Nenhuma medicação ministrada hoje.',
      temperature: '36.5 ºC (Normal)'
    },
    mood: {
      emoji: '😄',
      label: 'Alegre e participativo'
    },
    observations: {
      teacherNote: 'Dia muito alegre e tranquilo! Brincou bastante na piscina de bolinhas com os coleguinhas e explorou as texturas na aula de estimulação sensorial. Se alimentou super bem!',
      teacherName: 'Tia Carol e Tia Júlia'
    },
    updatedAt: new Date().toISOString()
  };
}

class StorageService {
  constructor() {
    this.init();
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

      // 3. Inicializa rotinas
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES) || '{}');
      if (!allRoutines[`child_liam_${todayStr}`]) {
        const liamRoutine = getDefaultRoutine('child_liam', todayStr);
        liamRoutine.observations.teacherNote = 'O Liam teve um dia maravilhoso no berçário! Brincou com blocos pedagógicos, comeu toda a frutinha e dormiu muito bem.';
        allRoutines[`child_liam_${todayStr}`] = liamRoutine;
      }
      if (!allRoutines[`child_1_${todayStr}`]) {
        const theoRoutine = getDefaultRoutine('child_1', todayStr);
        theoRoutine.hygiene.fralda.ok = false;
        theoRoutine.hygiene.pomada.ok = false;
        theoRoutine.hygiene.faltaObservacao = 'Por favor, trazer novo pacote de fraldas tam M e pomada.';
        allRoutines[`child_1_${todayStr}`] = theoRoutine;
      }
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(allRoutines));
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
    child.id = 'child_' + Date.now();
    list.push(child);
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(list));
    return child;
  }

  getRoutine(childId, dateStr) {
    try {
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES)) || {};
      const key = `${childId}_${dateStr}`;
      if (allRoutines[key]) {
        return allRoutines[key];
      }
      // Se não existir rotina específica para a data, retorna padrão
      const defaultRot = getDefaultRoutine(childId, dateStr);
      return defaultRot;
    } catch {
      return getDefaultRoutine(childId, dateStr);
    }
  }

  saveRoutine(childId, dateStr, routineData) {
    try {
      const allRoutines = JSON.parse(localStorage.getItem(STORAGE_KEYS.ROUTINES)) || {};
      const key = `${childId}_${dateStr}`;
      routineData.updatedAt = new Date().toISOString();
      allRoutines[key] = routineData;
      localStorage.setItem(STORAGE_KEYS.ROUTINES, JSON.stringify(allRoutines));
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
      return list[idx];
    }
    return null;
  }

  deleteChild(id) {
    const list = this.getChildren();
    const child = list.find(c => c.id === id);
    const filtered = list.filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CHILDREN, JSON.stringify(filtered));

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

    // 1. Adiciona o bebê na creche
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

    return true;
  }
}

// Instância global
window.storageService = new StorageService();
