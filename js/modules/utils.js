/**
 * Utility Module
 */
export const utils = {
    showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'bg-primary text-background px-4 py-2 rounded-lg shadow-lg font-bold text-sm animate-bounce z-[100]';
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
            setTimeout(() => toast.remove(), 500);
        }, 2500);
    },

    formatViews(v) {
        if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
        return v;
    },

    formatTime(s) {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    },

    escapeHtml(s) {
        if (!s) return '';
        return s.replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    },

    safeString(obj) {
        return JSON.stringify(obj).replace(/'/g, "&apos;").replace(/"/g, '&quot;');
    }
};
