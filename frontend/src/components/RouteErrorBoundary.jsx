import { Component } from "react";
import ErrorPage from "./ErrorPage";

function RouteErrorFallback({ error, onRetry }) {
  return (
    <ErrorPage
      errorCode="500"
      message="The application encountered an unexpected rendering error."
      showRetry
      onRetry={onRetry}
      errorDetails={error}
    />
  );
}

class RouteErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    // Keep logging simple and local for development troubleshooting.
    console.error("Route rendering error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <RouteErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }

    return this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  return <RouteErrorBoundaryInner>{children}</RouteErrorBoundaryInner>;
}
