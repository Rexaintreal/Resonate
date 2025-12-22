import { getAuth, signOut, onAuthStateChanged, deleteUser, GoogleAuthProvider, signInWithPopup, reauthenticateWithPopup } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { AudioConverter } from './converter.js';
import { PracticeTracker } from './practice_tracker.js';

const converter = new AudioConverter();
const practiceTracker = new PracticeTracker();

let firebaseInitialized = false;
let currentUser = null;

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
const deleteAccountBtn = document.getElementById('deleteAccountBtn');
const deleteAccountModal = document.getElementById('deleteAccountModal');
const cancelDeleteAccount = document.getElementById('cancelDeleteAccount');
const confirmDeleteAccount = document.getElementById('confirmDeleteAccount');
const exportDataBtn = document.getElementById('exportDataBtn');

let pendingDeleteFilename = null;
let pendingDownloadUrl = null;
let pendingDownloadFilename = null;
let pendingRenameFilename = null;
let allRecordings = [];
let currentSortOrder = 'newest';

exportDataBtn?.addEventListener('click', async () => {
    try {
        window.toast.info('Exporting data', 'Preparing your data...');
        
        const exportData = {
            exportDate: new Date().toISOString(),
            profile: {
                name: currentUser?.displayName || 'Unknown',
                email: currentUser?.email || 'Unknown',
                uid: currentUser?.uid || 'Unknown',
                memberSince: currentUser?.metadata?.creationTime || 'Unknown'
            },
            practiceData: {
                sessions: practiceTracker.sessions || [],
                todayStats: practiceTracker.getTodayStats(),
                weekStats: practiceTracker.getWeekStats(),
                totalSessions: practiceTracker.sessions?.length || 0
            },
            recordings: allRecordings.map(rec => ({
                filename: rec.filename,
                customName: rec.customName,
                timestamp: rec.timestamp,
                date: new Date(rec.timestamp * 1000).toISOString()
            })),
            statistics: {
                totalRecordings: allRecordings.length,
                totalPracticeSessions: practiceTracker.sessions?.length || 0,
                totalPracticeMinutes: practiceTracker.sessions?.reduce((sum, s) => sum + (s.minutes || 0), 0) || 0
            }
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const a = document.createElement('a');
        a.href = url;
        const timestamp = new Date().toISOString().split('T')[0];
        a.download = `resonate-data-${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        window.toast.success('Export complete', 'Your data has been downloaded');
    } catch (error) {
        console.error('Export error:', error);
        window.toast.error('Export failed', 'Could not export your data');
    }
});

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
deleteAccountBtn?.addEventListener('click', () => {
    deleteAccountModal.classList.remove('hidden');
    deleteAccountModal.classList.add('flex');
});

cancelDeleteAccount?.addEventListener('click', () => {
    deleteAccountModal.classList.add('hidden');
    deleteAccountModal.classList.remove('flex');
});

confirmDeleteAccount?.addEventListener('click', async () => {
    try {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
            window.toast.error('Error', 'No user logged in');
            return;
        }
        deleteAccountModal.classList.add('hidden');
        deleteAccountModal.classList.remove('flex');
        window.toast.info('Security check', 'Please sign in again to confirm');
        
        try {
            const provider = new GoogleAuthProvider();
            await reauthenticateWithPopup(user, provider);
            window.toast.info('Deleting account', 'Please wait...');
            await deleteAllUserRecordings();
            practiceTracker.clearAllData();
            localStorage.clear();
            await deleteUser(user);
            await fetch('/api/logout', { method: 'POST' });
            window.toast.success('Account deleted', 'Your account has been permanently deleted');
            
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
            
        } catch (reauthError) {
            console.error('Re-authentication error:', reauthError);
            
            if (reauthError.code === 'auth/popup-closed-by-user') {
                window.toast.warning('Cancelled', 'Account deletion cancelled');
            } else if (reauthError.code === 'auth/popup-blocked') {
                window.toast.error('Popup blocked', 'Please allow popups and try again');
            } else {
                window.toast.error('Authentication failed', 'Could not verify your identity');
            }
        }
        
    } catch (error) {
        console.error('Error deleting account:', error);
        window.toast.error('Delete failed', error.message || 'Could not delete account');
    }
});

deleteAccountModal?.addEventListener('click', (e) => {
    if (e.target === deleteAccountModal) {
        deleteAccountModal.classList.add('hidden');
        deleteAccountModal.classList.remove('flex');
    }
});

async function loadUserProfile() {
    try {
        const auth = getAuth();
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                currentUser = user;
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
    
    const sessionsCount = practiceTracker.sessions.length;
    totalSessions.textContent = sessionsCount;
    const totalSessionsLarge = document.getElementById('totalSessionsLarge');
    if (totalSessionsLarge) {
        totalSessionsLarge.textContent = sessionsCount;
    }
    
    updateActivityFeed();
}

function updateActivityFeed() {
    const activityItems = document.getElementById('activityItems');
    if (!activityItems) return;
    
    const recentSessions = practiceTracker.sessions.slice(-5).reverse();
    
    if (recentSessions.length === 0) {
        activityItems.innerHTML = `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-info-circle"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">No recent activity</div>
                    <div class="activity-time">Start practicing to see activity</div>
                </div>
            </div>
        `;
        return;
    }
    
    activityItems.innerHTML = recentSessions.map(session => {
        const date = new Date(session.date);
        const timeAgo = getTimeAgo(date);
        const duration = practiceTracker.formatMinutes(session.minutes);
        
        return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-music"></i>
                </div>
                <div class="activity-details">
                    <div class="activity-title">Practice session • ${duration}</div>
                    <div class="activity-time">${timeAgo}</div>
                </div>
            </div>
        `;
    }).join('');
}

function getTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString();
}

async function loadRecordings() {
    try {
        const response = await fetch('/api/get-recordings');
        const data = await response.json();
        
        if (data.success && data.recordings) {
            allRecordings = data.recordings;
            sortAndDisplayRecordings();
            totalFiles.textContent = data.recordings.length;
            const totalFilesLarge = document.getElementById('totalFilesLarge');
            if (totalFilesLarge) {
                totalFilesLarge.textContent = data.recordings.length;
            }
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

async function deleteAllUserRecordings() {
    if (!allRecordings || allRecordings.length === 0) {
        return;
    }
    
    const deletePromises = allRecordings.map(recording => 
        fetch('/api/delete-recording', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: recording.filename })
        })
    );
    
    await Promise.all(deletePromises);
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

document.addEventListener('DOMContentLoaded', () => {
    loadUserProfile();
    updatePracticeDisplay();
    loadRecordings();
});