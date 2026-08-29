import { Graphics, Text } from 'pixi.js';
import { describe, expect, it, rstest } from '@rstest/core';
import {
  layoutCompactContent,
  layoutFigmaRowContent,
  layoutGojsRowContent,
  layoutPeriodChip,
  truncatePixiText,
  type PersonCardParts,
} from './personCardContent.js';
import { resolveGojsRowLayoutMetrics } from './personLayout.js';
import { defaultNodeTheme, type PersonNodeStyle } from './types.js';

function parts(): PersonCardParts {
  const text = () => new Text({ text: '', style: { fontSize: 12 } });
  return {
    nameText: text(),
    titleText: text(),
    initialsText: text(),
    periodChip: new Graphics(),
    periodChipLabel: text(),
    timelineDot: new Graphics(),
    pendingMarker: new Graphics(),
    pendingLabel: text(),
    countBar: new Graphics(),
    countBarLabel: text(),
    countExpander: new Graphics(),
  };
}

const style = (over: Partial<PersonNodeStyle> = {}): PersonNodeStyle => ({
  ...defaultNodeTheme.person,
  ...over,
});

const position = { id: 'p1', organizationId: 'o1', title: 'Lead engineer', groupIds: [], status: 'filled' as const, isTemporary: false };
const person = { id: 'per1', fullName: 'Ada Byron' };

describe('personCardContent', () => {
  it('success: the Figma row stacks title over name against the avatar tile', () => {
    const p = parts();
    p.nameText.text = person.fullName;
    layoutFigmaRowContent(p, {
      person,
      position,
      style: style({ personLayout: 'figma-row', width: 248, height: 44 }),
      vacant: false,
    });
    expect(p.titleText.text).toBe('Lead engineer');
    expect(p.titleText.position.y).toBeLessThan(p.nameText.position.y);
    expect(p.titleText.position.x).toBe(p.nameText.position.x);
    expect(p.initialsText.text).toBe('AB');
  });

  it('success: a vacant seat shows no initials', () => {
    const p = parts();
    layoutFigmaRowContent(p, {
      person: undefined,
      position,
      style: style({ personLayout: 'figma-row' }),
      vacant: true,
    });
    expect(p.initialsText.visible).toBe(false);
  });

  it('success: the GoJS count bar only reacts when the seat has children', () => {
    const s = style({ personLayout: 'gojs-row', width: 220, height: 120 });
    const gojs = { ...resolveGojsRowLayoutMetrics(position, s), countsLabel: '3 / 12' };
    const onToggle = rstest.fn();

    const withKids = parts();
    layoutGojsRowContent(withKids, {
      person,
      position,
      style: s,
      vacant: false,
      gojs,
      expand: { expanded: false, hasChildren: true, onToggle },
    });
    expect(withKids.countBar.visible).toBe(true);
    expect(withKids.countExpander.eventMode).toBe('static');

    const noKids = parts();
    layoutGojsRowContent(noKids, { person, position, style: s, vacant: false, gojs });
    expect(noKids.countBar.visible).toBe(true);
    expect(noKids.countExpander.eventMode).not.toBe('static');
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('failure: without a period there is no chip, and the GoJS row never gets one', () => {
    const p = parts();
    layoutPeriodChip(p, {
      position,
      style: style(),
      lod: 'near',
      pad: 8,
      layout: 'figma-row',
    });
    expect(p.periodChip.visible).toBe(false);

    const dated = parts();
    layoutPeriodChip(dated, {
      position: { ...position, periodStart: '2024-01-01' },
      style: style(),
      lod: 'near',
      pad: 8,
      layout: 'gojs-row',
    });
    // gojs-row bails before drawing: its period is the timeline chip instead.
    expect(dated.periodChipLabel.text).toContain('01.01.2024');
    expect(dated.periodChipLabel.position.x).toBe(0);
  });

  it('success: mid LOD drops the title, near LOD keeps it', () => {
    const mid = parts();
    layoutCompactContent(mid, { person, position, style: style(), vacant: false, lod: 'mid', pad: 8 });
    expect(mid.titleText.visible).toBe(false);

    const near = parts();
    layoutCompactContent(near, { person, position, style: style(), vacant: false, lod: 'near', pad: 8 });
    expect(near.titleText.visible).toBe(true);
  });

  it('failure: truncation is a no-op for empty text and short labels', () => {
    const label = new Text({ text: '', style: { fontSize: 12 } });
    truncatePixiText(label, 10);
    expect(label.text).toBe('');
    label.text = 'ok';
    truncatePixiText(label, 200);
    expect(label.text).toBe('ok');
    label.text = 'a very long label that will not fit';
    truncatePixiText(label, 40);
    expect(label.text.endsWith('…')).toBe(true);
  });
});
