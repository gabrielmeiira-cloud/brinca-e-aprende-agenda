/**
 * Main Application - Brinca e Aprende Agenda Berçário
 * Versão Mobile First com foco na Tela de Login / Cadastro e Identidade Original
 */

function initApp() {
  const appContainer = document.getElementById('app');

  // Estado da aplicação
  const state = {
    selectedDate: window.storageService.getTodayDateString(),
    selectedChildId: null,
    authTab: 'login', // 'login' | 'register' | 'admin'
    showPassword: false,
    adminEditingRoutine: null,
    previewAsParent: false
  };

  // Toast notification helper
  function showToast(message, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
    toast.innerHTML = `
      <span style="font-size: 1.2rem;">${type === 'success' ? '✨' : '⚠️'}</span>
      <div style="flex: 1;">${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Formata data amigável em Português
  function formatDateFriendly(dateStr) {
    const parts = dateStr.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    return `${days[date.getDay()]}, ${parts[2]} de ${months[date.getMonth()]} de ${parts[0]}`;
  }

  // Helper para renderizar avatar (foto do Google ou emoji padrão)
  function renderUserAvatar(user) {
    const photo = (user?.photoURL && user.photoURL.startsWith('http')) ? user.photoURL :
                  (user?.avatar && user.avatar.startsWith('http') ? user.avatar : null);
    if (photo) {
      return `<img src="${photo}" alt="${user?.name || 'Foto'}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" onerror="this.outerHTML='👤'">`;
    }
    return user?.avatar || '👤';
  }

  // Render principal
  function render() {
    const currentUser = window.authService.getCurrentUser();

    if (!currentUser) {
      appContainer.classList.remove('app-view-wide');
      renderAuthScreen();
      return;
    }

    // Se for pai e não tiver criança vinculada no objeto, busca no banco pelo email
    if (currentUser.role === 'parent' && (!currentUser.childId || currentUser.needsChildRegistration)) {
      const children = window.storageService ? window.storageService.getChildren() : [];
      const match = children.find(c => (c.parentEmail || '').toLowerCase().trim() === (currentUser.email || '').toLowerCase().trim());
      if (match) {
        currentUser.childId = match.id;
        currentUser.needsChildRegistration = false;
        try {
          localStorage.setItem('brinca_aprende_current_user', JSON.stringify(currentUser));
        } catch {}
      }
    }

    // Se o usuário logou com Google mas realmente ainda precisa cadastrar o bebê
    if (currentUser.role === 'parent' && (currentUser.needsChildRegistration || !currentUser.childId)) {
      appContainer.classList.remove('app-view-wide');
      renderChildRegistrationScreen(currentUser);
      return;
    }

    appContainer.classList.add('app-view-wide');
    if (!state.selectedChildId) {
      if (currentUser.role === 'parent' && currentUser.childId) {
        state.selectedChildId = currentUser.childId;
      } else {
        const children = window.storageService.getChildren();
        state.selectedChildId = children[0] ? children[0].id : 'child_1';
      }
    }

    renderAgendaScreen(currentUser);
  }

  // ==========================================================================
  // TELA DE CADASTRO COMPLETO DA CONTA E DO BEBÊ (PÓS AUTENTICAÇÃO COM GOOGLE)
  // ==========================================================================
  function renderChildRegistrationScreen(currentUser) {
    let selectedAvatar = '👶';
    let showRegPassword = false;

    appContainer.innerHTML = `
      <div class="auth-wrapper">
        <header class="brand-header">
          <div class="brand-logo-container">
            <img src="assets/logo.png" alt="Brinca e Aprende Berçário" class="brand-logo-img">
          </div>
        </header>

        <div class="auth-card" style="max-width: 480px; margin: 0 auto;">
          <div style="display: flex; align-items: center; gap: 10px; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 14px; border-radius: var(--radius-sm); margin-bottom: 16px;">
            ${currentUser.photoURL ? `<img src="${currentUser.photoURL}" alt="Google Avatar" style="width: 38px; height: 38px; border-radius: 50%; border: 2px solid #22c55e;">` : `<span style="font-size: 1.6rem;">👪</span>`}
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 0.86rem; font-weight: 800; color: #15803d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                Autenticado com o Google 🟢
              </div>
              <div style="font-size: 0.72rem; color: #166534; word-break: break-all;">
                E-mail: <strong>${currentUser.email}</strong>
              </div>
            </div>
          </div>

          <h2 class="auth-heading" style="font-size: 1.25rem;">Finalizar Cadastro da Família 📝</h2>
          <p class="auth-subheading">Preencha os dados do seu bebê e defina a senha da sua conta para acessar a agenda</p>

          <form id="childRegistrationForm">
            <!-- Dados do Responsável -->
            <div class="form-group">
              <label class="form-label" for="googleParentName">Nome Completo do Responsável *</label>
              <div class="input-container">
                <span class="input-icon">👤</span>
                <input type="text" id="googleParentName" class="form-input" value="${currentUser.name || ''}" placeholder="Ex: Mariana Oliveira" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleParentPhone">Telefone / WhatsApp de Contato</label>
              <div class="input-container">
                <span class="input-icon">📱</span>
                <input type="tel" id="googleParentPhone" class="form-input" placeholder="(77) 99999-9999">
              </div>
            </div>

            <!-- Dados do Bebê -->
            <div class="form-group">
              <label class="form-label" for="googleBabyName">Nome Completo do Bebê *</label>
              <div class="input-container">
                <span class="input-icon">👶</span>
                <input type="text" id="googleBabyName" class="form-input" placeholder="Ex: Theo Oliveira" required autofocus>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleBabyAge">Idade ou Data de Nascimento *</label>
              <div class="input-container">
                <span class="input-icon">🎂</span>
                <input type="text" id="googleBabyAge" class="form-input" placeholder="Ex: 1 ano e 2 meses ou 15/04/2023" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleBabyTurma">Turma do Berçário *</label>
              <div class="input-container">
                <span class="input-icon">🏫</span>
                <select id="googleBabyTurma" class="form-input no-icon" style="padding-left: 12px; font-weight: 700;">
                  <option value="Berçário 1" selected>Berçário 1 (4 meses a 1 ano)</option>
                  <option value="Berçário 2">Berçário 2 (1 a 2 anos)</option>
                  <option value="Maternal">Maternal (2 a 3 anos)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Ícone do Bebê</label>
              <div style="display: flex; gap: 8px; margin-top: 6px;" id="avatarSelectorContainer">
                <button type="button" class="avatar-select-btn active" data-avatar="👶" style="flex: 1; padding: 10px 4px; font-size: 1.15rem; border: 2px solid var(--brand-pink); border-radius: var(--radius-sm); background: var(--brand-pink-light); cursor: pointer;">
                  👶 Menino
                </button>
                <button type="button" class="avatar-select-btn" data-avatar="👧" style="flex: 1; padding: 10px 4px; font-size: 1.15rem; border: 2px solid var(--gray-200); border-radius: var(--radius-sm); background: white; cursor: pointer;">
                  👧 Menina
                </button>
                <button type="button" class="avatar-select-btn" data-avatar="🍼" style="flex: 1; padding: 10px 4px; font-size: 1.15rem; border: 2px solid var(--gray-200); border-radius: var(--radius-sm); background: white; cursor: pointer;">
                  🍼 Bebê
                </button>
                <button type="button" class="avatar-select-btn" data-avatar="🧸" style="flex: 1; padding: 10px 4px; font-size: 1.15rem; border: 2px solid var(--gray-200); border-radius: var(--radius-sm); background: white; cursor: pointer;">
                  🧸 Ursinho
                </button>
              </div>
            </div>

            <!-- Criação de Senha da Conta -->
            <div class="form-group">
              <label class="form-label" for="googleAccountPassword">Criar Senha de Acesso à Conta *</label>
              <div class="input-container">
                <span class="input-icon">🔒</span>
                <input type="password" id="googleAccountPassword" class="form-input" placeholder="Mínimo 6 caracteres" minlength="4" required autocomplete="new-password">
                <button type="button" id="toggleGooglePassBtn" class="password-toggle-btn" title="Mostrar/ocultar senha">
                  👁️
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleAccountPasswordConfirm">Confirmar Senha *</label>
              <div class="input-container">
                <span class="input-icon">🔒</span>
                <input type="password" id="googleAccountPasswordConfirm" class="form-input" placeholder="Repita a senha digitada" minlength="4" required autocomplete="new-password">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleBabyNotes">Observações de Saúde / Cuidados (opcional)</label>
              <div class="input-container">
                <span class="input-icon">📝</span>
                <input type="text" id="googleBabyNotes" class="form-input" placeholder="Ex: Alergia a lactose, sono, etc.">
              </div>
            </div>

            <button type="submit" id="saveBabyBtn" class="btn btn-primary" style="margin-top: 10px;">
              Concluir Cadastro e Acessar Agenda 🚀
            </button>
          </form>

          <div style="text-align: center; margin-top: 14px;">
            <button type="button" id="cancelGoogleLoginBtn" style="background: none; border: none; font-size: 0.78rem; color: var(--gray-500); cursor: pointer; text-decoration: underline;">
              🚪 Sair / Entrar com outra conta
            </button>
          </div>
        </div>

        <footer class="app-cloud-footer">
          <svg class="cloud-bottom-wave" viewBox="0 0 400 36" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
            <path d="M 400,36 L 0,36 L 0,22 C 25,6 75,6 100,20 C 125,4 175,4 200,20 C 225,6 275,6 300,20 C 325,4 375,4 400,22 Z" fill="#EC4899"/>
          </svg>
          <div class="cloud-footer-bar">
            <p class="cloud-footer-text">
              <strong>Brinca e Aprende</strong> • Espaço Kids & Berçário 💖
            </p>
          </div>
        </footer>
      </div>
    `;

    // Alternar visibilidade da senha
    document.getElementById('toggleGooglePassBtn')?.addEventListener('click', () => {
      showRegPassword = !showRegPassword;
      const passInput = document.getElementById('googleAccountPassword');
      const passConfirm = document.getElementById('googleAccountPasswordConfirm');
      const toggleBtn = document.getElementById('toggleGooglePassBtn');
      if (passInput) passInput.type = showRegPassword ? 'text' : 'password';
      if (passConfirm) passConfirm.type = showRegPassword ? 'text' : 'password';
      if (toggleBtn) toggleBtn.innerText = showRegPassword ? '🙈' : '👁️';
    });

    // Seleção de avatar
    document.querySelectorAll('.avatar-select-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.avatar-select-btn').forEach(b => {
          b.style.borderColor = 'var(--gray-200)';
          b.style.background = 'white';
        });
        btn.style.borderColor = 'var(--brand-pink)';
        btn.style.background = 'var(--brand-pink-light)';
        selectedAvatar = btn.dataset.avatar;
      });
    });

    // Envio do formulário do cadastro completo
    document.getElementById('childRegistrationForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const parentName = document.getElementById('googleParentName').value;
      const parentPhone = document.getElementById('googleParentPhone').value;
      const babyName = document.getElementById('googleBabyName').value;
      const babyAge = document.getElementById('googleBabyAge').value;
      const babyTurma = document.getElementById('googleBabyTurma').value;
      const pass = document.getElementById('googleAccountPassword').value;
      const passConfirm = document.getElementById('googleAccountPasswordConfirm').value;
      const babyNotes = document.getElementById('googleBabyNotes').value;

      if (pass !== passConfirm) {
        showToast('As senhas digitadas não coincidem. Por favor, verifique.', 'error');
        return;
      }

      if (pass.length < 4) {
        showToast('A senha deve ter no mínimo 4 caracteres.', 'error');
        return;
      }

      const res = window.authService.completeChildRegistration({
        parentName: parentName,
        phone: parentPhone,
        babyName: babyName,
        babyAge: babyAge,
        turma: babyTurma,
        password: pass,
        avatar: selectedAvatar,
        notes: babyNotes
      });

      if (res.success) {
        showToast(`Cadastro da família concluído com sucesso! Bem-vindo(a), ${parentName}! 🎉`, 'success');
        state.selectedChildId = res.child.id;
        render();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Cancelar / Logout
    document.getElementById('cancelGoogleLoginBtn')?.addEventListener('click', () => {
      window.authService.logout();
      showToast('Sessão encerrada.');
      render();
    });
  }

  // ==========================================================================
  // TELA DE LOGIN / CADASTRO (MOBILE FIRST COM LOGO ORIGINAL)
  // ==========================================================================
  function renderAuthScreen() {
    appContainer.innerHTML = `
      <div class="auth-wrapper">
        <!-- Header com Logo Original Recortado em Alta Resolução -->
        <header class="brand-header">
          <div class="brand-logo-container">
            <img src="assets/logo.png" alt="Brinca e Aprende Berçário" class="brand-logo-img">
          </div>
        </header>

        <!-- Card de Login Mobile -->
        <div class="auth-card">
          <!-- Abas de Navegação -->
          <div class="auth-nav-tabs">
            <button type="button" class="auth-nav-btn ${state.authTab === 'login' ? 'active' : ''}" id="tabLoginBtn">
              👪 Entrar
            </button>
            <button type="button" class="auth-nav-btn ${state.authTab === 'register' ? 'active' : ''}" id="tabRegisterBtn">
              ✨ Cadastrar
            </button>
            <button type="button" class="auth-nav-btn ${state.authTab === 'admin' ? 'active' : ''}" id="tabAdminBtn">
              👩‍🏫 Educador
            </button>
          </div>

          <!-- Conteúdo da Aba Ativa -->
          <div id="authContentArea">
            ${state.authTab === 'login' ? renderLoginForm() : ''}
            ${state.authTab === 'register' ? renderRegisterForm() : ''}
            ${state.authTab === 'admin' ? renderAdminLoginForm() : ''}
          </div>
        </div>
        <footer class="app-cloud-footer">
          <svg class="cloud-bottom-wave" viewBox="0 0 400 36" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
            <path d="M 400,36 L 0,36 L 0,22 C 25,6 75,6 100,20 C 125,4 175,4 200,20 C 225,6 275,6 300,20 C 325,4 375,4 400,22 Z" fill="#EC4899"/>
          </svg>
          <div class="cloud-footer-bar">
            <p class="cloud-footer-text">
              <strong>Brinca e Aprende</strong> • Espaço Kids & Berçário 💖
            </p>
          </div>
        </footer>
      </div>
    `;

    bindAuthEvents();
  }

  function renderLoginForm() {
    return `
      <h2 class="auth-heading">Acesso da Família</h2>
      <p class="auth-subheading">Acompanhe o dia a dia do seu bebê com amor e segurança</p>

      <form id="loginForm">
        <div class="form-group">
          <label class="form-label" for="loginEmail">E-mail dos Pais</label>
          <div class="input-container">
            <span class="input-icon">✉️</span>
            <input type="email" id="loginEmail" class="form-input" placeholder="seu.email@exemplo.com" required autocomplete="email">
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" for="loginPassword" style="margin-bottom: 0;">Senha</label>
            <a href="#" id="forgotPasswordLink" style="font-size: 0.76rem; color: var(--brand-pink-dark); text-decoration: none; font-weight: 700;">Esqueceu a senha?</a>
          </div>
          <div class="input-container">
            <span class="input-icon">🔒</span>
            <input type="${state.showPassword ? 'text' : 'password'}" id="loginPassword" class="form-input" placeholder="Sua senha" required autocomplete="current-password">
            <button type="button" id="togglePasswordBtn" class="password-toggle-btn" title="Mostrar/ocultar senha">
              ${state.showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button type="submit" id="submitLoginBtn" class="btn btn-primary">
          Entrar na Agenda 🚀
        </button>
      </form>

      <div class="form-divider">
        <span>ou acesse com sua conta</span>
      </div>

      <!-- Botão Google Oficial -->
      <button type="button" id="googleLoginBtn" class="btn btn-google">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Continuar com o Google
      </button>

      <!-- Botão para Educador -->
      <div class="admin-switch-card">
        <p>Você faz parte da equipe escolar ou berçário?</p>
        <button type="button" id="switchToAdminTabBtn" class="btn btn-admin-pill">
          👩‍🏫 Acesso de Cuidador / Educador
        </button>
      </div>
    `;
  }

  function renderRegisterForm() {
    return `
      <h2 class="auth-heading">Novo Cadastro da Família 📝</h2>
      <p class="auth-subheading">Preencha os dados do seu bebê para criar sua conta e acessar a agenda</p>

      <form id="registerForm">
        <!-- Dados do Responsável -->
        <div class="form-group">
          <label class="form-label" for="regName">Nome Completo do Responsável *</label>
          <div class="input-container">
            <span class="input-icon">👤</span>
            <input type="text" id="regName" class="form-input" placeholder="Ex: Mariana Oliveira" required>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="regEmail">E-mail dos Pais *</label>
            <div class="input-container">
              <span class="input-icon">✉️</span>
              <input type="email" id="regEmail" class="form-input" placeholder="seu.email@exemplo.com" required autocomplete="email">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="regPhone">WhatsApp / Telefone</label>
            <div class="input-container">
              <span class="input-icon">📱</span>
              <input type="tel" id="regPhone" class="form-input" placeholder="(77) 99999-9999">
            </div>
          </div>
        </div>

        <!-- Dados do Bebê -->
        <div class="form-row">
          <div class="form-group" style="flex: 1.3;">
            <label class="form-label" for="regBabyName">Nome do Bebê *</label>
            <div class="input-container">
              <span class="input-icon">👶</span>
              <input type="text" id="regBabyName" class="form-input" placeholder="Ex: Theo Oliveira" required>
            </div>
          </div>
          <div class="form-group" style="flex: 0.9;">
            <label class="form-label" for="regBabyAge">Idade *</label>
            <div class="input-container">
              <span class="input-icon">🎂</span>
              <input type="text" id="regBabyAge" class="form-input" placeholder="Ex: 1 ano" required>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group" style="flex: 1.1;">
            <label class="form-label" for="regBabyTurma">Turma *</label>
            <div class="input-container">
              <select id="regBabyTurma" class="form-input no-icon" style="padding-left: 10px; font-weight: 700;">
                <option value="Berçário 1" selected>Berçário 1</option>
                <option value="Berçário 2">Berçário 2</option>
                <option value="Maternal">Maternal</option>
              </select>
            </div>
          </div>
          <div class="form-group" style="flex: 1.5;">
            <label class="form-label">Ícone do Bebê</label>
            <div style="display: flex; gap: 4px;" id="regAvatarSelectorContainer">
              <button type="button" class="reg-avatar-btn active" data-avatar="👶" style="flex: 1; padding: 10px 0; font-size: 1.15rem; border: 2px solid var(--brand-pink); border-radius: var(--radius-sm); background: var(--brand-pink-light); cursor: pointer;" title="Menino">
                👶
              </button>
              <button type="button" class="reg-avatar-btn" data-avatar="👧" style="flex: 1; padding: 10px 0; font-size: 1.15rem; border: 2px solid var(--gray-200); border-radius: var(--radius-sm); background: white; cursor: pointer;" title="Menina">
                👧
              </button>
              <button type="button" class="reg-avatar-btn" data-avatar="🍼" style="flex: 1; padding: 10px 0; font-size: 1.15rem; border: 2px solid var(--gray-200); border-radius: var(--radius-sm); background: white; cursor: pointer;" title="Mamadeira">
                🍼
              </button>
              <button type="button" class="reg-avatar-btn" data-avatar="🧸" style="flex: 1; padding: 10px 0; font-size: 1.15rem; border: 2px solid var(--gray-200); border-radius: var(--radius-sm); background: white; cursor: pointer;" title="Ursinho">
                🧸
              </button>
            </div>
          </div>
        </div>

        <!-- Senhas lado a lado -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="regPassword">Criar Senha *</label>
            <div class="input-container">
              <span class="input-icon">🔒</span>
              <input type="password" id="regPassword" class="form-input" placeholder="Mín. 4 dígitos" minlength="4" required autocomplete="new-password">
              <button type="button" id="toggleRegPasswordBtn" class="password-toggle-btn" title="Mostrar/ocultar senha">
                👁️
              </button>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label" for="regPasswordConfirm">Confirmar *</label>
            <div class="input-container">
              <span class="input-icon">🔒</span>
              <input type="password" id="regPasswordConfirm" class="form-input" placeholder="Repita a senha" minlength="4" required autocomplete="new-password">
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regNotes">Observações / Restrições (opcional)</label>
          <div class="input-container">
            <span class="input-icon">📝</span>
            <input type="text" id="regNotes" class="form-input" placeholder="Ex: Alergias, sono, cuidados especiais">
          </div>
        </div>

        <button type="submit" id="submitRegBtn" class="btn btn-primary" style="margin-top: 4px;">
          Criar Cadastro e Entrar na Agenda 🌟
        </button>
      </form>

      <div class="form-divider">
        <span>ou cadastre-se via Google</span>
      </div>

      <button type="button" id="googleRegBtn" class="btn btn-google">
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
        Cadastrar Instantâneo com Google
      </button>
    `;
  }

  function renderAdminLoginForm() {
    return `
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 100%; margin-bottom: 8px;">
        <span style="background: var(--brand-pink-light); color: var(--brand-pink-dark); font-size: 0.74rem; font-weight: 800; padding: 4px 12px; border-radius: var(--radius-full); text-transform: uppercase;">
          Área do Educador / Equipe
        </span>
      </div>
      <h2 class="auth-heading">Painel do Berçário</h2>
      <p class="auth-subheading">Acesso exclusivo para educadores e berçaristas autorizados</p>

      <form id="adminLoginForm">
        <div class="form-group">
          <label class="form-label" for="adminEmail">E-mail Institucional</label>
          <div class="input-container">
            <span class="input-icon">👩‍🏫</span>
            <input type="email" id="adminEmail" class="form-input" placeholder="seu.email@brincaeaprende.com.br" required autocomplete="email">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="adminPassword">Senha de Acesso</label>
          <div class="input-container">
            <span class="input-icon">🔑</span>
            <input type="password" id="adminPassword" class="form-input" placeholder="Sua senha institucional" required autocomplete="current-password">
            <button type="button" id="toggleAdminPasswordBtn" class="password-toggle-btn" title="Mostrar/ocultar senha">
              👁️
            </button>
          </div>
        </div>

        <button type="submit" id="submitAdminBtn" class="btn btn-cyan" style="margin-top: 6px;">
          Entrar no Painel do Berçário ✏️
        </button>
      </form>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: var(--radius-sm); margin-top: 16px; font-size: 0.76rem; color: var(--gray-600); line-height: 1.4;">
        🔒 <strong>Acesso Controlado:</strong> Por segurança, contas de educadores e cuidadores são criadas e autorizadas exclusivamente pelo sistema administrativo da escola. Não há cadastro público para cuidadores.
      </div>
    `;
  }

  // Transição instantânea e estável entre abas de autenticação (sem recriar o card inteiro)
  function switchAuthTab(newTab) {
    state.authTab = newTab;
    const contentArea = document.getElementById('authContentArea');
    if (!contentArea) {
      render();
      return;
    }

    document.getElementById('tabLoginBtn')?.classList.toggle('active', newTab === 'login');
    document.getElementById('tabRegisterBtn')?.classList.toggle('active', newTab === 'register');
    document.getElementById('tabAdminBtn')?.classList.toggle('active', newTab === 'admin');

    if (newTab === 'login') {
      contentArea.innerHTML = renderLoginForm();
    } else if (newTab === 'register') {
      contentArea.innerHTML = renderRegisterForm();
    } else if (newTab === 'admin') {
      contentArea.innerHTML = renderAdminLoginForm();
    }

    bindAuthContentEvents();
  }

  function bindAuthNavEvents() {
    document.getElementById('tabLoginBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('login');
    });
    document.getElementById('tabRegisterBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('register');
    });
    document.getElementById('tabAdminBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('admin');
    });
  }

  function bindAuthContentEvents() {
    // Atalho dentro do card de login para alternar para educador
    document.getElementById('switchToAdminTabBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab('admin');
    });

    // Toggle de visibilidade da senha (sem re-renderizar o formulário)
    const setupPasswordToggle = (inputId, btnId) => {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      if (btn && input) {
        btn.addEventListener('click', () => {
          const isPass = input.type === 'password';
          input.type = isPass ? 'text' : 'password';
          btn.innerText = isPass ? '🙈' : '👁️';
        });
      }
    };

    setupPasswordToggle('loginPassword', 'togglePasswordBtn');
    setupPasswordToggle('regPassword', 'toggleRegPasswordBtn');
    setupPasswordToggle('adminPassword', 'toggleAdminPasswordBtn');

    // Recuperação de senha
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value;
      if (email && window.FirebaseModule && window.FirebaseModule.auth && window.FirebaseModule.sendPasswordResetEmail) {
        window.FirebaseModule.sendPasswordResetEmail(window.FirebaseModule.auth, email)
          .then(() => showToast('E-mail de recuperação enviado com sucesso!'))
          .catch(() => showToast('Enviamos as instruções para o seu e-mail cadastrado.'));
      } else {
        showToast('Digite seu e-mail no campo acima para enviarmos o link de recuperação.');
      }
    });

    // Login Form Submit (Pais)
    document.getElementById('loginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitLoginBtn');
      const email = document.getElementById('loginEmail')?.value;
      const pass = document.getElementById('loginPassword')?.value;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Entrando... ⏳';
      }

      try {
        const res = await window.authService.loginParent(email, pass);
        if (res.success) {
          showToast(`Bem-vindo(a), ${res.user.name}!`);
          render();
        } else {
          showToast(res.message, 'error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Entrar na Agenda 🚀';
        }
      }
    });

    // Seleção de Avatar no Cadastro Normal
    let selectedRegAvatar = '👶';
    document.querySelectorAll('.reg-avatar-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.reg-avatar-btn').forEach(b => {
          b.classList.remove('active');
          b.style.borderColor = 'var(--gray-200)';
          b.style.background = 'white';
        });
        btn.classList.add('active');
        btn.style.borderColor = 'var(--brand-pink)';
        btn.style.background = 'var(--brand-pink-light)';
        selectedRegAvatar = btn.dataset.avatar;
      });
    });

    // Register Form Submit (Pais)
    document.getElementById('registerForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitRegBtn');
      const name = document.getElementById('regName')?.value;
      const phone = document.getElementById('regPhone')?.value || '';
      const email = document.getElementById('regEmail')?.value;
      const baby = document.getElementById('regBabyName')?.value;
      const babyAge = document.getElementById('regBabyAge')?.value;
      const turma = document.getElementById('regBabyTurma')?.value || 'Berçário 1';
      const pass = document.getElementById('regPassword')?.value;
      const passConfirm = document.getElementById('regPasswordConfirm')?.value || '';
      const notes = document.getElementById('regNotes')?.value || '';

      if (pass !== passConfirm) {
        showToast('As senhas digitadas não coincidem. Verifique a confirmação.', 'error');
        return;
      }

      if (!pass || pass.length < 4) {
        showToast('A senha deve ter no mínimo 4 caracteres.', 'error');
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Cadastrando... ⏳';
      }

      try {
        const res = await window.authService.registerParent({
          name,
          phone,
          email,
          password: pass,
          babyName: baby,
          babyAge,
          turma,
          avatar: selectedRegAvatar,
          notes
        });
        if (res.success) {
          showToast(`Cadastro realizado com sucesso! Bem-vindo(a), ${name}!`);
          render();
        } else {
          showToast(res.message, 'error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Criar Cadastro e Entrar na Agenda 🌟';
        }
      }
    });

    // Admin Login Form Submit (Educadores)
    document.getElementById('adminLoginForm')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitAdminBtn');
      const email = document.getElementById('adminEmail')?.value;
      const pass = document.getElementById('adminPassword')?.value;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Verificando permissões... ⏳';
      }

      try {
        const res = await window.authService.loginEducator(email, pass);
        if (res.success) {
          showToast(`Painel do Educador liberado! Olá, ${res.user.name}!`);
          render();
        } else {
          showToast(res.message, 'error');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Entrar no Painel do Berçário ✏️';
        }
      }
    });

    // Login com Google Oficial via Firebase
    const handleGoogle = async (btn, isExplicitRegister = false) => {
      if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.6';
      }
      showToast('Conectando ao Google... Aguarde a janela pop-up.', 'success');

      try {
        const res = await window.authService.loginWithGoogle(isExplicitRegister);
        if (res.success) {
          showToast(`Autenticado com sucesso! Olá, ${res.user.name}!`);
          render();
        } else {
          showToast(res.message, 'error');
        }
      } catch (err) {
        showToast('Erro ao autenticar com o Google.', 'error');
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.style.opacity = '1';
        }
      }
    };

    document.getElementById('googleLoginBtn')?.addEventListener('click', function() {
      handleGoogle(this, false);
    });
    document.getElementById('googleRegBtn')?.addEventListener('click', function() {
      handleGoogle(this, true);
    });
  }

  function bindAuthEvents() {
    bindAuthNavEvents();
    bindAuthContentEvents();
  }

  // ==========================================================================
  // TELA DA AGENDA (PAIS & EDUCADOR)
  // ==========================================================================
  function renderAgendaScreen(currentUser) {
    const isActualAdmin = currentUser.role === 'admin';
    const isAdmin = isActualAdmin && !state.previewAsParent;
    const children = window.storageService.getChildren();
    const activeChild = window.storageService.getChildById(state.selectedChildId);
    const routine = window.storageService.getRoutine(state.selectedChildId, state.selectedDate);

    if (isAdmin && (!state.adminEditingRoutine || state.adminEditingRoutine.childId !== state.selectedChildId || state.adminEditingRoutine.date !== state.selectedDate)) {
      state.adminEditingRoutine = JSON.parse(JSON.stringify(routine));
    }

    const currentData = isAdmin ? state.adminEditingRoutine : routine;
    const hasData = window.storageService.hasRoutine(state.selectedChildId, state.selectedDate);

    const missingHygieneItems = Object.entries(currentData.hygiene)
      .filter(([key, val]) => typeof val === 'object' && val !== null && val.ok === false)
      .map(([k, v]) => v.name);

    appContainer.innerHTML = `
      <!-- Header do App -->
      <header class="brand-header" style="margin-bottom: 12px;">
        <div class="brand-logo-container" style="max-width: 200px; margin-bottom: 0;">
          <img src="assets/logo.png" alt="Brinca e Aprende" class="brand-logo-img" style="max-height: 90px;">
        </div>
      </header>

      <!-- Barra do Usuário -->
      <nav class="user-navbar">
        <div class="user-badge-info">
          <div class="user-avatar">${renderUserAvatar(currentUser)}</div>
          <div>
            <div style="font-size: 0.88rem; font-weight: 800; color: var(--gray-900); display: flex; align-items: center; gap: 6px;">
              ${currentUser.name}
              <span class="role-pill ${currentUser.role}">
                ${isActualAdmin ? 'Educadora' : 'Família'}
              </span>
              <span id="appCloudStatusBadge" title="Banco de Dados Cloud Firestore conectado e sincronizado em tempo real" style="font-size: 0.65rem; font-weight: 700; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 2px 7px; display: inline-flex; align-items: center; gap: 4px;">
                ☁️ Nuvem 🟢
              </span>
            </div>
            <div style="font-size: 0.75rem; color: var(--gray-500);">
              ${isActualAdmin ? (state.previewAsParent ? '👁️ Modo Visualização (Prévia Pais)' : '✏️ Modo Edição do Berçário') : `Bebê: <strong>${activeChild ? activeChild.name : 'Meu Bebê'}</strong>`}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 6px;">
          ${isActualAdmin ? `
            <button id="toggleRoleBtn" class="btn btn-secondary btn-sm" style="height: 32px; font-size: 0.74rem; padding: 4px 8px; width: auto;" title="Alternar visualização">
              ${state.previewAsParent ? '✏️ Modo Edição' : '👁️ Prévia dos Pais'}
            </button>
          ` : ''}
          <button id="logoutBtn" class="btn btn-secondary btn-sm" style="height: 32px; font-size: 0.74rem; padding: 4px 8px; width: auto; color: #ef4444;" title="Sair">
            🚪 Sair
          </button>
        </div>
      </nav>

      <!-- Barra de Ferramentas (Criança e Data) -->
      <div class="agenda-toolbar">
        ${isAdmin ? `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <label for="childSelector" style="font-size: 0.8rem; font-weight: 800; color: var(--gray-700);">Bebê:</label>
            <select id="childSelector" class="form-input no-icon" style="height: 38px; font-size: 0.85rem; padding: 4px 10px; font-weight: 700;">
              ${children.map(c => `
                <option value="${c.id}" ${c.id === state.selectedChildId ? 'selected' : ''}>
                  ${c.avatar} ${c.name} (${c.turma})
                </option>
              `).join('')}
            </select>
          </div>
        ` : `
          <div style="display: flex; align-items: center; justify-content: space-between; background: var(--brand-pink-light); padding: 8px 12px; border-radius: var(--radius-sm);">
            <div style="font-weight: 800; color: var(--brand-pink-dark); font-size: 0.88rem; display: flex; align-items: center; gap: 6px;">
              <span>${activeChild.avatar}</span> ${activeChild.name}
            </div>
            <span style="font-size: 0.75rem; color: var(--gray-600); font-weight: 700;">${activeChild.age}</span>
          </div>
        `}

        <div class="date-navigator">
          <button id="prevDateBtn" class="date-nav-btn">◀</button>
          <input type="date" id="datePickerInput" value="${state.selectedDate}" style="display: none;">
          <span id="dateDisplayLabel" class="date-display" style="cursor: pointer;">
            📅 ${formatDateFriendly(state.selectedDate)}
          </span>
          <button id="nextDateBtn" class="date-nav-btn">▶</button>
        </div>
      </div>

      ${!isAdmin && !hasData ? `
        <!-- Estado Inicial Sem Registros (Visão dos Pais) -->
        <div class="empty-agenda-container" style="background: white; border-radius: var(--radius-md); padding: 42px 20px; text-align: center; border: 1.5px dashed var(--brand-pink); margin: 20px 0; box-shadow: 0 4px 15px rgba(236, 72, 153, 0.05);">
          <div style="font-size: 3.2rem; margin-bottom: 12px;">🍼</div>
          <h3 style="font-size: 1.2rem; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
            Nenhum registro para este dia ainda
          </h3>
          <p style="font-size: 0.88rem; color: #64748b; line-height: 1.5; max-width: 380px; margin: 0 auto 16px auto;">
            As tias e educadoras do berçário começarão a registrar as refeições, trocas de fralda, sonecas e recadinhos de <strong>${activeChild ? activeChild.name : 'seu bebê'}</strong> ao longo das atividades do dia.
          </p>
          <div style="display: inline-flex; align-items: center; gap: 6px; background: #fdf2f8; color: #db2777; font-size: 0.82rem; font-weight: 700; padding: 6px 14px; border-radius: 9999px; border: 1px solid #fbcfe8;">
            <span>📅</span> ${formatDateFriendly(state.selectedDate)}
          </div>
        </div>
      ` : `
        <!-- Banner de Status para Educador -->
        ${isAdmin ? (hasData ? `
          <div style="background: #f0fdf4; border: 1px solid #86efac; color: #166534; border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 16px; font-size: 0.82rem; font-weight: 700; display: flex; align-items: center; justify-content: space-between;">
            <span>✅ Agenda preenchida e sincronizada em tempo real com a família de <strong>${activeChild ? activeChild.name : 'seu bebê'}</strong>.</span>
            <span style="font-size: 1.2rem;">🟢</span>
          </div>
        ` : `
          <div style="background: #eff6ff; border: 1.5px dashed #3b82f6; color: #1e40af; border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div>
              <div style="font-size: 0.88rem; font-weight: 800;">📝 Agenda em Branco (${formatDateFriendly(state.selectedDate)})</div>
              <div style="font-size: 0.76rem; color: #1d4ed8;">Preencha os campos abaixo e clique em <strong>Salvar Alterações</strong> para publicar para a família.</div>
            </div>
            <span style="font-size: 1.5rem;">✨</span>
          </div>
        `) : ''}

        <!-- Alerta de Mochila / Higiene -->
        ${missingHygieneItems.length > 0 ? `
          <div class="alert-banner has-missing">
            <strong style="color: var(--brand-pink-dark); display: block; margin-bottom: 2px;">⚠️ Atenção na Mochila:</strong>
            Falta repor: <strong>${missingHygieneItems.join(', ')}</strong>.
            ${currentData.hygiene.faltaObservacao ? `<br><em>"${currentData.hygiene.faltaObservacao}"</em>` : ''}
          </div>
        ` : `
          <div class="alert-banner">
            ✨ <strong>Mochila em dia!</strong> Todos os produtos de higiene estão abastecidos.
          </div>
        `}

        <!-- Cards da Agenda -->
        <div class="agenda-grid">
          
          <!-- PRODUTOS DE HIGIENE -->
          <div class="agenda-card">
            <div class="card-header">
              <h2 class="card-title">🧴 Produtos de Higiene</h2>
              <span style="font-size: 0.72rem; color: var(--gray-500); font-weight: 700;">
                ${isAdmin ? 'Clique p/ alterar' : 'Estoque'}
              </span>
            </div>
            <div class="card-body">
              <div class="hygiene-grid">
                ${renderHygieneItem('pomada', 'Pomada', '🧴', currentData.hygiene.pomada?.ok, isAdmin)}
                ${renderHygieneItem('fralda', 'Fralda', '🧷', currentData.hygiene.fralda?.ok, isAdmin)}
                ${renderHygieneItem('lenco', 'Lenço', '🧻', currentData.hygiene.lenco?.ok, isAdmin)}
                ${renderHygieneItem('shampoo', 'Shampoo', '🧴', currentData.hygiene.shampoo?.ok, isAdmin)}
                ${renderHygieneItem('condicionador', 'Condic.', '🧼', currentData.hygiene.condicionador?.ok, isAdmin)}
                ${renderHygieneItem('sabonete', 'Sabonete', '🧼', currentData.hygiene.sabonete?.ok, isAdmin)}
              </div>

              ${isAdmin ? `
                <div style="margin-top: 10px;">
                  <label class="form-label" style="font-size: 0.76rem;">Observação de Reposição (FALTA):</label>
                  <input type="text" id="hygieneMissingNotes" class="form-input no-icon" style="height: 38px; font-size: 0.82rem;"
                    placeholder="Ex: Trazer pomada e fralda tamanho M"
                    value="${currentData.hygiene.faltaObservacao || ''}">
                </div>
              ` : ''}
            </div>
          </div>

          <!-- REFEIÇÕES -->
          <div class="agenda-card">
            <div class="card-header">
              <h2 class="card-title">🍼 Alimentação & Refeições</h2>
            </div>
            <div class="card-body">
              ${currentData.meals.map((meal, index) => renderMealRow(meal, index, isAdmin)).join('')}
            </div>
          </div>

          <!-- FRALDAS & SONECAS -->
          <div class="agenda-card">
            <div class="card-header">
              <h2 class="card-title">🚼 Trocas de Fralda (${currentData.diapers?.count || currentData.diapers?.logs?.length || 0})</h2>
            </div>
            <div class="card-body">
              ${(currentData.diapers?.logs || []).length > 0 ? `
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px;">
                  ${currentData.diapers.logs.map((log, lIdx) => `
                    <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-sm); padding: 6px 8px; font-size: 0.78rem; position: relative;">
                      <strong>⏰ ${log.time}</strong> • ${log.type}
                      ${log.ointment ? `<br><span style="color: var(--brand-pink-dark); font-size: 0.7rem;">✓ Com pomada</span>` : ''}
                      ${isAdmin ? `
                        <button type="button" class="remove-diaper-btn" data-remove-diaper="${lIdx}" title="Remover troca" style="position: absolute; top: 4px; right: 4px; background: none; border: none; color: #ef4444; font-size: 0.8rem; cursor: pointer; font-weight: 800;">✕</button>
                      ` : ''}
                    </div>
                  `).join('')}
                </div>
              ` : `
                <div style="font-size: 0.82rem; color: #94a3b8; padding: 6px 0; font-style: italic; margin-bottom: 8px;">
                  Nenhuma troca de fralda registrada para esta data ainda.
                </div>
              `}

              ${isAdmin ? `
                <button type="button" id="addDiaperLogBtn" class="btn btn-secondary btn-sm" style="height: 34px; font-size: 0.76rem; margin-bottom: 14px; width: 100%;">
                  ➕ Registrar Nova Troca
                </button>
              ` : ''}

              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; margin-top: 8px;">
                <h3 style="font-size: 0.86rem; font-weight: 800; color: var(--gray-800); margin: 0;">😴 Sonecas</h3>
                ${isAdmin ? `
                  <button type="button" id="addSleepBtn" class="btn btn-secondary btn-sm" style="height: 28px; font-size: 0.72rem; padding: 2px 8px; width: auto;">
                    ➕ Adicionar Soneca
                  </button>
                ` : ''}
              </div>

              ${(currentData.sleep || []).length > 0 ? currentData.sleep.map((nap, sIdx) => `
                <div style="font-size: 0.8rem; background: var(--gray-50); padding: 6px 10px; border-radius: var(--radius-sm); margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                  <div>
                    <strong>${nap.period}: ${nap.time}</strong>
                    <span style="color: var(--brand-cyan-dark); font-weight: 700; margin-left: 6px;">${nap.quality}</span>
                  </div>
                  ${isAdmin ? `
                    <button type="button" class="remove-sleep-btn" data-remove-sleep="${sIdx}" title="Remover soneca" style="background: none; border: none; color: #ef4444; font-size: 0.8rem; cursor: pointer; font-weight: 800;">✕</button>
                  ` : ''}
                </div>
              `).join('') : `
                <div style="font-size: 0.82rem; color: #94a3b8; padding: 6px 0; font-style: italic;">
                  Nenhuma soneca registrada para esta data ainda.
                </div>
              `}
            </div>
          </div>

          <!-- RECADO E OBSERVAÇÕES -->
          <div class="agenda-card">
            <div class="card-header">
              <h2 class="card-title">💬 Observações & Recadinho</h2>
            </div>
            <div class="card-body">
              <div style="font-size: 0.78rem; font-weight: 800; margin-bottom: 6px;">Humor do dia:</div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                ${renderMoodOptions(currentData.mood?.label, isAdmin)}
              </div>

              ${isAdmin ? `
                <label class="form-label" style="font-size: 0.78rem;">Recado para a família:</label>
                <textarea id="teacherNoteInput" class="form-input no-icon" rows="3" style="height: auto; padding: 8px; font-size: 0.84rem;" placeholder="Como foi o dia do bebê hoje...">${currentData.observations?.teacherNote || ''}</textarea>
                <div style="margin-top: 6px;">
                  <input type="text" id="teacherNameInput" class="form-input no-icon" style="height: 34px; font-size: 0.8rem;" placeholder="Assinatura da Tia / Educadora" value="${currentData.observations?.teacherName || ''}">
                </div>
              ` : (currentData.observations?.teacherNote ? `
                <div style="background: #ffffff; border: 1.5px solid var(--brand-cyan-light); border-radius: var(--radius-md); padding: 12px; font-size: 0.85rem; line-height: 1.5;">
                  "${currentData.observations.teacherNote}"
                  <div style="text-align: right; margin-top: 8px; font-size: 0.76rem; color: var(--brand-cyan-dark); font-weight: 800;">
                    💌 ${currentData.observations.teacherName || 'Equipe Berçário'}
                  </div>
                </div>
              ` : `
                <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: var(--radius-sm); padding: 12px; font-size: 0.82rem; color: #94a3b8; font-style: italic; text-align: center;">
                  💌 O recadinho carinhoso da educadora ainda não foi publicado para esta data.
                </div>
              `)}
            </div>
          </div>

        </div>

        ${isAdmin ? `
          <div class="admin-sticky-bar">
            <div style="font-size: 0.78rem; font-weight: 800; color: var(--brand-pink-dark);">
              ✏️ Modo Cuidador
            </div>
            <button id="saveRoutineBtn" class="btn btn-primary" style="height: 38px; width: auto; font-size: 0.82rem; padding: 0 16px;">
              💾 Salvar Alterações
            </button>
          </div>
        ` : ''}
      `}

      <footer class="app-cloud-footer">
        <svg class="cloud-bottom-wave" viewBox="0 0 400 36" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" shape-rendering="geometricPrecision">
          <path d="M 400,36 L 0,36 L 0,22 C 25,6 75,6 100,20 C 125,4 175,4 200,20 C 225,6 275,6 300,20 C 325,4 375,4 400,22 Z" fill="#EC4899"/>
        </svg>
        <div class="cloud-footer-bar">
          <p class="cloud-footer-text">
            <strong>Brinca e Aprende</strong> • Espaço Kids & Berçário • Cuidando com amor 💖
          </p>
        </div>
      </footer>
    `;

    bindAgendaEvents(currentUser, activeChild, currentData, isAdmin);
  }

  function renderHygieneItem(key, label, icon, isOk, isAdmin) {
    const ok = isOk !== false;
    return `
      <div class="hygiene-item ${ok ? 'ok' : 'missing'}">
        <span style="font-size: 1.2rem;">${icon}</span>
        <span class="hygiene-label">${label}</span>
        <span class="hygiene-status-badge">${ok ? '✓ OK' : '⚠️ Falta'}</span>
        ${isAdmin ? `
          <button type="button" class="btn-toggle-hygiene ${ok ? 'is-ok' : 'is-missing'}" data-toggle-hygiene="${key}">
            ${ok ? 'Marcar Falta' : 'Marcar OK'}
          </button>
        ` : ''}
      </div>
    `;
  }

  function renderMealRow(meal, index, isAdmin) {
    const hasMealData = !!meal.acceptance || !!(meal.description && meal.description.trim() !== '');
    if (!isAdmin && !hasMealData) {
      return `
        <div class="meal-row" style="opacity: 0.7;">
          <div class="meal-time-info">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--gray-700);">
              ${meal.icon} ${meal.name} <span style="font-size: 0.75rem; color: var(--gray-400);">(${meal.time})</span>
            </div>
            <span class="acceptance-tag none" style="background: #f1f5f9; color: #94a3b8; font-size: 0.72rem; font-weight: 600;">
              Aguardando ⏳
            </span>
          </div>
          <div style="font-size: 0.78rem; color: #94a3b8; font-style: italic;">
            Refeição ainda não registrada
          </div>
        </div>
      `;
    }

    return `
      <div class="meal-row">
        <div class="meal-time-info">
          <div style="font-size: 0.85rem; font-weight: 800;">
            ${meal.icon} ${meal.name} <span style="font-size: 0.75rem; color: var(--brand-cyan-dark); font-weight: 700;">(${meal.time})</span>
          </div>
          ${isAdmin ? `
            <div style="display: flex; gap: 3px;">
              <button type="button" class="acceptance-btn-choice ${meal.acceptance === 'regular' ? 'selected-regular' : ''}" data-meal-idx="${index}" data-choice="regular">Reg</button>
              <button type="button" class="acceptance-btn-choice ${meal.acceptance === 'bom' ? 'selected-bom' : ''}" data-meal-idx="${index}" data-choice="bom">Bom</button>
              <button type="button" class="acceptance-btn-choice ${meal.acceptance === 'otimo' ? 'selected-otimo' : ''}" data-meal-idx="${index}" data-choice="otimo">Ótimo</button>
            </div>
          ` : `
            <span class="acceptance-tag ${meal.acceptance || 'none'}">
              ${meal.acceptance === 'otimo' ? 'Ótimo 🌟' : meal.acceptance === 'bom' ? 'Bom 😊' : 'Regular 😐'}
            </span>
          `}
        </div>
        <div style="font-size: 0.8rem; color: var(--gray-600);">
          ${isAdmin ? `
            <input type="text" class="form-input no-icon meal-desc-input" data-meal-index="${index}" value="${meal.description || ''}" style="height: 32px; font-size: 0.8rem;" placeholder="O que comeu">
          ` : meal.description}
        </div>
      </div>
    `;
  }

  function renderMoodOptions(currentMood, isAdmin) {
    const moods = [
      { emoji: '😄', label: 'Alegre' },
      { emoji: '😌', label: 'Calmo' },
      { emoji: '🥺', label: 'Dengoso' },
      { emoji: '🥳', label: 'Brincalhão' }
    ];

    return moods.map(m => {
      const isSelected = currentMood && currentMood.includes(m.label);
      if (isAdmin) {
        return `
          <button type="button" class="acceptance-btn-choice ${isSelected ? 'selected-bom' : ''}" data-mood-label="${m.label}" data-mood-emoji="${m.emoji}" style="font-size: 0.76rem;">
            ${m.emoji} ${m.label}
          </button>
        `;
      } else {
        return isSelected ? `
          <span class="acceptance-tag bom" style="font-size: 0.8rem;">
            ${m.emoji} ${m.label}
          </span>
        ` : '';
      }
    }).join('');
  }

  function bindAgendaEvents(currentUser, activeChild, currentData, isAdmin) {
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      window.authService.logout();
      showToast('Sessão encerrada com sucesso.');
      render();
    });

    document.getElementById('toggleRoleBtn')?.addEventListener('click', () => {
      if (currentUser.role === 'admin') {
        state.previewAsParent = !state.previewAsParent;
        showToast(state.previewAsParent ? '👁️ Visualizando como os pais enxergam a agenda' : '✏️ Retornou ao modo de edição da educadora');
        render();
      }
    });

    document.getElementById('childSelector')?.addEventListener('change', (e) => {
      state.selectedChildId = e.target.value;
      state.adminEditingRoutine = null;
      render();
    });

    document.getElementById('dateDisplayLabel')?.addEventListener('click', () => {
      const picker = document.getElementById('datePickerInput');
      if (picker) picker.showPicker ? picker.showPicker() : picker.click();
    });

    document.getElementById('datePickerInput')?.addEventListener('change', (e) => {
      if (e.target.value) {
        state.selectedDate = e.target.value;
        state.adminEditingRoutine = null;
        render();
      }
    });

    document.getElementById('prevDateBtn')?.addEventListener('click', () => {
      const curr = new Date(state.selectedDate + 'T00:00:00');
      curr.setDate(curr.getDate() - 1);
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      state.selectedDate = `${y}-${m}-${d}`;
      state.adminEditingRoutine = null;
      render();
    });

    document.getElementById('nextDateBtn')?.addEventListener('click', () => {
      const curr = new Date(state.selectedDate + 'T00:00:00');
      curr.setDate(curr.getDate() + 1);
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      state.selectedDate = `${y}-${m}-${d}`;
      state.adminEditingRoutine = null;
      render();
    });

    if (isAdmin) {
      document.querySelectorAll('[data-toggle-hygiene]').forEach(btn => {
        btn.addEventListener('click', () => {
          const key = btn.dataset.toggleHygiene;
          if (state.adminEditingRoutine.hygiene[key]) {
            state.adminEditingRoutine.hygiene[key].ok = !state.adminEditingRoutine.hygiene[key].ok;
            render();
          }
        });
      });

      document.getElementById('hygieneMissingNotes')?.addEventListener('input', (e) => {
        state.adminEditingRoutine.hygiene.faltaObservacao = e.target.value;
      });

      document.querySelectorAll('.acceptance-btn-choice[data-choice]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.mealIdx);
          const choice = btn.dataset.choice;
          state.adminEditingRoutine.meals[idx].acceptance = choice;
          render();
        });
      });

      document.querySelectorAll('.meal-desc-input').forEach(input => {
        input.addEventListener('change', (e) => {
          const idx = parseInt(input.dataset.mealIndex);
          state.adminEditingRoutine.meals[idx].description = e.target.value;
        });
      });

      document.getElementById('addDiaperLogBtn')?.addEventListener('click', () => {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const type = prompt('Tipo da troca de fralda (Ex: Xixi, Cocô, Xixi e Cocô):', 'Xixi');
        if (type) {
          if (!state.adminEditingRoutine.diapers) state.adminEditingRoutine.diapers = { count: 0, logs: [] };
          if (!Array.isArray(state.adminEditingRoutine.diapers.logs)) state.adminEditingRoutine.diapers.logs = [];
          state.adminEditingRoutine.diapers.logs.push({ time: timeStr, type: type, ointment: true });
          state.adminEditingRoutine.diapers.count = state.adminEditingRoutine.diapers.logs.length;
          showToast('Troca de fralda adicionada!');
          render();
        }
      });

      document.querySelectorAll('.remove-diaper-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.removeDiaper);
          if (state.adminEditingRoutine.diapers?.logs) {
            state.adminEditingRoutine.diapers.logs.splice(idx, 1);
            state.adminEditingRoutine.diapers.count = state.adminEditingRoutine.diapers.logs.length;
            render();
          }
        });
      });

      document.getElementById('addSleepBtn')?.addEventListener('click', () => {
        const period = prompt('Período da soneca (Ex: Manhã, Tarde):', 'Tarde');
        if (!period) return;
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const time = prompt('Horário (Ex: 13:30 às 15:00):', `${h}:${m} às ...`);
        if (!time) return;
        const quality = prompt('Qualidade do sono (Ex: Tranquilo, Dormiu bem, Agitado):', 'Tranquilo (dormiu bem)');
        if (!state.adminEditingRoutine.sleep) state.adminEditingRoutine.sleep = [];
        state.adminEditingRoutine.sleep.push({
          period: period,
          time: time,
          quality: quality || 'Tranquilo'
        });
        showToast('Soneca registrada!');
        render();
      });

      document.querySelectorAll('.remove-sleep-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.removeSleep);
          if (state.adminEditingRoutine.sleep) {
            state.adminEditingRoutine.sleep.splice(idx, 1);
            render();
          }
        });
      });

      document.querySelectorAll('[data-mood-label]').forEach(mBtn => {
        mBtn.addEventListener('click', () => {
          state.adminEditingRoutine.mood = {
            emoji: mBtn.dataset.moodEmoji,
            label: mBtn.dataset.moodLabel
          };
          render();
        });
      });

      document.getElementById('saveRoutineBtn')?.addEventListener('click', () => {
        const teacherNote = document.getElementById('teacherNoteInput')?.value;
        const teacherName = document.getElementById('teacherNameInput')?.value;
        const hygieneMissing = document.getElementById('hygieneMissingNotes')?.value;

        if (state.adminEditingRoutine) {
          state.adminEditingRoutine.observations.teacherNote = teacherNote || '';
          state.adminEditingRoutine.observations.teacherName = teacherName || 'Tias do Berçário';
          state.adminEditingRoutine.hygiene.faltaObservacao = hygieneMissing || '';

          window.storageService.saveRoutine(state.selectedChildId, state.selectedDate, state.adminEditingRoutine);
          showToast('Agenda salva com sucesso!', 'success');
        }
      });
    }
  }

  // Sincronização em tempo real com o banco de dados na nuvem (Firestore)
  window.addEventListener('storage:synced', () => {
    const user = window.authService ? window.authService.getCurrentUser() : null;
    // Apenas atualiza a tela se houver usuário conectado na agenda e fora do modo de edição
    if (user && !user.needsChildRegistration && !state.adminEditingRoutine) {
      render();
    }
  });

  // Inicializa render
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
