// practice session tracker to trakc users practice time
export class PracticeTracker {
    constructor() {
        this.sessions = this.loadSessions();
        this.currentSession = null;
        this.startTime = null;
        this.updateInterval = null;
    }

    loadSessions() {
        try {
            const stored = localStorage.getItem('practice_sessions');
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('Failed to load sessions:', e);
            return [];
        }
    }

    startSession(tool) {
        if (this.currentSession) {
            console.warn('Session already active');
            return;
        }

        this.currentSession = {
            tool: tool, // pages visualizer, tuner, chords etc
            startTime: Date.now(),
            endTime: null,
            duration: 0
        };
        this.startTime = Date.now();

        this.updateInterval = setInterval(() => {
            if (this.currentSession) {
                const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
                this.currentSession.duration = elapsed;
            }
        }, 1000);

        // console.log('Practice session started:', tool);
    }

    endSession() {
        if(!this.currentSession) {
            return null;
        }
        clearInterval(this.updateInterval);
        if  (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        this.currentSession.endTime = Date.now();
        this.currentSession.duration = Math.floor(
            (this.currentSession.endTime - this.currentSession.startTime) / 1000
        );

        if (this.currentSession.duration > 5) {
            this.sessions.push(this.currentSession);
            this.saveSessions();
            // console.log ('Session saved:', this.currentSession);
        }

        const session = this.currentSession;
        this.currentSession = null;
        this.startTime = null;

        return session;
    }

    saveSessions() {
        try {
            //keep only last 100 sessions 
            if (this.sessions.length > 100) {
                this.sessions = this.sessions.slice(-100);
            }
            localStorage.setItem('practice_sessions', JSON.stringify(this.sessions));
        } catch (e) {
            console.error('Failed to save sesisons:', e);
        }
    }

    getTodayStats() {
        const today = new Date().setHours(0, 0, 0, 0);
        const todaySessions = this.sessions.filter(s => {
            const sessionDate = new Date(s.startTime).setHours(0, 0, 0, 0);
            return sessionDate === today;
        });

        let totalSeconds = 0;
        todaySessions.forEach(s => totalSeconds += s.duration);

        return {
            minutes: Math.floor(totalSeconds / 60),
            sessions: todaySessions.length,
            tools: [...new Set(todaySessions.map(s => s.tool))]
        };
    }

    getWeekStats() {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const weekSessions = this.sessions.filter(s => {
            return new Date(s.startTime) >= weekAgo;
        });

        let totalSeconds = 0;
        weekSessions.forEach(s => totalSeconds += s.duration);

        return  {
            minutes: Math.floor(totalSeconds / 60),
            sessions: weekSessions.length,
            days: this.getUniqueDays(weekSessions)
        };
    }

    getUniqueDays(sessions) {
        const days = new Set();
        sessions.forEach(s => {
            const day = new Date(s.startTime).toDateString();
            days.add(day);
        });
        return days.size;
    }

    getCurrentDuration() {
        if (this.currentSession || !this.startTime) {
            return 0;
        }
        return Math.floor((Date.now() - this.startTime) / 1000);
    }

    isActive() {
        return this.currentSession !== null;
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    formatMinutes(minutes) {
        if (minutes < 60) {
            return `${minutes}m`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    clearAllData() {
        this.sessions = []; 
        this.currentSession = null;
        this.startTime = null;
        localStorage.removeItem('practice_sessions');
        console.log('All practice data cleared');
    }
}

