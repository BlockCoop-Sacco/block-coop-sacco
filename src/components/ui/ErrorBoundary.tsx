import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { Card, CardContent, CardHeader } from './Card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="max-w-2xl mx-auto mt-8 border-red-200 bg-red-50">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-red-900">Something went wrong</h2>
            <p className="text-red-700 mt-2">
              An error occurred while loading this component. This might be due to a contract configuration issue.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {this.state.error && (
              <div className="bg-red-100 border border-red-300 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">Error Details:</h3>
                <p className="text-sm text-red-800 font-mono break-all">
                  {this.state.error.message}
                </p>
                {this.state.error.message.includes('exchangeRate') && (
                  <div className="mt-3 p-3 bg-yellow-100 border border-yellow-300 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>Possible Solution:</strong> This error suggests a contract ABI mismatch. 
                      The contract may not have the expected 'exchangeRate' field. Please verify:
                    </p>
                    <ul className="text-sm text-yellow-800 mt-2 list-disc list-inside">
                      <li>Contract is deployed with dual pricing system</li>
                      <li>Frontend ABI matches deployed contract</li>
                      <li>Environment variables point to correct contract addresses</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
            
            <div className="flex justify-center space-x-4">
              <Button 
                onClick={this.handleRetry}
                className="flex items-center space-x-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Try Again</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
