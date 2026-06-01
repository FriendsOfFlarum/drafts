import { extend, override } from 'flarum/common/extend';
import Stream from 'flarum/common/utils/Stream';
import Button from 'flarum/common/components/Button';
import ComposerState from 'flarum/forum/states/ComposerState';
import app from 'flarum/forum/app';
import haptic from 'flarum/common/utils/haptic';
import deepEqual from './utils/deepEqual';
import { adjustDraftCount } from './utils/draftCount';
import fillRelationship from './utils/fillRelationship';

export default function () {
  // Add changed() method to ComposerState
  ComposerState.prototype['changed'] = function (this: ComposerState): boolean {
    if (!this.body || !this.data) return false;

    const currentData = this.data();
    const draft = this.draft;

    const fields = Object.keys(currentData).filter((fieldName: string) => fieldName !== 'relationships');

    if (!fields || fields.length === 0) {
      return false;
    }

    // If there's no content, we don't want to save this draft
    // regardless of whether other attributes have changed.
    if (!this.fields.content()) {
      return false;
    }

    const getData = (fieldKey: string): string => (fieldKey === 'content' ? this.fields.content() : currentData[fieldKey]) || '';

    for (const field of fields) {
      const fieldValue = getData(field);
      const draftFieldValue = draft?.data?.attributes?.[field];

      if ((!draft && fieldValue) || (draft && !deepEqual(fieldValue, draftFieldValue))) {
        return true;
      }
    }

    // Check if relationships exist and need comparison
    if (!currentData.relationships && (!draft || !draft.relationships())) {
      return false;
    }

    // If only data has relationships but no draft exists, consider it changed
    if (currentData.relationships && !draft) {
      return true;
    }

    // If no relationships in data, no changes to check
    if (!currentData.relationships) {
      return false;
    }

    const relationships = Object.keys(currentData.relationships);

    const equalRelationships = (composerData: any, draftModel: any, relName: string): boolean => {
      if (
        (!composerData.relationships[relName] || !composerData.relationships[relName].length) &&
        (!(relName in draftModel.relationships()) || !draftModel.relationships()[relName].data?.length)
      ) {
        return true;
      } else if (
        !(relName in draftModel.relationships()) ||
        composerData.relationships[relName].length !== draftModel.relationships()[relName].data?.length
      ) {
        return false;
      }

      const getId = (relItem: any): string => (typeof relItem.id == 'function' ? relItem.id() : relItem.id);

      const dataIds = fillRelationship(composerData.relationships[relName], getId);
      const draftIds = fillRelationship(draftModel.relationships()[relName].data, getId);

      const dataIdsArray = Array.isArray(dataIds) ? dataIds : [dataIds];
      const draftIdsArray = Array.isArray(draftIds) ? draftIds : [draftIds];

      return !dataIdsArray.some((id: string, i: number) => id !== draftIdsArray[i]);
    };

    for (const relationship of relationships) {
      if (!draft) {
        if (currentData.relationships[relationship]) {
          return true;
        }
      } else {
        if (!equalRelationships(currentData, draft, relationship)) {
          return true;
        }
      }
    }

    return false;
  };

  // Add saveDraft() method to ComposerState
  ComposerState.prototype['saveDraft'] = function (this: ComposerState): void {
    this.saving = true;
    m.redraw();

    const afterSave = (): void => {
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
    const serializeRelationships = (draftData: any): any => {
      const serialized = { ...draftData };

      // Remove read-only fields that shouldn't be sent to API
      delete serialized.scheduledValidationError;
      delete serialized.updatedAt;

      if (draftData.relationships) {
        serialized.relationships = {};

        Object.keys(draftData.relationships).forEach((relationshipKey: string) => {
          const relationship = draftData.relationships[relationshipKey];

          if (Array.isArray(relationship)) {
            // Convert array of models to JSON:API format with data wrapper
            serialized.relationships[relationshipKey] = {
              data: relationship.map((relModel: any) => ({
                type: typeof relModel.data?.type === 'function' ? relModel.data.type() : relModel.data?.type || relModel.type?.() || 'unknown',
                id: typeof relModel.id === 'function' ? relModel.id() : relModel.id,
              })),
            };
          } else if (relationship && typeof relationship === 'object') {
            // Convert single model to JSON:API format with data wrapper
            serialized.relationships[relationshipKey] = {
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
      const rawData = this.data?.();
      if (!rawData) return;

      const updatePayload = serializeRelationships(rawData);

      draft
        .save(updatePayload)
        .catch((saveError: any) => {
          console.error('Draft save failed:', saveError);
          console.error('Response:', saveError.response);
        })
        .then(() => afterSave());
    } else {
      const rawData = this.data?.();
      if (!rawData) return;

      const createPayload = serializeRelationships(rawData);

      app.store
        .createRecord('drafts')
        .save(createPayload)
        .then((savedDraft: any) => {
          savedDraft.loadRelationships(true);
          this.draft = savedDraft;
          afterSave();
        })
        .catch((createError: any) => {
          console.error('New draft save failed:', createError);
          console.error('Response:', createError.response);
        });
    }
  };

  // Add save draft button to composer
  extend('flarum/forum/components/Composer', 'controlItems', function (items) {
    if (
      !(this.state.bodyMatches('flarum/forum/components/DiscussionComposer') || this.state.bodyMatches('flarum/forum/components/ReplyComposer')) ||
      !app.forum.attribute('canSaveDrafts') ||
      (this.state.position === 'minimized' && !this.state.isFullScreen())
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
        icon={this.state.justSaved ? 'fas fa-check' : this.state.saving ? 'fas fa-spinner fa-spin' : 'fas fa-floppy-disk'}
        className={classNames.join(' ')}
        itemClassName="App-backControl"
        title={app.translator.trans('fof-drafts.forum.composer.title')}
        aria-label={app.translator.trans('fof-drafts.forum.composer.title')}
        disabled={this.state.saving || this.state.justSaved || this.loading}
        onclick={() => {
          haptic('success');
          this.state.saveDraft();
        }}
      />,
      20
    );
  });

  // Set up autosave
  extend(ComposerState.prototype, 'load', function (this: ComposerState) {
    if (!app.forum.attribute('canSaveDrafts')) return;

    if (
      // @ts-ignore - User preferences access
      app.session.user?.preferences().draftAutosaveEnable &&
      (this.bodyMatches('flarum/forum/components/DiscussionComposer') || this.bodyMatches('flarum/forum/components/ReplyComposer'))
    ) {
      this.autosaveInterval = setInterval(() => {
        if (this.changed?.() && !this.saving && !this.loading) {
          this.saveDraft?.();
        }
        // @ts-ignore - User preferences access
      }, 1000 * app.session.user?.preferences().draftAutosaveInterval);
    }
  });

  // Clear draft on composer clear
  extend(ComposerState.prototype, 'clear', function (this: ComposerState) {
    this.draft = null;
    if (this.autosaveInterval) clearInterval(this.autosaveInterval);
  });

  // Override preventExit to handle drafts
  override(ComposerState.prototype, 'preventExit', function (this: ComposerState, original: () => boolean | void) {
    if (this.body && this.body.componentClass && this.draft) {
      this.body.attrs.confirmExit = app.translator.trans('fof-drafts.forum.composer.exit_alert') as string;
    }

    let prevented: boolean = false;
    if (this.changed?.()) {
      const result = original();
      prevented = result === true;
    }

    if (prevented) return prevented;

    if (!this.body || !this.body.componentClass) return;

    const draft = this.draft;
    if (
      draft &&
      !draft.title() &&
      !draft.content() &&
      confirm(app.translator.trans('fof-drafts.forum.composer.discard_empty_draft_alert') as string)
    ) {
      draft
        .delete()
        .then(() => {
          adjustDraftCount(-1);
          m.redraw();
        })
        .catch((deleteError: any) => {
          console.error('Draft delete failed:', deleteError);
          console.error('Response:', deleteError.response);
        });
    }

    return prevented;
  });

  // Initialize composer body with draft data
  function initComposerBody(this: any): void {
    Object.keys(this.attrs).forEach((attrKey: string) => {
      if (!['originalContent', 'title', 'user'].includes(attrKey)) {
        this[attrKey] = this.attrs[attrKey];
      } else if (attrKey === 'title') {
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
  function deleteDraftsOnSubmit(this: any): void {
    if (this.composer.draft) {
      this.composer.draft
        .delete()
        .then(() => {
          adjustDraftCount(-1);
          m.redraw();
        })
        .catch((deleteError: any) => {
          console.error('Draft delete failed:', deleteError);
          console.error('Response:', deleteError.response);
        });
    }
  }

  extend('flarum/forum/components/DiscussionComposer', 'onsubmit', deleteDraftsOnSubmit);
  extend('flarum/forum/components/ReplyComposer', 'onsubmit', deleteDraftsOnSubmit);

  // Handle byobu extension if present
  if ('fof-byobu' in flarum.extensions) {
    extend('ext:fof/byobu/forum/pages/discussions/PrivateDiscussionComposer', 'onsubmit', deleteDraftsOnSubmit);
  }
}
