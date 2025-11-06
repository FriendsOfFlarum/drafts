import app from 'flarum/forum/app';
import ScheduleDraftModal from '../components/ScheduleDraftModal';

export default class DraftsListState {
  constructor() {
    /**
     * Whether or not the flags are loading.
     *
     * @type {Boolean}
     */
    this.loading = false;

    this.cache = [];
  }

  deleteDraft(draft) {
    if (!window.confirm(app.translator.trans('fof-drafts.forum.dropdown.alert'))) return;

    this.loading = true;

    draft.delete().then(() => {
      if (app.composer.body && app.composer.draft && app.composer.draft.id() === draft.id() && !app.composer.changed()) {
        app.composer.hide();
      }

      this.loading = false;
      m.redraw();
    });
  }

  scheduleDraft(draft) {
    if (!app.forum.attribute('canScheduleDrafts') || !app.forum.attribute('drafts.enableScheduledDrafts')) return;

    app.modal.show(ScheduleDraftModal, { draft });
  }

  showComposer(draft) {
    if (this.loading) return;

    return new Promise(async (resolve) => {
      let componentClass;

      switch (draft.type()) {
        case 'privateDiscussion':
          // Use lazy loading for byobu extension
          try {
            const byobuModule = await import('ext:fof/byobu/discussions');
            componentClass = byobuModule.PrivateDiscussionComposer;
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
      .find('drafts')
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
