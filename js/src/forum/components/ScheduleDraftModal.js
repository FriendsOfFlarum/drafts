import app from 'flarum/forum/app';
import Alert from 'flarum/common/components/Alert';
import Button from 'flarum/common/components/Button';
import Modal from 'flarum/common/components/Modal';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

const CurrentDate = dayjs().format('YYYY-MM-DD');
const CurrentTime = dayjs().format('HH:mm');

export default class ScheduleDraftModal extends Modal {
  loading = false;

  date;
  time;

  previewFormatString;

  oninit(vnode) {
    super.oninit(vnode);

    this.date = this.isScheduled() ? dayjs(this.attrs.draft.scheduledFor()).format('YYYY-MM-DD') : CurrentDate;
    this.time = this.isScheduled() ? dayjs(this.attrs.draft.scheduledFor()).format('HH:mm') : CurrentTime;

    this.previewFormatString = app.translator.trans('fof-drafts.forum.schedule_draft_modal.schedule_time_preview_formatter')[0];
  }

  className() {
    return 'ScheduleDraftModal';
  }

  title() {
    return app.translator.trans('fof-drafts.forum.schedule_draft_modal.title');
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
        <div className="Form Form--centered">
          <p className="helpText">{app.translator.trans('fof-drafts.forum.schedule_draft_modal.text')}</p>
          <div className="Form-group ScheduleDraftModal-timeDateGroup">
            <input
              name="scheduledForDate"
              className="FormControl"
              type="date"
              min={CurrentDate}
              value={this.date}
              onchange={(e) => (this.date = e.target.value)}
            />
            <input name="scheduledForTime" className="FormControl" type="time" value={this.time} onchange={(e) => (this.time = e.target.value)} />
          </div>

          {/* Date time preview */}
          <div class="Form-group ScheduleDraftModal-datePreview">
            {app.translator.trans('fof-drafts.forum.schedule_draft_modal.schedule_time_preview', {
              datetime: this.formattedDateTime(),
            })}
          </div>

          <div className="Form-group ScheduleDraftModal-submitButtons">
            {/* Unschedule button */}
            {this.isScheduled() && (
              <Button
                className="ScheduleDraftModal-unscheduleBtn Button Button--block Button--danger"
                loading={this.loading}
                onclick={this.unschedule.bind(this)}
              >
                {app.translator.trans('fof-drafts.forum.schedule_draft_modal.unschedule_button')}
              </Button>
            )}

            {/* Schedule/reschedule button */}
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
        </div>
      </div>,
    ];
  }

  /**
   * Returns a Date object for currently entered values in the modal.
   */
  scheduledFor() {
    const date = new Date(`${this.date} ${this.time}`);

    return date || null;
  }

  /**
   * Whether the modal's details have been modified.
   */
  changed() {
    const getTimeOrNull = (date) => (date ? date.getTime() || null : null);

    return getTimeOrNull(this.scheduledFor()) !== getTimeOrNull(this.attrs.draft.scheduledFor());
  }

  isScheduled() {
    return !!this.attrs.draft.scheduledFor();
  }

  formattedDateTime() {
    const date = dayjs(this.scheduledFor());

    // if (!date) {
    //     return app.translator.trans('fof-drafts.forum.schedule_draft_modal.schedule_time_preview_invalid');
    // }

    const formatted = date.format(this.previewFormatString);

    return formatted;
  }

  unschedule(e) {
    e.preventDefault();

    this.loading = true;

    // Save draft with no scheduled post time
    if (confirm(app.translator.trans('fof-drafts.forum.schedule_draft_modal.unschedule_warning'))) {
      this.attrs.draft
        .save({ scheduledFor: null, clearValidationError: true, scheduledValidationError: '' })
        .then(() => {
          this.success = true;
          this.hide.call(this);
        })
        .catch(() => {})
        .then(this.loaded.bind(this));
    }
  }

  onsubmit(e) {
    e.preventDefault();

    this.loading = true;

    this.attrs.draft
      .save({ scheduledFor: this.scheduledFor(), clearValidationError: true, scheduledValidationError: '' })
      .then(() => (this.success = true))
      .catch(() => {})
      .then(this.loaded.bind(this));
  }
}
