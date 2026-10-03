import app from 'flarum/forum/app';
import mq from 'mithril-query';
import DraftsDropdown from '../../../src/forum/components/DraftsDropdown';
import DraftsListState from '../../../src/forum/states/DraftsListState';
import { bootForum, fakeDraftsApi, FakeIntersectionObserver, settle } from '../../helpers';

beforeAll(() => bootForum());

beforeEach(() => {
  app.cache.draftsLoaded = false;
  FakeIntersectionObserver.install();
});

describe('DraftsDropdown badge', () => {
  it('shows the total number of drafts, not just those loaded so far', async () => {
    fakeDraftsApi(45);
    app.session.user!.pushAttributes({ draftCount: 45 });
    const state = new DraftsListState();
    const dropdown = mq(DraftsDropdown, { state });

    state.load();
    await settle(dropdown);

    expect(app.store.all('drafts')).toHaveLength(20);
    expect(dropdown.first('.HeaderDropdownBubble').textContent).toBe('45');
  });
});
