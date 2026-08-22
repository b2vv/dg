import { createElement, type ComponentType, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { ContextMenuRequest } from '../interaction/contextMenuPayload.js';
import type { MenuItem } from '../interaction/types.js';

export interface ReactContextMenuRenderProps {
  request: ContextMenuRequest;
  onClose: () => void;
  onAction: (item: MenuItem) => void;
}

export interface ReactContextMenuHostOptions {
  /** React component that receives node payload + pointer position. */
  component: ComponentType<ReactContextMenuRenderProps>;
  /** Mount point; defaults to a fixed overlay on document.body */
  container?: HTMLElement;
  /** Called when user picks an item (before close). */
  onAction?: (item: MenuItem, request: ContextMenuRequest) => void;
}

export interface ReactContextMenuHost {
  /** Pass to `callbacks.onContextMenu` */
  handleContextMenu: (request: ContextMenuRequest) => void;
  close: () => void;
  dispose: () => void;
  isOpen: () => boolean;
}

/**
 * Mounts a host React context-menu component at the pointer with full node data.
 * SDK core stays React-free; this entry is optional (`@org-hierarchy/sdk/react`).
 */
export function createReactContextMenuHost(
  options: ReactContextMenuHostOptions,
): ReactContextMenuHost {
  const mount =
    options.container ??
    (() => {
      const el = document.createElement('div');
      el.setAttribute('data-org-hierarchy-context-menu', '');
      el.style.position = 'fixed';
      el.style.inset = '0';
      el.style.pointerEvents = 'none';
      el.style.zIndex = '10000';
      document.body.appendChild(el);
      return el;
    })();

  let root: Root | null = createRoot(mount);
  let open = false;
  let ownedContainer = !options.container;

  const close = (): void => {
    open = false;
    mount.style.pointerEvents = 'none';
    root?.render(null);
  };

  const handleContextMenu = (request: ContextMenuRequest): void => {
    open = true;
    mount.style.pointerEvents = 'auto';
    const element: ReactElement = createElement(options.component, {
      request,
      onClose: close,
      onAction: (item: MenuItem) => {
        options.onAction?.(item, request);
        close();
      },
    });
    root?.render(element);
  };

  const dispose = (): void => {
    close();
    root?.unmount();
    root = null;
    if (ownedContainer && mount.parentNode) {
      mount.parentNode.removeChild(mount);
    }
  };

  return {
    handleContextMenu,
    close,
    dispose,
    isOpen: () => open,
  };
}
