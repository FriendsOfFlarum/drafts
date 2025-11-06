import { extend, override } from 'flarum/common/extend';
import Stream from 'flarum/common/utils/Stream';
import Button from 'flarum/common/components/Button';
import ComposerState from 'flarum/forum/states/ComposerState';
import app from 'flarum/forum/app';
import deepEqual from './utils/deepEqual';
import fillRelationship from './utils/fillRelationship';

export default function () {
  // Add changed() method to ComposerState
  ComposerState.prototype['changed'] = function () {
    if (!this.body || !this.data) return false;

    const data = this.data();
    const draft = this.draft;

    const fields = Object.keys(data).filter((element) => element !== 'relationships');

    if (!fields || fields.length === 0) {
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

    // Check if relationships exist and need comparison
    if (!data.relationships && (!draft || !draft.relationships())) {
      return false;
    }

    // If only data has relationships but no draft exists, consider it changed
    if (data.relationships && !draft) {
      return true;
    }

    // If no relationships in data, no changes to check
    if (!data.relationships) {
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

  // Add saveDraft() method to ComposerState
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

    // Helper to serialize relationships for API and filter read-only fields
    const serializeRelationships = (data) => {
      const serialized = { ...data };

      // Remove read-only fields that shouldn't be sent to API
      delete serialized.scheduledValidationError;
      delete serialized.updatedAt;

      if (data.relationships) {
        serialized.relationships = {};

        Object.keys(data.relationships).forEach((key) => {
          const relationship = data.relationships[key];

          if (Array.isArray(relationship)) {
            // Convert array of models to JSON:API format with data wrapper
            serialized.relationships[key] = {
              data: relationship.map((item) => ({
                type: typeof item.data?.type === 'function' ? item.data.type() : item.data?.type || item.type?.() || 'unknown',
                id: typeof item.id === 'function' ? item.id() : item.id,
              })),
            };
          } else if (relationship && typeof relationship === 'object') {
            // Convert single model to JSON:API format with data wrapper
            serialized.relationships[key] = {
              data: {
                type:
                  typeof relationship.data?.type === 'function'
                    ? relationship.data.type()
                    : relationship.data?.type || relationship.type?.() || 'unknown',
                id: typeof relationship.id === 'function' ? relationship.id() : relationship.id,
              },
            };
          }
        });
      }

      return serialized;
    };

    if (draft) {
      const rawData = this.data();
      const data = serializeRelationships(rawData);

      draft
        .save(data)
        .catch((error) => {
          console.error('Draft save failed:', error);
          console.error('Response:', error.response);
        })
        .then(() => afterSave());
    } else {
      const rawData = this.data();
      const data = serializeRelationships(rawData);

      app.store
        .createRecord('drafts')
        .save(data)
        .then((draft) => {
          draft.loadRelationships(true);
          this.draft = draft;
          afterSave();
        })
        .catch((error) => {
          console.error('New draft save failed:', error);
          console.error('Response:', error.response);
        });
    }
  };

  // Add save draft button to composer
  extend('flarum/forum/components/Composer', 'controlItems', function (items) {
    if (
      !(this.state.bodyMatches('flarum/forum/components/DiscussionComposer') || this.state.bodyMatches('flarum/forum/components/ReplyComposer')) ||
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
      <Button
        icon={this.state.justSaved ? 'fas fa-check' : this.state.saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'}
        className={classNames.join(' ')}
        itemClassName="App-backControl"
        title={app.translator.trans('fof-drafts.forum.composer.title')}
        aria-label={app.translator.trans('fof-drafts.forum.composer.title')}
        disabled={this.state.saving || this.state.justSaved || this.loading}
        onclick={this.state.saveDraft.bind(this.state)}
      />,
      20
    );
  });

  // Set up autosave
  extend(ComposerState.prototype, 'load', function () {
    if (!app.forum.attribute('canSaveDrafts')) return;

    if (
      app.session.user.preferences().draftAutosaveEnable &&
      (this.bodyMatches('flarum/forum/components/DiscussionComposer') || this.bodyMatches('flarum/forum/components/ReplyComposer'))
    ) {
      this.autosaveInterval = setInterval(() => {
        if (this.changed() && !this.saving && !this.loading) {
          this.saveDraft();
        }
      }, 1000 * app.session.user.preferences().draftAutosaveInterval);
    }
  });

  // Clear draft on composer clear
  extend(ComposerState.prototype, 'clear', function () {
    this.draft = null;
    if (this.autosaveInterval) clearInterval(this.autosaveInterval);
  });

  // Override preventExit to handle drafts
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

  // Initialize composer body with draft data
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

  extend('flarum/forum/components/DiscussionComposer', 'oninit', initComposerBody);
  extend('flarum/forum/components/ReplyComposer', 'oninit', initComposerBody);

  // Delete drafts when submitted
  function deleteDraftsOnSubmit() {
    if (this.composer.draft) {
      this.composer.draft.delete();
    }
  }

  extend('flarum/forum/components/DiscussionComposer', 'onsubmit', deleteDraftsOnSubmit);
  extend('flarum/forum/components/ReplyComposer', 'onsubmit', deleteDraftsOnSubmit);

  // Handle byobu extension if present
  if (app.initializers.has('fof-byobu')) {
    const PrivateDiscussionComposer = flarum.extensions['fof-byobu'].discussions.PrivateDiscussionComposer;
    extend(PrivateDiscussionComposer.prototype, 'onsubmit', deleteDraftsOnSubmit);
  }
}
