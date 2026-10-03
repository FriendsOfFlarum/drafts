import type Draft from '../models/Draft';
export default class DraftsListState {
    loading: boolean;
    loadingMore: boolean;
    hasNextPage: boolean;
    nextOffset: number;
    cache: any[];
    deleteDraft(draft: Draft): void;
    scheduleDraft(draft: Draft): void;
    showComposer(draft: Draft): Promise<any> | undefined;
    load(): void;
    loadMore(): void;
}
