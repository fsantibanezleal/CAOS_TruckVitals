// One panel failing must not blank the App.
//
// Without a boundary, a single bad index or a null where a number was expected unmounts the whole React
// tree and the page goes white, which reads as "the site is down" rather than "one view has a bug". The
// boundary keeps the shell, the selectors and every other tab alive, and it SHOWS the error rather than
// swallowing it, because a panel that silently renders nothing is the failure mode that ships.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { name: string; children: ReactNode }
interface State { error: Error | null }

export default class PanelBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the stack in the console for the visual-verify harness, which fails a run on console errors.
    console.error(`[panel:${this.props.name}]`, error, info.componentStack);
  }

  componentDidUpdate(prev: Props) {
    // A new panel gets a fresh chance; otherwise one bad truck would poison the tab until a reload.
    if (prev.name !== this.props.name && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="tv-err" role="alert">
          <strong>This panel failed to render.</strong>
          <div style={{ marginTop: '0.4rem', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            {this.props.name}: {this.state.error.message}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
