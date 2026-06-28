import React, { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    retryKey: number;
}

export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null, retryKey: 0 };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[ErrorBoundary]', error, info.componentStack);
    }

    handleRetry = () => {
        this.setState((prev) => ({
            hasError: false,
            error: null,
            retryKey: prev.retryKey + 1,
        }));
    };

    render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg m-4">
                    <h2 className="text-red-400 font-bold mb-2">Something went wrong</h2>
                    <p className="text-gray-400 text-sm mb-3">{this.state.error?.message}</p>
                    <button
                        className="px-3 py-1 bg-red-700 text-white rounded text-sm hover:bg-red-600"
                        onClick={this.handleRetry}
                    >
                        Retry
                    </button>
                </div>
            );
        }
        return <React.Fragment key={this.state.retryKey}>{this.props.children}</React.Fragment>;
    }
}
