import Alert from 'flarum/common/components/Alert';
import Button from 'flarum/common/components/Button';
import Modal from 'flarum/common/components/Modal';
import LoadingIndicator from 'flarum/common/components/LoadingIndicator';

import load from 'external-load';

const CurrentDate = dayjs().format("YYYY-MM-DD")
const CurrentTime = dayjs().format("HH:mm")

export default class ScheduleDraftModal extends Modal {
    oninit(vnode) {
        super.oninit(vnode);

        this.loading = false;
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
                            datetime: dayjs(this.attrs.draft.scheduledFor()).format('LLLL'),
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
                            value={this.unscheduleMode() ? dayjs(this.attrs.draft.scheduledFor()).format("YYYY-MM-DD") : CurrentDate}
                            // onchange={()=>m.redraw()}
                        />
                        <input
                            name="scheduledForTime"
                            className="FormControl"
                            type="time"
                            value={this.unscheduleMode() ? dayjs(this.attrs.draft.scheduledFor()).format("HH:mm") : CurrentTime}
                            // onchange={()=>m.redraw}
                        />
                    </div>
                    <div className="Form-group">
                        {Button.component(
                            {
                                className: 'Button Button--block' + (this.unscheduleMode() ? ' Button--danger' : ' Button--primary'),
                                type: 'submit',
                                loading: this.loading,
                            },
                            this.unscheduleMode()
                                ? app.translator.trans('fof-drafts.forum.schedule_draft_modal.unschedule_button')
                                : this.rescheduleMode()
                                ? app.translator.trans('fof-drafts.forum.schedule_draft_modal.reschedule_button')
                                : app.translator.trans('fof-drafts.forum.schedule_draft_modal.schedule_button')
                        )}
                    </div>
                </div>
            </div>,
        ];
    }

    scheduledFor() {
        const date = new Date(`${$('input[name=scheduledForDate]').val()} ${$('input[name=scheduledForTime]').val()}`);
        console.log(date);
        return date;
    }

    changed() {
        const getTimeOrNull = (date) => (date?.getTime());

        return getTimeOrNull(this.scheduledFor()) !== getTimeOrNull(this.attrs.draft.scheduledFor());
    }

    unscheduleMode() {
        return !this.changed() && this.attrs.draft.scheduledFor();
    }

    rescheduleMode() {
        return this.changed() && this.attrs.draft.scheduledFor();
    }

    onsubmit(e) {
        e.preventDefault();

        this.loading = true;

        this.attrs.draft
            .save({ scheduledFor: this.unscheduleMode() ? null : this.scheduledFor(), clearValidationError: true, scheduledValidationError: '' })
            .then(() => (this.success = true))
            .catch(() => {})
            .then(this.loaded.bind(this));
    }
}
