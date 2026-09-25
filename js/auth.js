/**
 * Auth Service - Brinca e Aprende Agenda Berçário
 * Integração com Firebase Authentication (Google e E-mail/Senha).
 * 
 * Regras de Negócio:
 * - O painel de cuidador NÃO PODE ser cadastrado pelo site (restrito ao backend/administração).
 * - O cadastro pelo site e login com Google é de uso exclusivo para Pais/Famílias.
 * - Todos os botões e dados de teste foram removidos.
 */

class AuthService {
  constructor() {
    this.currentUser = null;
    this.listeners = [];
    this.init();
  }

  init() {
    try {
      const saved = localStorage.getItem('brinca_aprende_current_user');
      if (saved) {
        this.currentUser = JSON.parse(saved);
        if (this.currentUser && this.currentUser.role === 'parent') {
          // Garante que o avatar não seja uma string bruta de URL
          if (this.currentUser.avatar && this.currentUser.avatar.startsWith('http')) {
            this.currentUser.photoURL = this.currentUser.avatar;
            this.currentUser.avatar = '👪';
          }
          // Valida se a criança associada é real e não provisória "Bebê de..."
          const children = window.storageService.getChildren();
          const validChild = children.find(c => c.id === this.currentUser.childId && !c.name?.startsWith('Bebê de '));
          if (!validChild) {
            this.currentUser.childId = null;
            this.currentUser.needsChildRegistration = true;
          }
        }
      } else {
        this.currentUser = null;
      }
    } catch {
      this.currentUser = null;
    }

    // Configuração do ouvinte de estado de autenticação do Firebase (síncrono ou pós-carregamento)
    const setupFirebaseAuth = () => {
      if (window.FirebaseModule && window.FirebaseModule.auth) {
        try {
          window.FirebaseModule.onAuthStateChanged(window.FirebaseModule.auth, (fbUser) => {
            if (fbUser && fbUser.email) {
              const isGoogle = (fbUser.providerData && fbUser.providerData.some(p => p.providerId === 'google.com')) || 
                               fbUser.email.toLowerCase().endsWith('@gmail.com') || 
                               !!fbUser.photoURL;

              // Registra na lista oficial de contas Google
              if (isGoogle) {
                try {
                  const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
                  const clean = fbUser.email.toLowerCase().trim();
                  const filtered = gAccounts.filter(g => (g.email || '').toLowerCase().trim() !== clean);
                  const gDoc = {
                    uid: fbUser.uid,
                    name: fbUser.displayName || 'Usuário Google',
                    email: fbUser.email.trim(),
                    photoURL: fbUser.photoURL || null,
                    provider: 'google.com',
                    createdAt: new Date().toISOString()
                  };
                  filtered.push(gDoc);
                  localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(filtered));
                  if (window.storageService && window.storageService.cloudSaveGoogleAccount) {
                    window.storageService.cloudSaveGoogleAccount(gDoc);
                  }
                } catch (e) {}
              }

              // Se o usuário estiver autenticado no Firebase mas não na sessão local
              if (!this.currentUser || this.currentUser.uid !== fbUser.uid) {
                const caregiver = this.findAuthorizedCaregiver(fbUser.email);
                if (caregiver) {
                  this.currentUser = {
                    uid: fbUser.uid,
                    name: caregiver.name,
                    email: fbUser.email,
                    role: 'admin',
                    avatar: caregiver.avatar || '👩‍🏫',
                    photoURL: fbUser.photoURL,
                    turma: caregiver.turma,
                    isGoogle: isGoogle,
                    needsChildRegistration: false
                  };
                } else {
                  // Pai/Mãe: verifica se já tem criança real cadastrada
                  const children = window.storageService.getChildren();
                  const unlinked = new Set(JSON.parse(localStorage.getItem('brinca_aprende_unlinked_emails') || '[]'));
                  const uEmail = (fbUser.email || '').toLowerCase().trim();
                  const isUnlinked = unlinked.has(uEmail);
                  const existingChild = !isUnlinked ? children.find(c => {
                    const pEmail = (c.parentEmail || '').toLowerCase().trim();
                    return pEmail === uEmail && !c.name?.startsWith('Bebê de ');
                  }) : null;
                  this.currentUser = {
                    uid: fbUser.uid,
                    name: fbUser.displayName || (existingChild ? existingChild.responsible?.replace(/\s*\(Responsável\)/i, '').trim() : 'Responsável'),
                    email: fbUser.email,
                    role: 'parent',
                    avatar: '👪',
                    photoURL: fbUser.photoURL,
                    isGoogle: isGoogle,
                    childId: existingChild ? existingChild.id : null,
                    needsChildRegistration: !existingChild
                  };
                }
                localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
                this.notify();
              }
            }
          });
        } catch (e) {
          console.warn('Firebase onAuthStateChanged notice:', e);
        }
      }
    };

    if (window.FirebaseModule && window.FirebaseModule.auth) {
      setupFirebaseAuth();
    } else {
      window.addEventListener('firebase:ready', setupFirebaseAuth);
    }
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
  }

  notify() {
    this.listeners.forEach(cb => {
      try {
        cb(this.currentUser);
      } catch (err) {
        console.error('Auth notify error:', err);
      }
    });
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }

  // Verifica se o e-mail pertence à lista oficial de cuidadores autorizados no backend
  findAuthorizedCaregiver(email) {
    const cleanEmail = (email || '').trim().toLowerCase();
    const list = window.storageService ? window.storageService.getEducators() : [];
    return list.find(c => c.email && c.email.toLowerCase() === cleanEmail);
  }

  // Completa o cadastro da conta e do bebê para pais que entraram com Google
  completeChildRegistration({ parentName, babyName, babyAge, turma, password, phone, avatar, notes }) {
    if (!this.currentUser) return { success: false, message: 'Usuário não autenticado.' };

    const cleanBabyName = (babyName || '').trim();
    if (!cleanBabyName) {
      return { success: false, message: 'Por favor, informe o nome do bebê.' };
    }

    const cleanParentName = (parentName || this.currentUser.name || 'Responsável').trim();

    // 1. Cadastra o bebê no sistema
    const newChild = window.storageService.addChild({
      name: cleanBabyName,
      age: babyAge ? babyAge.trim() : '1 ano',
      turma: turma || 'Berçário 1',
      avatar: avatar || '👶',
      parentEmail: this.currentUser.email,
      responsible: `${cleanParentName} (Responsável)`,
      phone: phone ? phone.trim() : '',
      notes: notes ? notes.trim() : '',
      isGoogle: true
    });

    // 2. Registra na lista oficial de contas Google
    try {
      const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
      const filteredG = gAccounts.filter(g => (g.email || '').toLowerCase().trim() !== this.currentUser.email.toLowerCase().trim());
      const gData = {
        uid: this.currentUser.uid,
        name: cleanParentName,
        email: this.currentUser.email.trim(),
        photoURL: this.currentUser.photoURL || null,
        provider: 'google.com',
        childId: newChild.id,
        childName: cleanBabyName,
        createdAt: new Date().toISOString()
      };
      filteredG.push(gData);
      localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(filteredG));
      if (window.storageService && window.storageService.cloudSaveGoogleAccount) {
        window.storageService.cloudSaveGoogleAccount(gData);
      }
    } catch (e) {
      console.warn('Erro ao salvar em brinca_aprende_google_accounts:', e);
    }

    // 3. Registra a conta nos usuários cadastrados locais com a senha criada
    const users = JSON.parse(localStorage.getItem('brinca_aprende_registered_users') || '[]');
    const filtered = users.filter(u => u.email.toLowerCase() !== this.currentUser.email.toLowerCase());
    const regUser = {
      uid: this.currentUser.uid,
      name: cleanParentName,
      email: this.currentUser.email,
      password: password || '',
      phone: phone || '',
      role: 'parent',
      childId: newChild.id,
      avatar: this.currentUser.avatar || '👪',
      isGoogle: true
    };
    filtered.push(regUser);
    localStorage.setItem('brinca_aprende_registered_users', JSON.stringify(filtered));
    if (window.storageService && window.storageService.cloudSaveUser) {
      window.storageService.cloudSaveUser(regUser);
    }

    // 4. Atualiza o usuário atual da sessão
    this.currentUser.name = cleanParentName;
    this.currentUser.childId = newChild.id;
    this.currentUser.isGoogle = true;
    this.currentUser.needsChildRegistration = false;
    localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
    this.notify();

    return { success: true, child: newChild };
  }

  // ==========================================================================
  // LOGIN COM GOOGLE (AUTENTICAÇÃO OFICIAL FIREBASE)
  // ==========================================================================
  async loginWithGoogle(isExplicitRegister = false) {
    try {
      const fb = window.FirebaseModule;
      if (!fb || !fb.auth || !fb.googleProvider) {
        throw new Error('Módulo Firebase não carregado.');
      }

      // Dispara o Popup oficial de Login do Google
      const result = await fb.signInWithPopup(fb.auth, fb.googleProvider);
      const user = result.user;

      const caregiver = this.findAuthorizedCaregiver(user.email);
      let sessionUser;

      if (caregiver) {
        // Cuidador autorizado logando via Google
        sessionUser = {
          uid: user.uid,
          name: caregiver.name || user.displayName,
          email: user.email,
          role: 'admin',
          avatar: caregiver.avatar || '👩‍🏫',
          photoURL: user.photoURL,
          turma: caregiver.turma,
          needsChildRegistration: false
        };
      } else {
        // Pai/Mãe autenticando com Google:
        // Verifica se esta família já cadastrou um bebê real antes
        const children = window.storageService.getChildren();
        const unlinked = new Set(JSON.parse(localStorage.getItem('brinca_aprende_unlinked_emails') || '[]'));
        const uEmail = (user.email || '').toLowerCase().trim();
        const isUnlinked = unlinked.has(uEmail);
        const existingChild = !isUnlinked ? children.find(c => {
          const pEmail = (c.parentEmail || '').toLowerCase().trim();
          return pEmail === uEmail && !c.name?.startsWith('Bebê de ');
        }) : null;

        const needsRegistration = isExplicitRegister ? true : !existingChild;

        sessionUser = {
          uid: user.uid,
          name: user.displayName || (existingChild ? existingChild.responsible?.replace(/\s*\(Responsável\)/i, '').trim() : 'Responsável'),
          email: user.email,
          role: 'parent',
          avatar: '👪',
          photoURL: user.photoURL,
          isGoogle: true,
          childId: (!needsRegistration && existingChild) ? existingChild.id : null,
          needsChildRegistration: needsRegistration // Abre a janela de cadastro se for novo ou cadastro explícito!
        };
      }

      // Registra a conta na lista de contas Google do sistema
      try {
        const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
        const filtered = gAccounts.filter(g => (g.email || '').toLowerCase().trim() !== user.email.toLowerCase().trim());
        filtered.push({
          uid: user.uid,
          name: user.displayName || (caregiver ? caregiver.name : 'Usuário Google'),
          email: user.email.trim(),
          photoURL: user.photoURL || null,
          provider: 'google.com',
          role: sessionUser.role,
          createdAt: new Date().toISOString()
        });
        localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(filtered));
      } catch (e) {
        console.warn('Erro ao salvar em brinca_aprende_google_accounts:', e);
      }

      this.currentUser = sessionUser;
      localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
      this.notify();

      return { 
        success: true, 
        user: this.currentUser,
        needsChildRegistration: sessionUser.needsChildRegistration 
      };
    } catch (error) {
      console.error('Erro no login com Google:', error);

      if (error.code === 'auth/popup-closed-by-user') {
        return { success: false, message: 'Janela de login com o Google fechada.' };
      }
      if (error.code === 'auth/popup-blocked') {
        return { success: false, message: 'O pop-up foi bloqueado pelo navegador. Por favor, permita pop-ups para este site.' };
      }
      if (error.code === 'auth/operation-not-allowed') {
        return { 
          success: false, 
          message: 'Ative o provedor Google no Firebase Console (Menu Authentication > Sign-in method > Google).' 
        };
      }
      if (error.code === 'auth/unauthorized-domain') {
        return { success: false, message: 'Domínio não autorizado no Firebase Console. Adicione seu domínio em Authentication > Configurações.' };
      }
      if (error.code === 'auth/invalid-api-key' || error.message?.includes('DummyKey')) {
        return { 
          success: false, 
          message: 'Configure as credenciais do seu projeto no arquivo js/firebase-config.js para habilitar o Google Sign-In real.' 
        };
      }

      return { 
        success: false, 
        message: error.message || 'Não foi possível concluir o login com o Google.' 
      };
    }
  }

  // ==========================================================================
  // LOGIN DE PAIS (E-MAIL E SENHA)
  // ==========================================================================
  async loginParent(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, message: 'Por favor, preencha o e-mail e a senha.' };
    }

    // 1. Tenta autenticação via Firebase se disponível
    const fb = window.FirebaseModule;
    if (fb && fb.auth && fb.isFirebaseConfigured) {
      try {
        const userCredential = await fb.signInWithEmailAndPassword(fb.auth, cleanEmail, password);
        const fbUser = userCredential.user;
        const child = this.getOrCreateChildForParent(fbUser.email, fbUser.displayName);

        this.currentUser = {
          uid: fbUser.uid,
          name: fbUser.displayName || cleanEmail.split('@')[0],
          email: fbUser.email,
          role: 'parent',
          childId: child.id,
          avatar: '👪'
        };
        localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
        this.notify();
        return { success: true, user: this.currentUser };
      } catch (err) {
        console.warn('Tentativa Firebase falhou, verificando base local:', err.code);
      }
    }

    // 2. Verificação de usuários cadastrados localmente
    const users = JSON.parse(localStorage.getItem('brinca_aprende_registered_users') || '[]');
    const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password && u.role === 'parent');

    if (user) {
      this.currentUser = user;
      localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
      this.notify();
      return { success: true, user: this.currentUser };
    }

    return { 
      success: false, 
      message: 'E-mail ou senha incorretos. Caso seja novo, clique na aba Cadastrar.' 
    };
  }

  // ==========================================================================
  // CADASTRO DE PAIS / FAMÍLIA (EXCLUSIVO PARA PAIS)
  // ==========================================================================
  async registerParent(arg1, email, password, babyName, babyAge) {
    let data;
    if (typeof arg1 === 'object' && arg1 !== null) {
      data = arg1;
    } else {
      data = {
        name: arg1,
        email: email,
        password: password,
        babyName: babyName,
        babyAge: babyAge || '1 ano',
        turma: 'Berçário 1',
        avatar: '👶',
        phone: '',
        notes: ''
      };
    }

    const cleanName = (data.name || '').trim();
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const cleanPassword = data.password || '';
    const cleanBabyName = (data.babyName || '').trim();

    if (!cleanName || !cleanEmail || !cleanPassword || !cleanBabyName) {
      return { success: false, message: 'Preencha todos os campos obrigatórios (*).' };
    }

    const isGoogleAccount = cleanEmail.endsWith('@gmail.com');

    // Cria a criança no sistema com todas as informações padronizadas
    const newChild = window.storageService.addChild({
      name: cleanBabyName,
      age: data.babyAge ? data.babyAge.trim() : '1 ano',
      turma: data.turma || 'Berçário 1',
      avatar: data.avatar || '👶',
      parentEmail: cleanEmail,
      responsible: `${cleanName} (Responsável)`,
      phone: data.phone ? data.phone.trim() : '',
      notes: data.notes ? data.notes.trim() : '',
      isGoogle: isGoogleAccount
    });

    let fbUid = 'user_' + Date.now();

    // Cria no Firebase Auth se configurado
    const fb = window.FirebaseModule;
    if (fb && fb.auth && fb.isFirebaseConfigured) {
      try {
        const userCredential = await fb.createUserWithEmailAndPassword(fb.auth, cleanEmail, cleanPassword);
        await fb.updateProfile(userCredential.user, { displayName: cleanName });
        fbUid = userCredential.user.uid;
      } catch (err) {
        console.warn('Aviso ao registrar no Firebase Auth:', err.message);
      }
    }

    const newUser = {
      uid: fbUid,
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      phone: data.phone || '',
      role: 'parent',
      childId: newChild.id,
      avatar: '👪',
      isGoogle: isGoogleAccount
    };

    if (isGoogleAccount) {
      try {
        const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
        const filteredG = gAccounts.filter(g => (g.email || '').toLowerCase().trim() !== cleanEmail);
        const gData = {
          uid: fbUid,
          name: cleanName,
          email: cleanEmail,
          photoURL: null,
          provider: 'google.com',
          childId: newChild.id,
          childName: cleanBabyName,
          createdAt: new Date().toISOString()
        };
        filteredG.push(gData);
        localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(filteredG));
        if (window.storageService && window.storageService.cloudSaveGoogleAccount) {
          window.storageService.cloudSaveGoogleAccount(gData);
        }
      } catch (e) {}
    }

    const users = JSON.parse(localStorage.getItem('brinca_aprende_registered_users') || '[]');
    const filtered = users.filter(u => u.email.toLowerCase() !== cleanEmail);
    filtered.push(newUser);
    localStorage.setItem('brinca_aprende_registered_users', JSON.stringify(filtered));
    if (window.storageService && window.storageService.cloudSaveUser) {
      window.storageService.cloudSaveUser(newUser);
    }

    this.currentUser = newUser;
    localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
    this.notify();

    return { success: true, user: this.currentUser };
  }

  // ==========================================================================
  // LOGIN DE CUIDADOR / EDUCADOR
  // Não há auto-cadastro público. Apenas e-mails previamente cadastrados no backend.
  // ==========================================================================
  async loginEducator(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, message: 'Informe o e-mail institucional e a senha.' };
    }

    const caregiver = this.findAuthorizedCaregiver(cleanEmail);
    if (!caregiver) {
      return { 
        success: false, 
        message: 'Acesso negado: Este e-mail não possui permissão de educador. O cadastro de cuidadores é realizado internamente pela direção.' 
      };
    }

    // Se Firebase estiver configurado, valida credenciais no Firebase
    const fb = window.FirebaseModule;
    if (fb && fb.auth && fb.isFirebaseConfigured) {
      try {
        const userCredential = await fb.signInWithEmailAndPassword(fb.auth, cleanEmail, password);
        this.currentUser = {
          uid: userCredential.user.uid,
          name: caregiver.name,
          email: cleanEmail,
          role: 'admin',
          avatar: caregiver.avatar || '👩‍🏫',
          turma: caregiver.turma
        };
        localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
        this.notify();
        return { success: true, user: this.currentUser };
      } catch (err) {
        console.warn('Firebase login educator:', err.code);
      }
    }

    // Validação local de segurança para cuidadores autorizados
    // Senha padrão inicial para cuidadores cadastrados no backend (ou senha salva pela direção)
    const storedEducators = JSON.parse(localStorage.getItem('brinca_aprende_educators_pass') || '{}');
    const validPass = storedEducators[cleanEmail] || 'admin123';

    if (password === validPass) {
      this.currentUser = {
        uid: 'caregiver_' + cleanEmail.replace(/[^a-z0-9]/g, '_'),
        name: caregiver.name,
        email: cleanEmail,
        role: 'admin',
        avatar: caregiver.avatar || '👩‍🏫',
        turma: caregiver.turma
      };
      localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
      this.notify();
      return { success: true, user: this.currentUser };
    }

    return { success: false, message: 'Senha incorreta para o perfil de educador.' };
  }

  // Logout
  async logout() {
    const fb = window.FirebaseModule;
    if (fb && fb.auth && fb.signOut) {
      try {
        await fb.signOut(fb.auth);
      } catch (e) {
        console.warn('Erro ao deslogar do Firebase:', e);
      }
    }

    this.currentUser = null;
    localStorage.removeItem('brinca_aprende_current_user');
    this.notify();
  }
}

window.authService = new AuthService();
