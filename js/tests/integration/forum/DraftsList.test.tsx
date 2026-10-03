import app from 'flarum/forum/app';
import { jest } from '@jest/globals';
import mq from 'mithril-query';
import DraftsList from '../../../src/forum/components/DraftsList';
import DraftsListState from '../../../src/forum/states/DraftsListState';
import { bootForum, fakeDraftsApi, FakeIntersectionObserver, settle } from '../../helpers';

beforeAll(() => bootForum());

beforeEach(() => {
  app.cache.draftsLoaded = false;
  app.store.all('drafts').forEach((draft) => app.store.remove(draft));
  FakeIntersectionObserver.install();
});

afterEach(() => jest.restoreAllMocks());

describe('DraftsList pagination', () => {
  it('loads older drafts on scroll when the list is opened after the first page has loaded', async () => {
    fakeDraftsApi(45);
    const state = new DraftsListState();

    state.load();
    await settle({ redraw() {} });

    // e.g. the dropdown being closed and reopened: a fresh list over already-loaded state.
    const list = mq(DraftsList, { state });
    await settle(list);
    expect(list).toContainRaw('Draft 20');
    expect(list).not.toContainRaw('Draft 21');

    // Scrolled to the bottom; the next page then pushes the bottom back out of view.
    FakeIntersectionObserver.setInView(true);
    FakeIntersectionObserver.setInView(false);
    await settle(list);

    expect(list).toContainRaw('Draft 21');
    expect(list).toContainRaw('Draft 40');
    expect(list).not.toContainRaw('Draft 41');
  });

  it('keeps loading while the bottom of the list stays in view', async () => {
    fakeDraftsApi(45);
    const state = new DraftsListState();
    const list = mq(DraftsList, { state });

    state.load();
    await settle(list);

    // A tall viewport: each new page still leaves the bottom of the list visible.
    FakeIntersectionObserver.setInView(true);
    await settle(list);

    expect(list).toContainRaw('Draft 45');
  });

  it('does not skip a draft when loading the next page after deleting one', async () => {
    fakeDraftsApi(45);
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    const state = new DraftsListState();
    const list = mq(DraftsList, { state });

    state.load();
    await settle(list);

    state.deleteDraft(app.store.getById('drafts', '5')!);
    await settle(list);

    FakeIntersectionObserver.setInView(true);
    FakeIntersectionObserver.setInView(false);
    await settle(list);

    expect(list).not.toContainRaw('Draft 5');
    expect(list).toContainRaw('Draft 21');
  });
});
