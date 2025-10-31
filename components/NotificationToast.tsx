import React, { useEffect, useState } from 'react';
import { InfoIcon, ErrorIcon, SuccessIcon, WarningIcon } from './Icons';

interface NotificationToastProps {
    id: string;
    message: string;
    type: 'info' | 'error' | 'success' | 'warning';
    onDismiss: (id: string) => void;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
    index?: number; // For stacking multiple notifications
}

const NotificationToast: React.FC<NotificationToastProps> = ({
    id,
    message,
    type,
    onDismiss,
    duration = 5000,
    action,
    index = 0
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [progress, setProgress] = useState(100);

    useEffect(() => {
        const startTime = Date.now();
        const timer = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, ((duration - elapsed) / duration) * 100);
            setProgress(remaining);

            if (elapsed >= duration) {
                setIsVisible(false);
                setTimeout(() => onDismiss(id), 300);
                clearInterval(timer);
            }
        }, 50);

        return () => clearInterval(timer);
    }, [id, onDismiss, duration]);

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => onDismiss(id), 300);
    };

    const getColors = () => {
        switch (type) {
            case 'success':
                return {
                    bg: 'bg-emerald-500',
                    border: 'border-emerald-400',
                    progress: 'bg-emerald-300',
                    icon: SuccessIcon
                };
            case 'error':
                return {
                    bg: 'bg-red-500',
                    border: 'border-red-400',
                    progress: 'bg-red-300',
                    icon: ErrorIcon
                };
            case 'warning':
                return {
                    bg: 'bg-yellow-500',
                    border: 'border-yellow-400',
                    progress: 'bg-yellow-300',
                    icon: WarningIcon
                };
            default:
                return {
                    bg: 'bg-sky-500',
                    border: 'border-sky-400',
                    progress: 'bg-sky-300',
                    icon: InfoIcon
                };
        }
    };

    const colors = getColors();
    const Icon = colors.icon;
    const offset = index * 80; // Stack notifications with 80px offset

    return (
        <div
            className={`fixed bottom-4 right-4 p-4 rounded-lg shadow-xl text-white flex items-start space-x-3 transition-all duration-300 transform border-2 z-50 ${colors.bg} ${colors.border} ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}`}
            style={{
                bottom: `${16 + offset}px`,
                minWidth: '320px',
                maxWidth: '480px'
            }}
            role="alert"
        >
            <Icon className="w-6 h-6 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed break-words">{message}</p>
                {action && (
                    <button
                        onClick={() => {
                            action.onClick();
                            handleDismiss();
                        }}
                        className="mt-2 text-xs underline hover:no-underline focus:outline-none focus:underline"
                    >
                        {action.label}
                    </button>
                )}
                {/* Progress bar */}
                <div className="mt-3 w-full bg-black/20 rounded-full h-1 overflow-hidden">
                    <div
                        className={`h-full ${colors.progress} transition-all duration-50 ease-linear`}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>
            <button
                onClick={handleDismiss}
                className="ml-2 text-white/80 hover:text-white focus:outline-none focus:text-white transition-colors flex-shrink-0"
                aria-label="Dismiss notification"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
            </button>
        </div>
    );
};

export default NotificationToast;
