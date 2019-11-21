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

import Component from 'flarum/Component';
import LoadingIndicator from 'flarum/components/LoadingIndicator';
import DiscussionComposer from 'flarum/components/DiscussionComposer';
import avatar from 'flarum/helpers/avatar';
import icon from 'flarum/helpers/icon';
import humanTime from 'flarum/helpers/humanTime';
import { truncate } from 'flarum/utils/string';
import Button from 'flarum/components/Button';

export default class DraftsList extends Component {
    init() {
        this.loading = false;
    }

    config(isIntialized) {
        if (!isIntialized) return;

        $('.draft--delete').on('click tap', function(event) {
            event.stopPropagation();
        });
    }

    view() {
        const drafts = app.cache.drafts || [];

        return (
            <div className="NotificationList DraftsList">
                <div className="NotificationList-header">
                    <h4 className="App-titleControl App-titleControl--text">{app.translator.trans('fof-drafts.forum.dropdown.title')}</h4>
                </div>
                <div className="NotificationList-content">
                    <ul className="NotificationGroup-content">
                        {drafts.length ? (
                            drafts
                                .sort((a, b) => b.updatedAt() - a.updatedAt())
                                .map(draft => {
                                    return (
                                        <li>
                                            <a onclick={this.showComposer.bind(this, draft)} className="Notification draft--item">
                                                {avatar(draft.user())}
                                                {icon('fas fa-edit', { className: 'Notification-icon' })}
                                                <span className="Notification-content">{draft.title()}</span>
                                                {humanTime(draft.updatedAt())}
                                                {Button.component({
                                                    icon: 'fas fa-times',
                                                    style: 'float: right; z-index: 20;',
                                                    className: 'Button Button--icon Button--link draft--delete',
                                                    title: app.translator.trans('fof-drafts.forum.dropdown.button'),
                                                    onclick: this.deleteDraft.bind(this, draft),
                                                })}
                                                <div className="Notification-excerpt">{truncate(draft.content(), 200)}</div>
                                            </a>
                                        </li>
                                    );
                                })
                        ) : !this.loading ? (
                            <div className="NotificationList-empty">{app.translator.trans('fof-drafts.forum.dropdown.empty_text')}</div>
                        ) : (
                            LoadingIndicator.component({ className: 'LoadingIndicator--block' })
                        )}
                    </ul>
                </div>
            </div>
        );
    }

    deleteDraft(draft) {
        this.loading = true;

        if (!window.confirm(app.translator.trans('fof-drafts.forum.dropdown.alert'))) return;

        draft.delete();
        app.cache.drafts.some((cacheDraft, i) => {
            if (cacheDraft.id() === draft.id()) {
                app.cache.drafts.splice(i, 1);
            }
        });
        app.composer.hide();

        this.loading = false;
    }

    showComposer(draft) {
        if (this.loading) return;

        const deferred = m.deferred();

        const data = {
            originalContent: draft.content(),
            title: draft.title(),
            user: app.session.user,
            confirmExit: app.translator.trans('fof-drafts.forum.composer.exit_alert'),
            draft,
        };

        const relationships = draft.relationships();

        if (relationships) {
            Object.keys(relationships).forEach(relationshipName => {
                const relationship = relationships[relationshipName];
                const relationshipData = relationship.data.map( (model, i) => app.store.getById(model.type, model.id) );

                data[relationshipName] = relationshipData;
            });
        }

        const component = new DiscussionComposer(data);

        app.composer.load(component);
        app.composer.show();

        deferred.resolve(component);

        return deferred.promise;
    }

    load() {
        if (app.cache.drafts) {
            return;
        }

        this.loading = true;
        m.redraw();

        app.store
            .find('drafts')
            .then(response => {
                delete response.payload;
                app.cache.drafts = response;
            })
            .catch(() => {})
            .then(() => {
                this.loading = false;
                m.redraw();
            });
    }
}
