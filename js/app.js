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

  // Adiciona ou subtrai dias de uma string YYYY-MM-DD com segurança de fuso
  function addDaysToDateStr(dateStr, days) {
    if (!dateStr) return window.storageService ? window.storageService.getTodayDateString() : '';
    const parts = dateStr.split('-');
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const date = new Date(y, m, d + days, 12, 0, 0);
    const resY = date.getFullYear();
    const resM = String(date.getMonth() + 1).padStart(2, '0');
    const resD = String(date.getDate()).padStart(2, '0');
    return `${resY}-${resM}-${resD}`;
  }

  // Data mínima permitida: estritamente a data em que o bebê foi cadastrado
  function getMinAllowedDateForChild(childId) {
    if (!window.storageService || !childId) return '';
    return window.storageService.getChildRegistrationDate(childId);
  }

  // Data máxima permitida: estritamente o dia de hoje oficial da internet (não permite datas futuras)
  function getMaxAllowedDateForChild(childId) {
    if (!window.storageService) return '';
    return window.storageService.getTodayDateString();
  }

  // Formata data amigável em Português destacando "Hoje"
  function formatDateFriendly(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const date = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0);
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const todayStr = window.storageService ? window.storageService.getTodayDateString() : '';
    const isToday = (dateStr === todayStr);
    
    return `${isToday ? 'Hoje, ' : ''}${days[date.getDay()]}, ${parts[2]} de ${months[date.getMonth()]} de ${parts[0]}`;
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
          <p class="auth-subheading">Preencha os dados do responsável e do bebê para concluir o acesso</p>

          <form id="childRegistrationForm">
            <!-- 1. DADOS DO RESPONSÁVEL -->
            <div class="form-section-divider">
              <span>👤 Dados do Responsável</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleParentName">Nome Completo do Responsável *</label>
              <div class="input-container">
                <span class="input-icon">👤</span>
                <input type="text" id="googleParentName" class="form-input" value="${currentUser.name || ''}" placeholder="Ex: Mariana Oliveira" required>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleParentPhone">WhatsApp / Telefone de Contato</label>
              <div class="input-container">
                <span class="input-icon">📱</span>
                <input type="tel" id="googleParentPhone" class="form-input" placeholder="(77) 99999-9999">
              </div>
            </div>

            <!-- 2. DADOS DO BEBÊ -->
            <div class="form-section-divider">
              <span>👶 Dados do Bebê</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleBabyName">Nome Completo do Bebê *</label>
              <div class="input-container">
                <span class="input-icon">👶</span>
                <input type="text" id="googleBabyName" class="form-input" placeholder="Ex: Theo Oliveira" required autofocus>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleBabyAge">Idade do Bebê *</label>
              <div class="input-container">
                <span class="input-icon">🎂</span>
                <select id="googleBabyAge" class="form-input" required style="cursor: pointer;">
                  ${window.renderBabyAgeSelectOptions ? window.renderBabyAgeSelectOptions('1 ano') : '<option value="1 ano">1 ano</option>'}
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleBabyTurma">Turma do Berçário *</label>
              <div class="input-container">
                <span class="input-icon">🏫</span>
                <select id="googleBabyTurma" class="form-input" required style="font-weight: 700; cursor: pointer;">
                  <option value="Berçário 1" selected>Berçário 1 (4 meses a 1 ano)</option>
                  <option value="Berçário 2">Berçário 2 (1 a 2 anos)</option>
                  <option value="Maternal">Maternal (2 a 3 anos)</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Ícone do Bebê</label>
              <div class="avatar-grid" id="avatarSelectorContainer">
                <button type="button" class="avatar-select-btn active" data-avatar="👶" title="Menino">
                  <span class="avatar-emoji">👶</span>
                  <span class="avatar-label">Menino</span>
                </button>
                <button type="button" class="avatar-select-btn" data-avatar="👧" title="Menina">
                  <span class="avatar-emoji">👧</span>
                  <span class="avatar-label">Menina</span>
                </button>
                <button type="button" class="avatar-select-btn" data-avatar="🍼" title="Mamadeira">
                  <span class="avatar-emoji">🍼</span>
                  <span class="avatar-label">Mamadeira</span>
                </button>
                <button type="button" class="avatar-select-btn" data-avatar="🧸" title="Ursinho">
                  <span class="avatar-emoji">🧸</span>
                  <span class="avatar-label">Ursinho</span>
                </button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleBabyNotes">Observações de Saúde / Cuidados (opcional)</label>
              <div class="input-container">
                <span class="input-icon">📝</span>
                <input type="text" id="googleBabyNotes" class="form-input" placeholder="Ex: Alergia a lactose, restrições, etc.">
              </div>
            </div>

            <!-- 3. SENHA DE ACESSO -->
            <div class="form-section-divider">
              <span>🔒 Senha de Acesso</span>
            </div>

            <div class="form-group">
              <label class="form-label" for="googleAccountPassword">Criar Senha de Acesso à Conta *</label>
              <div class="input-container">
                <span class="input-icon">🔒</span>
                <input type="password" id="googleAccountPassword" class="form-input" placeholder="Mínimo 4 caracteres" minlength="4" required autocomplete="new-password">
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
        document.querySelectorAll('.avatar-select-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
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
        state.selectedDate = window.storageService.getTodayDateString();
        state.adminEditingRoutine = null;
        render();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Cancelar / Logout
    document.getElementById('cancelGoogleLoginBtn')?.addEventListener('click', async (e) => {
      e?.preventDefault();
      const btn = document.getElementById('cancelGoogleLoginBtn');
      if (btn) btn.disabled = true;
      state.selectedChildId = null;
      state.adminEditingRoutine = null;
      state.previewAsParent = false;
      await window.authService.logout();
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
              👶 Cadastrar
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

      <!-- Acesso Discreto do Administrador Geral (Senha Master) -->
      <div class="admin-master-direct-link">
        <a href="admin.html" id="directAdminLink" class="admin-direct-link-btn" title="Acesso Master da Coordenação/Diretoria">
          <span>🛡️</span> Acesso do Administrador
        </a>
      </div>
    `;
  }

  function renderRegisterForm() {
    return `
      <h2 class="auth-heading">Novo Cadastro da Família 📝</h2>
      <p class="auth-subheading">Preencha os dados do responsável e do bebê para criar sua conta</p>

      <form id="registerForm">
        <!-- 1. DADOS DO RESPONSÁVEL -->
        <div class="form-section-divider">
          <span>👤 Dados do Responsável</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="regName">Nome Completo do Responsável *</label>
          <div class="input-container">
            <span class="input-icon">👤</span>
            <input type="text" id="regName" class="form-input" placeholder="Ex: Mariana Oliveira" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regEmail">E-mail dos Pais *</label>
          <div class="input-container">
            <span class="input-icon">✉️</span>
            <input type="email" id="regEmail" class="form-input" placeholder="seu.email@exemplo.com" required autocomplete="email">
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regPhone">WhatsApp / Telefone de Contato</label>
          <div class="input-container">
            <span class="input-icon">📱</span>
            <input type="tel" id="regPhone" class="form-input" placeholder="(77) 99999-9999">
          </div>
        </div>

        <!-- 2. DADOS DO BEBÊ -->
        <div class="form-section-divider">
          <span>👶 Dados do Bebê</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="regBabyName">Nome Completo do Bebê *</label>
          <div class="input-container">
            <span class="input-icon">👶</span>
            <input type="text" id="regBabyName" class="form-input" placeholder="Ex: Theo Oliveira" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regBabyAge">Idade do Bebê *</label>
          <div class="input-container">
            <span class="input-icon">🎂</span>
            <select id="regBabyAge" class="form-input" required style="cursor: pointer;">
              ${window.renderBabyAgeSelectOptions ? window.renderBabyAgeSelectOptions('1 ano') : '<option value="1 ano">1 ano</option>'}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regBabyTurma">Turma do Berçário *</label>
          <div class="input-container">
            <span class="input-icon">🏫</span>
            <select id="regBabyTurma" class="form-input" required style="font-weight: 700; cursor: pointer;">
              <option value="Berçário 1" selected>Berçário 1 (4 meses a 1 ano)</option>
              <option value="Berçário 2">Berçário 2 (1 a 2 anos)</option>
              <option value="Maternal">Maternal (2 a 3 anos)</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Ícone do Bebê</label>
          <div class="avatar-grid" id="regAvatarSelectorContainer">
            <button type="button" class="reg-avatar-btn active" data-avatar="👶" title="Menino">
              <span class="avatar-emoji">👶</span>
              <span class="avatar-label">Menino</span>
            </button>
            <button type="button" class="reg-avatar-btn" data-avatar="👧" title="Menina">
              <span class="avatar-emoji">👧</span>
              <span class="avatar-label">Menina</span>
            </button>
            <button type="button" class="reg-avatar-btn" data-avatar="🍼" title="Mamadeira">
              <span class="avatar-emoji">🍼</span>
              <span class="avatar-label">Mamadeira</span>
            </button>
            <button type="button" class="reg-avatar-btn" data-avatar="🧸" title="Ursinho">
              <span class="avatar-emoji">🧸</span>
              <span class="avatar-label">Ursinho</span>
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regNotes">Observações de Saúde / Cuidados (opcional)</label>
          <div class="input-container">
            <span class="input-icon">📝</span>
            <input type="text" id="regNotes" class="form-input" placeholder="Ex: Alergias, rotina de sono, restrições">
          </div>
        </div>

        <!-- 3. SENHA DE ACESSO -->
        <div class="form-section-divider">
          <span>🔒 Senha de Acesso</span>
        </div>

        <div class="form-group">
          <label class="form-label" for="regPassword">Criar Senha *</label>
          <div class="input-container">
            <span class="input-icon">🔒</span>
            <input type="password" id="regPassword" class="form-input" placeholder="Mínimo 4 dígitos" minlength="4" required autocomplete="new-password">
            <button type="button" id="toggleRegPasswordBtn" class="password-toggle-btn" title="Mostrar/ocultar senha">
              👁️
            </button>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regPasswordConfirm">Confirmar Senha *</label>
          <div class="input-container">
            <span class="input-icon">🔒</span>
            <input type="password" id="regPasswordConfirm" class="form-input" placeholder="Repita a senha digitada" minlength="4" required autocomplete="new-password">
            <button type="button" id="toggleRegPasswordConfirmBtn" class="password-toggle-btn" title="Mostrar/ocultar senha">
              👁️
            </button>
          </div>
        </div>

        <button type="submit" id="submitRegBtn" class="btn btn-primary" style="margin-top: 10px;">
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

      <div class="admin-master-direct-link" style="margin-top: 14px;">
        <a href="admin.html" class="admin-direct-link-btn" title="Acesso Master da Coordenação/Diretoria">
          <span>🛡️</span> Acesso do Administrador
        </a>
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
    setupPasswordToggle('regPasswordConfirm', 'toggleRegPasswordConfirmBtn');
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
          state.selectedDate = window.storageService.getTodayDateString();
          state.adminEditingRoutine = null;
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
        document.querySelectorAll('.reg-avatar-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
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
          state.selectedDate = window.storageService.getTodayDateString();
          state.adminEditingRoutine = null;
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
          state.selectedDate = window.storageService.getTodayDateString();
          state.adminEditingRoutine = null;
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
          state.selectedDate = window.storageService.getTodayDateString();
          state.adminEditingRoutine = null;
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

    // Garante que o calendário respeite estritamente: Início = Data de Cadastro, Fim = Data Oficial de Hoje (via Internet)
    const todayStr = window.storageService.getTodayDateString();
    const minPickerDate = getMinAllowedDateForChild(state.selectedChildId);
    const maxPickerDate = todayStr; // estritamente hoje pela internet (não permite dias futuros)

    if (!state.selectedDate || state.selectedDate > maxPickerDate) {
      state.selectedDate = maxPickerDate;
    }
    if (minPickerDate && state.selectedDate < minPickerDate) {
      state.selectedDate = (maxPickerDate >= minPickerDate) ? maxPickerDate : minPickerDate;
    }

    const routine = window.storageService.getRoutine(state.selectedChildId, state.selectedDate);

    if (isAdmin && (!state.adminEditingRoutine || state.adminEditingRoutine.childId !== state.selectedChildId || state.adminEditingRoutine.date !== state.selectedDate)) {
      state.adminEditingRoutine = JSON.parse(JSON.stringify(routine));
    }

    const currentData = isAdmin ? state.adminEditingRoutine : routine;
    const hasData = window.storageService.hasRoutine(state.selectedChildId, state.selectedDate);

    // Regras de navegação estritas:
    // - Para trás: permitido apenas a partir da data em que o bebê foi cadastrado
    // - Para frente: permitido apenas até a data de hoje oficial da internet
    const prevDate = addDaysToDateStr(state.selectedDate, -1);
    const nextDate = addDaysToDateStr(state.selectedDate, 1);
    const canGoPrev = Boolean(minPickerDate ? prevDate >= minPickerDate : true);
    const canGoNext = nextDate <= maxPickerDate;
    const isNotToday = state.selectedDate !== todayStr;

    const missingHygieneItems = Object.entries(currentData.hygiene || {})
      .filter(([key, val]) => typeof val === 'object' && val !== null && val.ok === false)
      .map(([k, v]) => v.name);

    const unreadNotifCount = window.storageService ? window.storageService.getUnreadNotificationsCount(activeChild?.id, state.selectedDate, currentUser.id || currentUser.email) : 0;

    appContainer.innerHTML = `
      <!-- Ícone de Sino Fixo no Canto Superior Direito com Vetor Branco -->
      <div class="fixed-top-notification-bell">
        <button type="button" id="openNotifCenterBtn" class="fixed-notification-bell-btn" title="Central de Notificações e Avisos" aria-label="Notificações">
          <svg class="bell-vector-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C13.1 22 14 21.1 14 20H10C10 21.1 10.89 22 12 22ZM18 16V11C18 7.93 16.36 5.36 13.5 4.68V4C13.5 3.17 12.83 2.5 12 2.5C11.17 2.5 10.5 3.17 10.5 4V4.68C7.63 5.36 6 7.92 6 11V16L4 18V19H20V18L18 16Z" fill="#FFFFFF"/>
          </svg>
          ${unreadNotifCount > 0 ? `<span class="notification-badge">${unreadNotifCount}</span>` : ''}
        </button>
      </div>

      <!-- Header do App -->
      <header class="brand-header" style="margin-bottom: 12px;">
        <div class="brand-logo-container" style="max-width: 200px; margin-bottom: 0;">
          <img src="assets/logo.png" alt="Brinca e Aprende" class="brand-logo-img" style="max-height: 90px;">
        </div>
      </header>

      <!-- Barra do Usuário com Foto, Nome, Bebê e Calendário Minimalista Estilo iPhone -->
      <nav class="user-navbar">
        <div class="user-navbar-top">
          <div class="user-badge-info">
            <div class="user-avatar">${renderUserAvatar(currentUser)}</div>
            <div>
              <div style="font-size: 0.88rem; font-weight: 800; color: var(--gray-900); display: flex; align-items: center; gap: 6px;">
                ${currentUser.name}
                ${isActualAdmin ? `<span class="role-pill ${currentUser.role}">Educadora</span>` : ''}
              </div>
              <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 2px;">
                ${isActualAdmin ? `
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span>Bebê:</span>
                    <select id="childSelector" class="form-input no-icon" style="height: 28px; font-size: 0.76rem; padding: 2px 6px; font-weight: 700; width: auto; max-width: 170px;">
                      ${children.map(c => `
                        <option value="${c.id}" ${c.id === state.selectedChildId ? 'selected' : ''}>
                          ${c.name} (${c.turma})
                        </option>
                      `).join('')}
                    </select>
                  </div>
                ` : `Bebê: <strong>${activeChild ? activeChild.name : 'Meu Bebê'}</strong>`}
              </div>
            </div>
          </div>

          <div class="user-navbar-actions">
            ${activeChild ? `
              <button type="button" id="openCaregiverNoteDrawerBtn" class="btn btn-secondary btn-sm" style="height: 32px; font-size: 0.74rem; padding: 4px 8px; width: auto; color: #db2777; border-color: #fbcfe8; background: #fff5f7; font-weight: 800; display: inline-flex; align-items: center; gap: 4px;" title="Deixar Recado Para o Cuidador">
                💬 Recado${currentData.observations?.parentNote ? '<span style="color: #047857; font-weight: 800;" title="Recado enviado">✓</span>' : ''}
              </button>
            ` : ''}
            ${isActualAdmin ? `
              <button id="toggleRoleBtn" class="btn btn-secondary btn-sm" style="height: 32px; font-size: 0.74rem; padding: 4px 8px; width: auto;" title="Alternar visualização">
                ${state.previewAsParent ? '✏️ Modo Edição' : '👁️ Prévia'}
              </button>
            ` : ''}
            <button id="logoutBtn" class="btn btn-secondary btn-sm" style="height: 32px; font-size: 0.74rem; padding: 4px 8px; width: auto; color: #ef4444;" title="Sair">
              🚪 Sair
            </button>
          </div>
        </div>

        <!-- Opção do Calendário Minimalista Estilo iPhone -->
        <div class="user-navbar-calendar">
          <div class="ios-calendar-nav-bar">
            <button type="button" id="prevDateBtn" class="ios-nav-chevron" ${!canGoPrev ? `disabled title="A agenda inicia a partir da data de cadastro (${formatDateFriendly(minPickerDate)})"` : 'title="Dia anterior"'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
            </button>

            <input type="date" id="datePickerInput" value="${state.selectedDate}" ${minPickerDate ? `min="${minPickerDate}"` : ''} ${maxPickerDate ? `max="${maxPickerDate}"` : ''} style="position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none;">

            <div id="dateDisplayLabel" class="ios-date-selector-btn" title="Toque para abrir o calendário">
              <span style="font-size: 1rem; line-height: 1;">📅</span>
              <span class="ios-date-title">${formatDateFriendly(state.selectedDate)}</span>
              <span class="ios-date-dropdown-arrow">▾</span>
            </div>

            <button type="button" id="nextDateBtn" class="ios-nav-chevron" ${!canGoNext ? 'disabled title="Não é possível acessar datas futuras"' : 'title="Próximo dia"'}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </button>
          </div>

          ${isNotToday ? `
            <div class="ios-today-reset-wrap" style="text-align: center; margin-top: 4px;">
              <button type="button" id="goToTodayBtn" class="ios-today-reset-btn" title="Voltar para a data de hoje">
                <span>📍</span> Voltar para a Agenda de Hoje
              </button>
            </div>
          ` : ''}
        </div>
      </nav>

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
          <div style="background: #f0fdf4; border: 1px solid #86efac; color: #166534; border-radius: var(--radius-sm); padding: 8px 12px; margin-bottom: 10px; font-size: 0.8rem; font-weight: 700; display: flex; align-items: center; justify-content: space-between;">
            <span>✅ Agenda preenchida e sincronizada em tempo real com a família de <strong>${activeChild ? activeChild.name : 'seu bebê'}</strong>.</span>
            <span style="font-size: 1.1rem;">🟢</span>
          </div>
        ` : `
          <div style="background: #eff6ff; border: 1.5px dashed #3b82f6; color: #1e40af; border-radius: var(--radius-sm); padding: 10px 12px; margin-bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div>
              <div style="font-size: 0.85rem; font-weight: 800;">📝 Agenda em Branco (${formatDateFriendly(state.selectedDate)})</div>
              <div style="font-size: 0.74rem; color: #1d4ed8;">Preencha os campos abaixo e clique em <strong>Salvar Alterações</strong> para publicar para a família.</div>
            </div>
            <span style="font-size: 1.3rem;">✨</span>
          </div>
        `) : ''}

        <!-- Cards da Agenda -->
        <div class="agenda-grid">
          
          <!-- 1ª OPÇÃO PARA O EDUCADOR: RECADINHO DOS PAIS (ESTILO OFICIAL COM RIBBON) -->
          ${isAdmin ? `
            <div class="agenda-card rotina-oficial-card" style="background: #ffffff; border-radius: var(--radius-md); box-shadow: 0 4px 15px rgba(244, 63, 94, 0.12); border: 1.5px solid #fda4af;">
              <div class="card-body" style="padding: 10px 8px 8px 8px;">
                <div class="rotina-ribbon-container">
                  <div class="rotina-ribbon-banner rose">
                    <span>♥</span> RECADINHO DOS PAIS <span>♥</span>
                  </div>
                </div>

                <div class="rotina-row-item rotina-theme-rose" style="margin-bottom: 0;">
                  <div class="rotina-row-top">
                    <div class="rotina-time-box" style="width: 68px; font-size: 0.8rem;">
                      ${currentData.observations?.parentNoteTime ? `⏰ ${currentData.observations.parentNoteTime}` : '💌 Família'}
                    </div>
                    <div class="rotina-content-box" style="padding: 4px 6px;">
                      <span class="rotina-icon-art">💬</span>
                      <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
                          <span class="rotina-activity-title" style="font-size: 0.88rem; color: #be123c;">
                            Recado de ${currentData.observations?.parentNoteAuthor || 'Família'}
                          </span>
                          <span style="font-size: 0.68rem; color: #be123c; background: #fff1f2; border: 1px solid #fecdd3; padding: 2px 7px; border-radius: 9999px; font-weight: 800;">Prioridade ⚠️</span>
                        </div>
                        <div style="font-size: 0.84rem; color: #1e293b; margin-top: 3px; line-height: 1.45; font-weight: 600; font-style: italic;">
                          ${currentData.observations?.parentNote ? `"${currentData.observations.parentNote}"` : '<span style="color: #94a3b8; font-weight: normal;">Nenhum recadinho especial enviado pelos pais para esta data.</span>'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- PRODUTOS DE HIGIENE (ESTILO OFICIAL COM RIBBON) -->
          <div class="agenda-card rotina-oficial-card" style="background: #ffffff; border-radius: var(--radius-md); box-shadow: 0 4px 15px rgba(236, 72, 153, 0.08); border: 1.5px solid #fbcfe8;">
            <div class="card-body" style="padding: 10px 8px 8px 8px;">
              <div class="rotina-ribbon-container">
                <div class="rotina-ribbon-banner">
                  <span>♥</span> PRODUTOS DE HIGIENE <span>♥</span>
                </div>
              </div>

              <!-- Aviso de Produtos em Dia / Reposição dentro da sessão de Produtos de Higiene -->
              ${missingHygieneItems.length > 0 ? `
                <div class="alert-banner has-missing" style="background: #fff1f2; border-left: 4px solid #f43f5e; color: #9f1239; margin-bottom: 8px; border-radius: var(--radius-sm); padding: 8px 10px; font-size: 0.8rem;">
                  <strong style="color: #be123c; display: block; margin-bottom: 2px;">⚠️ Atenção: Falta repor na mochila:</strong>
                  <strong>${missingHygieneItems.join(', ')}</strong>.
                  ${currentData.hygiene?.faltaObservacao ? `<br><em>"${currentData.hygiene.faltaObservacao}"</em>` : ''}
                </div>
              ` : `
                <div class="alert-banner" style="background: #f0fdf4; border-left: 4px solid #10b981; color: #166534; margin-bottom: 8px; border-radius: var(--radius-sm); padding: 8px 10px; font-size: 0.8rem; font-weight: 600;">
                  ✨ <strong>Produtos em dia!</strong> Todos os produtos de higiene estão abastecidos.
                </div>
              `}

              <div class="hygiene-list" style="display: flex; flex-direction: column; gap: 6px;">
                ${renderHygieneItem('pomada', 'Pomada', '🧴', currentData.hygiene?.pomada?.ok, isAdmin)}
                ${renderHygieneItem('fralda', 'Fralda', '🧷', currentData.hygiene?.fralda?.ok, isAdmin)}
                ${renderHygieneItem('lenco', 'Lenço Umedecido', '🧻', currentData.hygiene?.lenco?.ok, isAdmin)}
                ${renderHygieneItem('shampoo', 'Shampoo', '🧴', currentData.hygiene?.shampoo?.ok, isAdmin)}
                ${renderHygieneItem('condicionador', 'Condicionador', '🧼', currentData.hygiene?.condicionador?.ok, isAdmin)}
                ${renderHygieneItem('sabonete', 'Sabonete', '🧼', currentData.hygiene?.sabonete?.ok, isAdmin)}
                ${renderHygieneItem('perfume', 'Perfume', '🌸', currentData.hygiene?.perfume?.ok, isAdmin)}
                ${renderHygieneItem('cremeDental', 'Creme Dental', '🪥', currentData.hygiene?.cremeDental?.ok, isAdmin)}
              </div>

              ${isAdmin ? `
                <div class="rotina-row-item rotina-theme-pink" style="margin-top: 6px; margin-bottom: 0;">
                  <div class="rotina-row-top" style="min-height: auto; padding: 6px 8px;">
                    <div style="width: 100%;">
                      <label class="form-label" style="font-size: 0.74rem; font-weight: 800; color: #db2777; margin-bottom: 2px;">Observação de Reposição (FALTA NA MOCHILA):</label>
                      <input type="text" id="hygieneMissingNotes" class="form-input no-icon" style="height: 32px; font-size: 0.8rem; background: #ffffff;"
                        placeholder="Ex: Trazer pomada e fralda tamanho M"
                        value="${currentData.hygiene?.faltaObservacao || ''}">
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          </div>

          <!-- ROTINA DIÁRIA DO BEBÊ (ESTILO OFICIAL COM FAIXA RIBBON) -->
          <div class="agenda-card rotina-oficial-card" style="background: #ffffff; border-radius: var(--radius-md); box-shadow: 0 4px 15px rgba(236, 72, 153, 0.08); border: 1.5px solid #fbcfe8;">
            <div class="card-body" style="padding: 10px 8px 6px 8px;">
              <!-- Faixa Ribbon Oficial -->
              <div class="rotina-ribbon-container">
                <div class="rotina-ribbon-banner">
                  <span>♥</span> ROTINA DIÁRIA DE BEBÊ <span>♥</span>
                </div>
              </div>

              <!-- Linhas da Rotina com Cores, Ícones e Botões de Marcação -->
              <div class="rotina-rows-container">
                ${(currentData.meals || []).map((meal, index) => renderMealRow(meal, index, isAdmin)).join('')}
              </div>
            </div>
          </div>

          <!-- TROCAS DE FRALDA (COR ROSA E NOME APENAS 'TROCAS DE FRALDA') -->
          <div class="agenda-card rotina-oficial-card" style="background: #ffffff; border-radius: var(--radius-md); box-shadow: 0 4px 15px rgba(236, 72, 153, 0.08); border: 1.5px solid #fbcfe8;">
            <div class="card-body" style="padding: 10px 8px 8px 8px;">
              <div class="rotina-ribbon-container">
                <div class="rotina-ribbon-banner">
                  <span>♥</span> TROCAS DE FRALDA <span>♥</span>
                </div>
              </div>

              <!-- Lista de Trocas de Fralda estilo Rotina Oficial (Tema Rosa) -->
              <div>
                <div style="font-family: 'Fredoka', cursive; font-size: 0.92rem; font-weight: 700; color: #db2777; margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between;">
                  <span>🚼 Registros de Fralda (${currentData.diapers?.count || currentData.diapers?.logs?.length || 0})</span>
                  ${isAdmin ? `
                    <button type="button" id="addDiaperLogBtn" class="btn btn-secondary btn-sm" style="height: 28px; font-size: 0.72rem; padding: 2px 8px; width: auto; background: #fdf2f8; border-color: #fbcfe8; color: #db2777; font-weight: 800;">
                      ➕ Registrar Troca
                    </button>
                  ` : ''}
                </div>

                ${(currentData.diapers?.logs || []).length > 0 ? currentData.diapers.logs.map((log, lIdx) => `
                  <div class="rotina-row-item rotina-theme-pink" style="margin-bottom: 6px;">
                    <div class="rotina-row-top" style="min-height: 42px;">
                      <div class="rotina-time-box" style="width: 68px; font-size: 0.82rem;">
                        ${log.time} h
                      </div>
                      <div class="rotina-content-box" style="padding: 4px 6px;">
                        <span class="rotina-icon-art" style="font-size: 1.15rem; width: 28px; height: 28px;">🚼</span>
                        <div style="flex: 1; min-width: 0;">
                          <span class="rotina-activity-title" style="font-size: 0.88rem;">${log.type}</span>
                          ${log.ointment ? `
                            <div style="font-size: 0.72rem; color: #db2777; font-weight: 700;">✓ Pomada preventiva aplicada</div>
                          ` : ''}
                        </div>
                        ${isAdmin ? `
                          <button type="button" class="remove-diaper-btn" data-remove-diaper="${lIdx}" title="Remover troca" style="background: none; border: none; color: #ef4444; font-size: 0.85rem; cursor: pointer; font-weight: 800; padding: 4px;">✕</button>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `).join('') : `
                  <div style="font-size: 0.8rem; color: #94a3b8; font-style: italic; padding: 8px 0; text-align: center;">
                    Nenhuma troca de fezes registrada para esta data ainda.
                  </div>
                `}
              </div>
            </div>
          </div>

          <!-- SONECAS & DESCANSO (AVULSA - APARECE APENAS SE EDUCADORA MARCAR OU NO MODO EDUCADOR) -->
          ${(isAdmin || (currentData.sleep && currentData.sleep.length > 0)) ? `
            <div class="agenda-card rotina-oficial-card" style="background: #ffffff; border-radius: var(--radius-md); box-shadow: 0 4px 15px rgba(2, 132, 199, 0.08); border: 1.5px solid #bae6fd;">
              <div class="card-body" style="padding: 10px 8px 8px 8px;">
                <div class="rotina-ribbon-container">
                  <div class="rotina-ribbon-banner cyan">
                    <span>♥</span> SONECAS & DESCANSO <span>♥</span>
                  </div>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span style="font-family: 'Fredoka', cursive; font-size: 0.92rem; font-weight: 700; color: #0284c7;">
                    😴 Registros de Soninho (${currentData.sleep?.length || 0})
                  </span>
                  ${isAdmin ? `
                    <button type="button" id="addSleepBtn" class="btn btn-secondary btn-sm" style="height: 28px; font-size: 0.72rem; padding: 2px 8px; width: auto; background: #f0f9ff; border-color: #bae6fd; color: #0369a1; font-weight: 800;">
                      ➕ Adicionar Soneca
                    </button>
                  ` : ''}
                </div>

                ${(currentData.sleep || []).length > 0 ? currentData.sleep.map((nap, sIdx) => `
                  <div class="rotina-row-item rotina-theme-blue" style="margin-bottom: 6px;">
                    <div class="rotina-row-top" style="min-height: 42px;">
                      <div class="rotina-time-box" style="width: 68px; font-size: 0.82rem;">
                        ${nap.period}
                      </div>
                      <div class="rotina-content-box" style="padding: 4px 6px;">
                        <span class="rotina-icon-art" style="font-size: 1.15rem; width: 28px; height: 28px;">😴</span>
                        <div style="flex: 1; min-width: 0;">
                          <span class="rotina-activity-title" style="font-size: 0.88rem;">${nap.time}</span>
                          <div style="font-size: 0.72rem; color: #0284c7; font-weight: 700;">Qualidade: ${nap.quality}</div>
                        </div>
                        ${isAdmin ? `
                          <button type="button" class="remove-sleep-btn" data-remove-sleep="${sIdx}" title="Remover soneca" style="background: none; border: none; color: #ef4444; font-size: 0.85rem; cursor: pointer; font-weight: 800; padding: 4px;">✕</button>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                `).join('') : `
                  <div style="font-size: 0.8rem; color: #94a3b8; font-style: italic; padding: 8px 0; text-align: center;">
                    Nenhuma soneca registrada para esta data ainda.
                  </div>
                `}
              </div>
            </div>
          ` : ''}

          <!-- MEDICAÇÃO (ESTILO OFICIAL COM RIBBON) -->
          <div class="agenda-card rotina-oficial-card" style="background: #ffffff; border-radius: var(--radius-md); box-shadow: 0 4px 15px rgba(236, 72, 153, 0.08); border: 1.5px solid #bae6fd;">
            <div class="card-body" style="padding: 10px 8px 8px 8px;">
              <div class="rotina-ribbon-container">
                <div class="rotina-ribbon-banner cyan">
                  <span>♥</span> MEDICAÇÃO E SAÚDE <span>♥</span>
                </div>
              </div>

              <div class="rotina-row-item rotina-theme-blue" style="margin-bottom: 0;">
                <div class="rotina-row-top" style="min-height: 42px;">
                  <div class="rotina-time-box" style="width: 68px; font-size: 0.82rem;">
                    💊 Saúde
                  </div>
                  <div class="rotina-content-box" style="padding: 4px 6px;">
                    <span class="rotina-icon-art" style="font-size: 1.15rem; width: 28px; height: 28px;">🩺</span>
                    <div style="flex: 1; min-width: 0;">
                      <span class="rotina-activity-title" style="font-size: 0.88rem;">Orientações de Medicamento</span>
                      ${!isAdmin && currentData.medication?.details ? `
                        <div style="font-size: 0.82rem; color: #1e3a8a; line-height: 1.45; margin-top: 3px; font-weight: 600; white-space: pre-wrap;">
                          ${currentData.medication.details}
                        </div>
                      ` : (!isAdmin ? `
                        <div style="font-size: 0.76rem; color: #94a3b8; font-style: italic; margin-top: 2px;">
                          Nenhuma medicação registrada para esta data.
                        </div>
                      ` : '')}
                    </div>
                  </div>
                </div>

                ${isAdmin ? `
                  <div class="rotina-actions-tray" style="padding: 6px 8px;">
                    <textarea id="medicationNotesInput" class="form-input no-icon" rows="2" style="height: auto; padding: 6px 8px; font-size: 0.8rem; background: #ffffff;"
                      placeholder="Ex: Paracetamol 5 gotas às 14:00 se febre / Pomada antialérgica">${currentData.medication?.details || ''}</textarea>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>

          <!-- OBSERVAÇÕES & RECADINHOS (ESTILO OFICIAL COM RIBBON) -->
          <div class="agenda-card rotina-oficial-card" style="background: #ffffff; border-radius: var(--radius-md); box-shadow: 0 4px 15px rgba(236, 72, 153, 0.08); border: 1.5px solid #fbcfe8;">
            <div class="card-body" style="padding: 10px 8px 8px 8px;">
              <div class="rotina-ribbon-container">
                <div class="rotina-ribbon-banner">
                  <span>♥</span> RECADO DO BERÇÁRIO E HUMOR <span>♥</span>
                </div>
              </div>

              <!-- Linha 1: Humor do Dia no formato oficial -->
              <div class="rotina-row-item rotina-theme-yellow" style="margin-bottom: 6px;">
                <div class="rotina-row-top" style="min-height: 42px;">
                  <div class="rotina-time-box" style="width: 68px; font-size: 0.82rem;">
                    😄 Humor
                  </div>
                  <div class="rotina-content-box" style="padding: 4px 6px;">
                    <span class="rotina-icon-art" style="font-size: 1.15rem; width: 28px; height: 28px;">🌈</span>
                    <div style="flex: 1; min-width: 0;">
                      <span class="rotina-activity-title" style="font-size: 0.88rem;">Como estava o bebê hoje</span>
                      ${!isAdmin && currentData.mood?.label ? `
                        <div style="font-size: 0.8rem; color: #a16207; font-weight: 800; margin-top: 2px;">
                          ${currentData.mood.emoji || ''} ${currentData.mood.label}
                        </div>
                      ` : (!isAdmin ? `
                        <div style="font-size: 0.76rem; color: #94a3b8; font-style: italic; margin-top: 2px;">
                          Aguardando registro do humor
                        </div>
                      ` : '')}
                    </div>
                  </div>
                </div>

                ${isAdmin ? `
                  <div class="rotina-actions-tray" style="padding: 6px 8px;">
                    <div class="rotina-buttons-group">
                      ${renderMoodOptions(currentData.mood?.label, isAdmin)}
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Linha 2: Recado da Educadora no formato oficial -->
              <div class="rotina-row-item rotina-theme-pink" style="margin-bottom: 6px;">
                <div class="rotina-row-top" style="min-height: 42px;">
                  <div class="rotina-time-box" style="width: 68px; font-size: 0.82rem;">
                    👩‍🏫 Tias
                  </div>
                  <div class="rotina-content-box" style="padding: 4px 6px;">
                    <span class="rotina-icon-art" style="font-size: 1.15rem; width: 28px; height: 28px;">💌</span>
                    <div style="flex: 1; min-width: 0;">
                      <span class="rotina-activity-title" style="font-size: 0.88rem;">Recadinho Carinhoso do Berçário</span>
                      ${!isAdmin && currentData.observations?.teacherNote ? `
                        <div style="font-size: 0.84rem; color: #1e293b; line-height: 1.45; margin-top: 3px; font-style: italic; font-weight: 600;">
                          "${currentData.observations.teacherNote}"
                        </div>
                        <div style="text-align: right; margin-top: 3px; font-size: 0.72rem; color: #db2777; font-weight: 800;">
                          💖 ${currentData.observations.teacherName || 'Equipe Berçário'}
                        </div>
                      ` : (!isAdmin ? `
                        <div style="font-size: 0.76rem; color: #94a3b8; font-style: italic; margin-top: 2px;">
                          O recadinho carinhoso das tias ainda não foi publicado hoje.
                        </div>
                      ` : '')}
                    </div>
                  </div>
                </div>

                ${isAdmin ? `
                  <div class="rotina-actions-tray" style="padding: 6px 8px;">
                    <textarea id="teacherNoteInput" class="form-input no-icon" rows="2" style="height: auto; padding: 6px 8px; font-size: 0.8rem; background: #ffffff;" placeholder="Como foi o dia do bebê hoje...">${currentData.observations?.teacherNote || ''}</textarea>
                    <div style="margin-top: 4px;">
                      <input type="text" id="teacherNameInput" class="form-input no-icon" style="height: 30px; font-size: 0.76rem; background: #ffffff;" placeholder="Assinatura da Tia / Educadora" value="${currentData.observations?.teacherName || ''}">
                    </div>
                  </div>
                ` : ''}
              </div>

              <!-- Linha 3: Recado dos Pais para as Educadoras (visão dos pais) -->
              ${!isAdmin ? `
                <div class="rotina-row-item rotina-theme-purple" style="margin-bottom: 0;">
                  <div class="rotina-row-top" style="min-height: 42px;">
                    <div class="rotina-time-box" style="width: 68px; font-size: 0.82rem;">
                      💬 Pais
                    </div>
                    <div class="rotina-content-box" style="padding: 4px 6px;">
                      <span class="rotina-icon-art" style="font-size: 1.15rem; width: 28px; height: 28px;">✍️</span>
                      <div style="flex: 1; min-width: 0;">
                        <span class="rotina-activity-title" style="font-size: 0.88rem;">Deixar recado para as educadoras</span>
                        <div style="font-size: 0.72rem; color: #64748b; margin-top: 1px;">Orientações sobre o bebê para as tias do dia.</div>
                      </div>
                    </div>
                  </div>
                  <div class="rotina-actions-tray" style="padding: 6px 8px;">
                    <textarea id="parentNoteInput" class="form-input no-icon" rows="2" style="height: auto; padding: 6px 8px; font-size: 0.8rem; background: #ffffff;"
                      placeholder="Escreva aqui seu recadinho para as tias/educadoras do berçário...">${currentData.observations?.parentNote || ''}</textarea>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                      ${currentData.observations?.parentNote ? `
                        <span style="font-size: 0.72rem; color: #16a34a; font-weight: 700;">✓ Recado enviado!</span>
                      ` : '<span></span>'}
                      <button type="button" id="saveParentNoteBtn" class="btn btn-primary btn-sm" style="font-size: 0.74rem; padding: 4px 12px; width: auto; background: var(--brand-pink); border-color: var(--brand-pink-dark);">
                        📨 Enviar Recadinho
                      </button>
                    </div>
                  </div>
                </div>
              ` : ''}
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
      <div class="rotina-row-item ${ok ? 'rotina-theme-green' : 'rotina-theme-rose'}" style="margin-bottom: 0;">
        <div class="rotina-row-top" style="min-height: 44px;">
          <div class="rotina-time-box" style="width: 74px; font-size: 0.82rem;">
            ${ok ? '✓ OK' : '⚠️ Falta'}
          </div>
          <div class="rotina-content-box" style="padding: 4px 10px;">
            <span class="rotina-icon-art" style="width: 32px; height: 32px; font-size: 1.2rem;">${icon}</span>
            <div style="flex: 1; min-width: 0;">
              <span class="rotina-activity-title" style="font-size: 0.90rem;">${label}</span>
            </div>
            ${isAdmin ? `
              <button type="button" class="btn-toggle-hygiene ${ok ? 'is-ok' : 'is-missing'}" data-toggle-hygiene="${key}" style="font-size: 0.74rem; padding: 4px 12px; border-radius: 9999px; width: auto; margin-top: 0;">
                ${ok ? 'Marcar Falta' : 'Marcar OK'}
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function renderMealRow(meal, index, isAdmin) {
    // Configurações temáticas fiéis ao design oficial da rotina (cores, ícones e opções)
    const rowConfigs = [
      {
        theme: 'rotina-theme-pink',
        icon: '🛁',
        options: [
          { key: 'realizado', label: '✓ Realizado' },
          { key: 'pomada', label: '🧴 Pomada' },
          { key: 'nao', label: '❌ Não' }
        ]
      },
      {
        theme: 'rotina-theme-orange',
        icon: '🍼',
        options: [
          { key: 'mamadeira', label: '🍼 Mamadeira' },
          { key: 'dormiu', label: '😴 Dormiu' },
          { key: 'metade', label: '🥣 Metade' },
          { key: 'recusou', label: '❌ Não' }
        ]
      },
      {
        theme: 'rotina-theme-green',
        icon: '🛁',
        options: [
          { key: 'realizado', label: '✓ Realizado' },
          { key: 'pomada', label: '🧴 Pomada' },
          { key: 'nao', label: '❌ Não' }
        ]
      },
      {
        theme: 'rotina-theme-blue',
        icon: '😴',
        options: [
          { key: 'dormiu', label: '😴 Dormiu' },
          { key: 'mamadeira', label: '🍼 Mamadeira' },
          { key: 'metade', label: '🥣 Metade' },
          { key: 'recusou', label: '❌ Não' }
        ]
      },
      {
        theme: 'rotina-theme-purple',
        icon: '🥪',
        options: [
          { key: 'tudo', label: '😋 Tudo' },
          { key: 'metade', label: '🥣 Metade' },
          { key: 'pouco', label: '🤏 Pouco' },
          { key: 'recusou', label: '❌ Recusou' }
        ]
      },
      {
        theme: 'rotina-theme-rose',
        icon: '🛁',
        options: [
          { key: 'realizado', label: '✓ Realizado' },
          { key: 'pomada', label: '🧴 Pomada' },
          { key: 'nao', label: '❌ Não' }
        ]
      }
    ];

    const cfg = rowConfigs[index] || {
      theme: 'rotina-theme-orange',
      icon: meal.icon || '⏰',
      options: [
        { key: 'regular', label: 'Regular' },
        { key: 'bom', label: 'Bom' },
        { key: 'otimo', label: 'Ótimo' }
      ]
    };

    const activeOption = cfg.options.find(o => o.key === meal.acceptance);
    
    // Status visual / Tag
    let statusBadgeHtml = '';
    if (activeOption) {
      statusBadgeHtml = `<span class="rotina-choice-btn active" style="font-size: 0.72rem; padding: 2px 9px; pointer-events: none;">${activeOption.label}</span>`;
    } else if (meal.acceptance) {
      const fallbackLabel = meal.acceptance === 'otimo' ? 'Ótimo 🌟' : (meal.acceptance === 'bom' ? 'Bom 😊' : (meal.acceptance === 'regular' ? 'Regular 😐' : meal.acceptance));
      statusBadgeHtml = `<span class="rotina-choice-btn active" style="font-size: 0.72rem; padding: 2px 9px; pointer-events: none;">${fallbackLabel}</span>`;
    } else {
      statusBadgeHtml = isAdmin 
        ? `<span style="font-size: 0.7rem; color: #94a3b8; font-weight: 600;">Marcar ⬇️</span>`
        : `<span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">Aguardando ⏳</span>`;
    }

    return `
      <div class="rotina-row-item ${cfg.theme}">
        <div class="rotina-row-top">
          <div class="rotina-time-box">${meal.time} h</div>
          <div class="rotina-content-box">
            <span class="rotina-icon-art">${cfg.icon}</span>
            <div style="flex: 1; min-width: 0;">
              <span class="rotina-activity-title">${meal.name}</span>
              ${meal.description ? `
                <div style="font-size: 0.74rem; color: #475569; font-weight: 600; margin-top: 2px; white-space: normal; word-break: break-word;">
                  📝 ${meal.description}
                </div>
              ` : ''}
            </div>
            <div class="rotina-status-indicator">
              ${statusBadgeHtml}
            </div>
          </div>
        </div>

        ${isAdmin ? `
          <div class="rotina-actions-tray">
            <div class="rotina-buttons-group">
              ${cfg.options.map(opt => `
                <button type="button" class="rotina-choice-btn ${meal.acceptance === opt.key ? 'active' : ''}" data-meal-idx="${index}" data-choice="${opt.key}">
                  ${opt.label}
                </button>
              `).join('')}
            </div>
            <div>
              <input type="text" class="form-input no-icon meal-desc-input" data-meal-index="${index}" value="${meal.description || ''}" style="height: 30px; font-size: 0.78rem; padding: 2px 8px;" placeholder="Observações (opcional: mamou 150ml, dormiu tranquilo...)">
            </div>
          </div>
        ` : ''}
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
    document.getElementById('logoutBtn')?.addEventListener('click', async (e) => {
      e?.preventDefault();
      const btn = document.getElementById('logoutBtn');
      if (btn) btn.disabled = true;
      state.selectedChildId = null;
      state.adminEditingRoutine = null;
      state.previewAsParent = false;
      await window.authService.logout();
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
      state.selectedDate = window.storageService.getTodayDateString();
      state.adminEditingRoutine = null;
      render();
    });

    document.getElementById('goToTodayBtn')?.addEventListener('click', () => {
      state.selectedDate = window.storageService.getTodayDateString();
      state.adminEditingRoutine = null;
      showToast('📍 Retornou para o dia de hoje.');
      render();
    });

    document.getElementById('dateDisplayLabel')?.addEventListener('click', () => {
      const picker = document.getElementById('datePickerInput');
      if (picker) {
        try {
          if (picker.showPicker) {
            picker.showPicker();
          } else {
            picker.click();
          }
        } catch {
          picker.click();
        }
      }
    });

    document.getElementById('datePickerInput')?.addEventListener('change', (e) => {
      const chosen = e.target.value;
      if (!chosen) return;
      const today = window.storageService.getTodayDateString();
      const minDate = getMinAllowedDateForChild(state.selectedChildId);

      if (minDate && chosen < minDate) {
        showToast(`⚠️ A agenda deste bebê inicia a partir da data de cadastro (${formatDateFriendly(minDate)}).`, 'warning');
        e.target.value = state.selectedDate;
        return;
      }
      if (chosen > today) {
        showToast('⚠️ Não é possível acessar datas futuras. Apenas até o dia de hoje.', 'warning');
        e.target.value = state.selectedDate;
        return;
      }
      state.selectedDate = chosen;
      state.adminEditingRoutine = null;
      render();
    });

    document.getElementById('prevDateBtn')?.addEventListener('click', () => {
      const minDate = getMinAllowedDateForChild(state.selectedChildId);
      const prevDate = addDaysToDateStr(state.selectedDate, -1);
      if (minDate && prevDate < minDate) {
        showToast(`⚠️ A agenda deste bebê inicia a partir da data de cadastro (${formatDateFriendly(minDate)}).`, 'warning');
        return;
      }
      state.selectedDate = prevDate;
      state.adminEditingRoutine = null;
      render();
    });

    document.getElementById('nextDateBtn')?.addEventListener('click', () => {
      const today = window.storageService.getTodayDateString();
      const nextDate = addDaysToDateStr(state.selectedDate, 1);
      if (nextDate > today) {
        showToast('⚠️ Não é possível acessar datas futuras. Apenas até o dia de hoje.', 'warning');
        return;
      }
      state.selectedDate = nextDate;
      state.adminEditingRoutine = null;
      render();
    });

    // Eventos globais (disponíveis para pais e educadores)
    document.getElementById('openCaregiverNoteDrawerBtn')?.addEventListener('click', () => {
      openCaregiverNoteDrawerModal(currentUser, activeChild, state.selectedDate);
    });

    document.getElementById('openNotifCenterBtn')?.addEventListener('click', () => {
      openNotificationCenterModal(currentUser, activeChild, state.selectedDate);
    });

    document.getElementById('saveParentNoteBtn')?.addEventListener('click', () => {
      const noteInput = document.getElementById('parentNoteInput');
      const noteVal = noteInput ? noteInput.value.trim() : '';
      const currentRoutine = window.storageService.getRoutine(activeChild.id, state.selectedDate);
      if (!currentRoutine.observations) currentRoutine.observations = {};
      currentRoutine.observations.parentNote = noteVal;
      currentRoutine.observations.parentNoteAuthor = currentUser.name || 'Família';
      currentRoutine.observations.parentNoteTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      window.storageService.saveRoutine(activeChild.id, state.selectedDate, currentRoutine);
      showToast('💌 Recadinho salvo e enviado com sucesso para a educadora!', 'success');
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

      document.querySelectorAll('.rotina-choice-btn[data-choice], .acceptance-btn-choice[data-choice]').forEach(btn => {
        btn.addEventListener('click', () => {
          const idx = parseInt(btn.dataset.mealIdx, 10);
          const choice = btn.dataset.choice;
          if (state.adminEditingRoutine && state.adminEditingRoutine.meals[idx]) {
            state.adminEditingRoutine.meals[idx].acceptance = choice;
            render();
          }
        });
      });

      document.querySelectorAll('.meal-desc-input').forEach(input => {
        input.addEventListener('change', (e) => {
          const idx = parseInt(input.dataset.mealIndex, 10);
          if (state.adminEditingRoutine && state.adminEditingRoutine.meals[idx]) {
            state.adminEditingRoutine.meals[idx].description = e.target.value;
          }
        });
      });

      document.getElementById('medicationNotesInput')?.addEventListener('input', (e) => {
        if (!state.adminEditingRoutine.medication) state.adminEditingRoutine.medication = {};
        state.adminEditingRoutine.medication.details = e.target.value;
        state.adminEditingRoutine.medication.hasMedication = e.target.value.trim() !== '';
      });

      document.getElementById('addDiaperLogBtn')?.addEventListener('click', () => {
        openDiaperSelectionModal(currentUser, activeChild, state.selectedDate);
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
        const medNotes = document.getElementById('medicationNotesInput')?.value;

        if (state.adminEditingRoutine) {
          state.adminEditingRoutine.observations.teacherNote = teacherNote || '';
          state.adminEditingRoutine.observations.teacherName = teacherName || 'Tias do Berçário';
          state.adminEditingRoutine.hygiene.faltaObservacao = hygieneMissing || '';
          if (!state.adminEditingRoutine.medication) state.adminEditingRoutine.medication = {};
          state.adminEditingRoutine.medication.details = medNotes || '';
          state.adminEditingRoutine.medication.hasMedication = (medNotes || '').trim() !== '';

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

  // Atualiza automaticamente para a data atual de hoje sincronizada com a internet
  const syncToCurrentDay = () => {
    if (!window.storageService) return;
    const today = window.storageService.getTodayDateString();
    const minDate = getMinAllowedDateForChild(state.selectedChildId);
    let changed = false;

    if (state.selectedDate && state.selectedDate > today) {
      state.selectedDate = today;
      changed = true;
    }
    if (minDate && state.selectedDate && state.selectedDate < minDate) {
      state.selectedDate = (today >= minDate) ? today : minDate;
      changed = true;
    }
    if (changed) {
      state.adminEditingRoutine = null;
      render();
    }
  };

  window.addEventListener('focus', syncToCurrentDay);
  window.addEventListener('time:day_changed', syncToCurrentDay);
  window.addEventListener('time:synced', syncToCurrentDay);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncToCurrentDay();
  });

  // Modal do Painel de Recados / Gaveta: Deixar Recado Para o Cuidador
  function openCaregiverNoteDrawerModal(currentUser, activeChild, selectedDate) {
    const existing = document.getElementById('caregiverDrawerModalOverlay');
    if (existing) existing.remove();

    if (!activeChild) {
      showToast('Nenhum bebê selecionado no momento.', 'warning');
      return;
    }

    const currentRoutine = (window.storageService ? window.storageService.getRoutine(activeChild.id, selectedDate) : {}) || {};
    const existingParentNote = currentRoutine.observations?.parentNote || '';
    const existingTeacherNote = currentRoutine.observations?.teacherNote || '';
    const teacherName = currentRoutine.observations?.teacherName || 'Equipe Berçário';
    const noteAuthor = currentRoutine.observations?.parentNoteAuthor || currentUser?.name || 'Família';
    const noteTime = currentRoutine.observations?.parentNoteTime || '';

    const overlay = document.createElement('div');
    overlay.id = 'caregiverDrawerModalOverlay';
    overlay.className = 'notif-modal-overlay';

    overlay.innerHTML = `
      <div class="caregiver-drawer-modal-box">
        <div class="caregiver-drawer-header">
          <div class="caregiver-drawer-title-area">
            <div class="caregiver-drawer-title-row">
              <h3 class="caregiver-drawer-title">
                <span>💬</span> Recado para o Cuidador
              </h3>
            </div>
            <div style="font-size: 0.74rem; color: #64748b; font-weight: 600; margin-top: 2px;">
              👶 <strong>${activeChild.name}</strong> • 📅 ${formatDateFriendly(selectedDate)}
            </div>
          </div>
          <button type="button" class="notif-modal-close" id="closeCaregiverDrawerBtn" title="Fechar">&times;</button>
        </div>

        <div class="caregiver-drawer-body">
          ${existingTeacherNote ? `
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: var(--radius-md); padding: 12px;">
              <div style="font-size: 0.78rem; font-weight: 800; color: #166534; margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                <span style="display: flex; align-items: center; gap: 6px;"><span>💌</span> Resposta da Educadora:</span>
                <span style="font-size: 0.72rem; color: #15803d; font-weight: 700;">${teacherName}</span>
              </div>
              <div style="font-size: 0.85rem; color: #1e293b; line-height: 1.5; font-style: italic;">
                "${existingTeacherNote}"
              </div>
            </div>
          ` : ''}

          <div style="background: #fdf2f8; border: 1px solid #fbcfe8; border-radius: var(--radius-md); padding: 14px;">
            <label class="form-label" for="caregiverDrawerNoteInput" style="font-size: 0.82rem; font-weight: 800; color: #be123c; display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span>✍️ Escreva seu recado para as educadoras:</span>
            </label>
            <p style="font-size: 0.75rem; color: #64748b; margin: 0 0 10px 0; line-height: 1.4;">
              Informe orientações de alimentação, medicação dada em casa, bem-estar ou quem irá buscar o bebê hoje.
            </p>
            <textarea id="caregiverDrawerNoteInput" class="form-input no-icon" rows="4" style="height: auto; padding: 10px; font-size: 0.86rem; line-height: 1.5; background: #ffffff; border-radius: var(--radius-sm); border: 1.5px solid #f472b6; resize: vertical;"
              placeholder="Ex: Hoje acordou com tosse leve. Dei antitérmico às 07:00. Favor colocar o agasalho ao sair...">${existingParentNote}</textarea>

            ${existingParentNote ? `
              <div style="font-size: 0.74rem; color: #16a34a; font-weight: 700; margin-top: 8px; display: flex; align-items: center; gap: 4px;">
                <span>✓</span> Recado registrado por <strong>${noteAuthor}</strong>${noteTime ? ` às ${noteTime}` : ''}.
              </div>
            ` : ''}
          </div>
        </div>

        <div class="caregiver-drawer-footer">
          <button type="button" class="btn btn-secondary btn-sm" id="cancelCaregiverDrawerBtn" style="height: 36px; padding: 0 14px; font-size: 0.8rem; width: auto;">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="saveCaregiverDrawerBtn" style="height: 36px; padding: 0 16px; font-size: 0.82rem; width: auto; background: var(--brand-pink); border-color: var(--brand-pink-dark);">
            💾 Salvar e Enviar Recado
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => {
      overlay.remove();
    };

    overlay.querySelector('#closeCaregiverDrawerBtn')?.addEventListener('click', closeModal);
    overlay.querySelector('#cancelCaregiverDrawerBtn')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelector('#saveCaregiverDrawerBtn')?.addEventListener('click', () => {
      const noteInput = overlay.querySelector('#caregiverDrawerNoteInput');
      const noteVal = noteInput ? noteInput.value.trim() : '';

      const routineToSave = window.storageService.getRoutine(activeChild.id, selectedDate) || {};
      if (!routineToSave.observations) routineToSave.observations = {};
      routineToSave.observations.parentNote = noteVal;
      routineToSave.observations.parentNoteAuthor = currentUser.name || 'Família';
      routineToSave.observations.parentNoteTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      window.storageService.saveRoutine(activeChild.id, selectedDate, routineToSave);
      showToast(noteVal ? '💌 Recadinho salvo e enviado com sucesso para a educadora!' : 'Recado atualizado.', 'success');
      closeModal();
      render();
    });

    setTimeout(() => {
      overlay.querySelector('#caregiverDrawerNoteInput')?.focus();
    }, 150);
  }

  // Modal da Central de Notificações e Avisos para a Família
  function openNotificationCenterModal(currentUser, activeChild, selectedDate) {
    const existing = document.getElementById('notifCenterModalOverlay');
    if (existing) existing.remove();

    const notifs = window.storageService ? window.storageService.getActiveNotificationsForChild(activeChild?.id, selectedDate) : [];
    const userId = currentUser?.id || currentUser?.email || 'default';

    const overlay = document.createElement('div');
    overlay.id = 'notifCenterModalOverlay';
    overlay.className = 'notif-modal-overlay';

    overlay.innerHTML = `
      <div class="notif-modal-box">
        <div class="notif-modal-header" style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <h3 class="notif-modal-title" style="margin: 0;">
              <span>🔔</span> Central de Notificações & Avisos
            </h3>
            <span id="appCloudStatusBadge" title="Banco de Dados Cloud Firestore conectado e sincronizado em tempo real" style="font-size: 0.68rem; font-weight: 700; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 9999px; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px;">
              ☁️ Nuvem 🟢
            </span>
          </div>
          <button type="button" class="notif-modal-close" id="closeNotifCenterBtn" title="Fechar">&times;</button>
        </div>
        <div class="notif-modal-body">
          ${notifs.length === 0 ? `
            <div style="text-align: center; padding: 36px 16px; color: #64748b;">
              <div style="font-size: 2.8rem; margin-bottom: 8px;">✨</div>
              <strong style="color: #1e293b; display: block; margin-bottom: 4px;">Tudo tranquilo por aqui!</strong>
              <span style="font-size: 0.85rem;">Nenhum aviso ou comunicado novo para a data selecionada (${formatDateFriendly(selectedDate)}).</span>
            </div>
          ` : notifs.map(n => {
            const isRead = window.storageService.isNotificationReadToday(n.id, selectedDate, userId);
            const duration = parseInt(n.durationDays, 10) || 1;
            const endDate = window.addDaysToDateStr ? window.addDaysToDateStr(n.startDate, duration - 1) : n.startDate;
            return `
              <div class="notif-card-item ${isRead ? 'is-read' : 'is-unread'}" id="notif-card-${n.id}">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                  <span class="${isRead ? 'notif-card-badge-read' : 'notif-card-badge-unread'}">
                    ${isRead ? '✓ Lido' : '🟢 NOVO'}
                  </span>
                  <span style="font-size: 0.72rem; color: #94a3b8; font-weight: 600;">
                    ${duration > 1 ? `Exibição: ${formatDateFriendly(n.startDate)} a ${formatDateFriendly(endDate)} (${duration} dias)` : `Data: ${formatDateFriendly(n.startDate)}`}
                  </span>
                </div>
                <h4 class="notif-card-title">${n.title}</h4>
                <div class="notif-card-message">${n.message}</div>
                <div class="notif-card-meta">
                  <span>Enviado por: <strong>${n.author || 'Coordenação Berçário'}</strong></span>
                  ${!isRead ? `
                    <button type="button" class="btn btn-secondary btn-sm mark-notif-read-btn" data-notif-id="${n.id}" style="height: 28px; font-size: 0.72rem; padding: 2px 10px; border-radius: 9999px;">
                      Marcar como lido ✓
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#closeNotifCenterBtn')?.addEventListener('click', () => {
      overlay.remove();
      render();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
        render();
      }
    });

    overlay.querySelectorAll('.mark-notif-read-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nid = btn.dataset.notifId;
        window.storageService.markNotificationReadToday(nid, selectedDate, userId);
        showToast('Notificação marcada como lida!');
        openNotificationCenterModal(currentUser, activeChild, selectedDate);
        render();
      });
    });

    overlay.querySelectorAll('.notif-card-item.is-unread').forEach(card => {
      card.addEventListener('click', () => {
        const btn = card.querySelector('.mark-notif-read-btn');
        if (btn) {
          const nid = btn.dataset.notifId;
          window.storageService.markNotificationReadToday(nid, selectedDate, userId);
          openNotificationCenterModal(currentUser, activeChild, selectedDate);
          render();
        }
      });
    });
  }

  // Modal de Escolha Interativa para Troca de Fralda (Fezes)
  function openDiaperSelectionModal(currentUser, activeChild, selectedDate) {
    const existing = document.getElementById('diaperSelectionModalOverlay');
    if (existing) existing.remove();

    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let chosenTime = defaultTime;
    let chosenConsistencia = 'Normal';
    let chosenQtd = 'Média';
    let chosenPomada = 'sim';

    const overlay = document.createElement('div');
    overlay.id = 'diaperSelectionModalOverlay';
    overlay.className = 'notif-modal-overlay';

    overlay.innerHTML = `
      <div class="notif-modal-box" style="max-width: 420px;">
        <div class="notif-modal-header" style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);">
          <h3 class="notif-modal-title" style="color: #db2777;">
            <span>🚼</span> Registrar Troca de Fezes
          </h3>
          <button type="button" class="notif-modal-close" id="closeDiaperModalBtn" title="Fechar">&times;</button>
        </div>

        <div class="notif-modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 14px;">
          <!-- Horário -->
          <div>
            <label style="font-size: 0.8rem; font-weight: 800; color: #334155; display: block; margin-bottom: 4px;">
              ⏰ Horário da Troca:
            </label>
            <input type="time" id="diaperTimeInput" class="form-input no-icon" value="${defaultTime}" style="height: 38px; font-weight: 700; font-size: 0.95rem;">
          </div>

          <!-- Consistência -->
          <div>
            <label style="font-size: 0.8rem; font-weight: 800; color: #334155; display: block; margin-bottom: 6px;">
              💩 Consistência das Fezes:
            </label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="diaperConsistencyGroup">
              <button type="button" class="diaper-choice-chip active" data-val="Normal">Normal</button>
              <button type="button" class="diaper-choice-chip" data-val="Pastosa">Pastosa</button>
              <button type="button" class="diaper-choice-chip" data-val="Líquida">Líquida</button>
              <button type="button" class="diaper-choice-chip" data-val="Com Muco">Com Muco</button>
              <button type="button" class="diaper-choice-chip" data-val="Seca / Dura">Seca / Dura</button>
            </div>
          </div>

          <!-- Quantidade -->
          <div>
            <label style="font-size: 0.8rem; font-weight: 800; color: #334155; display: block; margin-bottom: 6px;">
              📊 Quantidade:
            </label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="diaperQuantityGroup">
              <button type="button" class="diaper-choice-chip" data-val="Pouca">Pouca</button>
              <button type="button" class="diaper-choice-chip active" data-val="Média">Média</button>
              <button type="button" class="diaper-choice-chip" data-val="Abundante">Abundante</button>
            </div>
          </div>

          <!-- Pomada -->
          <div>
            <label style="font-size: 0.8rem; font-weight: 800; color: #334155; display: block; margin-bottom: 6px;">
              🧴 Pomada Preventiva:
            </label>
            <div style="display: flex; gap: 6px; flex-wrap: wrap;" id="diaperPomadaGroup">
              <button type="button" class="diaper-choice-chip active" data-val="sim">🧴 Com Pomada</button>
              <button type="button" class="diaper-choice-chip" data-val="nao">Sem Pomada</button>
            </div>
          </div>
        </div>

        <div class="caregiver-drawer-footer" style="padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px;">
          <button type="button" class="btn btn-secondary btn-sm" id="cancelDiaperModalBtn" style="height: 36px; padding: 0 14px; font-size: 0.8rem; width: auto;">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="confirmDiaperModalBtn" style="height: 36px; padding: 0 18px; font-size: 0.84rem; width: auto; background: var(--brand-pink); border-color: var(--brand-pink-dark);">
            Confirmar Troca ✓
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('#closeDiaperModalBtn')?.addEventListener('click', closeModal);
    overlay.querySelector('#cancelDiaperModalBtn')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    overlay.querySelectorAll('#diaperConsistencyGroup .diaper-choice-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        overlay.querySelectorAll('#diaperConsistencyGroup .diaper-choice-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        chosenConsistencia = chip.dataset.val;
      });
    });

    overlay.querySelectorAll('#diaperQuantityGroup .diaper-choice-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        overlay.querySelectorAll('#diaperQuantityGroup .diaper-choice-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        chosenQtd = chip.dataset.val;
      });
    });

    overlay.querySelectorAll('#diaperPomadaGroup .diaper-choice-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        overlay.querySelectorAll('#diaperPomadaGroup .diaper-choice-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        chosenPomada = chip.dataset.val;
      });
    });

    overlay.querySelector('#confirmDiaperModalBtn')?.addEventListener('click', () => {
      const timeVal = overlay.querySelector('#diaperTimeInput')?.value || defaultTime;
      if (!state.adminEditingRoutine.diapers) state.adminEditingRoutine.diapers = { count: 0, logs: [] };
      if (!Array.isArray(state.adminEditingRoutine.diapers.logs)) state.adminEditingRoutine.diapers.logs = [];

      const labelStr = `Fezes (${chosenConsistencia} - ${chosenQtd})`;
      state.adminEditingRoutine.diapers.logs.push({
        time: timeVal,
        type: labelStr,
        ointment: (chosenPomada === 'sim')
      });
      state.adminEditingRoutine.diapers.count = state.adminEditingRoutine.diapers.logs.length;
      showToast('🚼 Troca de fralda registrada com sucesso!');
      closeModal();
      render();
    });
  }

  // Inicializa render
  render();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
