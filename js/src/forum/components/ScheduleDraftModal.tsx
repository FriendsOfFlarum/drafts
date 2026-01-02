import Form from 'flarum/common/components/Form';
import app from 'flarum/forum/app';
import Alert from 'flarum/common/components/Alert';
import Button from 'flarum/common/components/Button';
import FormModal, { IFormModalAttrs } from 'flarum/common/components/FormModal';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';
import type Draft from '../models/Draft';

const CurrentDate = dayjs().format('YYYY-MM-DD');
const CurrentTime = dayjs().format('HH:mm');

interface ScheduleDraftModalAttrs extends IFormModalAttrs {
  draft: Draft;
}

export default class ScheduleDraftModal extends FormModal<ScheduleDraftModalAttrs> {
  loading: boolean = false;
  date!: string;
  time!: string;
  previewFormatString!: string;

  oninit(vnode: any) {
    super.oninit(vnode);

    this.date = this.isScheduled() ? dayjs(this.attrs.draft.scheduledFor()).format('YYYY-MM-DD') : CurrentDate;
    this.time = this.isScheduled() ? dayjs(this.attrs.draft.scheduledFor()).format('HH:mm') : CurrentTime;

    this.previewFormatString = app.translator.trans('fof-drafts.forum.schedule_draft_modal.schedule_time_preview_formatter')[0] as string;
  }

  className(): string {
    return 'ScheduleDraftModal';
  }

  title(): string {
    return app.translator.trans('fof-drafts.forum.schedule_draft_modal.title') as string;
  }

  content() {
    if (this.loading) {
      return <LoadingIndicator />;
    }

    return [
      this.attrs.draft.scheduledFor() ? (
        <div className="Modal-alert">
          <Alert type="success" dismissible={false}>
            {app.translator.trans('fof-drafts.forum.schedule_draft_modal.scheduled_text', {
              datetime: this.formattedDateTime(),
            })}
          </Alert>
        </div>
      ) : (
        ''
      ),
      this.attrs.draft.scheduledValidationError() ? (
        <div className="Modal-alert">
          <Alert type="error" dismissible={false}>
            {app.translator.trans('fof-drafts.forum.schedule_draft_modal.scheduled_error', {
              error: this.attrs.draft.scheduledValidationError(),
            })}
          </Alert>
        </div>
      ) : (
        ''
      ),

      <input style="display: none"></input>,

      <div className="Modal-body">
        <Form className="Form--centered">
          <p className="helpText">{app.translator.trans('fof-drafts.forum.schedule_draft_modal.text')}</p>
          <div className="Form-group ScheduleDraftModal-timeDateGroup">
            <input
              name="scheduledForDate"
              className="FormControl"
              type="date"
              min={CurrentDate}
              value={this.date}
              onchange={(dateEvent: Event) => (this.date = (dateEvent.target as HTMLInputElement).value)}
            />
            <input
              name="scheduledForTime"
              className="FormControl"
              type="time"
              value={this.time}
              onchange={(timeEvent: Event) => (this.time = (timeEvent.target as HTMLInputElement).value)}
            />
          </div>
          {}
          <div class="Form-group ScheduleDraftModal-datePreview">
            {app.translator.trans('fof-drafts.forum.schedule_draft_modal.schedule_time_preview', {
              datetime: this.formattedDateTime(),
            })}
          </div>
          <div className="Form-group ScheduleDraftModal-submitButtons">
            {}
            {this.isScheduled() && (
              <Button
                className="ScheduleDraftModal-unscheduleBtn Button Button--block Button--danger"
                loading={this.loading}
                onclick={this.unschedule.bind(this)}
              >
                {app.translator.trans('fof-drafts.forum.schedule_draft_modal.unschedule_button')}
              </Button>
            )}
            {}
            <Button
              className="ScheduleDraftModal-scheduleBtn Button Button--block Button--primary"
              type="submit"
              loading={this.loading}
              disabled={!this.changed()}
            >
              {this.isScheduled()
                ? app.translator.trans('fof-drafts.forum.schedule_draft_modal.reschedule_button')
                : app.translator.trans('fof-drafts.forum.schedule_draft_modal.schedule_button')}
            </Button>
          </div>
        </Form>
      </div>,
    ];
  }

  /**
   * Returns a Date object for currently entered values in the modal.
   */
  scheduledFor(): Date | null {
    const date = new Date(`${this.date} ${this.time}`);

    return date || null;
  }

  /**
   * Whether the modal's details have been modified.
   */
  changed(): boolean {
    const getTimeOrNull = (date: Date | null | undefined): number | null => (date ? date.getTime() || null : null);

    return getTimeOrNull(this.scheduledFor()) !== getTimeOrNull(this.attrs.draft.scheduledFor());
  }

  isScheduled(): boolean {
    return !!this.attrs.draft.scheduledFor();
  }

  formattedDateTime(): string {
    const date = dayjs(this.scheduledFor());

    const formatted = date.format(this.previewFormatString);

    return formatted;
  }

  unschedule(e: Event) {
    e.preventDefault();

    this.loading = true;

    // Save draft with no scheduled post time
    if (confirm(app.translator.trans('fof-drafts.forum.schedule_draft_modal.unschedule_warning') as string)) {
      this.attrs.draft
        .save({ scheduledFor: null, clearValidationError: true })
        .then(() => {
          (this as any).success = true;
          this.hide.call(this);
        })
        .catch(() => {})
        .then(this.loaded.bind(this));
    }
  }

  onsubmit(e: Event) {
    e.preventDefault();

    this.loading = true;

    this.attrs.draft
      .save({ scheduledFor: this.scheduledFor(), clearValidationError: true })
      .then(() => ((this as any).success = true))
      .catch(() => {})
      .then(this.loaded.bind(this));
  }
}
