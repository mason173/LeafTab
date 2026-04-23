import { createRef } from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useNewtabBootstrapFocus } from './useNewtabBootstrapFocus';

function BootstrapFocusHarness() {
  const pageFocusRef = createRef<HTMLDivElement>();
  useNewtabBootstrapFocus(pageFocusRef);
  return <div ref={pageFocusRef}>page</div>;
}

describe('useNewtabBootstrapFocus', () => {
  beforeEach(() => {
    window.history.replaceState(window.history.state, '', '/index.html?nt=1');
  });

  afterEach(() => {
    document.body.innerHTML = '';
    window.history.replaceState(window.history.state, '', '/index.html');
  });

  it('cleans the bootstrap focus query parameter after startup', () => {
    render(<BootstrapFocusHarness />);
    expect(new URLSearchParams(window.location.search).get('nt')).toBeNull();
  });
});
