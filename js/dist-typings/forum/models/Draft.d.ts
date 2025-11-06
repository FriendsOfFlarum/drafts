import Model from 'flarum/common/Model';
import type User from 'flarum/common/models/User';
export default class Draft extends Model {
    user(): false | User;
    content(): string;
    title(): string;
    scheduledValidationError(): string | null;
    relationships(): Record<string, any>;
    extra(): Record<string, any>;
    scheduledFor(): Date | null | undefined;
    updatedAt(): Date | null | undefined;
    private loadedRelationships;
    type(): 'reply' | 'privateDiscussion' | 'discussion';
    icon(): string;
    loadRelationships(force?: boolean): Record<string, any>;
    compileData(): Record<string, any>;
}
