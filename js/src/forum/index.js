/*
 *
 *  This file is part of fof/drafts.
 *
 *  Copyright (c) 2019 FriendsOfFlarum..
 *
 *  For the full copyright and license information, please view the license.md
 *  file that was distributed with this source code.
 *
 */

import {extend} from 'flarum/extend';
import User from 'flarum/models/User';
import Model from 'flarum/Model';
import Draft from './models/Draft';
import DraftsPage from './components/DraftsPage';
import addDraftsDropdown from './addDraftsDropdown';
import DiscussionComposer from 'flarum/components/DiscussionComposer';
import Button from 'flarum/components/Button';
import Alert from 'flarum/components/Alert';

app.initializers.add('fof-drafts', () => {
    app.store.models.drafts = Draft;
    User.prototype.drafts = Model.hasMany('drafts');

    app.routes.drafts = {path: '/drafts', component: <DraftsPage/>};

    extend(DiscussionComposer.prototype, 'headerItems', function (items) {
        if (!app.forum.attribute('canSaveDrafts')) return;
        items.add('save-draft',
            Button.component({
                icon: 'fas fa-save',
                className: 'Button Button--icon Button--link',
                style: 'margin: 0 10px 2px -10px;',
                title: app.translator.trans('fof-drafts.forum.composer.title'),
                onclick: () => {
                    if (this.draft) {
                        delete this.draft.data.attributes.relationships;
                        this.draft.save(this.data()).then(
                            (draft) => {
                                if (!app.cache.drafts) app.cache.drafts = [];
                                app.cache.drafts.some((cacheDraft, i) => {
                                    if (cacheDraft.id() === draft.id()) {
                                        var now = new Date();
                                        draft.data.attributes.updatedAt = now.toString();
                                        app.cache.drafts[i] = draft;
                                    }
                                });
                            }
                        );
                    } else {
                        app.store.createRecord('drafts').save(this.data()).then(
                            (draft) => {
                                if (!app.cache.drafts) {
                                    app.session.user.data.relationships.drafts.data.push(draft);
                                } else {
                                    app.cache.drafts.push(draft);
                                }
                                m.redraw();
                            }
                        );
                    }
                    app.alerts.show(this.successAlert = new Alert({type: 'success', children: app.translator.trans('fof-drafts.forum.composer.alert')}));
                    app.composer.hide();
                }
            })
            , 20);

    });

    extend(DiscussionComposer.prototype, 'init', function () {
        Object.keys(this.props).forEach(key => {
            if (!['originalContent', 'title', 'user'].includes(key)) {
                this[key] = this.props[key];
            } else if (key === 'title') {
                this.title = m.prop(this.props.title)
            }
        });
    });

    extend(DiscussionComposer.prototype, 'onsubmit', function () {
        if (this.draft) {
            this.draft.delete();

            app.cache.drafts.some((cacheDraft, i) => {
                if (cacheDraft.id() === this.draft.id()) {
                    app.cache.drafts.splice(i, 1);
                }
            });
        }
    });

    addDraftsDropdown();
});
