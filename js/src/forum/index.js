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
import Draft from './models/Draft';
import DraftsPage from './components/DraftsPage';
import addDraftsDropdown from './addDraftsDropdown';
import addPreferences from './addPreferences';
import Composer from 'flarum/components/Composer';
import DiscussionComposer from 'flarum/components/DiscussionComposer';
import ReplyComposer from 'flarum/components/ReplyComposer';
import Button from 'flarum/components/Button';
import DraftsList from './components/DraftsList';
import fillRelationship from './utils/fillRelationship';

app.initializers.add('fof-drafts', () => {
    app.store.models.drafts = Draft;
    User.prototype.drafts = Model.hasMany('drafts');
    User.prototype.draftCount = Model.attribute('draftCount');

    app.routes.drafts = { path: '/drafts', component: <DraftsPage /> };

    Composer.prototype['changed'] = function () {
        if (!this.component) return false;

        const data = this.component.data();
        const draft = this.component.draft;

        const fields = Object.keys(data).filter((element) => element !== 'relationships');

        if (!fields) {
            return false;
        }

        const getData = (field) => (field === 'content' ? this.component.editor.value() : data[field]) || '';

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
                !data.relationships[relationship].length &&
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

    Composer.prototype['saveDraft'] = function () {
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

        if (this.component.draft) {
            delete this.component.draft.data.attributes.relationships;

            this.component.draft.save(Object.assign(this.component.draft.data.attributes, this.component.data())).then(() => afterSave());
        } else {
            app.store
                .createRecord('drafts')
                .save(this.component.data())
                .then((draft) => {
                    draft.loadRelationships(true);
                    this.component.draft = draft;
                    afterSave();
                });
        }
    };

    extend(Composer.prototype, 'controlItems', function (items) {
        if (
            !(this.component instanceof DiscussionComposer || this.component instanceof ReplyComposer) ||
            !app.forum.attribute('canSaveDrafts') ||
            this.position === Composer.PositionEnum.MINIMIZED
        )
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
                disabled: this.saving || this.justSaved || this.loading,
                onclick: this.saveDraft.bind(this),
            }),
            20
        );
    });

    extend(Composer.prototype, 'load', function () {
        if (!app.forum.attribute('canSaveDrafts')) return;

        if (
            app.session.user.preferences().draftAutosaveEnable &&
            (this.component instanceof DiscussionComposer || this.component instanceof ReplyComposer)
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

    override(Composer.prototype, 'preventExit', function (original) {
        if (this.component && this.component.draft) {
            this.component.props.confirmExit = app.translator.trans('fof-drafts.forum.composer.exit_alert');
        }

        let prevented = false;
        if (this.changed()) {
            prevented = original();
        }

        if (prevented) return prevented;

        if (!this.component) return;

        const draft = this.component.draft;
        if (draft && !draft.title() && !draft.content() && confirm(app.translator.trans('fof-drafts.forum.composer.discard_empty_draft_alert'))) {
            draft.delete();
        }

        return prevented;
    });

    function initComposerBody() {
        Object.keys(this.props).forEach((key) => {
            if (!['originalContent', 'title', 'user'].includes(key)) {
                this[key] = this.props[key];
            } else if (key === 'title') {
                this.title = m.prop(this.props.title);
            }
        });
    }

    extend(DiscussionComposer.prototype, 'init', initComposerBody);
    extend(ReplyComposer.prototype, 'init', initComposerBody);

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
