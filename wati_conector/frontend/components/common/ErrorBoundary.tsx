import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info);
    }

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;
            return (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                    <div className="text-4xl mb-3">⚠️</div>
                    <div className="text-card-heading font-semibold text-gray-800 mb-1">
                        Algo salió mal
                    </div>
                    <div className="text-body text-gray-400 mb-4 max-w-[320px]">
                        {this.state.error?.message || 'Error inesperado en la aplicación'}
                    </div>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="px-4 py-2 bg-primary text-white text-body font-medium rounded-lg hover:bg-primary-dark transition-colors"
                    >
                        Reintentar
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
