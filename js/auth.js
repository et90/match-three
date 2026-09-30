/**
 * Authentication and Leaderboard Client Module
 * Supports Registration, Login, Guest Mode, Unlocked Level Persistence, and Leaderboards.
 */

class AuthManager {
  constructor() {
    this.apiUrl = this.detectApiUrl();
    this.currentUser = null;
    this.isGuest = false;
    this.loadSession();
  }

  detectApiUrl() {
    // Если игра открыта прямо в браузере с веб-сервера
    if (window.location.protocol.startsWith('http') && (window.location.port === '3000' || window.location.hostname === '45.141.184.186')) {
      return window.location.origin;
    }
    // IP-адрес вашего VDS сервера
    return 'http://45.141.184.186:3000';
  }

  loadSession() {
    const saved = localStorage.getItem('match3_auth_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isGuest) {
          this.currentUser = {
            user: 'Гость',
            games: parseInt(localStorage.getItem('match3_guest_max_level') || '1', 10),
            isGuest: true
          };
          this.isGuest = true;
        } else {
          this.currentUser = parsed;
          this.isGuest = false;
        }
      } catch (e) {
        this.setDefaultGuest();
      }
    } else {
      this.setDefaultGuest();
    }
  }

  setDefaultGuest() {
    const guestMax = parseInt(localStorage.getItem('match3_guest_max_level') || '1', 10);
    this.currentUser = {
      user: 'Гость',
      games: guestMax,
      isGuest: true
    };
    this.isGuest = true;
  }

  saveSession() {
    if (this.currentUser) {
      localStorage.setItem('match3_auth_user', JSON.stringify(this.currentUser));
      if (this.currentUser.isGuest) {
        localStorage.setItem('match3_guest_max_level', this.currentUser.games.toString());
      }
    } else {
      localStorage.removeItem('match3_auth_user');
    }
  }

  // Register new account
  async register(username, password) {
    const res = await fetch(`${this.apiUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: username, password: password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Ошибка регистрации');
    }

    this.currentUser = {
      user: username,
      password: password,
      games: data.games || 1,
      isGuest: false
    };
    this.isGuest = false;
    this.saveSession();
    return this.currentUser;
  }

  // Login existing account
  async login(username, password) {
    const res = await fetch(`${this.apiUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: username, password: password })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || 'Ошибка авторизации');
    }

    const maxLevel = Math.max(data.games || 1, 1);
    this.currentUser = {
      user: data.user,
      password: password,
      games: maxLevel,
      isGuest: false
    };
    this.isGuest = false;
    this.saveSession();
    return this.currentUser;
  }

  // Guest Mode
  playAsGuest() {
    this.setDefaultGuest();
    this.saveSession();
    return this.currentUser;
  }

  // Logout
  logout() {
    this.setDefaultGuest();
    this.saveSession();
    return this.currentUser;
  }

  // Update max opened level (games field)
  async updateMaxLevel(level) {
    if (!this.currentUser) return;

    if (level > this.currentUser.games) {
      this.currentUser.games = level;
      this.saveSession();

      // If registered user, sync with backend database
      if (!this.isGuest && this.currentUser.password) {
        try {
          await fetch(`${this.apiUrl}/update-games`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: this.currentUser.user,
              password: this.currentUser.password,
              games: this.currentUser.games
            })
          });
        } catch (err) {
          console.warn('Не удалось синхронизировать максимальный уровень с сервером:', err);
        }
      }
    }
  }

  // Fetch leaderboard of registered users
  async fetchLeaderboard() {
    try {
      const res = await fetch(`${this.apiUrl}/leaderboard`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data.leaderboard || [];
      }
      throw new Error(data.message || 'Ошибка загрузки таблицы рекордов');
    } catch (err) {
      throw new Error('Сервер базы данных недоступен (' + err.message + ')');
    }
  }
}

window.authManager = new AuthManager();
