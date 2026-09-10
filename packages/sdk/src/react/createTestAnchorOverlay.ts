import type { ContextMenuPointer } from '../interaction/contextMenuPayload.js';
import type { NodeRef } from '../interaction/types.js';
import { nodeDomTestId } from '../interaction/nodeTestId.js';
import type { TestAnchorCandidate } from '../interaction/nodeTestId.js';
import { screenRectInView, worldBoxToScreen } from '../render/promoteMath.js';
import type { ViewportTransform } from '../render/Viewport.js';

/** Diagram surface for test anchor overlay (mirrors promote sync). */
export interface TestAnchorOverlayDiagram {
  getViewport(): ViewportTransform;
  listTestAnchors(): readonly TestAnchorCandidate[];
  focusByTestId(testId: string): Promise<boolean>;
  toggleOrgExpand(orgId: string): Promise<boolean>;
  openContextMenu(ref: NodeRef, pointer?: Partial<ContextMenuPointer>): void;
  subscribePromoteSync(listener: () => void): () => void;
}

export interface TestAnchorOverlayOptions {
  diagram: TestAnchorOverlayDiagram;
  mount: HTMLElement;
  /**
   * When true, anchors receive clicks: the node anchor calls `focusByTestId`,
   * the expander anchor `toggleOrgExpand` — deliberately **not** the same branch
   * (e2e mode).
   */
  interactive?: boolean;
}

export interface TestAnchorOverlay {
  sync: () => void;
  dispose: () => void;
}

/** Один невидимий hit-target на екранному прямокутнику. */
function placeAnchor(
  testId: string,
  rect: { left: number; top: number; width: number; height: number },
  interactive: boolean,
): HTMLButtonElement {
  const el = document.createElement('button');
  el.type = 'button';
  el.setAttribute('data-testid', testId);
  el.style.position = 'absolute';
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  // Мінімум 8 px — кнопка chevron на далекому зумі інакше стає неклікабельною
  // смужкою; те саме правило вже діяло для картки.
  el.style.width = `${Math.max(rect.width, 8)}px`;
  el.style.height = `${Math.max(rect.height, 8)}px`;
  el.style.padding = '0';
  el.style.margin = '0';
  el.style.border = '0';
  el.style.background = 'transparent';
  el.style.opacity = '0.001';
  el.style.cursor = interactive ? 'pointer' : 'default';
  el.style.pointerEvents = interactive ? 'auto' : 'none';
  return el;
}

/**
 * Invisible DOM hit-targets synced to Pixi node bounds for Playwright/Cypress.
 * `data-testid="node-<testId>"` on each anchor, plus `node-<testId>-expander`
 * on the chevron of an organization that has one in the current frame (T115).
 */
export function createTestAnchorOverlay(options: TestAnchorOverlayOptions): TestAnchorOverlay {
  const { mount, diagram } = options;
  const interactive = options.interactive ?? false;

  const prevPosition = mount.style.position;
  if (!prevPosition || prevPosition === 'static') {
    mount.style.position = 'relative';
  }

  const layer = document.createElement('div');
  layer.setAttribute('data-org-hierarchy-test-anchors', '');
  layer.style.position = 'absolute';
  layer.style.inset = '0';
  layer.style.pointerEvents = 'none';
  layer.style.zIndex = '6';
  mount.appendChild(layer);

  let disposed = false;

  const sync = (): void => {
    if (disposed) return;
    layer.replaceChildren();
    const viewport = diagram.getViewport();
    const screen = { width: mount.clientWidth || 1, height: mount.clientHeight || 1 };

    for (const anchor of diagram.listTestAnchors()) {
      const rect = worldBoxToScreen(anchor.world, viewport);
      if (!screenRectInView(rect, screen)) continue;

      const el = placeAnchor(nodeDomTestId(anchor.testId), rect, interactive);
      el.setAttribute('data-node-kind', anchor.kind);
      el.setAttribute('data-node-id', anchor.ref.id);
      el.setAttribute('aria-label', `${anchor.kind} ${anchor.testId}`);
      el.title = anchor.testId;

      if (interactive) {
        el.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          void diagram.focusByTestId(anchor.testId);
        });
        el.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          diagram.openContextMenu(anchor.ref, { clientX: e.clientX, clientY: e.clientY });
        });
      }

      layer.appendChild(el);

      if (!anchor.expander) continue;
      const expanderRect = worldBoxToScreen(anchor.expander, viewport);
      if (!screenRectInView(expanderRect, screen)) continue;

      const chevron = placeAnchor(
        `${nodeDomTestId(anchor.testId)}-expander`,
        expanderRect,
        interactive,
      );
      // Без `data-node-id`/`data-node-kind` — свідомо. Вони вже є на якорі
      // вузла, і другий носій зробив би `[data-node-id="org-1"]` двозначним, а
      // Playwright у strict-режимі на двох збігах кидає. Вузол цей якір
      // називає сам, через `data-testid`.
      chevron.setAttribute('aria-label', `toggle expand ${anchor.testId}`);
      chevron.title = `${anchor.testId} expander`;

      if (interactive) {
        chevron.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // 🔴 **Окрема гілка, не `focusByTestId`.** Той виділяє вузол, а клік
          // по chevron виділяти не має права: інакше e2e не відрізнить
          // «розгорнув» від «клікнув картку», а рівно ця різниця й потрібна.
          //
          // `.catch` — за прецедентом `reparentPosition`
          // (`OrgHierarchyDiagram.ts:775-786`): `toggleOrgExpand` успадкував
          // нетранзакційний шлях `expandOrg` і **кидає** на відмові рендера, а
          // клік нічого не чекає. Без цього — необроблений reject у сторінці
          // хоста.
          diagram.toggleOrgExpand(anchor.ref.id).catch((err: unknown) => {
            console.warn('[org-hierarchy] expander anchor toggle failed', err);
          });
        });
        // ⚠️ Дзеркалить слухач якоря вузла — і **не** з міркувань симетрії.
        // Chevron лежить зверху з `pointer-events: auto`, тож без цього рядка
        // він відбирає в картки ту частину екрана: меню діаграми не
        // відкривається, `preventDefault` ніхто не кличе, і користувач дістає
        // **браузерне** меню поверх канви. К5 вніс це мовчки — усі наші проби
        // клікають у центр картки.
        chevron.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          diagram.openContextMenu(anchor.ref, { clientX: e.clientX, clientY: e.clientY });
        });
      }

      // Після якоря вузла **свідомо**: обидва абсолютні й без `z-index`, тож
      // виграє пізніший брат. Зворотний порядок віддав би клік по chevron
      // картці, яка його накриває.
      layer.appendChild(chevron);
    }
  };

  const unsubscribe = diagram.subscribePromoteSync(sync);
  sync();

  return {
    sync,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      layer.remove();
      if (!prevPosition || prevPosition === 'static') {
        mount.style.position = prevPosition;
      }
    },
  };
}
