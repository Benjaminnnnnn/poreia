import Button from "@/components/ui/Button";
import Surface from "@/components/ui/Surface";
import { RotateCcw } from "lucide-react";
import React from "react";

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Unhandled app error:", error, errorInfo);
  }

  private handleReturnHome = () => {
    if (typeof window !== "undefined") {
      window.location.hash = "/";
    }

    this.setState({ error: null });
  };

  render() {
    const { children } = this.props;
    const { error } = this.state;

    if (!error) {
      return children;
    }

    const message = error.message?.trim() || null;

    return (
      <section className="flex min-h-screen items-center justify-center bg-black/40 px-4 py-6 sm:px-6 lg:px-8 backdrop-blur-sm before:absolute before:inset-0 before:bg-gradient-to-b before:from-black/20 before:via-black/40 before:to-black/60 before:-z-10">
        <div className="relative z-10 w-full max-w-[31rem]">
          <Surface
            variant="glass"
            radius="2xl"
            padding="xl"
            className="before:absolute before:inset-0 before:bg-black/30 before:backdrop-blur before:mix-blend-overlay before:-z-10 before:rounded-[inherit]"
          >
            <div className="relative z-10 max-w-[25rem]">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#e66a3f]">
                Something went wrong
              </p>
              <h1 className="mt-3 font-display text-[clamp(2rem,4vw,2.8rem)] leading-[0.94] tracking-[-0.05em] text-white drop-shadow">
                We could not load this page.
              </h1>
              <p className="mt-4 text-[0.98rem] leading-7 text-white/80">
                Go back to the home page and try again.
              </p>
            </div>

            {message ? (
              <div className="relative z-10 mt-6 border-l-2 border-[#e66a3f]/50 pl-4">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white/70">
                  Details
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/75">
                  {message}
                </p>
              </div>
            ) : null}

            <div className="relative z-10 mt-7">
              <Button size="lg" onClick={this.handleReturnHome}>
                <RotateCcw size={17} />
                Back to home
              </Button>
            </div>
          </Surface>
        </div>
      </section>
    );
  }
}

export default ErrorBoundary;
