import app from 'flarum/forum/app';
import RequestError from 'flarum/common/utils/RequestError';
import { jest } from '@jest/globals';
import addComposerIntegration from '../../../src/forum/addComposerIntegration';
import { bootForum, flushPromises, openReplyComposer } from '../../helpers';

beforeAll(() => {
  bootForum();
  addComposerIntegration();
  app.forum.pushAttributes({ canSaveDrafts: true });
});

afterEach(() => {
  app.composer.hide();
  jest.restoreAllMocks();
});

// What the API answers when asked to create a completely empty draft.
function rejectDrafts() {
  const body = JSON.stringify({
    errors: [
      {
        status: '422',
        code: 'validation_error',
        detail: "There's nothing to save in this draft yet.",
        source: { pointer: '/data/attributes/content' },
      },
    ],
  });

  jest
    .spyOn(app, 'request')
    .mockImplementation(((options: any) => Promise.reject(new RequestError(422, body, options, {} as XMLHttpRequest))) as any);
  jest.spyOn(console, 'error').mockImplementation(() => {});
}

describe('saving a draft', () => {
  it('puts the save button back to normal when an empty draft is rejected', async () => {
    rejectDrafts();

    await openReplyComposer();
    app.composer.saveDraft!();
    await flushPromises();

    expect(app.composer.saving).toBeFalsy();
    expect(app.composer.justSaved).toBeFalsy();
  });
});
