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

import Page from 'flarum/components/Page';

import DraftsList from './DraftsList';

export default class DraftsPage extends Page {
    init() {
        super.init();

        app.history.push('drafts');

        this.list = new DraftsList();
        this.list.load();

        this.bodyClass = 'App--drafts';
    }

    view() {
        return <div className="DraftsPage">{this.list.render()}</div>;
    }
}
