import app from 'flarum/forum/app';
import HeaderDropdown from 'flarum/forum/components/HeaderDropdown';
import classList from 'flarum/common/utils/classList';

import DraftsList from './DraftsList';

export default class DraftsDropdown extends HeaderDropdown {
  static initAttrs(attrs) {
    attrs.className = classList('DraftsDropdown', attrs.className);
    attrs.label = attrs.label || app.translator.trans('fof-drafts.forum.dropdown.tooltip');
    attrs.icon = attrs.icon || 'fas fa-edit';

    super.initAttrs(attrs);
  }

  getContent() {
    return DraftsList.component({ state: this.attrs.state });
  }

  goToRoute() {
    m.route.set(app.route('drafts'));
  }

  getUnreadCount() {
    if (app.cache.draftsLoaded) {
      return app.store.all('drafts').length;
    }

    return app.store.all('drafts').length + app.session.user.draftCount();
  }

  getNewCount() {
    // We return 0 here so that the drafts dropdown doesn't always show a new count (usually highlighted in the forum primary color).
    return 0;
  }
}
