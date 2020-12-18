import Alert from 'flarum/components/Alert';
import Button from 'flarum/components/Button';
import Modal from 'flarum/components/Modal';
import LoadingIndicator from 'flarum/components/LoadingIndicator';

import load from 'external-load';

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
                    <div className="Form-group flatpickr">
                        <input
                            name="scheduledFor"
                            className="FormControl flatpickr-input"
                            data-input
                            oncreate={this.initFlatpickr.bind(this)}
                            onchange={m.redraw}
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

    initFlatpickr(vnode) {
        const url = app.forum.attribute('baseUrl') + '/assets/extensions/fof-drafts/flatpickr';

        this.loading = true;

        Promise.all(typeof flatpickr === 'undefined' ? [load.js(`${url}.js`), load.css(`${url}.css`)] : []).then(() => {
            this.loading = false;

            m.redraw();

            window.flatpickrElement = flatpickr('.flatpickr-input', {
                enableTime: true,
                enableSeconds: false,
                minDate: Date.now(),
                maxDate: new Date(9999, 12, 31),
                defaultDate: this.attrs.draft.scheduledFor(),
            });
        });
    }

    scheduledFor() {
        return new Date($('input[name=scheduledFor]').val());
    }

    changed() {
        const getTimeOrNull = (date) => (date ? date.getTime() : null);

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
