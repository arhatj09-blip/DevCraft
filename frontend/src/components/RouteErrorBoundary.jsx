import { Component, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function RouteErrorFallback() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Recover from unexpected render failures by returning users home.
    navigate("/landing", {
      replace: true,
      state: { fromError: location.pathname },
    });
  }, [navigate, location.pathname]);

  return null;
}

class RouteErrorBoundaryInner extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    // Keep logging simple and local for development troubleshooting.
    // eslint-disable-next-line no-console
    console.error("Route rendering error:", error);
  }

  render() {
    if (this.state.hasError) {
      return <RouteErrorFallback />;
    }

    return this.props.children;
  }
}

export default function RouteErrorBoundary({ children }) {
  return <RouteErrorBoundaryInner>{children}</RouteErrorBoundaryInner>;
}
