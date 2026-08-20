import { describe, expect, it } from 'vitest';
import { PersonNodeView } from './PersonNode.js';
import { defaultNodeTheme } from './types.js';

describe('PersonNodeView', () => {
  it('success: renders name, title and temp badge', () => {
    const view = PersonNodeView.create(
      {
        id: 'p1',
        fullName: 'Іваненко Іван',
        photoUrl: undefined,
      },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: true,
      },
      defaultNodeTheme.person,
    );
    expect(view.eventMode).toBe('static');
    expect(view.findText('Іваненко Іван')).toBeTruthy();
    expect(view.findText('Інженер')).toBeTruthy();
    expect(view.hasTempBadge()).toBe(true);
  });

  it('failure: missing person uses placeholder name', () => {
    const view = PersonNodeView.create(
      undefined,
      {
        id: 'vacant',
        title: 'Вакантна посада',
        organizationId: 'org1',
        groupIds: [],
        status: 'vacant',
        isTemporary: false,
      },
      defaultNodeTheme.person,
    );
    expect(view.findText('—')).toBeTruthy();
    expect(view.hasTempBadge()).toBe(false);
  });
});
