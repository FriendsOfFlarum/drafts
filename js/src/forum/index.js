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

import { extend, override } from 'flarum/common/extend';
import User from 'flarum/common/models/User';
import Model from 'flarum/common/Model';
import Stream from 'flarum/common/utils/Stream';
import Draft from './models/Draft';
import DraftsPage from './components/DraftsPage';
import addDraftsDropdown from './addDraftsDropdown';
import addPreferences from './addPreferences';
import Composer from 'flarum/forum/components/Composer';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';
import ReplyComposer from 'flarum/forum/components/ReplyComposer';
import Button from 'flarum/common/components/Button';
import ComposerState from 'flarum/forum/states/ComposerState';
import fillRelationship from './utils/fillRelationship';
import DraftsListState from './states/DraftsListState';
import app from 'flarum/forum/app';
import deepEqual from './utils/deepEqual';

export * from './components';
export * from './models';
export * from './states';
export * from './utils';

app.initializers.add('fof-drafts', () => {
  app.store.models.drafts = Draft;
  User.prototype.drafts = Model.hasMany('drafts');
  User.prototype.draftCount = Model.attribute('draftCount');

  app.routes.drafts = { path: '/drafts', component: DraftsPage };

  app.drafts = new DraftsListState(app);

  ComposerState.prototype['changed'] = function () {
    if (!this.body || !this.data) return false;

    const data = this.data();
    const draft = this.draft;

    const fields = Object.keys(data).filter((element) => element !== 'relationships');

    if (!fields) {
      return false;
    }

    // If there's no content, we don't want to save this draft
    // regardless of whether other attributes have changed.
    if (!this.fields.content()) {
      return false;
    }

    const getData = (field) => (field === 'content' ? this.fields.content() : data[field]) || '';

    for (const field of fields) {
      const fieldValue = getData(field);
      const draftFieldValue = draft && draft.data.attributes[field];

      if ((!draft && fieldValue) || (draft && !deepEqual(fieldValue, draftFieldValue))) {
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
        (!(relationship in draft.relationships()) || !draft.relationships()[relationship].data?.length)
      ) {
        return true;
      } else if (
        !(relationship in draft.relationships()) ||
        data.relationships[relationship].length !== draft.relationships()[relationship].data?.length
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

    const draft = this.draft;

    if (draft && draft.id() && !draft.exists) {
      // Draft was deleted before autosave, no need to save.
      return;
    }

    if (draft) {
      delete draft.data.attributes.relationships;

      draft.save(Object.assign(draft.data.attributes, this.data())).then(() => afterSave());
    } else {
      app.store
        .createRecord('drafts')
        .save(this.data())
        .then((draft) => {
          draft.loadRelationships(true);
          this.draft = draft;
          afterSave();
        });
    }
  };

  extend(Composer.prototype, 'controlItems', function (items) {
    if (
      !(this.state.bodyMatches(DiscussionComposer) || this.state.bodyMatches(ReplyComposer)) ||
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

    if (app.session.user.preferences().draftAutosaveEnable && (this.bodyMatches(DiscussionComposer) || this.bodyMatches(ReplyComposer))) {
      this.autosaveInterval = setInterval(() => {
        if (this.changed() && !this.saving && !this.loading) {
          this.saveDraft();
        }
      }, 1000 * app.session.user.preferences().draftAutosaveInterval);
    }
  });

  extend(ComposerState.prototype, 'clear', function () {
    this.draft = null;
    if (this.autosaveInterval) clearInterval(this.autosaveInterval);
  });

  override(ComposerState.prototype, 'preventExit', function (original) {
    if (this.body && this.body.componentClass && this.draft) {
      this.body.attrs.confirmExit = app.translator.trans('fof-drafts.forum.composer.exit_alert');
    }

    let prevented = false;
    if (this.changed()) {
      prevented = original();
    }

    if (prevented) return prevented;

    if (!this.body || !this.body.componentClass) return;

    const draft = this.draft;
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
      this.composer.data = this.data.bind(this);
    }

    if (this.attrs.draft) {
      this.composer.draft = this.attrs.draft;
    }
  }

  extend(DiscussionComposer.prototype, 'oninit', initComposerBody);
  extend(ReplyComposer.prototype, 'oninit', initComposerBody);

  function deleteDraftsOnSubmit() {
    if (this.composer.draft) {
      this.composer.draft.delete();
    }
  }

  extend(DiscussionComposer.prototype, 'onsubmit', deleteDraftsOnSubmit);
  extend(ReplyComposer.prototype, 'onsubmit', deleteDraftsOnSubmit);

  if (app.initializers.has('fof-byobu')) {
    const PrivateDiscussionComposer = flarum.extensions['fof-byobu'].discussions.PrivateDiscussionComposer;
    extend(PrivateDiscussionComposer.prototype, 'onsubmit', deleteDraftsOnSubmit);
  }

  addDraftsDropdown();
  addPreferences();
});
