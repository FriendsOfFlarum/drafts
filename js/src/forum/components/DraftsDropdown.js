/*
 *
 *  This file is part of fof/drafts.
 *
 *  Copyright (c) 2019 FriendsOfFlarum.
 *
 *  For the full copyright and license information, please view the LICENSE.md
 *  file that was distributed with this source code.
 *
 */

import app from 'flarum/forum/app';
import NotificationsDropdown from 'flarum/common/components/NotificationsDropdown';

import DraftsList from './DraftsList';

export default class DraftsDropdown extends NotificationsDropdown {
  static initAttrs(attrs) {
    attrs.label = attrs.label || app.translator.trans('fof-drafts.forum.dropdown.tooltip');
    attrs.icon = attrs.icon || 'fas fa-edit';

    super.initAttrs(attrs);
  }

  getMenu() {
    return (
      <div className={'Dropdown-menu ' + this.attrs.menuClassName} onclick={this.menuClick.bind(this)}>
        {this.showing ? DraftsList.component({ state: this.attrs.state }) : ''}
      </div>
    );
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
    return this.getUnreadCount();
  }
}
