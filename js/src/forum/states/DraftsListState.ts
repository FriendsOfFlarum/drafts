import app from 'flarum/forum/app';
import type Draft from '../models/Draft';

export default class DraftsListState {
  loading: boolean = false;
  cache: any[] = [];

  deleteDraft(draft: Draft) {
    if (!window.confirm(app.translator.trans('fof-drafts.forum.dropdown.alert') as string)) return;

    this.loading = true;

    draft.delete().then(() => {
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
    if (app.cache.draftsLoaded) {
      return;
    }

    this.loading = true;
    m.redraw();

    app.store
      .find<Draft[]>('drafts')
      .then(
        () => (app.cache.draftsLoaded = true),
        () => {}
      )
      .then(() => {
        this.loading = false;
        m.redraw();
      });
  }
}
