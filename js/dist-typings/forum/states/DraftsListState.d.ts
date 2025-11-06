export default class DraftsListState {
    /**
     * Whether or not the flags are loading.
     *
     * @type {Boolean}
     */
    loading: boolean;
    cache: any[];
    deleteDraft(draft: any): void;
    scheduleDraft(draft: any): void;
    showComposer(draft: any): Promise<any> | undefined;
    load(): void;
}
