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

import { extend, override } from 'flarum/extend';
import User from 'flarum/models/User';
import Model from 'flarum/Model';
import Stream from 'flarum/utils/Stream';
import Draft from './models/Draft';
import DraftsPage from './components/DraftsPage';
import addDraftsDropdown from './addDraftsDropdown';
import addPreferences from './addPreferences';
import Composer from 'flarum/components/Composer';
import DiscussionComposer from 'flarum/components/DiscussionComposer';
import ReplyComposer from 'flarum/components/ReplyComposer';
import Button from 'flarum/components/Button';
import ComposerState from 'flarum/states/ComposerState';
import fillRelationship from './utils/fillRelationship';
import DraftsListState from './states/DraftsListState';

export * from './components';
export * from './models';
export * from './utils';

app.initializers.add('fof-drafts', () => {
    app.store.models.drafts = Draft;
    User.prototype.drafts = Model.hasMany('drafts');
    User.prototype.draftCount = Model.attribute('draftCount');

    app.routes.drafts = { path: '/drafts', component: DraftsPage };

    app.drafts = new DraftsListState(app);

    ComposerState.prototype['changed'] = function () {
        if (!app.composer.body || !app.composer.data) return false;

        const data = app.composer.data();
        const draft = app.composer.body.attrs.draft;

        const fields = Object.keys(data).filter((element) => element !== 'relationships');

        if (!fields) {
            return false;
        }

        const getData = (field) => (field === 'content' ? app.composer.fields.content() : data[field]) || '';

        for (const field of fields) {
            if ((!draft && getData(field)) || (draft && getData(field) != draft.data.attributes[field])) {
                return true;
            }
        }

        if (!data.relationships && !draft.relationships()) {
            return false;
        }

        const relationships = Object.keys(data.relationships);

        const equalRelationships = (data, draft, relationship) => {
            if (
                (!data.relationships[relationship] || !data.relationships[relationship].length) &&
                (!(relationship in draft.relationships()) || !draft.relationships()[relationship].data.length)
            ) {
                return true;
            } else if (
                !(relationship in draft.relationships()) ||
                data.relationships[relationship].length !== draft.relationships()[relationship].data.length
            ) {
                return false;
            }

            const getId = (element) => (typeof element.id == 'function' ? element.id() : element.id);

            const dataIds = fillRelationship(data.relationships[relationship], getId);
            const draftIds = fillRelationship(draft.relationships()[relationship].data, getId);

            return !dataIds.some((id, i) => id !== draftIds[i]);
        };

        for (const relationship of relationships) {
            if (!draft) {
                if (data.relationships[relationship]) {
                    return true;
                }
            } else {
                if (!equalRelationships(data, draft, relationship)) {
                    return true;
                }
            }
        }

        return false;
    };

    ComposerState.prototype['saveDraft'] = function () {
        this.saving = true;
        m.redraw();

        const afterSave = () => {
            this.saving = false;
            this.justSaved = true;
            setTimeout(() => {
                this.justSaved = false;
                m.redraw();
            }, 300);
            m.redraw();
        };

        if (app.composer.body.attrs.draft) {
            delete app.composer.body.attrs.draft.data.attributes.relationships;

            app.composer.body.attrs.draft
                .save(Object.assign(app.composer.body.attrs.draft.data.attributes, app.composer.data()))
                .then(() => afterSave());
        } else {
            app.store
                .createRecord('drafts')
                .save(app.composer.data())
                .then((draft) => {
                    draft.loadRelationships(true);
                    app.composer.body.attrs.draft = draft;
                    afterSave();
                });
        }
    };

    extend(Composer.prototype, 'controlItems', function (items) {
        if (
            !(app.composer.bodyMatches(DiscussionComposer) || app.composer.bodyMatches(ReplyComposer)) ||
            !app.forum.attribute('canSaveDrafts') ||
            this.state.position === 'minimized'
        )
            return;

        const classNames = ['Button', 'Button--icon', 'Button--link'];

        if (this.state.saving) {
            classNames.push('saving');
        }

        if (this.state.justSaved) {
            classNames.push('justSaved');
        }

        items.add(
            'save-draft',
            Button.component({
                icon: this.state.justSaved ? 'fas fa-check' : this.state.saving ? 'fas fa-spinner fa-spin' : 'fas fa-save',
                className: classNames.join(' '),
                itemClassName: 'App-backControl',
                title: app.translator.trans('fof-drafts.forum.composer.title'),
                disabled: this.state.saving || this.state.justSaved || this.loading,
                onclick: this.state.saveDraft.bind(this.state),
            }),
            20
        );
    });

    extend(ComposerState.prototype, 'load', function () {
        if (!app.forum.attribute('canSaveDrafts')) return;

        if (
            app.session.user.preferences().draftAutosaveEnable &&
            (app.composer.bodyMatches(DiscussionComposer) || app.composer.bodyMatches(ReplyComposer))
        ) {
            this.autosaveInterval = setInterval(() => {
                if (this.changed() && !this.saving && !this.loading) {
                    this.saveDraft();
                }
            }, 1000 * app.session.user.preferences().draftAutosaveInterval);
        }
    });

    extend(Composer.prototype, 'hide', function () {
        if (this.autosaveInterval) clearInterval(this.autosaveInterval);
    });

    override(ComposerState.prototype, 'preventExit', function (original) {
        if (app.composer.body && app.composer.body.componentClass && app.composer.body.attrs.draft) {
            app.composer.body.attrs.confirmExit = app.translator.trans('fof-drafts.forum.composer.exit_alert');
        }

        let prevented = false;
        if (this.changed()) {
            prevented = original();
        }

        if (prevented) return prevented;

        if (!app.composer.body || !app.composer.body.componentClass) return;

        const draft = app.composer.body.attrs.draft;
        if (draft && !draft.title() && !draft.content() && confirm(app.translator.trans('fof-drafts.forum.composer.discard_empty_draft_alert'))) {
            draft.delete();
        }

        return prevented;
    });

    function initComposerBody() {
        Object.keys(this.attrs).forEach((key) => {
            if (!['originalContent', 'title', 'user'].includes(key)) {
                this[key] = this.attrs[key];
            } else if (key === 'title') {
                this.title = Stream(this.attrs.title);
            }
        });

        if (this.data) {
            app.composer.data = this.data.bind(this);
        }
    }

    extend(DiscussionComposer.prototype, 'oninit', initComposerBody);
    extend(ReplyComposer.prototype, 'oninit', initComposerBody);

    function deleteDraftsOnSubmit() {
        if (this.draft) {
            this.draft.delete();
        }
    }

    extend(DiscussionComposer.prototype, 'onsubmit', deleteDraftsOnSubmit);
    extend(ReplyComposer.prototype, 'onsubmit', deleteDraftsOnSubmit);

    addDraftsDropdown();
    addPreferences();
});
