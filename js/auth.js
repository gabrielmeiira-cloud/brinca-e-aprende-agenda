/**
 * Auth Service - Brinca e Aprende Agenda Berçário
 * Gerencia autenticação de Pais e Educadores/Administradores, cadastro e login com Google.
 */

const ADMIN_CREDENTIALS = {
  email: 'admin@brincaeaprende.com.br',
  password: 'admin123',
  name: 'Tia Carol (Educadora)',
  role: 'admin',
  avatar: '👩‍🏫'
};

const DEFAULT_PARENT_DEMO = {
  email: 'pais.theo@gmail.com',
  password: '123456',
  name: 'Mariana Oliveira',
  role: 'parent',
  childId: 'child_1',
  avatar: '👩'
};

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
      } else {
        // Inicialmente deslogado para o usuário ver a tela de login como solicitado
        this.currentUser = null;
      }
    } catch {
      this.currentUser = null;
    }
  }

  onAuthStateChanged(callback) {
    this.listeners.push(callback);
    callback(this.currentUser);
  }

  notify() {
    this.listeners.forEach(cb => cb(this.currentUser));
  }

  getCurrentUser() {
    return this.currentUser;
  }

  isAdmin() {
    return this.currentUser && this.currentUser.role === 'admin';
  }

  // Login tradicional
  login(email, password) {
    const cleanEmail = (email || '').trim().toLowerCase();

    // Verificação de Administrador / Educador
    if (cleanEmail === ADMIN_CREDENTIALS.email.toLowerCase() && password === ADMIN_CREDENTIALS.password) {
      this.currentUser = { ...ADMIN_CREDENTIALS };
      localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
      this.notify();
      return { success: true, user: this.currentUser };
    }

    // Verificação de Pais demo
    if (cleanEmail === DEFAULT_PARENT_DEMO.email.toLowerCase() && password === DEFAULT_PARENT_DEMO.password) {
      this.currentUser = { ...DEFAULT_PARENT_DEMO };
      localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
      this.notify();
      return { success: true, user: this.currentUser };
    }

    // Usuários cadastrados no localStorage
    const users = JSON.parse(localStorage.getItem('brinca_aprende_registered_users') || '[]');
    const user = users.find(u => u.email.toLowerCase() === cleanEmail && u.password === password);

    if (user) {
      this.currentUser = user;
      localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
      this.notify();
      return { success: true, user: this.currentUser };
    }

    // Se preencheu e não encontrou
    if (cleanEmail && password && password.length >= 4) {
      const autoUser = {
        email: cleanEmail,
        name: cleanEmail.split('@')[0].replace('.', ' '),
        role: 'parent',
        childId: 'child_1',
        avatar: '👪'
      };
      this.currentUser = autoUser;
      localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
      this.notify();
      return { success: true, user: this.currentUser };
    }

    return { success: false, message: 'E-mail ou senha incorretos. Use a senha de demonstração ou faça login com o Google.' };
  }

  // Cadastro rápido para pais
  register(name, email, password, babyName, babyAge) {
    const cleanEmail = (email || '').trim().toLowerCase();

    // Cria a criança no sistema
    const newChild = window.storageService.addChild({
      name: babyName || 'Meu Bebê',
      age: babyAge || '1 ano',
      turma: 'Berçário 1',
      avatar: '👶',
      parentEmail: cleanEmail,
      responsible: `${name} (Responsável)`
    });

    const newUser = {
      name: name,
      email: cleanEmail,
      password: password,
      role: 'parent',
      childId: newChild.id,
      avatar: '👩'
    };

    const users = JSON.parse(localStorage.getItem('brinca_aprende_registered_users') || '[]');
    users.push(newUser);
    localStorage.setItem('brinca_aprende_registered_users', JSON.stringify(users));

    this.currentUser = newUser;
    localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
    this.notify();
    return { success: true, user: this.currentUser };
  }

  // Login com Google Rápido (1 clique)
  loginWithGoogle() {
    const googleUser = {
      name: 'Família Conectada (Google)',
      email: 'familia.conectada@gmail.com',
      role: 'parent',
      childId: 'child_1',
      avatar: '👪',
      isGoogleAuth: true
    };

    this.currentUser = googleUser;
    localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
    this.notify();
    return { success: true, user: this.currentUser };
  }

  // Login direto como Educador (Admin) para testes
  loginAsAdminQuick() {
    this.currentUser = { ...ADMIN_CREDENTIALS };
    localStorage.setItem('brinca_aprende_current_user', JSON.stringify(this.currentUser));
    this.notify();
    return { success: true, user: this.currentUser };
  }

  // Logout
  logout() {
    this.currentUser = null;
    localStorage.removeItem('brinca_aprende_current_user');
    this.notify();
  }
}

window.authService = new AuthService();
