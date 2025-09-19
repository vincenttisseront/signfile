// Plugin de débogage des formulaires pour identifier les problèmes de signature
import { defineNuxtPlugin } from '#app'

export default defineNuxtPlugin((nuxtApp) => {
  // S'active uniquement côté client
  if (typeof window === 'undefined') return;

  // Ne s'active qu'en mode développement ou si DEBUG_FORMS est activé
  const debugFormsEnabled = process.env.NODE_ENV === 'development' || window.localStorage.getItem('DEBUG_FORMS') === 'true';
  if (!debugFormsEnabled) return;

  console.log('[form-debug] Plugin activé');

  // Attendre que le DOM soit prêt
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFormDebug);
  } else {
    setupFormDebug();
  }

  function setupFormDebug() {
    // Ajouter une classe pour identifier que le débogage est actif
    document.documentElement.classList.add('form-debug-active');

    // Ajouter un style pour mettre en évidence les formulaires débogués
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .form-debug-active form {
        position: relative;
      }
      .form-debug-active form::before {
        content: "Debug";
        position: absolute;
        top: -8px;
        right: -8px;
        background: rgba(255, 82, 82, 0.8);
        color: white;
        font-size: 10px;
        padding: 2px 6px;
        border-radius: 4px;
        z-index: 1000;
      }
      .form-debug-log {
        margin-top: 10px;
        padding: 8px;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        background: #f8fafc;
        font-family: monospace;
        font-size: 12px;
        max-height: 200px;
        overflow-y: auto;
      }
      .form-debug-log-entry {
        margin-bottom: 4px;
        padding-bottom: 4px;
        border-bottom: 1px dashed #e2e8f0;
      }
      .form-debug-log-error {
        color: #e53e3e;
      }
      .form-debug-log-success {
        color: #38a169;
      }
    `;
    document.head.appendChild(styleEl);

    // Intercepter les soumissions de formulaire
    document.addEventListener('submit', (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      // Créer un conteneur de log s'il n'existe pas déjà
      let logContainer = form.querySelector('.form-debug-log');
      if (!logContainer) {
        logContainer = document.createElement('div');
        logContainer.className = 'form-debug-log';
        form.appendChild(logContainer);
      }

      // Fonction pour ajouter une entrée de log
      const addLogEntry = (message, type = 'info') => {
        const entry = document.createElement('div');
        entry.className = `form-debug-log-entry form-debug-log-${type}`;
        entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.appendChild(entry);
        logContainer.scrollTop = logContainer.scrollHeight;
      };

      // Log de la soumission
      addLogEntry(`Soumission du formulaire: ${form.action || 'no action'}`);

      // Intercepter les requêtes fetch pour les formulaires
      if (!window._formDebugFetchWrapped) {
        const originalFetch = window.fetch;
        window.fetch = async function(...args) {
          const url = args[0];
          const options = args[1] || {};

          if (typeof url === 'string' && (url.includes('/api/sign') || url.includes('/api/verify'))) {
            addLogEntry(`Requête fetch vers ${url}`, 'info');

            // Si c'est une requête multipart/form-data, examiner le contenu
            if (options.body instanceof FormData) {
              for (const [key, value] of options.body.entries()) {
                if (value instanceof File) {
                  addLogEntry(`Fichier: ${key} = ${value.name} (${value.size} bytes, ${value.type})`, 'info');
                } else {
                  addLogEntry(`Données: ${key} = ${value}`, 'info');
                }
              }
            }

            try {
              const response = await originalFetch.apply(this, args);
              const clone = response.clone();
              try {
                const jsonData = await clone.json();
                addLogEntry(`Réponse: ${JSON.stringify(jsonData)}`, response.ok ? 'success' : 'error');
              } catch (jsonError) {
                const textData = await clone.text();
                addLogEntry(`Réponse: ${textData.substring(0, 100)}${textData.length > 100 ? '...' : ''}`, response.ok ? 'success' : 'error');
              }
              return response;
            } catch (error) {
              addLogEntry(`Erreur fetch: ${error.message}`, 'error');
              throw error;
            }
          }
          return originalFetch.apply(this, args);
        };
        window._formDebugFetchWrapped = true;
      }
    });
  }

  // Fournir une API pour activer/désactiver le debug
  nuxtApp.provide('formDebug', {
    isEnabled: debugFormsEnabled,
    toggle: () => {
      const currentState = window.localStorage.getItem('DEBUG_FORMS') === 'true';
      window.localStorage.setItem('DEBUG_FORMS', (!currentState).toString());
      window.location.reload();
    }
  });
});