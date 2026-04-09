import { RotateCcw } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";

interface RouteErrorBoundaryProps {
  actionLabel?: string;
  children: React.ReactNode;
  description: string;
  fallbackPath?: string;
  title: string;
}

interface RouteErrorBoundaryState {
  error: Error | null;
}

class RouteErrorBoundary extends React.Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): RouteErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Route error:", error, errorInfo);
  }

  private handleAction = () => {
    const { fallbackPath = "/" } = this.props;

    if (typeof window !== "undefined") {
      window.location.hash = fallbackPath;
    }

    this.setState({ error: null });
  };

  render() {
    const { actionLabel = "Return home", children, description, title } =
      this.props;
    const { error } = this.state;

    if (!error) {
      return children;
    }

    const message = error.message?.trim() || null;

    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 sm:px-6">
        {/* Background */}
        <div className="absolute inset-0 bg-[rgb(18,14,10)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(217,119,87,0.18),transparent)]" />

        {/* Card */}
        <div className="relative z-10 w-full max-w-[30rem]">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-primary/80">
              Something went wrong
            </p>

            <h2 className="mt-3 font-display text-[clamp(1.75rem,4vw,2.4rem)] leading-[0.94] tracking-[-0.05em] text-white">
              {title}
            </h2>

            <p className="mt-4 text-[0.95rem] leading-7 text-white/60">
              {description}
            </p>

            {message ? (
              <div className="mt-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-white/40">
                  Details
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-white/50">
                  {message}
                </p>
              </div>
            ) : null}

            <div className="mt-8">
              <Button size="lg" onClick={this.handleAction}>
                <RotateCcw size={16} />
                {actionLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }
}

export default RouteErrorBoundary;
