/// <reference types="mithril" />
import FormModal, { IFormModalAttrs } from 'flarum/common/components/FormModal';
import type Draft from '../models/Draft';
interface ScheduleDraftModalAttrs extends IFormModalAttrs {
    draft: Draft;
}
export default class ScheduleDraftModal extends FormModal<ScheduleDraftModalAttrs> {
    loading: boolean;
    date: string;
    time: string;
    previewFormatString: string;
    oninit(vnode: any): void;
    className(): string;
    title(): string;
    content(): JSX.Element | (string | JSX.Element)[];
    /**
     * Returns a Date object for currently entered values in the modal.
     */
    scheduledFor(): Date | null;
    /**
     * Whether the modal's details have been modified.
     */
    changed(): boolean;
    isScheduled(): boolean;
    formattedDateTime(): string;
    unschedule(e: Event): void;
    onsubmit(e: Event): void;
}
export {};
