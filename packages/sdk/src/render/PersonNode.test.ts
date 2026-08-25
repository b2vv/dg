import { afterEach, describe, expect, it, vi } from 'vitest';
import { Texture } from 'pixi.js';
import { PersonNodeView } from './PersonNode.js';
import { configureNodeTextureLoader, clearNodeTextureCache } from '../media/nodeMedia.js';
import { defaultNodeTheme } from './types.js';
import { figmaRowTextRows } from './personLayout.js';
import { VACANT_POSITION_LABEL } from './orgCardChrome.js';

describe('PersonNodeView', () => {
  afterEach(() => {
    configureNodeTextureLoader(null);
    clearNodeTextureCache();
  });

  it('success: renders name, title, initials and temp badge', async () => {
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
    await view.mediaReady;
    expect(view.eventMode).toBe('static');
    expect(view.findText('Іваненко Іван')).toBeTruthy();
    expect(view.findText('Інженер')).toBeTruthy();
    expect(view.findText('ІІ')).toBeTruthy();
    expect(view.hasTempBadge()).toBe(true);
    expect(view.hasPhotoSprite()).toBe(false);
    expect(view.hasInitials()).toBe(true);
    expect(view.avatarFill).toBeGreaterThan(0);
  });

  it('success: near lod shows photo sprite when texture loads', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Іваненко Іван', photoUrl: '/photo.png' },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
      'near',
    );
    await view.mediaReady;
    expect(view.hasPhotoSprite()).toBe(true);
    expect(view.hasInitials()).toBe(false);
  });

  it('failure: 1×1 data-URI placeholder keeps initials (no sprite)', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const view = PersonNodeView.create(
      {
        id: 'p1',
        fullName: 'Іваненко Іван',
        photoUrl:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
      'near',
    );
    await view.mediaReady;
    expect(view.hasPhotoSprite()).toBe(false);
    expect(view.hasInitials()).toBe(true);
  });

  it('failure: missing person uses placeholder name', async () => {
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
    await view.mediaReady;
    expect(view.findText('(вакансія)')).toBeTruthy();
    expect(view.findText('—')).toBeUndefined();
    expect(view.hasTempBadge()).toBe(false);
  });

  it('Phase2 E7: filled seat without person still uses —', async () => {
    const view = PersonNodeView.create(
      undefined,
      {
        id: 'missing',
        title: 'Role',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
    );
    await view.mediaReady;
    expect(view.findText('—')).toBeTruthy();
    expect(view.findText('(вакансія)')).toBeUndefined();
  });

  it('Phase2 E7: position period chip via formatOrgPeriodLabel', async () => {
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Іваненко Іван' },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        periodStart: '2024-03-01',
        periodEnd: null,
      },
      defaultNodeTheme.person,
    );
    await view.mediaReady;
    expect(view.hasPeriodChip()).toBe(true);
    expect(view.findText('з 01.03.2024 по т.ч.')).toBeTruthy();
  });

  it('Phase2 E7: no period fields → no chip', async () => {
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Іваненко Іван' },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
    );
    await view.mediaReady;
    expect(view.hasPeriodChip()).toBe(false);
  });

  it('failure: photo load error keeps placeholder (no sprite)', async () => {
    configureNodeTextureLoader(async () => null);
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Іваненко Іван', photoUrl: '/missing.png' },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
    );
    await view.mediaReady;
    expect(view.hasPhotoSprite()).toBe(false);
    expect(view.findText('Іваненко Іван')).toBeTruthy();
  });

  it('success: far lod draws dot without name text', async () => {
    configureNodeTextureLoader(async () => Texture.WHITE);
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Іваненко Іван', photoUrl: '/photo.png' },
      {
        id: 'pos1',
        title: 'Інженер',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: true,
      },
      defaultNodeTheme.person,
      'far',
    );
    await view.mediaReady;
    expect(view.lod).toBe('far');
    expect(view.findText('Іваненко Іван')).toBeUndefined();
    expect(view.hasTempBadge()).toBe(false);
    expect(view.hasPhotoSprite()).toBe(false);
  });

  it('success: expand chrome shows when hasChildren', async () => {
    const onToggle = vi.fn();
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Lead' },
      {
        id: 'pos1',
        title: 'Lead',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      defaultNodeTheme.person,
      'near',
      {
        expand: { hasChildren: true, expanded: false, onToggle },
      },
    );
    await view.mediaReady;
    expect(view.hasExpandButton()).toBe(true);
  });

  it('figma-row: title above name, left text column', async () => {
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Alex Morgan' },
      {
        id: 'pos1',
        title: 'Regional Director',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      {
        ...defaultNodeTheme.person,
        width: 248,
        height: 72,
        personLayout: 'figma-row',
      },
      'near',
    );
    await view.mediaReady;
    const title = view.findText('Regional Director');
    const name = view.findText('Alex Morgan');
    const rows = figmaRowTextRows({
      height: 72,
      nameFontSize: defaultNodeTheme.person.nameFontSize,
      titleFontSize: defaultNodeTheme.person.titleFontSize,
    });
    expect(title).toBeTruthy();
    expect(name).toBeTruthy();
    // Title + name stack is centered against the 40px avatar tile.
    expect(title!.position.y).toBeCloseTo(rows.titleY, 5);
    expect(name!.position.y).toBeCloseTo(rows.nameY, 5);
    expect(title!.position.x).toBeGreaterThan(40);
    expect(name!.position.x).toBe(title!.position.x);
  });

  /** Figma «посади» seat (frame 1264:7906): no card frame, ⏳ marks acting. */
  describe('figma seat (chrome-less)', () => {
    const figmaSeat = {
      ...defaultNodeTheme.person,
      width: 248,
      height: 44,
      background: 0x121212,
      backgroundAlpha: 0,
      borderWidth: 0,
      nameFontSize: 14,
      titleFontSize: 16,
      nameColor: 0xe8490f,
      titleColor: 0xffffff,
      avatarPlaceholderColor: 0x121212,
      temporaryNameColor: 0xe8490f,
      permanentNameColor: 0xe8490f,
      tempMarkerStyle: 'hourglass' as const,
      hidePeriodOnCard: true,
      hideVacantLabel: true,
      personLayout: 'figma-row' as const,
    };

    it('acting seat: hourglass after the name, no «T» pill, no period chip', async () => {
      const view = PersonNodeView.create(
        { id: 'p1', fullName: 'Alex Morgan' },
        {
          id: 'pos1',
          title: 'First deputy',
          organizationId: 'org1',
          groupIds: [],
          status: 'filled',
          isTemporary: true,
          periodStart: '2018-06-27',
          periodEnd: null,
        },
        figmaSeat,
        'near',
      );
      await view.mediaReady;
      const name = view.findText('Alex Morgan');
      const hourglass = view.findText('⏳');
      expect(name).toBeTruthy();
      expect(hourglass).toBeTruthy();
      expect(hourglass!.position.x).toBeGreaterThan(name!.position.x);
      expect(view.hasTempBadge()).toBe(false);
      expect(view.hasPeriodChip()).toBe(false);
    });

    it('vacant seat: title only (no «(вакансія)» line)', async () => {
      const view = PersonNodeView.create(
        undefined,
        {
          id: 'pos2',
          title: 'Chief of staff',
          organizationId: 'org1',
          groupIds: [],
          status: 'vacant',
          isTemporary: false,
        },
        figmaSeat,
        'near',
      );
      await view.mediaReady;
      expect(view.findText('Chief of staff')).toBeTruthy();
      expect(view.findText(VACANT_POSITION_LABEL)).toBeUndefined();
    });
  });

  it('gojs-portrait: centered name + title below avatar band', async () => {
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Alex Morgan' },
      {
        id: 'pos1',
        title: 'Regional Director',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      {
        ...defaultNodeTheme.person,
        width: 136,
        height: 156,
        personLayout: 'gojs-portrait',
      },
      'near',
    );
    await view.mediaReady;
    const title = view.findText('Regional Director');
    const name = view.findText('Alex Morgan');
    expect(title).toBeTruthy();
    expect(name).toBeTruthy();
    expect(name!.position.y).toBe(92);
    expect(title!.position.y).toBe(112);
  });

  it('gojs-row near: hit stack excludes empty layout padding below card', async () => {
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Alex Morgan' },
      {
        id: 'pos1',
        title: 'Regional Director',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      {
        ...defaultNodeTheme.person,
        width: 200,
        height: 98,
        cardRowHeight: 56,
        personLayout: 'gojs-row',
      },
      'near',
    );
    await view.mediaReady;
    const hit = view.hitArea as { contains(x: number, y: number): boolean } | null;
    expect(hit).toBeTruthy();
    expect(hit!.contains(10, 40)).toBe(true);
    expect(hit!.contains(10, 90)).toBe(false);
  });

  it('gojs-portrait explicit wins over landscape aspect', async () => {
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Alex Morgan' },
      {
        id: 'pos1',
        title: 'Regional Director',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      {
        ...defaultNodeTheme.person,
        width: 248,
        height: 72,
        personLayout: 'gojs-portrait',
      },
      'near',
    );
    await view.mediaReady;
    const name = view.findText('Alex Morgan');
    expect(name!.position.y).toBe(92);
  });
});
