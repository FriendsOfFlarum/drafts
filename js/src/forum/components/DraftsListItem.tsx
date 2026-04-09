import app from 'flarum/forum/app';
import haptic from 'flarum/common/utils/haptic';
import Component from 'flarum/common/Component';
import Avatar from 'flarum/common/components/Avatar';
import Icon from 'flarum/common/components/Icon';
import HeaderListItem from 'flarum/forum/components/HeaderListItem';
import { truncate } from 'flarum/common/utils/string';
import Button from 'flarum/common/components/Button';
import Tooltip from 'flarum/common/components/Tooltip';
import dayjs from 'dayjs';
import tagsLabel from 'ext:flarum/tags/common/helpers/tagsLabel';

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

  getTags() {
    // Only show tags if flarum/tags is enabled
    if (!app.initializers.has('flarum-tags')) {
      return null;
    }

    // Get tags from relationships
    const relationships = this.attrs.draft.loadRelationships();
    if (!relationships.tags || !Array.isArray(relationships.tags) || relationships.tags.length === 0) {
      return null;
    }

    return relationships.tags;
  }

  view() {
    const { draft, state } = this.attrs;

    let scheduledDraftIcon = 'far fa-calendar-plus';
    if (draft.scheduledValidationError()) scheduledDraftIcon = 'far fa-calendar-xmark';
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

    // Get tags for display
    const tags = this.getTags();
    let tagsDisplay: Mithril.Children = null;
    if (tags && tags.length > 0 && tagsLabel) {
      tagsDisplay = tagsLabel(tags);
    }

    // Build the excerpt with tags and validation error if present
    const excerptText = truncate(draft.content(), 200);
    const excerpt = (
      <>
        {tagsDisplay && <div className="DraftListItem-tags">{tagsDisplay}</div>}
        {excerptText}
        {draft.scheduledValidationError() && <p className="scheduledValidationError">{draft.scheduledValidationError()}</p>}
      </>
    ) as any;

    // Build action buttons
    const actions = (
      <>
        <Tooltip showOnFocus={false} text={app.translator.trans('fof-drafts.forum.dropdown.delete_button')}>
          <Button
            icon="fas fa-trash-can"
            className="Button Button--link hasIcon draft--delete"
            onclick={(e: MouseEvent) => {
              $(e.currentTarget as HTMLElement).trigger('mouseleave');
              haptic('heavy');
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
                $(e.currentTarget as HTMLElement).trigger('mouseleave');
                haptic('medium');
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
          onclick={(event: Event) => {
            state.showComposer(draft);
            (event as any).redraw = false;
          }}
          actions={actions}
        />
      </li>
    );
  }
}
