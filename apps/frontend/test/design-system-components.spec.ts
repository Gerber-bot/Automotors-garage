import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { tokens } from '../src/design-system/tokens.ts';

describe('Design System Tokens & Components Specification', () => {
  it('1. Design tokens enforce dark mode canvas and primary emerald accent', () => {
    assert.equal(tokens.colors.surface.background, '#020617'); // slate-950
    assert.equal(tokens.colors.brand[500], '#10b981'); // Emerald-500
    assert.equal(tokens.colors.brand[600], '#059669'); // Emerald-600 hover
  });

  it('2. Status semantic colors are properly defined with background, border, text, and dot', () => {
    const statuses = ['success', 'warning', 'danger', 'info', 'inProgress', 'neutral'] as const;
    for (const status of statuses) {
      const config = tokens.colors.status[status];
      assert.ok(config.bg, `Missing bg for status ${status}`);
      assert.ok(config.border, `Missing border for status ${status}`);
      assert.ok(config.text, `Missing text for status ${status}`);
      assert.ok(config.dot, `Missing dot for status ${status}`);
    }
  });

  it('3. Breakpoint tokens cover responsive spectrum from 320px to 1440px', () => {
    assert.equal(tokens.breakpoints.compact, '320px');
    assert.equal(tokens.breakpoints.mobile, '390px');
    assert.equal(tokens.breakpoints.phablet, '430px');
    assert.equal(tokens.breakpoints.tablet, '768px');
    assert.equal(tokens.breakpoints.desktop, '1280px');
  });

  it('4. Accessibility tokens enforce minimum 44px touch target on interactive elements', () => {
    assert.equal(tokens.accessibility.minTouchTarget, '44px');
    assert.match(tokens.accessibility.focusRing, /ring-emerald-500/);
  });

  it('5. Typography font families enforce Inter sans and JetBrains Mono', () => {
    assert.match(tokens.typography.fonts.sans, /Inter/);
    assert.match(tokens.typography.fonts.mono, /JetBrains Mono/);
  });
});
