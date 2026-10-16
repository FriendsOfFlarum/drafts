import app from 'flarum/forum/app';
import DiscussionComposer from 'flarum/forum/components/DiscussionComposer';
import ReplyComposer from 'flarum/forum/components/ReplyComposer';
import { jest } from '@jest/globals';
import addComposerIntegration from '../../../src/forum/addComposerIntegration';
import { bootForum, openReplyComposer } from '../../helpers';

beforeAll(() => {
  bootForum();
  addComposerIntegration();
  app.forum.pushAttributes({ canSaveDrafts: true });
});

beforeEach(() => {
  // @flarum/jest-config stubs the module registry, so a string-path bodyMatches() throws once a body is
  // loaded. Answer from the body actually in place, so the test still depends on when load() sets it.
  const classes: Record<string, unknown> = {
    'flarum/forum/components/DiscussionComposer': DiscussionComposer,
    'flarum/forum/components/ReplyComposer': ReplyComposer,
  };

  jest.spyOn(app.composer, 'bodyMatches').mockImplementation((type) => app.composer.body.componentClass === classes[type as string]);
});

afterEach(() => {
  app.composer.hide();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

function setAutosave(enabled: boolean, seconds = 6) {
  const user = app.session.user!;
  user.pushAttributes({ preferences: { ...user.preferences(), draftAutosaveEnable: enabled, draftAutosaveInterval: seconds } });
}

function fakeDraftsApi() {
  return jest.spyOn(app, 'request').mockImplementation(((options: any) =>
    Promise.resolve({
      data: { type: 'drafts', id: '1', attributes: { content: options.body?.data?.attributes?.content, relationships: {}, extra: {} } },
    })) as any);
}

describe('draft autosave', () => {
  it('saves a reply opened the way core opens it once the interval passes', async () => {
    jest.useFakeTimers();
    setAutosave(true, 6);
    const request = fakeDraftsApi();

    await openReplyComposer();
    app.composer.fields.content('Half-written reply');
    // Changes are picked up by a once-a-second check, so allow a second on top of the interval.
    jest.advanceTimersByTime(7000);

    expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', url: expect.stringMatching(/\/drafts$/) }));
  });

  it('waits the full interval after the first change, however long the composer was open before', async () => {
    jest.useFakeTimers();
    setAutosave(true, 6);
    const request = fakeDraftsApi();

    await openReplyComposer();
    jest.advanceTimersByTime(4000);
    app.composer.fields.content('Half-written reply');

    jest.advanceTimersByTime(5000);
    expect(request).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2000);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: 'POST', url: expect.stringMatching(/\/drafts$/) }));
  });

  it('gives a change made after a save the full interval again', async () => {
    jest.useFakeTimers();
    setAutosave(true, 6);
    const request = fakeDraftsApi();

    await openReplyComposer();
    app.composer.fields.content('First version');
    jest.advanceTimersByTime(7000);
    await Promise.resolve();
    await Promise.resolve();
    request.mockClear();

    jest.advanceTimersByTime(3000);
    app.composer.fields.content('Second version');

    jest.advanceTimersByTime(5000);
    expect(request).not.toHaveBeenCalled();

    jest.advanceTimersByTime(2000);
    expect(request).toHaveBeenCalledWith(expect.objectContaining({ method: 'PATCH', url: expect.stringMatching(/\/drafts\/1$/) }));
  });

  it('does not save when autosave is disabled', async () => {
    jest.useFakeTimers();
    setAutosave(false, 6);
    const request = fakeDraftsApi();

    await openReplyComposer();
    app.composer.fields.content('Half-written reply');
    jest.advanceTimersByTime(60000);

    expect(request).not.toHaveBeenCalled();
  });
});
