import { describe, expect, it } from 'vitest';
import { OrganizationNodeView } from './OrganizationNode.js';
import { defaultNodeTheme } from './types.js';

describe('OrganizationNodeView', () => {
  const org = {
    id: 'org1',
    name: 'Міністерство',
    groupIds: ['g1'],
    symbolUrlLight: '/sym-light.png',
    symbolUrlDark: '/sym-dark.png',
  };
  const group = { id: 'g1', name: 'Група А', emblemUrl: '/emblem.png' };

  it('success: dark theme uses dark symbol url', () => {
    const view = OrganizationNodeView.create(org, group, 'dark', defaultNodeTheme.organization);
    expect(view.resolvedSymbolUrl).toBe('/sym-dark.png');
    expect(view.findText('Міністерство')).toBeTruthy();
  });

  it('success: light theme uses light symbol url', () => {
    const view = OrganizationNodeView.create(org, group, 'light', defaultNodeTheme.organization);
    expect(view.resolvedSymbolUrl).toBe('/sym-light.png');
  });

  it('failure: missing group still renders org name', () => {
    const view = OrganizationNodeView.create(org, undefined, 'light', defaultNodeTheme.organization);
    expect(view.findText('Міністерство')).toBeTruthy();
  });
});
