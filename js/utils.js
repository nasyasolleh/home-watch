// Error handling and utility functions
class ErrorHandler {
    static log(error, context = '') {
        console.error(`[HomeWatch Error] ${context}:`, error);
        
        // In production, send to error tracking service
        if (this.isProduction()) {
            this.sendToErrorTracking(error, context);
        }
    }

    static show(message, type = 'error') {
        this.showNotification(message, type);
    }

    static showNotification(message, type = 'info', duration = 5000) {
        // Remove existing notifications
        const existing = document.querySelector('.notification-toast');
        if (existing) {
            existing.remove();
        }

        const notification = document.createElement('div');
        notification.className = `notification-toast notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${this.getIcon(type)}"></i>
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    static getIcon(type) {
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    static isProduction() {
        return window.location.hostname !== 'localhost' && 
               window.location.hostname !== '127.0.0.1';
    }

    static sendToErrorTracking(error, context) {
        // Implementation for error tracking service (e.g., Sentry)
        console.log('Would send to error tracking:', { error, context });
    }
}

// Loading state utility
class LoadingState {
    static show(message = 'Loading...') {
        this.hide(); // Remove any existing loader

        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'loading-overlay';
        loader.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">${message}</div>
            </div>
        `;

        document.body.appendChild(loader);
    }

    static hide() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.remove();
        }
    }

    static showButtonLoading(button, text = 'Loading...') {
        button.disabled = true;
        button.dataset.originalText = button.textContent;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
    }

    static hideButtonLoading(button) {
        button.disabled = false;
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
    }
}

// Network connectivity checker
class ConnectivityManager {
    static isOnline() {
        return navigator.onLine;
    }

    static init() {
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    static handleOnline() {
        ErrorHandler.showNotification('Connection restored', 'success');
        this.syncOfflineData();
    }

    static handleOffline() {
        ErrorHandler.showNotification('You are offline. Some features may be limited.', 'warning');
    }

    static syncOfflineData() {
        // Sync any offline data when connection is restored
        console.log('Syncing offline data...');
    }
}

// Performance monitoring
class PerformanceMonitor {
    static init() {
        this.measurePageLoad();
        this.observeResourceTiming();
    }

    static measurePageLoad() {
        window.addEventListener('load', () => {
            const perfData = performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(`Page load time: ${pageLoadTime}ms`);
        });
    }

    static observeResourceTiming() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    if (entry.duration > 1000) { // Log slow resources
                        console.warn(`Slow resource: ${entry.name} took ${entry.duration}ms`);
                    }
                }
            });
            observer.observe({ entryTypes: ['resource'] });
        }
    }
}

// Initialize utilities
document.addEventListener('DOMContentLoaded', () => {
    ConnectivityManager.init();
    PerformanceMonitor.init();
});

// Export for use in other modules
window.ErrorHandler = ErrorHandler;
window.LoadingState = LoadingState;
window.ConnectivityManager = ConnectivityManager;
