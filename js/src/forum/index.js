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

import { extend } from 'flarum/extend';
import User from 'flarum/models/User';
import Model from 'flarum/Model';
import Draft from './models/Draft';
import DraftsPage from './components/DraftsPage';
import addDraftsDropdown from './addDraftsDropdown';
import Composer from 'flarum/components/Composer';
import DiscussionComposer from 'flarum/components/DiscussionComposer';
import Button from 'flarum/components/Button';
import DraftsList from './components/DraftsList';


app.initializers.add('fof-drafts', () => {
    app.store.models.drafts = Draft;
    User.prototype.drafts = Model.hasMany('drafts');
    User.prototype.draftCount = Model.attribute('draftCount');

    app.routes.drafts = { path: '/drafts', component: <DraftsPage /> };

    Composer.prototype['saveDraft'] = function () {
        this.saving = true;

        const afterSave = () => {
            this.saving = false;
            this.justSaved = true;
            setTimeout(() => {
                this.justSaved = false;
                m.redraw();
            }, 300);
            m.redraw();
        }

        if (this.component.draft) {
            delete this.component.draft.data.attributes.relationships;

            this.component.draft
                .save(Object.assign(this.component.draft.data.attributes, this.component.data()))
                .then(draft => {
                    app.cache.drafts = app.cache.drafts || [];
                    app.cache.drafts.forEach((cacheDraft, i) => {
                        if (cacheDraft.id() === draft.id()) {
                            var now = new Date();
                            draft.data.attributes.updatedAt = now.toString();
                            app.cache.drafts[i] = draft;
                        }
                    });
                    afterSave();
                });
        } else {
            app.store
                .createRecord('drafts')
                .save(this.component.data())
                .then(draft => {
                    app.cache.drafts = app.cache.drafts || [];
                    app.cache.drafts.push(draft);
                    this.component.draft = draft;
                    afterSave();
                });
        }
    };

    extend(Composer.prototype, 'controlItems', function(items) {
        if (!(this.component instanceof DiscussionComposer) || !app.forum.attribute('canSaveDrafts'))
            return;

        const classNames = ['Button', 'Button--icon', 'Button--link'];

        if (this.saving) {
            classNames.push('saving');
        }

        if (this.justSaved) {
            classNames.push('justSaved');
        }

        items.add(
            'save-draft',
            Button.component({
                icon: this.justSaved ? 'fas fa-check' : this.saving ? 'fas fa-spinner fa-spin' : 'fas fa-save',
                className: classNames.join(' '),
                itemClassName: 'App-backControl',
                title: app.translator.trans('fof-drafts.forum.composer.title'),
                disabled: this.saving || this.justSaved,
                onclick: this.saveDraft.bind(this),
            }),
            20
        );
    });

    extend(Composer.prototype, 'init', function () {
        if (!app.forum.attribute('canSaveDrafts')) return;
        // Load drafts; if already loaded, this will not do anything.
        const draftsList = new DraftsList();
        draftsList.load();

        setInterval(this.saveDraft.bind(this), 5000)
    });

    extend(DiscussionComposer.prototype, 'init', function() {
        Object.keys(this.props).forEach(key => {
            if (!['originalContent', 'title', 'user'].includes(key)) {
                this[key] = this.props[key];
            } else if (key === 'title') {
                this.title = m.prop(this.props.title);
            }
        });
    });

    extend(DiscussionComposer.prototype, 'onsubmit', function() {
        if (this.draft) {
            this.draft.delete();
            app.cache.drafts = app.cache.drafts.filter(cacheDraft => (cacheDraft.id() !== this.draft.id()));
        }
    });

    addDraftsDropdown();
});
