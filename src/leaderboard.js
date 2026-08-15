/**
 * Global Real-Time Cloud Leaderboard Service
 * Powered by Supabase REST API with zero-dependency native fetch & offline caching.
 */

const SUPABASE_URL = 'https://tmlhhufalnzuhoqkqino.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtbGhodWZhbG56dWhvcWtxaW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY3NDg3NjQsImV4cCI6MjEwMjMyNDc2NH0.wRtO6ppVsyQ6xrUhci0kCoaNpFNt6GZqizjwy7Y0Y8E';

class CloudLeaderboardService {
  constructor() {
    this.endpoint = `${SUPABASE_URL}/rest/v1/leaderboard_scores`;
    this.headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  /**
   * Fetch Global Top 10 High Scores across all players
   */
  async fetchGlobalTop10(filterMode = 'all') {
    try {
      let query = `${this.endpoint}?select=*&order=score.desc&limit=10`;
      if (filterMode && filterMode !== 'all') {
        query += `&mode=eq.${filterMode}`;
      }

      const res = await fetch(query, {
        headers: this.headers,
        method: 'GET'
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      const formatted = data.map(item => ({
        name: item.player_tag,
        score: item.score,
        combo: item.combo,
        mode: item.mode,
        level: item.level,
        date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));

      // Cache locally for offline resilience
      localStorage.setItem('cr_cloud_global_cache', JSON.stringify(formatted));
      return formatted;
    } catch (err) {
      console.warn('Cloud leaderboard fetch fallback:', err.message);
      return JSON.parse(localStorage.getItem('cr_cloud_global_cache') || '[]');
    }
  }

  /**
   * Fetch Top 10 High Scores for a specific Campaign Level
   */
  async fetchLevelTop10(levelNum) {
    try {
      const query = `${this.endpoint}?select=*&level=eq.${levelNum}&order=score.desc&limit=10`;
      const res = await fetch(query, {
        headers: this.headers,
        method: 'GET'
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const formatted = data.map(item => ({
        name: item.player_tag,
        score: item.score,
        combo: item.combo,
        date: new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      }));

      localStorage.setItem(`cr_cloud_level_${levelNum}_cache`, JSON.stringify(formatted));
      return formatted;
    } catch (err) {
      console.warn(`Cloud level ${levelNum} fetch fallback:`, err.message);
      return JSON.parse(localStorage.getItem(`cr_cloud_level_${levelNum}_cache`) || '[]');
    }
  }

  /**
   * Submit a new score record to the persistent cloud database
   */
  async submitScore(playerTag = 'ACE', score = 0, combo = 0, level = 1, mode = 'Campaign') {
    const cleanTag = (playerTag || 'ACE').trim().substring(0, 4).toUpperCase();
    
    try {
      const payload = {
        player_tag: cleanTag,
        score: Math.round(score),
        combo: Math.round(combo),
        level: typeof level === 'number' ? level : 1,
        mode: mode || 'Campaign'
      };

      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const result = await res.json();
      return { success: true, record: result[0] };
    } catch (err) {
      console.error('Cloud score submission failed:', err);
      return { success: false, error: err.message };
    }
  }
}

export const cloudLeaderboard = new CloudLeaderboardService();
