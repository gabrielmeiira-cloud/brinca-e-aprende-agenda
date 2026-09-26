/**
 * Admin Panel Controller - Brinca e Aprende Agenda Berçário
 * Controle total de dados: Crianças, Famílias, Contas Google e Educadores.
 */

document.addEventListener('DOMContentLoaded', () => {
  const modalOverlay = document.getElementById('adminModalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');

  // Helper de Notificações Toast
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

  // Controle de Abas
  function switchTab(target) {
    document.querySelectorAll('.admin-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === target);
    });

    document.getElementById('tabChildrenSection').style.display = target === 'tabChildren' ? 'block' : 'none';
    document.getElementById('tabEducatorsSection').style.display = target === 'tabEducators' ? 'block' : 'none';
    document.getElementById('tabFirebaseSection').style.display = target === 'tabFirebase' ? 'block' : 'none';

    renderAll(); // Garante atualização instantânea ao alternar abas
  }

  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  // Atualização de Métricas
  function updateMetrics() {
    const children = window.storageService.getChildren();
    const educators = window.storageService.getEducators();
    
    // Contagem de e-mails únicos de pais
    const parentEmails = new Set(children.map(c => (c.parentEmail || '').toLowerCase()).filter(Boolean));
    
    // Contagem de rotinas salvas
    let routinesCount = 0;
    try {
      const routines = JSON.parse(localStorage.getItem('brinca_aprende_routines') || '{}');
      routinesCount = Object.keys(routines).length;
    } catch {
      routinesCount = 0;
    }

    document.getElementById('metricChildrenCount').innerText = children.length;
    document.getElementById('metricParentsCount').innerText = parentEmails.size;
    document.getElementById('metricEducatorsCount').innerText = educators.length;
    document.getElementById('metricRoutinesCount').innerText = routinesCount;
  }

  // ==========================================================================
  // TABELA DE CRIANÇAS & FAMÍLIAS
  // ==========================================================================
  function renderChildrenTable() {
    const tableBody = document.getElementById('childrenTableBody');
    const children = window.storageService.getChildren();

    if (children.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 30px; color: #94a3b8;">
            Nenhum bebê cadastrado no momento. Clique em <strong>+ Cadastrar Novo Bebê</strong> acima.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = children.map(child => {
      const pEmail = (child.parentEmail || '').toLowerCase().trim();
      const isDemo = child.id === 'child_1' || child.id === 'child_2' || child.id === 'child_3' || child.id === 'child_4' || pEmail.endsWith('@exemplo.com');
      const isGoogle = !isDemo && (
        child.isGoogle || 
        pEmail.includes('gabrielmeiira') || 
        pEmail.endsWith('@gmail.com')
      );
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">${child.avatar || '👶'}</span>
              <strong style="color: #0f172a;">${child.name}</strong>
            </div>
          </td>
          <td>
            <span style="background: #e0f2fe; color: #0369a1; font-weight: 700; font-size: 0.74rem; padding: 2px 8px; border-radius: var(--radius-full);">
              ${child.turma || 'Berçário 1'}
            </span>
          </td>
          <td>${child.age || '1 ano'}</td>
          <td>${child.responsible || 'Responsável'}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>${child.parentEmail || 'Não informado'}</span>
              ${isGoogle ? `<span class="user-pill-tag google" title="Conta autenticada via Google">Google 🟢</span>` : `<span class="user-pill-tag email">E-mail</span>`}
            </div>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; gap: 6px;">
              <button class="btn-action-icon edit-child-btn" data-id="${child.id}" title="Editar informações do bebê">
                ✏️ Editar
              </button>
              <button class="btn-action-icon danger delete-child-btn" data-id="${child.id}" data-name="${child.name}" data-email="${child.parentEmail || ''}" title="Descadastrar bebê do sistema mantendo a conta do responsável salva">
                🚫 Descadastrar Bebê
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de Editar
    document.querySelectorAll('.edit-child-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openEditChildModal(btn.dataset.id);
      });
    });

    // Eventos de Descadastrar Bebê do Sistema (Sem apagar a conta da família)
    document.querySelectorAll('.delete-child-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const email = btn.dataset.email;

        if (confirm(`Tem certeza que deseja DESCADASTRAR o bebê "${name}" do sistema?\n\n• O bebê será desvinculado e removido da lista ativa do berçário.\n• A conta da família (${email || 'sem e-mail'}) NÃO será excluída e permanecerá salva no sistema.\n• Um botão "Recadastrar Conta" ficará disponível para você ou para a família cadastrar uma nova criança a qualquer momento.`)) {
          window.storageService.deleteChild(id);
          showToast(`Bebê "${name}" descadastrado do sistema! A conta continua salva para recadastro.`, 'success');
          renderAll();
        }
      });
    });
  }

  // ==========================================================================
  // TABELA DE CONTAS DE PAIS E RESPONSÁVEIS (LOGIN DO SISTEMA)
  // ==========================================================================
  function renderParentAccountsTable() {
    const tableBody = document.getElementById('parentAccountsTableBody');
    const countBadge = document.getElementById('parentAccountsCountBadge');
    if (!tableBody) return;

    const parentAccounts = window.storageService.getAllParentAccounts();

    if (countBadge) {
      countBadge.innerText = `${parentAccounts.length} conta${parentAccounts.length === 1 ? '' : 's'}`;
    }

    if (parentAccounts.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 28px; color: #94a3b8;">
            Nenhuma conta de responsável registrada no momento.
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = parentAccounts.map(acc => {
      const avatarHtml = acc.photoURL 
        ? `<img src="${acc.photoURL}" alt="${acc.name}" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover;" onerror="this.outerHTML='<span>👪</span>'">`
        : `<span style="font-size: 1.3rem;">👪</span>`;

      const babyStatusHtml = acc.linkedChild
        ? `<span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: #0284c7;">
             <span>${acc.linkedChild.avatar || '👶'}</span> ${acc.linkedChild.name} 
             <span style="font-size: 0.72rem; color: #64748b; font-weight: 600;">(${acc.linkedChild.turma || 'Berçário'})</span>
           </span>`
        : `<span style="background: #fef3c7; color: #b45309; font-weight: 700; font-size: 0.74rem; padding: 3px 8px; border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 4px;">
             ⚠️ Sem bebê vinculado
           </span>`;

      const loginBadgeHtml = acc.isGoogle
        ? `<span class="user-pill-tag google" style="display: inline-flex; align-items: center; gap: 4px;">Google Auth 🟢</span>`
        : `<span class="user-pill-tag email" style="display: inline-flex; align-items: center; gap: 4px;">E-mail / Senha</span>`;

      const relinkBtnHtml = !acc.linkedChild
        ? `<button class="btn btn-primary btn-sm relink-baby-btn" data-email="${acc.email}" data-name="${acc.name || 'Responsável'}" style="padding: 4px 10px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; margin-right: 6px;">
             ➕ Recadastrar Bebê
           </button>`
        : '';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              ${avatarHtml}
              <strong style="color: #0f172a; font-size: 0.88rem;">${acc.name || 'Responsável'}</strong>
            </div>
          </td>
          <td>
            <code style="background: #f8fafc; padding: 2px 6px; border-radius: 4px; font-size: 0.8rem; color: #334155; border: 1px solid #e2e8f0;">
              ${acc.email}
            </code>
          </td>
          <td>${loginBadgeHtml}</td>
          <td>${babyStatusHtml}</td>
          <td style="text-align: right;">
            <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px;">
              ${relinkBtnHtml}
              <button class="btn-action-icon danger delete-parent-account-btn" data-email="${acc.email}" data-name="${acc.name || 'Responsável'}" title="Excluir conta definitivamente do sistema">
                🗑️ Excluir Conta
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de Recadastrar Bebê na Conta
    tableBody.querySelectorAll('.relink-baby-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openRelinkBabyModal(btn.dataset.email, btn.dataset.name);
      });
    });

    // Eventos de Excluir Conta de Pai do Sistema
    tableBody.querySelectorAll('.delete-parent-account-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.dataset.email;
        const name = btn.dataset.name;

        if (confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE a conta de "${name}" (${email}) do sistema?\n\n• Isso apagará o login e qualquer histórico associado a este usuário.\n• Caso a conta seja do Google, para remoção das credenciais na nuvem, exclua também no painel do Firebase Console.`)) {
          window.storageService.deleteParentUser(email);
          showToast(`Conta de ${email} excluída definitivamente do sistema.`, 'success');
          renderAll();
        }
      });
    });
  }

  // ==========================================================================
  // TABELA DE EDUCADORES
  // ==========================================================================
  function renderEducatorsTable() {
    const tableBody = document.getElementById('educatorsTableBody');
    const educators = window.storageService.getEducators();

    tableBody.innerHTML = educators.map(edu => {
      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.4rem;">${edu.avatar || '👩‍🏫'}</span>
              <strong style="color: #0f172a;">${edu.name}</strong>
            </div>
          </td>
          <td><code>${edu.email}</code></td>
          <td>${edu.turma || 'Geral'}</td>
          <td>
            <span style="background: #fce7f3; color: #be185d; font-weight: 800; font-size: 0.72rem; padding: 2px 8px; border-radius: var(--radius-full);">
              ${edu.role === 'admin' ? 'Educadora / Admin' : 'Cuidadora'}
            </span>
          </td>
          <td style="text-align: right;">
            <button class="btn-action-icon danger delete-educator-btn" data-email="${edu.email}" data-name="${edu.name}" title="Revogar permissão de educador">
              🗑️ Revogar
            </button>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de Revogar Educador
    document.querySelectorAll('.delete-educator-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.dataset.email;
        const name = btn.dataset.name;

        if (confirm(`Deseja revogar a permissão do(a) educador(a) "${name}" (${email})?`)) {
          window.storageService.deleteEducator(email);
          showToast(`Acesso de ${name} revogado com sucesso.`, 'success');
          renderAll();
        }
      });
    });
  }

  // ==========================================================================
  // TABELA DE CONTAS GOOGLE / FIREBASE
  // ==========================================================================
  function renderGoogleAccountsTable() {
    const tableBody = document.getElementById('googleAccountsTableBody');
    const countBadge = document.getElementById('googleAccountsCountBadge');
    if (!tableBody) return;

    const googleAccounts = window.storageService.getGoogleAccounts();

    if (countBadge) {
      countBadge.innerText = `${googleAccounts.length} conta${googleAccounts.length === 1 ? '' : 's'} Google`;
    }

    if (googleAccounts.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 36px 16px; color: #94a3b8;">
            <div style="font-size: 2rem; margin-bottom: 8px;">☁️</div>
            <strong style="color: #475569; font-size: 0.95rem;">Nenhuma conta Google registrada ainda</strong>
            <p style="font-size: 0.82rem; margin: 4px 0 0 0; color: #94a3b8;">
              Assim que um responsável ou educador fizer login usando a opção "Entrar com Google", a conta aparecerá listada aqui para gerenciamento e exclusão direta.
            </p>
          </td>
        </tr>
      `;
      return;
    }

    tableBody.innerHTML = googleAccounts.map(acc => {
      const avatarHtml = acc.photoURL 
        ? `<img src="${acc.photoURL}" alt="${acc.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 2px solid #38bdf8;" onerror="this.outerHTML='<span style=\\'font-size: 1.4rem;\\'>👤</span>'">`
        : `<span style="font-size: 1.4rem;">👤</span>`;

      const childHtml = acc.linkedChild
        ? `<span style="display: inline-flex; align-items: center; gap: 6px; font-weight: 700; color: #0284c7;">
             <span>${acc.linkedChild.avatar || '👶'}</span> ${acc.linkedChild.name} 
             <span style="font-size: 0.72rem; color: #64748b; font-weight: 600;">(${acc.linkedChild.turma || 'Berçário'})</span>
           </span>`
        : `<span style="background: #fef3c7; color: #b45309; font-weight: 700; font-size: 0.74rem; padding: 3px 8px; border-radius: var(--radius-full); display: inline-flex; align-items: center; gap: 4px;">
             ⚠️ Sem bebê vinculado
           </span>`;

      const relinkBtnHtml = !acc.linkedChild
        ? `<button class="btn btn-primary btn-sm relink-baby-btn" data-email="${acc.email}" data-name="${acc.name || 'Usuário Google'}" style="padding: 4px 10px; font-size: 0.78rem; display: inline-flex; align-items: center; gap: 4px; margin-right: 6px;">
             ➕ Recadastrar Conta
           </button>`
        : '';

      return `
        <tr>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${avatarHtml}
              <div>
                <strong style="color: #0f172a; font-size: 0.9rem;">${acc.name || 'Usuário Google'}</strong>
              </div>
            </div>
          </td>
          <td>
            <code style="background: #f8fafc; padding: 3px 8px; border-radius: 4px; font-size: 0.82rem; color: #334155; border: 1px solid #e2e8f0;">
              ${acc.email}
            </code>
          </td>
          <td>${childHtml}</td>
          <td>
            <span class="user-pill-tag google" style="display: inline-flex; align-items: center; gap: 6px;">
              <svg width="12" height="12" viewBox="0 0 24 24" style="flex-shrink: 0;"><path fill="#0369a1" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#0369a1" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#0369a1" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#0369a1" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
              Google Auth 🟢
            </span>
          </td>
          <td style="text-align: right;">
            <div style="display: inline-flex; align-items: center; justify-content: flex-end; gap: 6px;">
              ${relinkBtnHtml}
              <button class="btn-action-icon danger delete-google-account-btn" data-email="${acc.email}" data-name="${acc.name || 'Usuário Google'}" title="Excluir conta Google definitivamente do sistema">
                🗑️ Excluir Conta
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Eventos de Recadastrar Conta Google
    tableBody.querySelectorAll('.relink-baby-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openRelinkBabyModal(btn.dataset.email, btn.dataset.name);
      });
    });

    // Eventos de Excluir Conta Google
    tableBody.querySelectorAll('.delete-google-account-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const email = btn.dataset.email;
        const name = btn.dataset.name;

        if (confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE a conta Google "${name}" (${email}) do sistema?\n\n• A conta será removida do painel do app.\n• Para exclusão definitiva das credenciais Google na nuvem, exclua também no painel do Firebase Console.`)) {
          window.storageService.deleteGoogleAccount(email);
          showToast(`Conta Google de ${email} excluída do sistema com sucesso!`, 'success');
          renderAll();
        }
      });
    });
  }

  // ==========================================================================
  // MODAIS (CADASTRO E EDIÇÃO)
  // ==========================================================================
  function openModal(title, contentHtml) {
    modalTitle.innerText = title;
    modalBody.innerHTML = contentHtml;
    modalOverlay.style.display = 'flex';
  }

  function closeModal() {
    modalOverlay.style.display = 'none';
    modalBody.innerHTML = '';
  }

  document.getElementById('closeModalBtn')?.addEventListener('click', closeModal);
  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });

  // Modal: Recadastrar Bebê / Reativar Vínculo à Conta
  function openRelinkBabyModal(email, parentName) {
    openModal(`Recadastrar Bebê na Conta`, `
      <form id="formRelinkBabyAdmin">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.82rem; color: #166534;">
          <strong>💡 Conta Preservada no Sistema:</strong><br>
          Esta conta já possui login ativo e autenticado. Preencha os dados do bebê para reativar o vínculo e liberar a agenda.
        </div>

        <div class="form-group">
          <label class="form-label">E-mail da Família (Conta Autenticada)</label>
          <input type="email" id="relinkParentEmail" class="form-input no-icon" value="${email}" readonly style="background: #f8fafc; color: #475569; font-weight: 700;">
        </div>

        <div class="form-group">
          <label class="form-label">Nome do Pai / Mãe / Responsável *</label>
          <input type="text" id="relinkParentName" class="form-input no-icon" value="${parentName || ''}" placeholder="Ex: Gabriel Meira (Pai)" required>
        </div>

        <div class="form-group">
          <label class="form-label">Nome Completo do Bebê *</label>
          <input type="text" id="relinkBabyName" class="form-input no-icon" placeholder="Ex: Liam Meira" required>
        </div>

        <div class="form-group">
          <label class="form-label">Idade ou Data de Nascimento *</label>
          <input type="text" id="relinkBabyAge" class="form-input no-icon" placeholder="Ex: 8 meses ou 15/01/2024" required>
        </div>

        <div class="form-group">
          <label class="form-label">Turma do Berçário *</label>
          <select id="relinkBabyTurma" class="form-input no-icon">
            <option value="Berçário 1">Berçário 1 (4 meses a 1 ano)</option>
            <option value="Berçário 2">Berçário 2 (1 a 2 anos)</option>
            <option value="Maternal">Maternal (2 a 3 anos)</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Ícone do Bebê</label>
          <select id="relinkBabyAvatar" class="form-input no-icon">
            <option value="👶">👶 Menino</option>
            <option value="👧">👧 Menina</option>
            <option value="🍼">🍼 Bebê Mamadeira</option>
            <option value="🧒">🧒 Criança</option>
            <option value="🧸">🧸 Ursinho</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Telefone / WhatsApp (Opcional)</label>
          <input type="tel" id="relinkPhone" class="form-input no-icon" placeholder="(00) 00000-0000">
        </div>

        <button type="submit" class="btn btn-primary" style="margin-top: 10px; width: 100%;">
          🚀 Concluir Recadastro do Bebê
        </button>
      </form>
    `);

    document.getElementById('formRelinkBabyAdmin')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pName = document.getElementById('relinkParentName').value.trim();
      const bName = document.getElementById('relinkBabyName').value.trim();
      const bAge = document.getElementById('relinkBabyAge').value.trim();
      const bTurma = document.getElementById('relinkBabyTurma').value;
      const bAvatar = document.getElementById('relinkBabyAvatar').value;
      const phone = document.getElementById('relinkPhone')?.value.trim() || '';

      const child = window.storageService.relinkBabyToParent({
        email: email,
        parentName: pName,
        babyName: bName,
        babyAge: bAge,
        turma: bTurma,
        avatar: bAvatar,
        phone: phone
      });

      if (child) {
        showToast(`Bebê "${bName}" recadastrado e vinculado à conta com sucesso!`, 'success');
      } else {
        showToast('Erro ao recadastrar bebê. Verifique os dados.', 'error');
      }

      closeModal();
      renderAll();
    });
  }

  // Modal: Cadastrar Novo Bebê Manualmente
  document.getElementById('openNewChildModalBtn')?.addEventListener('click', () => {
    openModal('Cadastrar Novo Bebê & Família', `
      <form id="formNewChildAdmin">
        <div class="form-group">
          <label class="form-label">Nome Completo do Bebê *</label>
          <input type="text" id="adminBabyName" class="form-input no-icon" placeholder="Ex: Lucas Henrique" required>
        </div>
        <div class="form-group">
          <label class="form-label">Idade ou Data de Nascimento *</label>
          <input type="text" id="adminBabyAge" class="form-input no-icon" placeholder="Ex: 1 ano ou 12/03/2023" required>
        </div>
        <div class="form-group">
          <label class="form-label">Turma do Berçário *</label>
          <select id="adminBabyTurma" class="form-input no-icon">
            <option value="Berçário 1">Berçário 1 (4 meses a 1 ano)</option>
            <option value="Berçário 2">Berçário 2 (1 a 2 anos)</option>
            <option value="Maternal">Maternal (2 a 3 anos)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nome do Pai / Mãe / Responsável *</label>
          <input type="text" id="adminParentName" class="form-input no-icon" placeholder="Ex: Juliana Santos (Mãe)" required>
        </div>
        <div class="form-group">
          <label class="form-label">E-mail do Responsável (Google ou Conta) *</label>
          <input type="email" id="adminParentEmail" class="form-input no-icon" placeholder="email.dos.pais@gmail.com" required>
        </div>
        <div class="form-group">
          <label class="form-label">Ícone do Bebê</label>
          <select id="adminBabyAvatar" class="form-input no-icon">
            <option value="👶">👶 Menino</option>
            <option value="👧">👧 Menina</option>
            <option value="🍼">🍼 Bebê Mamadeira</option>
            <option value="🧒">🧒 Criança</option>
            <option value="🧸">🧸 Ursinho</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top: 10px;">Salvar Cadastro do Bebê 🚀</button>
      </form>
    `);

    document.getElementById('formNewChildAdmin')?.addEventListener('submit', (e) => {
      e.preventDefault();
      window.storageService.addChild({
        name: document.getElementById('adminBabyName').value.trim(),
        age: document.getElementById('adminBabyAge').value.trim(),
        turma: document.getElementById('adminBabyTurma').value,
        responsible: document.getElementById('adminParentName').value.trim(),
        parentEmail: document.getElementById('adminParentEmail').value.trim().toLowerCase(),
        avatar: document.getElementById('adminBabyAvatar').value
      });

      showToast('Bebê cadastrado com sucesso!', 'success');
      closeModal();
      renderAll();
    });
  });

  // Modal: Editar Criança
  function openEditChildModal(childId) {
    const child = window.storageService.getChildById(childId);
    if (!child) return;

    openModal(`Editar Dados: ${child.name}`, `
      <form id="formEditChildAdmin">
        <div class="form-group">
          <label class="form-label">Nome Completo do Bebê *</label>
          <input type="text" id="editBabyName" class="form-input no-icon" value="${child.name}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Idade ou Nascimento *</label>
          <input type="text" id="editBabyAge" class="form-input no-icon" value="${child.age || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Turma do Berçário *</label>
          <select id="editBabyTurma" class="form-input no-icon">
            <option value="Berçário 1" ${child.turma === 'Berçário 1' ? 'selected' : ''}>Berçário 1 (4 meses a 1 ano)</option>
            <option value="Berçário 2" ${child.turma === 'Berçário 2' ? 'selected' : ''}>Berçário 2 (1 a 2 anos)</option>
            <option value="Maternal" ${child.turma === 'Maternal' ? 'selected' : ''}>Maternal (2 a 3 anos)</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nome do Responsável *</label>
          <input type="text" id="editParentName" class="form-input no-icon" value="${child.responsible || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">E-mail do Responsável (Google ou Conta) *</label>
          <input type="email" id="editParentEmail" class="form-input no-icon" value="${child.parentEmail || ''}" required>
        </div>
        <div class="form-group">
          <label class="form-label">Ícone do Bebê</label>
          <select id="editBabyAvatar" class="form-input no-icon">
            <option value="👶" ${child.avatar === '👶' ? 'selected' : ''}>👶 Menino</option>
            <option value="👧" ${child.avatar === '👧' ? 'selected' : ''}>👧 Menina</option>
            <option value="🍼" ${child.avatar === '🍼' ? 'selected' : ''}>🍼 Bebê Mamadeira</option>
            <option value="🧒" ${child.avatar === '🧒' ? 'selected' : ''}>🧒 Criança</option>
            <option value="🧸" ${child.avatar === '🧸' ? 'selected' : ''}>🧸 Ursinho</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" style="margin-top: 10px;">Salvar Alterações ✨</button>
      </form>
    `);

    document.getElementById('formEditChildAdmin')?.addEventListener('submit', (e) => {
      e.preventDefault();
      window.storageService.updateChild(childId, {
        name: document.getElementById('editBabyName').value.trim(),
        age: document.getElementById('editBabyAge').value.trim(),
        turma: document.getElementById('editBabyTurma').value,
        responsible: document.getElementById('editParentName').value.trim(),
        parentEmail: document.getElementById('editParentEmail').value.trim().toLowerCase(),
        avatar: document.getElementById('editBabyAvatar').value
      });

      showToast(`Dados de ${child.name} atualizados com sucesso!`, 'success');
      closeModal();
      renderAll();
    });
  }

  // Modal: Autorizar Novo Educador
  document.getElementById('openNewEducatorModalBtn')?.addEventListener('click', () => {
    openModal('Autorizar Novo Cuidador / Educador', `
      <form id="formNewEducatorAdmin">
        <div class="form-group">
          <label class="form-label">Nome do Educador(a) *</label>
          <input type="text" id="newEduName" class="form-input no-icon" placeholder="Ex: Tia Letícia" required>
        </div>
        <div class="form-group">
          <label class="form-label">E-mail Institucional *</label>
          <input type="email" id="newEduEmail" class="form-input no-icon" placeholder="leticia@brincaeaprende.com.br" required>
        </div>
        <div class="form-group">
          <label class="form-label">Turma de Atuação *</label>
          <input type="text" id="newEduTurma" class="form-input no-icon" placeholder="Ex: Berçário 1 e 2" value="Berçário 1 e 2" required>
        </div>
        <div class="form-group">
          <label class="form-label">Senha Inicial de Acesso *</label>
          <input type="password" id="newEduPass" class="form-input no-icon" placeholder="Mínimo 6 dígitos" minlength="4" value="admin123" required>
        </div>
        <button type="submit" class="btn btn-cyan" style="margin-top: 10px;">Autorizar Educador(a) 👩‍🏫</button>
      </form>
    `);

    document.getElementById('formNewEducatorAdmin')?.addEventListener('submit', (e) => {
      e.preventDefault();
      window.storageService.addEducator({
        name: document.getElementById('newEduName').value.trim(),
        email: document.getElementById('newEduEmail').value.trim().toLowerCase(),
        turma: document.getElementById('newEduTurma').value.trim(),
        password: document.getElementById('newEduPass').value,
        role: 'admin',
        avatar: '👩‍🏫'
      });

      showToast('Educador autorizado com sucesso!', 'success');
      closeModal();
      renderAll();
    });
  });

  document.getElementById('refreshDataBtn')?.addEventListener('click', () => {
    renderAll();
    showToast('Dados atualizados!', 'success');
  });

  document.getElementById('refreshGoogleAccountsBtn')?.addEventListener('click', () => {
    renderAll();
    showToast('Lista de contas Google sincronizada com sucesso!', 'success');
  });

  // Ouvinte de sincronização entre abas em tempo real
  window.addEventListener('storage', () => {
    renderAll();
  });

  // Re-sincroniza sempre que a aba do admin ganha foco
  window.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      renderAll();
    }
  });

  // Sincronização automática com autenticação do Firebase
  const setupAdminFirebaseSync = () => {
    if (window.FirebaseModule && window.FirebaseModule.auth) {
      try {
        window.FirebaseModule.onAuthStateChanged(window.FirebaseModule.auth, (fbUser) => {
          if (fbUser && fbUser.email) {
            try {
              const gAccounts = JSON.parse(localStorage.getItem('brinca_aprende_google_accounts') || '[]');
              const clean = fbUser.email.toLowerCase().trim();
              if (!gAccounts.some(g => (g.email || '').toLowerCase().trim() === clean)) {
                gAccounts.push({
                  uid: fbUser.uid,
                  name: fbUser.displayName || 'Usuário Google',
                  email: fbUser.email.trim(),
                  photoURL: fbUser.photoURL || null,
                  provider: 'google.com',
                  createdAt: new Date().toISOString()
                });
                localStorage.setItem('brinca_aprende_google_accounts', JSON.stringify(gAccounts));
              }
            } catch (e) {}
            renderAll();
          }
        });
      } catch (e) {}
    }
  };

  if (window.FirebaseModule && window.FirebaseModule.auth) {
    setupAdminFirebaseSync();
  } else {
    window.addEventListener('firebase:ready', setupAdminFirebaseSync);
  }

  // ==========================================================================
  // CÓPIA DO PAINEL DOS EDUCADORES (EDIÇÃO INDIVIDUAL DA AGENDA DO BEBÊ)
  // ==========================================================================
  let adminSelectedChildId = null;
  let adminSelectedDate = window.storageService.getTodayDateString();
  let adminEditingRoutine = null;

  function formatDateFriendly(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${days[date.getDay()]}, ${parts[2]} de ${months[date.getMonth()]} de ${parts[0]}`;
  }

  function renderHygieneAdminItem(key, label, icon, isOk) {
    const ok = isOk !== false;
    return `
      <div class="hygiene-item ${ok ? 'ok' : 'missing'}">
        <span style="font-size: 1.2rem;">${icon}</span>
        <span class="hygiene-label">${label}</span>
        <span class="hygiene-status-badge">${ok ? '✓ OK' : '⚠️ Falta'}</span>
        <button type="button" class="btn-toggle-hygiene ${ok ? 'is-ok' : 'is-missing'}" data-admin-hygiene="${key}">
          ${ok ? 'Marcar Falta' : 'Marcar OK'}
        </button>
      </div>
    `;
  }

  function renderMealAdminRow(meal, index) {
    return `
      <div class="meal-row">
        <div class="meal-time-info">
          <div style="font-size: 0.85rem; font-weight: 800;">
            ${meal.icon || '🥣'} ${meal.name} <span style="font-size: 0.75rem; color: var(--brand-cyan-dark); font-weight: 700;">(${meal.time})</span>
          </div>
          <div style="display: flex; gap: 3px;">
            <button type="button" class="acceptance-btn-choice ${meal.acceptance === 'regular' ? 'selected-regular' : ''}" data-admin-meal-idx="${index}" data-choice="regular">Reg</button>
            <button type="button" class="acceptance-btn-choice ${meal.acceptance === 'bom' ? 'selected-bom' : ''}" data-admin-meal-idx="${index}" data-choice="bom">Bom</button>
            <button type="button" class="acceptance-btn-choice ${meal.acceptance === 'otimo' ? 'selected-otimo' : ''}" data-admin-meal-idx="${index}" data-choice="otimo">Ótimo</button>
          </div>
        </div>
        <div style="font-size: 0.8rem; color: var(--gray-600); margin-top: 4px;">
          <input type="text" class="form-input no-icon admin-meal-desc-input" data-admin-meal-idx="${index}" value="${meal.description || ''}" style="height: 32px; font-size: 0.8rem;" placeholder="O que o bebê comeu...">
        </div>
      </div>
    `;
  }

  function renderMoodAdminOptions(currentLabel) {
    const moods = [
      { emoji: '😄', label: 'Alegre' },
      { emoji: '😌', label: 'Calmo' },
      { emoji: '🥺', label: 'Dengoso' },
      { emoji: '🥳', label: 'Brincalhão' }
    ];

    return moods.map(m => {
      const isSelected = currentLabel && currentLabel.includes(m.label);
      return `
        <button type="button" class="acceptance-btn-choice ${isSelected ? 'selected-bom' : ''}" data-admin-mood-label="${m.label}" data-admin-mood-emoji="${m.emoji}" style="font-size: 0.76rem;">
          ${m.emoji} ${m.label}
        </button>
      `;
    }).join('');
  }

  function renderAdminIndividualAgenda() {
    const container = document.getElementById('adminAgendaContainer');
    if (!container) return;

    const children = window.storageService.getChildren();
    if (children.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 30px; color: #64748b;">
          👶 Nenhum bebê cadastrado ainda no sistema. Cadastre uma criança acima para editar sua agenda individual.
        </div>
      `;
      return;
    }

    if (!adminSelectedChildId || !children.find(c => c.id === adminSelectedChildId)) {
      adminSelectedChildId = children[0].id;
    }

    const activeChild = window.storageService.getChildById(adminSelectedChildId);
    const routine = window.storageService.getRoutine(adminSelectedChildId, adminSelectedDate);

    if (!adminEditingRoutine || adminEditingRoutine.childId !== adminSelectedChildId || adminEditingRoutine.date !== adminSelectedDate) {
      adminEditingRoutine = JSON.parse(JSON.stringify(routine));
      adminEditingRoutine.childId = adminSelectedChildId;
      adminEditingRoutine.date = adminSelectedDate;
    }

    const currentData = adminEditingRoutine;

    const missingHygieneItems = Object.entries(currentData.hygiene || {})
      .filter(([key, val]) => typeof val === 'object' && val !== null && val.ok === false)
      .map(([k, v]) => v.name);

    container.innerHTML = `
      <!-- Barra de Ferramentas da Agenda (Seletor de Criança e Seletor de Data) -->
      <div class="agenda-toolbar" style="margin-bottom: 16px; background: #ffffff; padding: 14px; border-radius: var(--radius-sm); border: 1px solid #e2e8f0; box-shadow: 0 2px 6px rgba(0,0,0,0.03);">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label for="adminChildSelector" style="font-size: 0.84rem; font-weight: 800; color: #1e293b;">Bebê Selecionado:</label>
            <select id="adminChildSelector" class="form-input no-icon" style="height: 38px; font-size: 0.88rem; padding: 4px 12px; font-weight: 700; width: auto; min-width: 220px;">
              ${children.map(c => `
                <option value="${c.id}" ${c.id === adminSelectedChildId ? 'selected' : ''}>
                  ${c.avatar} ${c.name} (${c.turma})
                </option>
              `).join('')}
            </select>
          </div>

          <div class="date-navigator" style="margin: 0;">
            <button id="adminPrevDateBtn" class="date-nav-btn" title="Dia anterior">◀</button>
            <input type="date" id="adminDatePickerInput" value="${adminSelectedDate}" style="display: none;">
            <span id="adminDateDisplayLabel" class="date-display" style="cursor: pointer;" title="Clique para escolher a data">
              📅 ${formatDateFriendly(adminSelectedDate)}
            </span>
            <button id="adminNextDateBtn" class="date-nav-btn" title="Próximo dia">▶</button>
          </div>
        </div>
      </div>

      <!-- Banner de Status da Data para a Educadora -->
      ${!window.storageService.hasRoutine(adminSelectedChildId, adminSelectedDate) ? `
        <div style="background: #eff6ff; border: 1.5px dashed #3b82f6; color: #1e40af; border-radius: var(--radius-sm); padding: 12px 16px; margin-bottom: 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
          <div>
            <div style="font-size: 0.88rem; font-weight: 800;">📝 Data em Branco (${formatDateFriendly(adminSelectedDate)})</div>
            <div style="font-size: 0.76rem; color: #1d4ed8;">Preencha as informações abaixo e clique em <strong>Salvar Agenda de ${activeChild.name}</strong> para disponibilizar para a família.</div>
          </div>
          <span style="font-size: 1.5rem;">✨</span>
        </div>
      ` : `
        <div style="background: #f0fdf4; border: 1px solid #86efac; color: #166534; border-radius: var(--radius-sm); padding: 10px 14px; margin-bottom: 16px; font-size: 0.82rem; font-weight: 700; display: flex; align-items: center; justify-content: space-between;">
          <span>✅ Agenda desta data preenchida e sincronizada em tempo real com a família de <strong>${activeChild.name}</strong>.</span>
          <span style="font-size: 1.2rem;">🟢</span>
        </div>
      `}

      <!-- Alerta de Mochila / Higiene -->
      ${missingHygieneItems.length > 0 ? `
        <div class="alert-banner has-missing" style="margin-bottom: 16px;">
          <strong style="color: var(--brand-pink-dark); display: block; margin-bottom: 2px;">⚠️ Atenção na Mochila de ${activeChild.name}:</strong>
          Falta repor: <strong>${missingHygieneItems.join(', ')}</strong>.
          ${currentData.hygiene?.faltaObservacao ? `<br><em>"${currentData.hygiene.faltaObservacao}"</em>` : ''}
        </div>
      ` : `
        <div class="alert-banner" style="margin-bottom: 16px;">
          ✨ <strong>Mochila em dia!</strong> Todos os produtos de higiene de ${activeChild.name} estão abastecidos.
        </div>
      `}

      <!-- Grade dos Cards da Agenda -->
      <div class="agenda-grid">
        
        <!-- PRODUTOS DE HIGIENE -->
        <div class="agenda-card">
          <div class="card-header">
            <h2 class="card-title">🧴 Produtos de Higiene</h2>
            <span style="font-size: 0.72rem; color: var(--gray-500); font-weight: 700;">Clique para alternar OK / Falta</span>
          </div>
          <div class="card-body">
            <div class="hygiene-grid">
              ${renderHygieneAdminItem('pomada', 'Pomada', '🧴', currentData.hygiene?.pomada?.ok)}
              ${renderHygieneAdminItem('fralda', 'Fralda', '🧷', currentData.hygiene?.fralda?.ok)}
              ${renderHygieneAdminItem('lenco', 'Lenço', '🧻', currentData.hygiene?.lenco?.ok)}
              ${renderHygieneAdminItem('shampoo', 'Shampoo', '🧴', currentData.hygiene?.shampoo?.ok)}
              ${renderHygieneAdminItem('condicionador', 'Condic.', '🧼', currentData.hygiene?.condicionador?.ok)}
              ${renderHygieneAdminItem('sabonete', 'Sabonete', '🧼', currentData.hygiene?.sabonete?.ok)}
            </div>

            <div style="margin-top: 10px;">
              <label class="form-label" style="font-size: 0.76rem;">Observação de Reposição (FALTA):</label>
              <input type="text" id="adminHygieneMissingNotes" class="form-input no-icon" style="height: 38px; font-size: 0.82rem;"
                placeholder="Ex: Trazer pomada para assaduras e fraldas tam M"
                value="${currentData.hygiene?.faltaObservacao || ''}">
            </div>
          </div>
        </div>

        <!-- REFEIÇÕES -->
        <div class="agenda-card">
          <div class="card-header">
            <h2 class="card-title">🍼 Alimentação & Refeições</h2>
            <span style="font-size: 0.72rem; color: var(--gray-500); font-weight: 700;">Edite e avalie a aceitação</span>
          </div>
          <div class="card-body">
            ${(currentData.meals || []).map((meal, index) => renderMealAdminRow(meal, index)).join('')}
          </div>
        </div>

        <!-- FRALDAS & SONECAS -->
        <div class="agenda-card">
          <div class="card-header">
            <h2 class="card-title">🚼 Trocas de Fralda (${currentData.diapers?.count || currentData.diapers?.logs?.length || 0})</h2>
          </div>
          <div class="card-body">
            ${(currentData.diapers?.logs || []).length > 0 ? `
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px; margin-bottom: 12px;">
                ${currentData.diapers.logs.map((log, lIdx) => `
                  <div style="background: var(--gray-50); border: 1px solid var(--gray-200); border-radius: var(--radius-sm); padding: 6px 8px; font-size: 0.78rem; position: relative;">
                    <strong>⏰ ${log.time}</strong> • ${log.type}
                    ${log.ointment ? `<br><span style="color: var(--brand-pink-dark); font-size: 0.7rem;">✓ Com pomada</span>` : ''}
                    <button type="button" class="admin-remove-diaper-btn" data-admin-diaper-remove="${lIdx}" title="Remover troca" style="position: absolute; top: 4px; right: 4px; background: none; border: none; color: #ef4444; font-size: 0.8rem; cursor: pointer; font-weight: 800;">✕</button>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div style="font-size: 0.82rem; color: #94a3b8; padding: 6px 0; font-style: italic; margin-bottom: 8px;">
                Nenhuma troca de fralda registrada para esta data ainda.
              </div>
            `}

            <button type="button" id="adminAddDiaperBtn" class="btn btn-secondary btn-sm" style="height: 34px; font-size: 0.76rem; margin-bottom: 14px; width: 100%;">
              ➕ Adicionar Nova Troca de Fralda
            </button>

            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; margin-top: 6px;">
              <h3 style="font-size: 0.86rem; font-weight: 800; color: var(--gray-800); margin: 0;">😴 Sonecas</h3>
              <button type="button" id="adminAddSleepBtn" class="btn btn-secondary btn-sm" style="height: 28px; font-size: 0.72rem; padding: 2px 8px; width: auto;">
                ➕ Adicionar Soneca
              </button>
            </div>

            ${(currentData.sleep || []).length > 0 ? (currentData.sleep || []).map((nap, nIdx) => `
              <div style="font-size: 0.8rem; background: var(--gray-50); padding: 8px 10px; border-radius: var(--radius-sm); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <strong>${nap.period}:</strong>
                <input type="text" class="form-input no-icon admin-sleep-input" data-sleep-idx="${nIdx}" value="${nap.time}" style="height: 30px; font-size: 0.78rem; width: 130px; padding: 2px 6px;">
                <span style="color: var(--brand-cyan-dark); font-weight: 700; font-size: 0.76rem;">${nap.quality}</span>
                <button type="button" class="admin-remove-sleep-btn" data-admin-sleep-remove="${nIdx}" title="Remover soneca" style="background: none; border: none; color: #ef4444; font-size: 0.8rem; cursor: pointer; font-weight: 800;">✕</button>
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
              ${renderMoodAdminOptions(currentData.mood?.label)}
            </div>

            <label class="form-label" style="font-size: 0.78rem;">Recado para a família de ${activeChild.name}:</label>
            <textarea id="adminTeacherNoteInput" class="form-input no-icon" rows="3" style="height: auto; padding: 8px; font-size: 0.84rem;" placeholder="Como foi o dia do bebê hoje...">${currentData.observations?.teacherNote || ''}</textarea>
            
            <div style="margin-top: 8px;">
              <label class="form-label" style="font-size: 0.76rem;">Assinatura da Educadora / Berçário:</label>
              <input type="text" id="adminTeacherNameInput" class="form-input no-icon" style="height: 34px; font-size: 0.8rem;" placeholder="Assinatura da Tia / Educadora" value="${currentData.observations?.teacherName || ''}">
            </div>
          </div>
        </div>

      </div>

      <!-- Barra de Ação de Salvamento -->
      <div style="margin-top: 20px; background: #fdf2f8; border: 2px solid var(--brand-pink); border-radius: var(--radius-sm); padding: 16px 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;">
        <div>
          <div style="font-size: 0.95rem; font-weight: 800; color: var(--brand-pink-dark);">
            💾 Salvar Alterações na Agenda
          </div>
          <div style="font-size: 0.8rem; color: #64748b;">
            As alterações ficarão visíveis para a família de <strong>${activeChild.name}</strong> para o dia <strong>${formatDateFriendly(adminSelectedDate)}</strong>.
          </div>
        </div>

        <button id="adminSaveRoutineBtn" class="btn btn-primary" style="height: 42px; font-size: 0.9rem; padding: 0 24px; background: #db2777; border-color: #be185d; display: inline-flex; align-items: center; gap: 6px;">
          💾 Salvar Agenda de ${activeChild.name}
        </button>
      </div>
    `;

    bindAdminAgendaEvents(activeChild, currentData);
  }

  function bindAdminAgendaEvents(activeChild, currentData) {
    // Troca de Criança
    document.getElementById('adminChildSelector')?.addEventListener('change', (e) => {
      adminSelectedChildId = e.target.value;
      adminEditingRoutine = null;
      renderAdminIndividualAgenda();
    });

    // Seletor de Data
    document.getElementById('adminDateDisplayLabel')?.addEventListener('click', () => {
      const picker = document.getElementById('adminDatePickerInput');
      if (picker) picker.showPicker ? picker.showPicker() : picker.click();
    });

    document.getElementById('adminDatePickerInput')?.addEventListener('change', (e) => {
      if (e.target.value) {
        adminSelectedDate = e.target.value;
        adminEditingRoutine = null;
        renderAdminIndividualAgenda();
      }
    });

    document.getElementById('adminPrevDateBtn')?.addEventListener('click', () => {
      const curr = new Date(adminSelectedDate + 'T00:00:00');
      curr.setDate(curr.getDate() - 1);
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      adminSelectedDate = `${y}-${m}-${d}`;
      adminEditingRoutine = null;
      renderAdminIndividualAgenda();
    });

    document.getElementById('adminNextDateBtn')?.addEventListener('click', () => {
      const curr = new Date(adminSelectedDate + 'T00:00:00');
      curr.setDate(curr.getDate() + 1);
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      adminSelectedDate = `${y}-${m}-${d}`;
      adminEditingRoutine = null;
      renderAdminIndividualAgenda();
    });

    // Higiene
    document.querySelectorAll('[data-admin-hygiene]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.adminHygiene;
        if (adminEditingRoutine.hygiene[key]) {
          adminEditingRoutine.hygiene[key].ok = !adminEditingRoutine.hygiene[key].ok;
          renderAdminIndividualAgenda();
        }
      });
    });

    document.getElementById('adminHygieneMissingNotes')?.addEventListener('input', (e) => {
      adminEditingRoutine.hygiene.faltaObservacao = e.target.value;
    });

    // Refeições - Avaliação
    document.querySelectorAll('[data-admin-meal-idx][data-choice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.adminMealIdx);
        const choice = btn.dataset.choice;
        adminEditingRoutine.meals[idx].acceptance = choice;
        renderAdminIndividualAgenda();
      });
    });

    // Refeições - Descrição
    document.querySelectorAll('.admin-meal-desc-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(input.dataset.adminMealIdx);
        adminEditingRoutine.meals[idx].description = e.target.value;
      });
    });

    // Sonecas
    document.querySelectorAll('.admin-sleep-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const idx = parseInt(input.dataset.sleepIdx);
        adminEditingRoutine.sleep[idx].time = e.target.value;
      });
    });

    // Humor
    document.querySelectorAll('[data-admin-mood-label]').forEach(btn => {
      btn.addEventListener('click', () => {
        adminEditingRoutine.mood = {
          emoji: btn.dataset.adminMoodEmoji,
          label: `${btn.dataset.adminMoodLabel} e participativo`
        };
        renderAdminIndividualAgenda();
      });
    });

    // Recado e Educadora
    document.getElementById('adminTeacherNoteInput')?.addEventListener('input', (e) => {
      adminEditingRoutine.observations.teacherNote = e.target.value;
    });
    document.getElementById('adminTeacherNameInput')?.addEventListener('input', (e) => {
      adminEditingRoutine.observations.teacherName = e.target.value;
    });

    // Nova Troca de Fralda
    document.getElementById('adminAddDiaperBtn')?.addEventListener('click', () => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const type = prompt('Tipo de troca (Ex: Xixi, Cocô, Xixi e Cocô):', 'Xixi e Cocô');
      if (type) {
        adminEditingRoutine.diapers.logs.push({
          time: timeStr,
          type: type,
          ointment: true
        });
        adminEditingRoutine.diapers.count = adminEditingRoutine.diapers.logs.length;
        renderAdminIndividualAgenda();
      }
    });

    // Remover troca de fralda
    document.querySelectorAll('.admin-remove-diaper-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.adminDiaperRemove);
        if (adminEditingRoutine.diapers?.logs) {
          adminEditingRoutine.diapers.logs.splice(idx, 1);
          adminEditingRoutine.diapers.count = adminEditingRoutine.diapers.logs.length;
          renderAdminIndividualAgenda();
        }
      });
    });

    // Nova Soneca
    document.getElementById('adminAddSleepBtn')?.addEventListener('click', () => {
      const period = prompt('Período da soneca (Ex: Manhã, Tarde):', 'Tarde');
      if (!period) return;
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const time = prompt('Horário (Ex: 13:30 às 15:00):', `${h}:${m} às ...`);
      if (!time) return;
      const quality = prompt('Qualidade do sono (Ex: Tranquilo, Dormiu bem, Agitado):', 'Tranquilo (dormiu bem)');
      if (!adminEditingRoutine.sleep) adminEditingRoutine.sleep = [];
      adminEditingRoutine.sleep.push({
        period: period,
        time: time,
        quality: quality || 'Tranquilo'
      });
      showToast('Soneca registrada!');
      renderAdminIndividualAgenda();
    });

    // Remover Soneca
    document.querySelectorAll('.admin-remove-sleep-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.adminSleepRemove);
        if (adminEditingRoutine.sleep) {
          adminEditingRoutine.sleep.splice(idx, 1);
          renderAdminIndividualAgenda();
        }
      });
    });

    // Alterar horário da soneca
    document.querySelectorAll('.admin-sleep-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const sIdx = parseInt(input.dataset.sleepIdx);
        if (adminEditingRoutine.sleep && adminEditingRoutine.sleep[sIdx]) {
          adminEditingRoutine.sleep[sIdx].time = e.target.value;
        }
      });
    });
    document.getElementById('adminSaveRoutineBtn')?.addEventListener('click', () => {
      const noteInput = document.getElementById('adminTeacherNoteInput');
      if (noteInput) adminEditingRoutine.observations.teacherNote = noteInput.value;
      
      const teacherInput = document.getElementById('adminTeacherNameInput');
      if (teacherInput) adminEditingRoutine.observations.teacherName = teacherInput.value;

      const hygieneNotes = document.getElementById('adminHygieneMissingNotes');
      if (hygieneNotes) adminEditingRoutine.hygiene.faltaObservacao = hygieneNotes.value;

      document.querySelectorAll('.admin-meal-desc-input').forEach(input => {
        const idx = parseInt(input.dataset.adminMealIdx);
        if (adminEditingRoutine.meals[idx]) adminEditingRoutine.meals[idx].description = input.value;
      });

      window.storageService.saveRoutine(adminSelectedChildId, adminSelectedDate, adminEditingRoutine);
      showToast(`✅ Agenda de ${activeChild.name} salva com sucesso para ${formatDateFriendly(adminSelectedDate)}!`, 'success');
      updateMetrics();
      renderAdminIndividualAgenda();
    });
  }

  function renderAll() {
    updateMetrics();
    renderChildrenTable();
    renderParentAccountsTable();
    renderEducatorsTable();
    renderGoogleAccountsTable();
    renderAdminIndividualAgenda();
  }

  // Sincronização em Tempo Real via Cloud Firestore
  window.addEventListener('storage:synced', () => {
    renderAll();
  });

  window.addEventListener('cloud:status', (e) => {
    const badge = document.getElementById('cloudStatusBadge');
    if (badge && e.detail?.connected) {
      badge.innerHTML = '<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:#10b981;"></span> Firestore Nuvem Ativo 🟢';
      badge.style.background = '#ecfdf5';
      badge.style.color = '#047857';
      badge.style.borderColor = '#a7f3d0';
    }
  });

  // Inicialização
  renderAll();
});
