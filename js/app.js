/**
 * Main Application - Brinca e Aprende Agenda Berçário
 * Versão Mobile First com foco na Tela de Login / Cadastro e Identidade Original
 */

document.addEventListener('DOMContentLoaded', () => {
  const appContainer = document.getElementById('app');

  // Estado da aplicação
  const state = {
    selectedDate: window.storageService.getTodayDateString(),
    selectedChildId: null,
    authTab: 'login', // 'login' | 'register' | 'admin'
    showPassword: false,
    adminEditingRoutine: null
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

  // Render principal
  function render() {
    const currentUser = window.authService.getCurrentUser();

    if (!currentUser) {
      appContainer.classList.remove('app-view-wide');
      renderAuthScreen();
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
          ${state.authTab === 'login' ? renderLoginForm() : ''}
          ${state.authTab === 'register' ? renderRegisterForm() : ''}
          ${state.authTab === 'admin' ? renderAdminLoginForm() : ''}
        </div>

        <!-- Acesso Rápido de Teste -->
        <div class="quick-test-box">
          <button type="button" id="quickDemoBtn" class="btn btn-quick-demo">
            ⚡ Acesso Rápido de Teste (1 Clique)
          </button>
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
            <input type="email" id="loginEmail" class="form-input" placeholder="seu.email@exemplo.com" value="pais.theo@gmail.com" required autocomplete="email">
          </div>
        </div>

        <div class="form-group">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label class="form-label" for="loginPassword" style="margin-bottom: 0;">Senha</label>
            <a href="#" id="forgotPasswordLink" style="font-size: 0.76rem; color: var(--brand-pink-dark); text-decoration: none; font-weight: 700;">Esqueceu a senha?</a>
          </div>
          <div class="input-container">
            <span class="input-icon">🔒</span>
            <input type="${state.showPassword ? 'text' : 'password'}" id="loginPassword" class="form-input" placeholder="Sua senha" value="123456" required autocomplete="current-password">
            <button type="button" id="togglePasswordBtn" class="password-toggle-btn" title="Mostrar/ocultar senha">
              ${state.showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary">
          Entrar na Agenda 🚀
        </button>
      </form>

      <div class="form-divider">
        <span>ou acesse rapidamente</span>
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
      <h2 class="auth-heading">Novo Cadastro</h2>
      <p class="auth-subheading">Cadastre-se para receber as atualizações em tempo real</p>

      <form id="registerForm">
        <div class="form-group">
          <label class="form-label" for="regName">Nome do Responsável</label>
          <div class="input-container">
            <span class="input-icon">👤</span>
            <input type="text" id="regName" class="form-input" placeholder="Ex: Mariana Oliveira" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regBabyName">Nome do Bebê</label>
          <div class="input-container">
            <span class="input-icon">👶</span>
            <input type="text" id="regBabyName" class="form-input" placeholder="Ex: Theo Oliveira" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regEmail">Seu E-mail</label>
          <div class="input-container">
            <span class="input-icon">✉️</span>
            <input type="email" id="regEmail" class="form-input" placeholder="seu.email@exemplo.com" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="regPassword">Criar Senha</label>
          <div class="input-container">
            <span class="input-icon">🔒</span>
            <input type="${state.showPassword ? 'text' : 'password'}" id="regPassword" class="form-input" placeholder="Mínimo 6 caracteres" minlength="4" required>
            <button type="button" id="toggleRegPasswordBtn" class="password-toggle-btn" title="Mostrar/ocultar senha">
              ${state.showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-primary" style="margin-top: 6px;">
          Criar Cadastro e Entrar 🌟
        </button>
      </form>

      <div class="form-divider">
        <span>ou</span>
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
      <p class="auth-subheading">Acesso para preenchimento de rotinas, refeições e fraldas</p>

      <form id="adminLoginForm">
        <div class="form-group">
          <label class="form-label" for="adminEmail">E-mail Administrativo</label>
          <div class="input-container">
            <span class="input-icon">👩‍🏫</span>
            <input type="email" id="adminEmail" class="form-input" value="admin@brincaeaprende.com.br" required>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="adminPassword">Senha de Acesso</label>
          <div class="input-container">
            <span class="input-icon">🔑</span>
            <input type="${state.showPassword ? 'text' : 'password'}" id="adminPassword" class="form-input" value="admin123" required>
            <button type="button" id="toggleAdminPasswordBtn" class="password-toggle-btn" title="Mostrar/ocultar senha">
              ${state.showPassword ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button type="submit" class="btn btn-cyan" style="margin-top: 6px;">
          Entrar como Educador (Preencher) ✏️
        </button>
      </form>

      <div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 10px 12px; border-radius: var(--radius-sm); margin-top: 16px; font-size: 0.78rem; color: #6b21a8;">
        💡 <strong>Dica de Teste:</strong><br>
        E-mail: <code>admin@brincaeaprende.com.br</code> | Senha: <code>admin123</code>
      </div>
    `;
  }

  function bindAuthEvents() {
    // Alternância de abas
    document.getElementById('tabLoginBtn')?.addEventListener('click', () => {
      state.authTab = 'login';
      render();
    });
    document.getElementById('tabRegisterBtn')?.addEventListener('click', () => {
      state.authTab = 'register';
      render();
    });
    document.getElementById('tabAdminBtn')?.addEventListener('click', () => {
      state.authTab = 'admin';
      render();
    });
    document.getElementById('switchToAdminTabBtn')?.addEventListener('click', () => {
      state.authTab = 'admin';
      render();
    });

    // Toggle senha
    const handleTogglePassword = () => {
      state.showPassword = !state.showPassword;
      render();
    };
    document.getElementById('togglePasswordBtn')?.addEventListener('click', handleTogglePassword);
    document.getElementById('toggleRegPasswordBtn')?.addEventListener('click', handleTogglePassword);
    document.getElementById('toggleAdminPasswordBtn')?.addEventListener('click', handleTogglePassword);

    // Esqueceu a senha
    document.getElementById('forgotPasswordLink')?.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('Enviamos as instruções de recuperação para o seu e-mail cadastrado!');
    });

    // Login Form Submit
    document.getElementById('loginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const pass = document.getElementById('loginPassword').value;
      const res = window.authService.login(email, pass);
      if (res.success) {
        showToast(`Bem-vindo(a), ${res.user.name}!`);
        render();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Register Form Submit
    document.getElementById('registerForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const pass = document.getElementById('regPassword').value;
      const baby = document.getElementById('regBabyName').value;

      const res = window.authService.register(name, email, pass, baby, '1 ano');
      if (res.success) {
        showToast(`Cadastro realizado com sucesso! Bem-vindo(a), ${name}!`);
        render();
      }
    });

    // Admin Login Form Submit
    document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('adminEmail').value;
      const pass = document.getElementById('adminPassword').value;
      const res = window.authService.login(email, pass);
      if (res.success) {
        showToast(`Painel do Educador liberado! Olá, ${res.user.name}!`);
        render();
      } else {
        showToast(res.message, 'error');
      }
    });

    // Login Google
    const handleGoogle = () => {
      window.authService.loginWithGoogle();
      showToast('Autenticado com sucesso via Google!');
      render();
    };
    document.getElementById('googleLoginBtn')?.addEventListener('click', handleGoogle);
    document.getElementById('googleRegBtn')?.addEventListener('click', handleGoogle);

    // Botão de acesso rápido para testes
    document.getElementById('quickDemoBtn')?.addEventListener('click', () => {
      window.authService.login('pais.theo@gmail.com', '123456');
      showToast('Entrou na demonstração como responsável pelo Theo!');
      render();
    });
  }

  // ==========================================================================
  // TELA DA AGENDA (PAIS & EDUCADOR)
  // ==========================================================================
  function renderAgendaScreen(currentUser) {
    const isAdmin = currentUser.role === 'admin';
    const children = window.storageService.getChildren();
    const activeChild = window.storageService.getChildById(state.selectedChildId);
    const routine = window.storageService.getRoutine(state.selectedChildId, state.selectedDate);

    if (isAdmin && (!state.adminEditingRoutine || state.adminEditingRoutine.childId !== state.selectedChildId || state.adminEditingRoutine.date !== state.selectedDate)) {
      state.adminEditingRoutine = JSON.parse(JSON.stringify(routine));
    }

    const currentData = isAdmin ? state.adminEditingRoutine : routine;

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
          <div class="user-avatar">${currentUser.avatar || '👤'}</div>
          <div>
            <div style="font-size: 0.88rem; font-weight: 800; color: var(--gray-900); display: flex; align-items: center; gap: 6px;">
              ${currentUser.name}
              <span class="role-pill ${currentUser.role}">
                ${isAdmin ? 'Educadora' : 'Pais'}
              </span>
            </div>
            <div style="font-size: 0.75rem; color: var(--gray-500);">
              ${isAdmin ? 'Modo de Edição da Turma' : `Bebê: <strong>${activeChild.name}</strong>`}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 6px;">
          <button id="toggleRoleBtn" class="btn btn-secondary btn-sm" style="height: 32px; font-size: 0.74rem; padding: 4px 8px; width: auto;" title="Alternar visão">
            ${isAdmin ? '👁️ Ver como Pais' : '✏️ Painel Educador'}
          </button>
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
            <h2 class="card-title">🚼 Trocas de Fralda (${currentData.diapers.count || currentData.diapers.logs.length})</h2>
          </div>
          <div class="card-body">
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; margin-bottom: 12px;">
              ${currentData.diapers.logs.map((log) => `
                <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-sm); padding: 6px 8px; font-size: 0.78rem;">
                  <strong>⏰ ${log.time}</strong> • ${log.type}
                  ${log.ointment ? `<br><span style="color: var(--brand-pink-dark); font-size: 0.7rem;">✓ Com pomada</span>` : ''}
                </div>
              `).join('')}
            </div>

            ${isAdmin ? `
              <button type="button" id="addDiaperLogBtn" class="btn btn-secondary btn-sm" style="height: 34px; font-size: 0.76rem; margin-bottom: 14px;">
                ➕ Registrar Nova Troca
              </button>
            ` : ''}

            <h3 style="font-size: 0.86rem; font-weight: 800; color: var(--gray-800); margin-bottom: 6px;">😴 Sonecas</h3>
            ${currentData.sleep.map(nap => `
              <div style="font-size: 0.8rem; background: var(--gray-50); padding: 6px 10px; border-radius: var(--radius-sm); margin-bottom: 4px; display: flex; justify-content: space-between;">
                <strong>${nap.period}: ${nap.time}</strong>
                <span style="color: var(--brand-cyan-dark); font-weight: 700;">${nap.quality}</span>
              </div>
            `).join('')}
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
              <label class="form-label" style="font-size: 0.78rem;">Recado para os pais:</label>
              <textarea id="teacherNoteInput" class="form-input no-icon" rows="3" style="height: auto; padding: 8px; font-size: 0.84rem;">${currentData.observations.teacherNote || ''}</textarea>
              <div style="margin-top: 6px;">
                <input type="text" id="teacherNameInput" class="form-input no-icon" style="height: 34px; font-size: 0.8rem;" value="${currentData.observations.teacherName || 'Tias do Berçário'}">
              </div>
            ` : `
              <div style="background: #ffffff; border: 1.5px solid var(--brand-cyan-light); border-radius: var(--radius-md); padding: 12px; font-size: 0.85rem; line-height: 1.5;">
                "${currentData.observations.teacherNote || 'Dia tranquilo e alegre!'}"
                <div style="text-align: right; margin-top: 8px; font-size: 0.76rem; color: var(--brand-cyan-dark); font-weight: 800;">
                  💌 ${currentData.observations.teacherName || 'Equipe Berçário'}
                </div>
              </div>
            `}
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
      if (isAdmin) {
        window.authService.login('pais.theo@gmail.com', '123456');
        showToast('Mudou para Visão dos Pais');
      } else {
        window.authService.loginAsAdminQuick();
        showToast('Mudou para Modo Educador');
      }
      render();
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
        state.adminEditingRoutine.diapers.logs.push({ time: timeStr, type: 'Xixi', ointment: true });
        state.adminEditingRoutine.diapers.count = state.adminEditingRoutine.diapers.logs.length;
        showToast('Troca de fralda adicionada!');
        render();
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

  // Inicializa render
  render();
});
