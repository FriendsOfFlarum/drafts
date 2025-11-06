import app from 'flarum/forum/app';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import Icon from 'flarum/common/components/Icon';
import HeaderListItem from 'flarum/forum/components/HeaderListItem';
import { truncate } from 'flarum/common/utils/string';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import dayjs from 'dayjs';

import type Mithril from 'mithril';
import Draft from '../models/Draft';
import DraftsListState from '../states/DraftsListState';

export interface IAttrs {
  draft: Draft;
  state: DraftsListState;
}

export default class DraftsListItem extends Component<IAttrs> {
  private canSchedule: boolean = app.forum.attribute<boolean>('canScheduleDrafts') && app.forum.attribute<boolean>('drafts.enableScheduledDrafts');

  oncreate(vnode: Mithril.Vnode) {
    super.oncreate(vnode);
  }

  view() {
    const { draft, state } = this.attrs;

    let scheduledDraftIcon = 'far fa-calendar-plus';
    if (draft.scheduledValidationError()) scheduledDraftIcon = 'far fa-calendar-times';
    else if (draft.scheduledFor()) scheduledDraftIcon = 'far fa-calendar-check';

    // Build the content with scheduled icon if needed
    const content = (
      <>
        {draft.scheduledFor() && (
          <Tooltip
            showOnFocus={false}
            text={app.translator.trans('fof-drafts.forum.dropdown.scheduled_icon_tooltip', {
              datetime: dayjs(draft.scheduledFor()).format(app.translator.trans('fof-drafts.forum.dropdown.scheduled_icon_tooltip_formatter')[0]),
            })}
          >
            <Icon name="far fa-clock" className="draft--scheduledIcon" />
          </Tooltip>
        )}
        {draft.type() === 'reply' ? draft.loadRelationships().discussion.title() : draft.title()}
      </>
    );

    // Build the excerpt with validation error if present
    let excerpt = truncate(draft.content(), 200);
    if (draft.scheduledValidationError()) {
      excerpt = (
        <>
          {excerpt}
          <p className="scheduledValidationError">{draft.scheduledValidationError()}</p>
        </>
      ) as any;
    }

    // Build action buttons
    const actions = (
      <>
        <Tooltip showOnFocus={false} text={app.translator.trans('fof-drafts.forum.dropdown.delete_button')}>
          <Button
            icon="fas fa-trash-alt"
            className="Button Button--link hasIcon draft--delete"
            onclick={(e: MouseEvent) => {
              state.deleteDraft(draft);
              e.stopPropagation();
            }}
          />
        </Tooltip>

        {this.canSchedule && (
          <Tooltip showOnFocus={false} text={app.translator.trans('fof-drafts.forum.dropdown.schedule_button')}>
            <Button
              icon={scheduledDraftIcon}
              className="Button Button--link hasIcon draft--schedule"
              onclick={(e: MouseEvent) => {
                state.scheduleDraft(draft);
                e.stopPropagation();
              }}
            />
          </Tooltip>
        )}
      </>
    );

    return (
      <li>
        <HeaderListItem
          className="Draft draft--item"
          avatar={<Avatar user={draft.user()} />}
          icon={draft.icon()}
          content={content as any}
          excerpt={excerpt}
          datetime={draft.updatedAt()}
          onclick={(e: any) => {
            state.showComposer(draft);
            e.redraw = false;
          }}
          actions={actions}
        />
      </li>
    );
  }
}
