/*
 *
 *  This file is part of fof/username-request.
 *
 *  Copyright (c) 2019 FriendsOfFlarum..
 *
 *  For the full copyright and license information, please view the license.md
 *  file that was distributed with this source code.
 *
 */

import Component from 'flarum/Component';
import LoadingIndicator from 'flarum/components/LoadingIndicator';
import DiscussionComposer from 'flarum/components/DiscussionComposer';
import avatar from 'flarum/helpers/avatar';
import icon from 'flarum/helpers/icon';
import humanTime from 'flarum/helpers/humanTime';
import ItemList from "flarum/utils/ItemList";
import {truncate} from 'flarum/utils/string';

export default class FlagList extends Component {
    init() {

        this.loading = false;
    }

    view() {
        const drafts = app.cache.drafts || [];

        return (
            <div className="NotificationList RequestsList">
                <div className="NotificationList-header">
                    <h4 className="App-titleControl App-titleControl--text">{app.translator.trans('fof-drafts.forum.dropdown.title')}</h4>
                </div>
                <div className="NotificationList-content">
                    <ul className="NotificationGroup-content">
                        {drafts.length
                            ? drafts.map(draft => {

                                return (
                                    <li>
                                        <a onclick={this.showComposer.bind(this, draft)} className="Notification Request">
                                            {avatar(draft.user())}
                                            {icon('fas fa-edit', {className: 'Notification-icon'})}
                                            <span className="Notification-content">
                                                {draft.title()}
                                            </span>
                                            {humanTime(draft.updatedAt())}
                                            <div className="Notification-excerpt">
                                                {truncate(draft.content(), 200)}
                                            </div>
                                        </a>
                                    </li>
                                );
                            })
                            : !this.loading
                                ?
                                <div className="NotificationList-empty">{app.translator.trans('fof-drafts.forum.dropdown.empty_text')}</div>
                                : LoadingIndicator.component({className: 'LoadingIndicator--block'})}
                    </ul>
                </div>
            </div>
        );
    }

    showComposer(draft) {
        var data = {
            originalContent: draft.content(),
            title : draft.title(),
            user: app.session.user,
            draft
        }

        console.log(draft)

        Object.keys(draft.relationships()).forEach(relationship => {
            draft.relationships()[relationship].data.map((model, i) => {
                draft.relationships()[relationship].data[i] = app.store.getById(model.type, model.id)
            });
            data[relationship] = draft.relationships()[relationship].data
        });

        var component = new DiscussionComposer(data);

        app.composer.load(component);
        app.composer.show();
    }

    load() {
        if (app.cache.drafts) {
            return;
        }

        this.loading = true;
        m.redraw();

        app.store.find('drafts')
            .then(response => {
                delete response.payload;
                app.cache.drafts = response.sort((a, b) => b.updatedAt() - a.updatedAt());
            })
            .catch(() => {
            })
            .then(() => {
                this.loading = false;
                m.redraw();
            });
    }
}