import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

const firebaseConfig = {
    apiKey: window.FIREBASE_CONFIG?.FIREBASE_API_KEY || '',
    authDomain: window.FIREBASE_CONFIG?.FIREBASE_AUTH_DOMAIN || '',
    projectId: window.FIREBASE_CONFIG?.FIREBASE_PROJECT_ID || '',
    storageBucket: window.FIREBASE_CONFIG?.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: window.FIREBASE_CONFIG?.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: window.FIREBASE_CONFIG?.FIREBASE_APP_ID || ''
};

//init firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

function showErrorModal(message) {
    const modal = document.getElementById('errorModal');
    const messageEl = document.getElementById('errorMessage');
    if (modal && messageEl) {
        messageEl.textContent = message;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function hideErrorModal() {
    const modal = document.getElementById('errorModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function showSuccessModal() {
    const modal = document.getElementById('successModal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

//auth page
export function initAuthPage() {
    let isAuthenticating = false;

    onAuthStateChanged(auth, async (user) => {
        if (user && !isAuthenticating) {
            try {
                const response = await fetch('/api/check-auth');
                const data = await response.json();
                
                if (data.authenticated) {
                    window.location.href = '/home';
                }
            } catch (error) {
                console.error('Error checking auth status:', error);
            }
        }
    });

    //close error modal
    const closeErrorBtn = document.getElementById('closeErrorModal');
    const errorModal = document.getElementById('errorModal');
    
    if (closeErrorBtn) {
        closeErrorBtn.addEventListener('click', hideErrorModal);
    }
    
    if (errorModal) {
        errorModal.addEventListener('click', (e) => {
            if (e.target.id === 'errorModal') {
                hideErrorModal();
            }
        });
    }

    //googel sign in
    const signInBtn = document.getElementById('googleSignIn');
    if (signInBtn) {
        signInBtn.addEventListener('click', async () => {
            if (isAuthenticating) return;
            
            isAuthenticating = true;
            signInBtn.classList.add('btn-loading');
            const originalText = signInBtn.innerHTML;
            signInBtn.innerHTML = '<span style="opacity: 0;">Loading...</span>';

            try {
                const result = await signInWithPopup(auth, provider);
                const user = result.user;

                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        email: user.email,
                        name: user.displayName,
                        uid: user.uid
                    })
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showSuccessModal();
                    setTimeout(() => {
                        window.location.href = '/home';
                    }, 1000);
                } else {
                    throw new Error(data.error || 'Failed to complete sign in');
                }
            } catch (error) {
                console.error('Error signing in:', error);
                isAuthenticating = false;
                signInBtn.classList.remove('btn-loading');
                signInBtn.innerHTML = originalText;

                let errorMessage = 'An unexpected error occurred. Please try again.';
                
                if (error.code === 'auth/popup-closed-by-user') {
                    errorMessage = 'Sign in cancelled. Please try again.';
                } else if (error.code === 'auth/popup-blocked') {
                    errorMessage = 'Pop-up blocked by browser. Please allow pop-ups and try again.';
                } else if (error.code === 'auth/network-request-failed') {
                    errorMessage = 'Network error. Please check your connection and try again.';
                } else if (error.code === 'auth/too-many-requests') {
                    errorMessage = 'Too many attempts. Please wait a moment and try again.';
                } else if (error.message) {
                    errorMessage = error.message;
                }

                showErrorModal(errorMessage);
            }
        });
    }
}

// homepage
export function initHomePage() {
    let checkingAuth = true;
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            checkingAuth = false;
        } else {
            if (!checkingAuth) {
                window.location.href = '/auth';
            }
            checkingAuth = false;
        }
    });

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await signOut(auth);
                await fetch('/api/logout', { method: 'POST' });
                window.location.href = '/';
            } catch (error) {
                console.error('Error signing out:', error);
                showErrorModal('Failed to sign out. Please try again.');
            }
        });
    }
}

function initKeyboardShortcuts() {
    const path = window.location.pathname;
    
    if (path === '/' || path === '/auth') return;

    const hint = document.createElement('div');
    hint.className = 'shortcuts-hint';
    hint.innerHTML = `
        <div class="shortcuts-hint-icon">?</div>
        <span>Keyboard shortcuts</span>
    `;
    document.body.appendChild(hint);

    const modal = document.createElement('div');
    modal.className = 'shortcuts-modal';
    modal.innerHTML = `
        <div class="shortcuts-modal-content">
            <div class="shortcuts-modal-header">
                <h3 class="shortcuts-modal-title">Keyboard Shortcuts</h3>
                <button class="shortcuts-modal-close">&times;</button>
            </div>
            <div class="shortcuts-list">
                <div class="shortcut-item">
                    <span class="shortcut-description">Start/Stop</span>
                    <div class="shortcut-keys">
                        <kbd class="shortcut-key">Space</kbd>
                    </div>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-description">Stop Everything</span>
                    <div class="shortcut-keys">
                        <kbd class="shortcut-key">Esc</kbd>
                    </div>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-description">Show Shortcuts</span>
                    <div class="shortcut-keys">
                        <kbd class="shortcut-key">?</kbd>
                        <span style="color: #525252;">or</span>
                        <kbd class="shortcut-key">H</kbd>
                    </div>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-description">Navigate: Visualizer</span>
                    <div class="shortcut-keys">
                        <kbd class="shortcut-key">1</kbd>
                    </div>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-description">Navigate: Pitch</span>
                    <div class="shortcut-keys">
                        <kbd class="shortcut-key">2</kbd>
                    </div>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-description">Navigate: Tuner</span>
                    <div class="shortcut-keys">
                        <kbd class="shortcut-key">3</kbd>
                    </div>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-description">Navigate: Metronome</span>
                    <div class="shortcut-keys">
                        <kbd class="shortcut-key">4</kbd>
                    </div>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-description">Navigate: Chords</span>
                    <div class="shortcut-keys">
                        <kbd class="shortcut-key">5</kbd>
                    </div>
                </div>
                <div class="shortcut-item">
                    <span class="shortcut-description">Navigate: Spectrum</span>
                    <div class="shortcut-keys">
                        <kbd class="shortcut-key">6</kbd>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    function toggleModal() {
        modal.classList.toggle('show');
    }

    hint.addEventListener('click', toggleModal);
    modal.querySelector('.shortcuts-modal-close').addEventListener('click', toggleModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) toggleModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        const key = e.key.toLowerCase();

        if (key === '?' || key === 'h') {
            e.preventDefault();
            toggleModal();
            return;
        }

        if (key === 'escape') {
            if (modal.classList.contains('show')) {
                e.preventDefault();
                toggleModal();
                return;
            }
            const startButton = document.getElementById('startButton');
            if (startButton && startButton.classList.contains('active')) {
                startButton.click();
            }
            return;
        }

        if (key === ' ') {
            e.preventDefault();
            const startButton = document.getElementById('startButton');
            if (startButton) {
                startButton.click();
            }
            return;
        }

        const navMap = {
            '1': '/home',
            '2': '/pitch',
            '3': '/tuner',
            '4': '/metronome',
            '5': '/chords',
            '6': '/spectrum'
        };

        if (navMap[key]) {
            e.preventDefault();
            window.location.href = navMap[key];
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    
    if (path === '/auth') {
        initAuthPage();
    } else if (path === '/home' || path === '/tuner') {
        initHomePage();
    }
    initKeyboardShortcuts();
});