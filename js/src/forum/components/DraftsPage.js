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
import Page from 'flarum/common/components/Page';

import DraftsList from './DraftsList';

export default class DraftsPage extends Page {
  oninit(vnode) {
    super.oninit(vnode);

    app.history.push('drafts');

    app.drafts.load();

    this.bodyClass = 'App--drafts';
  }

  view() {
    return (
      <div className="DraftsPage">
        <DraftsList state={app.drafts}></DraftsList>
      </div>
    );
  }
}
