import app from 'flarum/forum/app';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';
import ReplyComposer from 'flarum/forum/components/ReplyComposer';
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

    return new Promise((resolve) => {
      let componentClass;

      switch (draft.type()) {
        case 'privateDiscussion':
          componentClass = require('@fof-byobu').discussions['PrivateDiscussionComposer'];
          break;
        case 'reply':
          componentClass = ReplyComposer;
          break;
        default:
          componentClass = DiscussionComposer;
      }

      const data = draft.compileData();
      app.composer.load(componentClass, data);

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
