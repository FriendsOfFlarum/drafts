import app from 'flarum/forum/app';

import DraftsListState from './states/DraftsListState';
import addComposerIntegration from './addComposerIntegration';
import addDraftsDropdown from './addDraftsDropdown';
import addPreferences from './addPreferences';

export { default as extend } from './extend';

app.initializers.add('fof-drafts', () => {
  app.drafts = new DraftsListState(app);

  addComposerIntegration();
  addDraftsDropdown();
  addPreferences();
});
