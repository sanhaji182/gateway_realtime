"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { InlineError } from "@/components/ui/InlineError";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? <InlineError message="Something went wrong." onRetry={() => this.setState({ hasError: false })} />;
    }

    return this.props.children;
  }
}
