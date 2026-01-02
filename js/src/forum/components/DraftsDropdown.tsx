import app from 'flarum/forum/app';
import HeaderDropdown from 'flarum/forum/components/HeaderDropdown';
import classList from 'flarum/common/utils/classList';
import type DraftsListState from '../states/DraftsListState';
import DraftsList from './DraftsList';

export default class DraftsDropdown extends HeaderDropdown {
  static initAttrs(attrs: any) {
    attrs.className = classList('DraftsDropdown', attrs.className);
    attrs.label = attrs.label || app.translator.trans('fof-drafts.forum.dropdown.tooltip');
    attrs.icon = attrs.icon || 'fas fa-edit';

    super.initAttrs(attrs);
  }

  getContent() {
    return <DraftsList state={this.attrs.state as DraftsListState} />;
  }

  goToRoute() {
    m.route.set(app.route('drafts'));
  }

  getUnreadCount(): number {
    if (app.cache.draftsLoaded) {
      return app.store.all('drafts').length;
    }

    return app.store.all('drafts').length + (app.session.user?.draftCount() || 0);
  }

  getNewCount(): number {
    // We return 0 here so that the drafts dropdown doesn't always show a new count (usually highlighted in the forum primary color).
    return 0;
  }
}
