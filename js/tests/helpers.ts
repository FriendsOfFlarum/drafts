// @ts-expect-error -- @flarum/jest-config ships its bootstrap helpers untyped
import bootstrapForum from '@flarum/jest-config/src/bootstrap/forum';
import app from 'flarum/forum/app';
import { jest } from '@jest/globals';
import extend from '../src/forum/extend';

export function bootForum(): void {
  bootstrapForum();
  app.bootExtensions({ 'fof-drafts': { extend } });
  app.boot();
}

export function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * jsdom has no IntersectionObserver. Like the browser's, this one reports each target
 * once when it is observed, and after that only when its visibility changes.
 * `setInView()` stands in for the user scrolling the observed elements in or out of view.
 */
export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  static inView = false;

  // Last visibility reported for each target; undefined until the initial report.
  private observed = new Map<Element, boolean | undefined>();

  constructor(private callback: IntersectionObserverCallback) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.set(el, undefined);
    setTimeout(() => this.notify(), 0);
  }

  unobserve(el: Element) {
    this.observed.delete(el);
  }

  disconnect() {
    this.observed.clear();
  }

  private notify() {
    const isIntersecting = FakeIntersectionObserver.inView;
    const entries = [...this.observed]
      .filter(([, last]) => last !== isIntersecting)
      .map(([target]) => ({ target, isIntersecting }) as unknown as IntersectionObserverEntry);

    entries.forEach((entry) => this.observed.set(entry.target, isIntersecting));

    if (entries.length) this.callback(entries, this as unknown as IntersectionObserver);
  }

  static install() {
    FakeIntersectionObserver.instances = [];
    FakeIntersectionObserver.inView = false;
    (window as any).IntersectionObserver = FakeIntersectionObserver;
  }

  static setInView(inView: boolean) {
    FakeIntersectionObserver.inView = inView;
    FakeIntersectionObserver.instances.forEach((observer) => observer.notify());
  }
}

/**
 * Let pending requests and observer callbacks run, redrawing after each round as
 * m.redraw() would in the browser (mithril-query only redraws when asked).
 */
export async function settle(out: { redraw(): void }): Promise<void> {
  for (let i = 0; i < 10; i++) {
    await flushPromises();
    out.redraw();
  }
}

/**
 * Serve `total` drafts from GET /api/drafts the way the API does: newest first,
 * 20 per page, with `links.next` while more remain. Draft 1 is the newest.
 */
export function fakeDraftsApi(total: number) {
  return jest.spyOn(app, 'request').mockImplementation(((options: any) => {
    const offset = Number(options.params?.page?.offset ?? 0);
    const limit = 20;
    const data = [];

    for (let n = offset + 1; n <= Math.min(offset + limit, total); n++) {
      data.push({
        type: 'drafts',
        id: String(n),
        attributes: {
          title: `Draft ${n}`,
          content: `Content ${n}`,
          relationships: {},
          extra: {},
          updatedAt: new Date(Date.UTC(2026, 0, 1) - n * 60_000).toISOString(),
        },
      });
    }

    return Promise.resolve({
      data,
      meta: { page: { offset, limit, total } },
      links: offset + limit < total ? { next: `/api/drafts?page[offset]=${offset + limit}` } : {},
    });
  }) as any);
}
