import { Application } from 'pixi.js';
import { OrganizationNodeView, PersonNodeView } from '@org-hierarchy/sdk';
import {
  isolatedPayloadFor,
  NODE_COMPARE_SPECIMENS,
  type NodeCompareSpecimen,
} from './specimens.js';

const PAD = 16;

async function renderSpecimen(spec: NodeCompareSpecimen, host: HTMLElement): Promise<void> {
  const payload = isolatedPayloadFor(spec.id);
  const app = new Application();
  await app.init({
    width: spec.width + PAD * 2,
    height: spec.height + PAD * 2,
    background: spec.stageBackground,
    antialias: true,
    resolution: 2,
    autoDensity: true,
  });

  app.canvas.style.display = 'block';
  host.appendChild(app.canvas);

  let view;
  if (payload.kind === 'organization') {
    view = OrganizationNodeView.create(
      payload.org,
      payload.group,
      payload.theme,
      payload.style,
      'near',
      { onContextMenu: () => {} },
    );
  } else {
    view = PersonNodeView.create(payload.person, payload.position, payload.style, 'near');
  }

  view.position.set(PAD, PAD);
  app.stage.addChild(view);
  await view.mediaReady;
  app.render();
}

export async function mountNodeComparePage(): Promise<void> {
  document.documentElement.setAttribute('data-theme', 'light');
  const toolbar = document.querySelector('.toolbar');
  const sidebars = document.querySelectorAll('.sidebar');
  const hint = document.querySelector('.viewport-hint');
  toolbar?.remove();
  for (const sb of sidebars) sb.remove();
  hint?.remove();

  const status = document.getElementById('status');
  if (status) status.textContent = 'Node compare — isolated specimens';

  const mount = document.getElementById('diagram-mount');
  if (!mount) throw new Error('#diagram-mount missing');

  mount.classList.add('node-compare-mount');
  mount.replaceChildren();

  const intro = document.createElement('p');
  intro.className = 'node-compare-intro';
  intro.textContent =
    'Isolated SDK renders at 1:1 card size. Playwright pairs each with a diagram crop for side-by-side / overlay.';
  mount.appendChild(intro);

  const grid = document.createElement('div');
  grid.className = 'node-compare-grid';
  mount.appendChild(grid);

  for (const spec of NODE_COMPARE_SPECIMENS) {
    const card = document.createElement('section');
    card.className = 'node-compare-card';
    card.dataset.specimenId = spec.id;

    const title = document.createElement('h2');
    title.textContent = spec.label;
    card.appendChild(title);

    const meta = document.createElement('p');
    meta.className = 'node-compare-meta';
    meta.textContent = `${spec.width}×${spec.height} · ${spec.theme} · testId specimen-${spec.id}`;
    card.appendChild(meta);

    const canvasHost = document.createElement('div');
    canvasHost.className = 'node-compare-canvas-host';
    canvasHost.dataset.testid = `specimen-${spec.id}`;
    card.appendChild(canvasHost);

    grid.appendChild(card);
    await renderSpecimen(spec, canvasHost);
  }

  mount.dataset.testid = 'node-compare-ready';
}
