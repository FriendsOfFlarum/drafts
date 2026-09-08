import app from 'flarum/forum/app';
import type Draft from '../models/Draft';
import { adjustDraftCount } from '../utils/draftCount';

export default class DraftsListState {
  loading: boolean = false;
  loadingMore: boolean = false;
  hasNextPage: boolean = false;
  nextOffset: number = 0;
  cache: any[] = [];

  deleteDraft(draft: Draft) {
    if (!window.confirm(app.translator.trans('fof-drafts.forum.dropdown.alert') as string)) return;

    this.loading = true;

    draft.delete().then(() => {
      adjustDraftCount(-1);

      if (app.composer.body && app.composer.draft && app.composer.draft.id() === draft.id() && !app.composer.changed?.()) {
        app.composer.hide();
      }

      this.loading = false;
      m.redraw();
    });
  }

  scheduleDraft(draft: Draft) {
    if (!app.forum.attribute('canScheduleDrafts') || !app.forum.attribute('drafts.enableScheduledDrafts')) return;

    // Lazy load ScheduleDraftModal
    import('../components/ScheduleDraftModal').then((module) => {
      app.modal.show(module.default as any, { draft });
    });
  }

  showComposer(draft: Draft): Promise<any> | undefined {
    if (this.loading) return;

    return new Promise(async (resolve) => {
      let componentClass: any;

      switch (draft.type()) {
        case 'privateDiscussion':
          // Use lazy loading for byobu extension
          try {
            const byobuModule = await import('ext:fof/byobu/forum/pages/discussions/PrivateDiscussionComposer');
            componentClass = byobuModule.default;
          } catch (e) {
            console.error('Failed to load byobu composer:', e);
            return;
          }
          break;
        case 'reply':
          // Lazy load ReplyComposer
          const replyModule = await import('flarum/forum/components/ReplyComposer');
          componentClass = replyModule.default;
          break;
        default:
          // Lazy load DiscussionComposer
          const discussionModule = await import('flarum/forum/components/DiscussionComposer');
          componentClass = discussionModule.default;
      }

      const data = draft.compileData();

      // Load composer asynchronously
      await app.composer.load(componentClass, data);

      app.composer.show();

      Object.assign(app.composer.fields, data.fields);

      return resolve(app.composer);
    });
  }

  load() {
    if (app.cache.draftsLoaded || this.loading) {
      return;
    }

    this.loading = true;
    m.redraw();

    app.store
      .find<Draft[]>('drafts')
      .then(
        (drafts) => {
          app.cache.draftsLoaded = true;

          // The badge count is derived from the server-side draftCount
          // attribute, which reflects the total number of drafts, so we
          // must not overwrite it with the number of drafts loaded here.
          const meta = drafts.payload?.meta?.page;
          this.nextOffset = (meta?.offset ?? 0) + (meta?.limit ?? drafts.length);
          this.hasNextPage = Boolean(drafts.payload?.links?.next);
        },
        () => {}
      )
      .then(() => {
        this.loading = false;
        m.redraw();
      });
  }

  loadMore() {
    if (!app.cache.draftsLoaded || !this.hasNextPage || this.loadingMore) {
      return;
    }

    this.loadingMore = true;
    m.redraw();

    app.store
      .find<Draft[]>('drafts', { page: { offset: this.nextOffset, limit: 20 } })
      .then(
        (drafts) => {
          const meta = drafts.payload?.meta?.page;
          this.nextOffset = meta?.offset != null ? meta.offset + (meta.limit ?? drafts.length) : this.nextOffset + drafts.length;
          this.hasNextPage = Boolean(drafts.payload?.links?.next);
        },
        () => {}
      )
      .then(() => {
        this.loadingMore = false;
        m.redraw();
      });
  }
}
