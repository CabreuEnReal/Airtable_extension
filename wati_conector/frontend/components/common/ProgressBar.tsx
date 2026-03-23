import React from 'react';

interface ProgressBarProps {
    progress: number; // 0-100
    size?: 'sm' | 'md' | 'lg';
    color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
    showPercentage?: boolean;
    className?: string;
}

export function ProgressBar({ 
    progress, 
    size = 'md', 
    color = 'primary',
    showPercentage = false,
    className = ''
}: ProgressBarProps) {
    const sizeClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3'
    };

    const colorClasses = {
        primary: 'bg-primary',
        secondary: 'bg-gray-500',
        success: 'bg-green-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500'
    };

    const bgClasses = {
        primary: 'bg-primary-light',
        secondary: 'bg-gray-200',
        success: 'bg-green-100',
        warning: 'bg-yellow-100',
        error: 'bg-red-100'
    };

    return (
        <div className={`w-full ${className}`}>
            <div className={`relative ${sizeClasses[size]} ${bgClasses[color]} rounded-full overflow-hidden`}>
                <div 
                    className={`absolute top-0 left-0 h-full ${colorClasses[color]} transition-all duration-300 ease-out`}
                    style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                />
            </div>
            {showPercentage && (
                <div className="mt-1 text-xs text-gray-600 text-center">
                    {Math.round(progress)}%
                </div>
            )}
        </div>
    );
}
