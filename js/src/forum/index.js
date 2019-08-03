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

import { extend } from 'flarum/extend';
import User from 'flarum/models/User';
import Model from 'flarum/Model';
import Draft from './models/Draft';
import DraftsPage from './components/DraftsPage';
import addDraftsDropdown from './addDraftsDropdown';
import DiscussionComposer from 'flarum/components/DiscussionComposer';
import Button from 'flarum/components/Button';

app.initializers.add('fof-drafts', () => {
    app.store.models.drafts = Draft;
    User.prototype.drafts = Model.hasMany('drafts');

    app.routes.drafts = {path: '/drafts', component: <DraftsPage/>};

    extend(DiscussionComposer.prototype, 'headerItems', function(items) {
        if (!app.forum.attribute('canSaveDrafts')) return;
        console.log(this.props)
        items.add('save-draft',
            Button.component({
                icon: 'fas fa-save',
                className: 'Button Button--icon Button--link',
                style: 'margin: 0 10px 2px -10px;',
                title: app.translator.trans('fof-drafts.forum.composer.title'),
                onclick: () => {
                    if (this.draft) {
                        this.draft.save(this.data()).then(
                            (draft) => {
                                if (!app.cache.drafts) app.cache.drafts = [];
                                app.cache.drafts.some((cacheDraft, i) => {
                                    if (cacheDraft.id() === draft.id()) {
                                        app.cache.drafts[i] = draft;
                                    }
                                });
                                app.composer.hide();
                            }
                        );
                    }
                    console.log(this.data())
                    app.store.createRecord('drafts').save(this.data()).then(
                        (draft) => {
                            if (!app.cache.drafts) app.cache.drafts = [];
                            app.cache.drafts.push(draft);
                            app.composer.hide();
                        }
                    );

                }
            })
        , 20);

    });

    extend(DiscussionComposer.prototype, 'init', function() {
        console.log(this.props)
       Object.keys(this.props).forEach(key => {
           if (!['originalContent', 'title', 'user'].includes(key)) {
                this[key] = this.props[key];
           } else if (key === 'title') {
               this.title = m.prop(this.props.title)
           }
       });
    });

    addDraftsDropdown();
});
