import ComposerState from 'flarum/forum/states/ComposerState';
import User from 'flarum/common/models/User';
import Draft from '../forum/models/Draft';
import DraftsListState from '../forum/states/DraftsListState';

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

declare module 'flarum/common/models/User' {
  export default interface User {
    draftCount(): number;
  }
}

declare module 'flarum/forum/ForumApplication' {
  export default interface ForumApplication {
    drafts: DraftsListState;
  }
}

declare module 'ext:fof/byobu/forum/pages/discussions/PrivateDiscussionComposer' {
  const PrivateDiscussionComposer: any;
  export default PrivateDiscussionComposer;
}
