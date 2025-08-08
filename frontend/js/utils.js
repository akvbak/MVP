// SpinX Utility Functions
class Utils {
    constructor() {
        this.currency = 'NGN';
        this.locale = 'en-NG';
    }

    // Number and Currency Formatting
    formatCurrency(amount, currency = this.currency) {
        return new Intl.NumberFormat(this.locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount || 0);
    }

    formatNumber(number) {
        return new Intl.NumberFormat(this.locale).format(number || 0);
    }

    formatPercentage(value, decimals = 1) {
        return new Intl.NumberFormat(this.locale, {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(value / 100);
    }

    // Date and Time Formatting
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        
        return new Intl.DateTimeFormat(this.locale, formatOptions).format(
            typeof date === 'string' ? new Date(date) : date
        );
    }

    formatDateTime(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        
        const formatOptions = { ...defaultOptions, ...options };
        
        return new Intl.DateTimeFormat(this.locale, formatOptions).format(
            typeof date === 'string' ? new Date(date) : date
        );
    }

    formatRelativeTime(date) {
        const now = new Date();
        const targetDate = typeof date === 'string' ? new Date(date) : date;
        const diffMs = now - targetDate;
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) {
            return 'just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        } else {
            return this.formatDate(targetDate);
        }
    }

    // Validation Functions
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    validatePhone(phone) {
        // Nigerian phone number validation
        const cleanPhone = phone.replace(/\s+/g, '');
        const phoneRegex = /^(\+234|234|0)?[789][01]\d{8}$/;
        return phoneRegex.test(cleanPhone);
    }

    validatePassword(password) {
        const minLength = 6;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        return {
            valid: password.length >= minLength && hasLetter && hasNumber,
            requirements: {
                minLength: password.length >= minLength,
                hasLetter,
                hasNumber,
                hasSpecial
            }
        };
    }

    validateUsername(username) {
        const minLength = 3;
        const maxLength = 20;
        const validChars = /^[a-zA-Z0-9_]+$/;

        return {
            valid: username.length >= minLength && 
                   username.length <= maxLength && 
                   validChars.test(username),
            requirements: {
                minLength: username.length >= minLength,
                maxLength: username.length <= maxLength,
                validChars: validChars.test(username)
            }
        };
    }

    // String Utilities
    sanitizeInput(input) {
        if (typeof input !== 'string') return input;
        
        const div = document.createElement('div');
        div.textContent = input;
        return div.innerHTML;
    }

    truncateText(text, maxLength = 50) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }

    camelToTitle(str) {
        return str
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    }

    // URL and Query String Utilities
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    setQueryParam(param, value) {
        const url = new URL(window.location);
        url.searchParams.set(param, value);
        window.history.pushState({}, '', url);
    }

    removeQueryParam(param) {
        const url = new URL(window.location);
        url.searchParams.delete(param);
        window.history.pushState({}, '', url);
    }

    // Local Storage Utilities
    setStorage(key, value, expiry = null) {
        const item = {
            value: value,
            timestamp: Date.now(),
            expiry: expiry
        };
        localStorage.setItem(key, JSON.stringify(item));
    }

    getStorage(key) {
        try {
            const item = JSON.parse(localStorage.getItem(key));
            if (!item) return null;

            // Check if item has expired
            if (item.expiry && Date.now() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }

            return item.value;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return null;
        }
    }

    removeStorage(key) {
        localStorage.removeItem(key);
    }

    clearExpiredStorage() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            try {
                const item = JSON.parse(localStorage.getItem(key));
                if (item && item.expiry && Date.now() > item.expiry) {
                    localStorage.removeItem(key);
                }
            } catch (error) {
                // Ignore non-JSON items
            }
        });
    }

    // Array and Object Utilities
    groupBy(array, key) {
        return array.reduce((groups, item) => {
            const group = item[key];
            groups[group] = groups[group] || [];
            groups[group].push(item);
            return groups;
        }, {});
    }

    sortBy(array, key, direction = 'asc') {
        return array.sort((a, b) => {
            const aVal = typeof key === 'function' ? key(a) : a[key];
            const bVal = typeof key === 'function' ? key(b) : b[key];
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    merge(target, ...sources) {
        return Object.assign({}, target, ...sources);
    }

    // Random Utilities
    generateId(length = 8) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    randomFloat(min, max, decimals = 2) {
        const factor = Math.pow(10, decimals);
        return Math.round((Math.random() * (max - min) + min) * factor) / factor;
    }

    // Color Utilities
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    // Device and Browser Detection
    isMobile() {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    }

    isTablet() {
        return /iPad|Android/i.test(navigator.userAgent) && window.innerWidth >= 768;
    }

    isDesktop() {
        return !this.isMobile() && !this.isTablet();
    }

    getViewportSize() {
        return {
            width: window.innerWidth,
            height: window.innerHeight
        };
    }

    // Animation Utilities
    easeInOut(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    animate(duration, callback, easing = this.easeInOut) {
        const start = performance.now();
        
        function step(timestamp) {
            const elapsed = timestamp - start;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easing(progress);
            
            callback(easedProgress);
            
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }
        
        requestAnimationFrame(step);
    }

    // Game Utilities
    calculateProbability(houseEdge, baseOdds) {
        return baseOdds * (1 - houseEdge);
    }

    calculatePayout(betAmount, multiplier, houseEdge = 0) {
        return Math.floor(betAmount * multiplier * (1 - houseEdge));
    }

    getRandomGameOutcome(probabilities) {
        const random = Math.random();
        let cumulative = 0;
        
        for (const [outcome, probability] of Object.entries(probabilities)) {
            cumulative += probability;
            if (random <= cumulative) {
                return outcome;
            }
        }
        
        // Fallback to last outcome
        return Object.keys(probabilities).pop();
    }

    // Performance Utilities
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Error Handling
    createError(message, code = 'GENERIC_ERROR', details = {}) {
        const error = new Error(message);
        error.code = code;
        error.details = details;
        error.timestamp = new Date().toISOString();
        return error;
    }

    logError(error, context = {}) {
        console.error('SpinX Error:', {
            message: error.message,
            code: error.code,
            details: error.details,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString()
        });
    }

    // CSS Utilities
    addClass(element, className) {
        if (element && !element.classList.contains(className)) {
            element.classList.add(className);
        }
    }

    removeClass(element, className) {
        if (element && element.classList.contains(className)) {
            element.classList.remove(className);
        }
    }

    toggleClass(element, className) {
        if (element) {
            element.classList.toggle(className);
        }
    }

    // Network Utilities
    isOnline() {
        return navigator.onLine;
    }

    waitForConnection() {
        return new Promise((resolve) => {
            if (this.isOnline()) {
                resolve();
            } else {
                const handleOnline = () => {
                    window.removeEventListener('online', handleOnline);
                    resolve();
                };
                window.addEventListener('online', handleOnline);
            }
        });
    }

    // Image Utilities
    preloadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    preloadImages(srcArray) {
        return Promise.all(srcArray.map(src => this.preloadImage(src)));
    }

    // File Utilities
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileExtension(filename) {
        return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
    }

    // Copy to Clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                document.body.removeChild(textArea);
                return true;
            } catch (fallbackError) {
                document.body.removeChild(textArea);
                return false;
            }
        }
    }

    // Download Utilities
    downloadFile(data, filename, type = 'text/plain') {
        const blob = new Blob([data], { type });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    downloadJSON(data, filename) {
        const jsonString = JSON.stringify(data, null, 2);
        this.downloadFile(jsonString, filename, 'application/json');
    }

    downloadCSV(data, filename) {
        if (!Array.isArray(data) || data.length === 0) return;
        
        const headers = Object.keys(data[0]);
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, filename, 'text/csv');
    }
}

// Create global utils instance
window.utils = new Utils();

// Initialize cleanup of expired storage on load
document.addEventListener('DOMContentLoaded', () => {
    window.utils.clearExpiredStorage();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
