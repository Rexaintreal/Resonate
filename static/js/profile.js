import { getAuth, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { AudioConverter } from './converter.js';
import { PracticeTracker } from './practice_tracker.js';

const converter = new AudioConverter();
const practiceTracker = new PracticeTracker();

let firebaseInitialized = false;

const logoutIcon = document.getElementById('logoutIcon');
const logoutModal = document.getElementById('logoutModal');
const cancelLogout = document.getElementById('cancelLogout');
const confirmLogout = document.getElementById('confirmLogout');
const deleteModal = document.getElementById('deleteModal');
const cancelDelete = document.getElementById('cancelDelete');
const confirmDelete = document.getElementById('confirmDelete');
const formatModal = document.getElementById('formatModal');
const cancelFormat = document.getElementById('cancelFormat');
const formatOptions = document.getElementById('formatOptions');
const conversionLoading = document.getElementById('conversionLoading');
const renameModal = document.getElementById('renameModal');
const cancelRename = document.getElementById('cancelRename');
const confirmRename = document.getElementById('confirmRename');
const renameInput = document.getElementById('renameInput');
const profileAvatar = document.getElementById('profileAvatar');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const todayPractice = document.getElementById('todayPractice');
const weekPractice = document.getElementById('weekPractice');
const totalFiles = document.getElementById('totalFiles');
const totalSessions = document.getElementById('totalSessions');
const memberSince = document.getElementById('memberSince');
const recordingsList = document.getElementById('recordingsList');
const emptyState = document.getElementById('emptyState');
const sortNewest = document.getElementById('sortNewest');
const sortOldest = document.getElementById('sortOldest');

let pendingDeleteFilename = null;
let pendingDownloadUrl = null;
let pendingDownloadFilename = null;
let pendingRenameFilename = null;
let allRecordings = [];
let currentSortOrder = 'newest';

logoutIcon.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    logoutModal.classList.remove('hidden');
    logoutModal.classList.add('flex');
});

cancelLogout.addEventListener('click', () => {
    logoutModal.classList.add('hidden');
    logoutModal.classList.remove('flex');
});

confirmLogout.addEventListener('click', async () => {
    try {
        const auth = getAuth();
        await signOut(auth);
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/';
    } catch (error) {
        console.error('Error signing out:', error);
    }
});

logoutModal.addEventListener('click', (e) => {
    if (e.target === logoutModal) {
        logoutModal.classList.add('hidden');
        logoutModal.classList.remove('flex');
    }
});

cancelDelete.addEventListener('click', () => {
    deleteModal.classList.add('hidden');
    deleteModal.classList.remove('flex');
    pendingDeleteFilename = null;
});

confirmDelete.addEventListener('click', async () => {
    if (pendingDeleteFilename) {
        try {
            const response = await fetch('/api/delete-recording', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: pendingDeleteFilename })
            });
            
            const data = await response.json();
            if (data.success) {
                await loadRecordings();
                window.toast.success('Recording deleted', 'Successfully removed from library');
            } else {
                window.toast.error('Delete failed', 'Could not delete recording');
            }
        } catch (error) {
            console.error('Error deleting recording:', error);
            window.toast.error('Delete failed', 'An error occurred');
        }
    }
    deleteModal.classList.add('hidden');
    deleteModal.classList.remove('flex');
    pendingDeleteFilename = null;
});

deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
        deleteModal.classList.add('hidden');
        deleteModal.classList.remove('flex');
        pendingDeleteFilename = null;
    }
});

cancelRename?.addEventListener('click', () => {
    renameModal.classList.add('hidden');
    renameModal.classList.remove('flex');
    renameInput.value = '';
    pendingRenameFilename = null;
});

confirmRename?.addEventListener('click', async () => {
    const newName = renameInput.value.trim();
    
    if (!newName) {
        window.toast.warning('Name required', 'Please enter a name');
        return;
    }
    
    if (pendingRenameFilename) {
        try {
            const response = await fetch('/api/rename-recording', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    filename: pendingRenameFilename,
                    newName: newName
                })
            });
            
            const data = await response.json();
            if (data.success) {
                await loadRecordings();
                window.toast.success('Recording renamed', `Now called "${newName}"`);
            } else {
                window.toast.error('Rename failed', data.error || 'Could not rename recording');
            }
        } catch (error) {
            console.error('Error renaming recording:', error);
            window.toast.error('Rename failed', 'An error occurred');
        }
    }
    
    renameModal.classList.add('hidden');
    renameModal.classList.remove('flex');
    renameInput.value = '';
    pendingRenameFilename = null;
});

renameModal?.addEventListener('click', (e) => {
    if (e.target === renameModal) {
        renameModal.classList.add('hidden');
        renameModal.classList.remove('flex');
        renameInput.value = '';
        pendingRenameFilename = null;
    }
});

renameInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        confirmRename.click();
    }
});

cancelFormat.addEventListener('click', () => {
    formatModal.classList.add('hidden');
    formatModal.classList.remove('flex');
    formatOptions.classList.remove('hidden');
    conversionLoading.classList.add('hidden');
    conversionLoading.classList.remove('flex');
    pendingDownloadUrl = null;
    pendingDownloadFilename = null;
});

document.querySelectorAll('.format-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
        const format = btn.dataset.format;
        if (pendingDownloadUrl && pendingDownloadFilename) {
            formatOptions.classList.add('hidden');
            conversionLoading.classList.remove('hidden');
            conversionLoading.classList.add('flex');

            try {
                let downloadUrl = pendingDownloadUrl;
                let finalFilename = pendingDownloadFilename.replace(/\.\w+$/, '') + '.' + format;

                if (format !== 'webm' && !pendingDownloadFilename.endsWith('.' + format)) {
                    const blob = await converter.convert(pendingDownloadUrl, format);
                    if (blob) {
                        downloadUrl = URL.createObjectURL(blob);
                        window.toast.success('Conversion complete', `Ready to download as ${format.toUpperCase()}`);
                    } else {
                        throw new Error("Conversion returned null");
                    }
                } else {
                    window.toast.info('Download started', 'Downloading original file');
                }

                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = finalFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);

                if (downloadUrl !== pendingDownloadUrl) {
                    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
                }

            } catch (error) {
                console.error('Conversion failed:', error);
                window.toast.error('Download failed', 'Could not convert audio format');
            }
        }
        formatModal.classList.add('hidden');
        formatModal.classList.remove('flex');
        setTimeout(() => {
            formatOptions.classList.remove('hidden');
            conversionLoading.classList.add('hidden');
            conversionLoading.classList.remove('flex');
        }, 300);

        pendingDownloadUrl = null;
        pendingDownloadFilename = null;
    });
});

formatModal.addEventListener('click', (e) => {
    if (e.target === formatModal) {
        formatModal.classList.add('hidden');
        formatModal.classList.remove('flex');
        formatOptions.classList.remove('hidden');
        conversionLoading.classList.add('hidden');
        conversionLoading.classList.remove('flex');
        pendingDownloadUrl = null;
        pendingDownloadFilename = null;
    }
});

sortNewest.addEventListener('click', () => {
    currentSortOrder = 'newest';
    sortNewest.classList.add('active');
    sortOldest.classList.remove('active');
    sortAndDisplayRecordings();
});

sortOldest.addEventListener('click', () => {
    currentSortOrder = 'oldest';
    sortOldest.classList.add('active');
    sortNewest.classList.remove('active');
    sortAndDisplayRecordings();
});

async function loadUserProfile() {
    try {
        const auth = getAuth();
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                profileAvatar.src = user.photoURL || 'https://via.placeholder.com/120';
                profileName.textContent = user.displayName || 'User';
                profileEmail.textContent = user.email || '';
                
                const creationTime = new Date(user.metadata.creationTime);
                const monthYear = creationTime.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                memberSince.textContent = monthYear;
                
                firebaseInitialized = true;
            } else {
                window.location.href = '/auth';
            }
        });
    } catch (error) {
        console.error('Error loading profile:', error);
        profileName.textContent = 'Error loading profile';
        profileEmail.textContent = 'Please refresh the page';
    }
}

function updatePracticeDisplay() {
    const todayStats = practiceTracker.getTodayStats();
    const weekStats = practiceTracker.getWeekStats();
    
    todayPractice.textContent = practiceTracker.formatMinutes(todayStats.minutes);
    weekPractice.textContent = practiceTracker.formatMinutes(weekStats.minutes);
    
    totalSessions.textContent = practiceTracker.sessions.length;
}

async function loadRecordings() {
    try {
        const response = await fetch('/api/get-recordings');
        const data = await response.json();
        
        if (data.success && data.recordings) {
            allRecordings = data.recordings;
            sortAndDisplayRecordings();
            totalFiles.textContent = data.recordings.length;
        }
    } catch (error) {
        console.error('Error loading recordings:', error);
    }
}

function sortAndDisplayRecordings() {
    let sortedRecordings = [...allRecordings];
    
    if (currentSortOrder === 'newest') {
        sortedRecordings.sort((a, b) => b.timestamp - a.timestamp);
    } else {
        sortedRecordings.sort((a, b) => a.timestamp - b.timestamp);
    }
    
    updateRecordingsList(sortedRecordings);
}

function updateRecordingsList(recordings) {
    if (!recordings || recordings.length === 0) {
        recordingsList.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }

    emptyState.style.display = 'none';
    recordingsList.innerHTML = recordings.map((rec, index) => {
        const date = new Date(rec.timestamp * 1000);
        const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = date.toLocaleDateString();
        const recNumber = recordings.length - index;
        const displayName = rec.customName || `Recording ${recNumber}`;
        
        return `
            <div class="recording-item" data-filename="${rec.filename}">
                <div class="recording-info">
                    <div class="recording-name">${displayName}</div>
                    <div class="recording-meta">${dateStr} • ${timeStr}</div>
                </div>
                <div class="recording-actions">
                    <button class="action-btn rename-btn" data-filename="${rec.filename}" data-current-name="${displayName}" title="Rename">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn download-btn" data-url="${rec.url}" data-filename="${rec.filename}" title="Download">
                        <i class="fas fa-download"></i>
                    </button>
                    <button class="action-btn delete-btn" data-filename="${rec.filename}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    document.querySelectorAll('.rename-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingRenameFilename = btn.dataset.filename;
            const currentName = btn.dataset.currentName;
            if (!currentName.startsWith('Recording ')) {
                renameInput.value = currentName;
            } else {
                renameInput.value = '';
            }
            
            renameModal.classList.remove('hidden');
            renameModal.classList.add('flex');
            setTimeout(() => {
                renameInput.focus();
                renameInput.select();
            }, 100);
        });
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingDownloadUrl = btn.dataset.url;
            pendingDownloadFilename = btn.dataset.filename;
            formatModal.classList.remove('hidden');
            formatModal.classList.add('flex');
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            pendingDeleteFilename = btn.dataset.filename;
            deleteModal.classList.remove('hidden');
            deleteModal.classList.add('flex');
        });
    });
}

setTimeout(() => {
    loadUserProfile();
    updatePracticeDisplay();
    loadRecordings();
}, 100);

