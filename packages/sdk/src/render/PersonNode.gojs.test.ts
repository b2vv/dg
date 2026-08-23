import { afterEach, describe, expect, it, vi } from 'vitest';
import { PersonNodeView } from './PersonNode.js';
import type { PersonNodeStyle } from './types.js';

const GOJS_ROW_STYLE: PersonNodeStyle = {
  width: 200,
  height: 56,
  background: 0x1e293b,
  border: 0x475569,
  borderWidth: 1.5,
  borderRadius: 10,
  nameColor: 0xf1f5f9,
  titleColor: 0xcbd5e1,
  nameFontSize: 12,
  titleFontSize: 11,
  badgeColor: 0xf59e0b,
  badgeTextColor: 0xffffff,
  avatarColor: 0x64748b,
  avatarPlaceholderFill: 0x475569,
  brandColor: 0x2563eb,
  keyPositionNameColor: 0x2563eb,
  pendingColor: 0xf59e0b,
  timelineChipFill: 0x334155,
  timelineChipStroke: 0x475569,
  timelineDotColor: 0x4ade80,
  countsBarFill: 0x334155,
  personLayout: 'gojs-row',
};

describe('PersonNodeView GoJS row (brief P1–P8)', () => {
  afterEach(() => {});

  it('success: no ⋮ menu on gojs-row (P1)', async () => {
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Alex Morgan' },
      {
        id: 'pos1',
        title: 'Director',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
      },
      GOJS_ROW_STYLE,
      'near',
      { onContextMenu: () => {} },
    );
    await view.mediaReady;
    expect(view.hasMenuButton()).toBe(false);
  });

  it('success: key position uses brand name, pending hourglass not T badge (P6)', async () => {
    const key = PersonNodeView.create(
      { id: 'p1', fullName: 'Avery Chen' },
      {
        id: 'pos-head',
        title: 'Regional director',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        isKeyPosition: true,
      },
      GOJS_ROW_STYLE,
    );
    await key.mediaReady;
    expect(key.hasTempBadge()).toBe(false);
    expect(key.findText('Avery Chen')?.style.fill).toBe(0x2563eb);

    const pending = PersonNodeView.create(
      { id: 'p2', fullName: 'Jordan Blake' },
      {
        id: 'pos-temp',
        title: 'Deputy',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: true,
        pending: true,
        periodStart: '2018-06-27',
        periodEnd: null,
      },
      GOJS_ROW_STYLE,
    );
    await pending.mediaReady;
    expect(pending.hasTempBadge()).toBe(false);
    expect(pending.hasPendingHourglass()).toBe(true);
    expect(pending.hasTimelineChip()).toBe(true);
  });

  it('success: count bar N [M] under card (P5)', async () => {
    const view = PersonNodeView.create(
      { id: 'p1', fullName: 'Lead' },
      {
        id: 'pos1',
        title: 'Lead',
        organizationId: 'org1',
        groupIds: [],
        status: 'filled',
        isTemporary: false,
        childrenCount: 3,
        allDescendantCount: 5,
      },
      GOJS_ROW_STYLE,
      'near',
      {
        expand: { hasChildren: true, expanded: false, onToggle: vi.fn() },
      },
    );
    await view.mediaReady;
    expect(view.hasCountBar()).toBe(true);
    expect(view.findText('3 [5]')).toBeTruthy();
  });

  it('success: vacant seat shows avatar tile, not empty circle (P3)', async () => {
    const view = PersonNodeView.create(
      undefined,
      {
        id: 'vac',
        title: 'Analyst',
        organizationId: 'org1',
        groupIds: [],
        status: 'vacant',
        isTemporary: false,
      },
      GOJS_ROW_STYLE,
    );
    await view.mediaReady;
    expect(view.hasInitials()).toBe(false);
    expect(view.findText('Analyst')).toBeTruthy();
  });
});
