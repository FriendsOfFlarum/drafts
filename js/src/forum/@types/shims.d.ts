import ComposerState from 'flarum/forum/states/ComposerState';
import Draft from '../models/Draft';

declare module 'flarum/forum/states/ComposerState' {
  export default interface ComposerState {
    // Existing ComposerState properties that aren't in the type definitions
    data?: () => any;
    loading?: boolean;

    // Custom properties added by fof/drafts
    draft?: Draft | null;
    saving?: boolean;
    justSaved?: boolean;
    autosaveInterval?: ReturnType<typeof setInterval>;

    // Custom methods added by fof/drafts
    changed?(): boolean;
    saveDraft?(): void;
  }
}
