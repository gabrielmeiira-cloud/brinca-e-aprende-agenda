/**
 * PWA Install Prompt Controller - Brinca e Aprende
 * Gerencia a instalação automática e guiada para Android e iOS (iPhone/iPad).
 */

(function initPWAInstaller() {
  // Registra o Service Worker para habilitar capacidade de PWA no navegador
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch((err) => {
        console.warn('Falha no registro do Service Worker:', err);
      });
    });
  }

  // Verifica se o aplicativo JÁ está rodando instalado como App Standalone
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true ||
                       document.referrer.includes('android-app://');

  if (isStandalone) {
    // Usuário já está usando o aplicativo instalado
    return;
  }

  // Identificação do Sistema Operacional
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  let deferredPrompt = null;
  let modalElement = null;

  // Captura o evento nativo de instalação do Android / Chrome / Edge
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Se o modal já estiver na tela, atualiza o botão para instalar sozinho
    const btn = document.getElementById('pwaInstallActionBtn');
    if (btn && isAndroid) {
      btn.innerHTML = '📲 Instalar Aplicativo Agora';
    }
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    closeModal();
    if (typeof showToast === 'function') {
      showToast('🎉 Aplicativo instalado com sucesso na sua tela inicial!');
    }
  });

  // Cria a folha / modal de instalação
  function createModalHtml(type) {
    if (type === 'ios') {
      return `
        <div class="pwa-backdrop" id="pwaBackdrop">
          <div class="pwa-card pwa-card-ios">
            <button type="button" class="pwa-close-btn" id="pwaCloseBtn" aria-label="Fechar">&times;</button>
            
            <div class="pwa-header">
              <div class="pwa-app-icon-wrap">
                <img src="assets/icon-192.png" alt="Brinca e Aprende" class="pwa-app-icon">
              </div>
              <div>
                <span class="pwa-pill ios">🍎 Disponível para iPhone / iPad</span>
                <h3 class="pwa-title">Instalar o App no iPhone</h3>
                <p class="pwa-subtitle">Adicione à sua <strong>Tela de Início</strong> para abrir em tela cheia como um aplicativo de verdade!</p>
              </div>
            </div>

            <div class="pwa-steps-list">
              <div class="pwa-step-item">
                <div class="pwa-step-num">1</div>
                <div class="pwa-step-text">
                  Toque no botão <strong>Compartilhar</strong> 
                  <span class="pwa-inline-badge">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  </span> 
                  (na barra inferior do Safari).
                </div>
              </div>

              <div class="pwa-step-item">
                <div class="pwa-step-num">2</div>
                <div class="pwa-step-text">
                  Role a lista e selecione <strong>"Adicionar à Tela de Início"</strong> 
                  <span class="pwa-inline-badge">➕</span>.
                </div>
              </div>

              <div class="pwa-step-item">
                <div class="pwa-step-num">3</div>
                <div class="pwa-step-text">
                  Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto! 🎉
                </div>
              </div>
            </div>

            <div class="pwa-actions">
              <button type="button" id="pwaIosGotItBtn" class="btn btn-primary" style="background: linear-gradient(135deg, #0284c7 0%, #00a8cc 100%);">
                👍 Entendi, vou adicionar
              </button>
              <button type="button" id="pwaDismissBtn" class="pwa-btn-text">
                Agora não, continuar no navegador
              </button>
            </div>

            <div class="pwa-ios-arrow-down" aria-hidden="true">
              <span>👇</span> O botão de compartilhar fica aqui embaixo
            </div>
          </div>
        </div>
      `;
    }

    // Android / Desktop / Outros
    return `
      <div class="pwa-backdrop" id="pwaBackdrop">
        <div class="pwa-card pwa-card-android">
          <button type="button" class="pwa-close-btn" id="pwaCloseBtn" aria-label="Fechar">&times;</button>
          
          <div class="pwa-header">
            <div class="pwa-app-icon-wrap">
              <img src="assets/icon-192.png" alt="Brinca e Aprende" class="pwa-app-icon">
            </div>
            <div>
              <span class="pwa-pill android">🤖 Disponível para Android</span>
              <h3 class="pwa-title">Instalar o Aplicativo</h3>
              <p class="pwa-subtitle">Tenha o <strong>Brinca e Aprende</strong> direto na tela inicial do seu celular, com acesso rápido e sem barra de navegação!</p>
            </div>
          </div>

          <div class="pwa-benefits-grid">
            <div class="pwa-benefit-item">
              <span>⚡</span> <strong>Mais Rápido</strong>
            </div>
            <div class="pwa-benefit-item">
              <span>📱</span> <strong>1 Toque</strong>
            </div>
            <div class="pwa-benefit-item">
              <span>💾</span> <strong>Leve & Seguro</strong>
            </div>
          </div>

          <div class="pwa-actions">
            <button type="button" id="pwaInstallActionBtn" class="btn btn-primary" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);">
              📲 Instalar Aplicativo Agora
            </button>
            <button type="button" id="pwaDismissBtn" class="pwa-btn-text">
              Agora não, continuar no navegador
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function injectStyles() {
    if (document.getElementById('pwaInstallStyles')) return;
    const style = document.createElement('style');
    style.id = 'pwaInstallStyles';
    style.textContent = `
      .pwa-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        display: flex;
        align-items: flex-end;
        justify-content: center;
        z-index: 999999;
        padding: 12px;
        animation: pwaFadeIn 0.25s ease-out;
      }

      @media (min-width: 600px) {
        .pwa-backdrop {
          align-items: center;
        }
      }

      .pwa-card {
        background: #ffffff;
        border-radius: 24px;
        max-width: 440px;
        width: 100%;
        padding: 24px 22px;
        position: relative;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.8);
        animation: pwaSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }

      .pwa-close-btn {
        position: absolute;
        top: 14px;
        right: 14px;
        background: #f1f5f9;
        border: none;
        width: 32px;
        height: 32px;
        border-radius: 50%;
        font-size: 1.3rem;
        line-height: 1;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .pwa-close-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }

      .pwa-header {
        display: flex;
        align-items: center;
        gap: 14px;
        margin-bottom: 16px;
      }

      .pwa-app-icon-wrap {
        width: 62px;
        height: 62px;
        border-radius: 16px;
        box-shadow: 0 4px 14px rgba(236, 72, 153, 0.25);
        flex-shrink: 0;
        overflow: hidden;
        border: 2px solid #fce7f3;
        background: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .pwa-app-icon {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .pwa-pill {
        display: inline-block;
        font-size: 0.68rem;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 9999px;
        text-transform: uppercase;
        letter-spacing: 0.4px;
        margin-bottom: 4px;
      }
      .pwa-pill.android {
        background: #dcfce7;
        color: #15803d;
      }
      .pwa-pill.ios {
        background: #e0f2fe;
        color: #0369a1;
      }

      .pwa-title {
        font-size: 1.15rem;
        font-weight: 800;
        color: #0f172a;
        margin: 0 0 2px 0;
        font-family: 'Fredoka', cursive, sans-serif;
      }

      .pwa-subtitle {
        font-size: 0.8rem;
        color: #64748b;
        margin: 0;
        line-height: 1.35;
      }

      .pwa-benefits-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        background: #f8fafc;
        padding: 10px;
        border-radius: 12px;
        margin-bottom: 18px;
        border: 1px solid #e2e8f0;
      }

      .pwa-benefit-item {
        font-size: 0.74rem;
        color: #334155;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }
      .pwa-benefit-item span {
        font-size: 1.2rem;
      }

      .pwa-steps-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: #f8fafc;
        border-radius: 14px;
        padding: 14px 12px;
        margin-bottom: 18px;
        border: 1px solid #e2e8f0;
      }

      .pwa-step-item {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 0.84rem;
        color: #334155;
        line-height: 1.3;
      }

      .pwa-step-num {
        width: 24px;
        height: 24px;
        background: #0284c7;
        color: #ffffff;
        font-weight: 800;
        font-size: 0.78rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .pwa-inline-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 2px 5px;
        font-size: 0.85rem;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .pwa-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .pwa-btn-text {
        background: transparent;
        border: none;
        color: #64748b;
        font-size: 0.8rem;
        font-weight: 700;
        cursor: pointer;
        padding: 6px 12px;
        text-align: center;
        transition: color 0.15s ease;
      }
      .pwa-btn-text:hover {
        color: #0f172a;
      }

      .pwa-ios-arrow-down {
        text-align: center;
        font-size: 0.74rem;
        font-weight: 700;
        color: #0284c7;
        margin-top: 10px;
        animation: pwaBounce 1.5s infinite;
      }

      @keyframes pwaFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes pwaSlideUp {
        from { transform: translateY(30px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes pwaBounce {
        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
        40% { transform: translateY(4px); }
        60% { transform: translateY(2px); }
      }
    `;
    document.head.appendChild(style);
  }

  function closeModal() {
    if (modalElement) {
      modalElement.remove();
      modalElement = null;
    }
  }

  function showPrompt() {
    injectStyles();
    closeModal();

    const type = isIOS ? 'ios' : 'android';
    const wrapper = document.createElement('div');
    wrapper.id = 'pwaInstallWrapper';
    wrapper.innerHTML = createModalHtml(type);
    document.body.appendChild(wrapper);
    modalElement = wrapper;

    // Listeners de fechar
    document.getElementById('pwaCloseBtn')?.addEventListener('click', closeModal);
    document.getElementById('pwaDismissBtn')?.addEventListener('click', closeModal);
    document.getElementById('pwaIosGotItBtn')?.addEventListener('click', closeModal);

    // Fechar ao clicar no fundo
    document.getElementById('pwaBackdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'pwaBackdrop') closeModal();
    });

    // Ação de instalação no Android (Instalar sozinho)
    const installBtn = document.getElementById('pwaInstallActionBtn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
          installBtn.disabled = true;
          installBtn.innerText = 'Instalando... ⏳';
          deferredPrompt.prompt();
          const choiceResult = await deferredPrompt.userChoice;
          if (choiceResult && choiceResult.outcome === 'accepted') {
            closeModal();
          } else {
            installBtn.disabled = false;
            installBtn.innerText = '📲 Instalar Aplicativo Agora';
          }
          deferredPrompt = null;
        } else {
          // Se o navegador ainda não disparou o evento nativo, tenta acionar via menu
          alert('Para instalar:\n\n1. Toque nos 3 pontinhos (⋮) no canto superior do navegador\n2. Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"');
          closeModal();
        }
      });
    }
  }

  // Exibe o aviso toda vez que entrar no site (com pequeno delay para carregar a página suavemente)
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      showPrompt();
    }, 700);
  });
})();
