import app from 'flarum/forum/app';
import Model from 'flarum/common/Model';
import ItemList from 'flarum/common/utils/ItemList';
import computed from 'flarum/common/utils/computed';
import fillRelationship from '../utils/fillRelationship';
import type User from 'flarum/common/models/User';
import type Discussion from 'flarum/common/models/Discussion';

export default class Draft extends Model {
  user() {
    return Model.hasOne<User>('user').call(this);
  }

  content() {
    return Model.attribute<string>('content').call(this);
  }

  title() {
    return Model.attribute<string>('title').call(this);
  }

  scheduledValidationError() {
    return Model.attribute<string | null>('scheduledValidationError').call(this);
  }

  relationships() {
    return Model.attribute<Record<string, any>>('relationships').call(this);
  }

  extra() {
    return Model.attribute<Record<string, any>>('extra').call(this);
  }

  scheduledFor() {
    return Model.attribute('scheduledFor', Model.transformDate).call(this);
  }

  updatedAt() {
    return Model.attribute('updatedAt', Model.transformDate).call(this);
  }

  private loadedRelationships: Record<string, any> | null = null;

  type(): 'reply' | 'privateDiscussion' | 'discussion' {
    const relationships = this.loadRelationships();
    if (relationships.discussion) {
      return 'reply';
    } else if (
      flarum.extensions['fof-byobu'] &&
      flarum.extensions['fof-byobu'].discussions && // If private discussion composer is not exported, we can't support PM drafts.
      ('recipientGroups' in relationships || 'recipientUsers' in relationships)
    ) {
      return 'privateDiscussion';
    } else {
      return 'discussion';
    }
  }

  icon(): string {
    switch (this.type()) {
      case 'discussion':
        return 'fas fa-feather-pointed';
      case 'reply':
        return 'fas fa-reply';
      case 'privateDiscussion':
        const customIcon = app.forum.attribute<string | undefined>('byobu.icon-badge');
        return customIcon ? customIcon : 'fas fa-eye-slash';
    }
  }

  loadRelationships(force: boolean = false): Record<string, any> {
    if (
      !force &&
      this.loadedRelationships &&
      (Object.keys(this.loadedRelationships).length > 0 ||
        (Object.keys(this.loadedRelationships).length === 0 && Object.keys(this.relationships() || {}).length === 0))
    ) {
      return this.loadedRelationships;
    }

    this.loadedRelationships = {};

    const relationships = this.relationships();

    if (relationships) {
      Object.keys(relationships).forEach((relationshipName) => {
        const relationship = relationships[relationshipName];

        if (!relationship || !relationship.data) return;

        this.loadedRelationships![relationshipName] = fillRelationship(relationship.data, (model: any) => app.store.getById(model.type, model.id));
      });
    }

    if ('recipientUsers' in this.loadedRelationships || 'recipientGroups' in this.loadedRelationships) {
      const recipients = new ItemList<User>();

      (this.loadedRelationships['recipientUsers'] || []).forEach((user: User) => {
        if (user) recipients.add('users:' + user.id(), user);
      });
      (this.loadedRelationships['recipientGroups'] || []).forEach((group: any) => {
        if (group) recipients.add('groups:' + group.id(), group);
      });

      this.loadedRelationships['recipients'] = recipients;
    }

    return this.loadedRelationships;
  }

  compileData(): Record<string, any> {
    const data: Record<string, any> = {
      originalContent: this.content(),
      title: this.title(),
      user: app.session.user,
      confirmExit: app.translator.trans('fof-drafts.forum.composer.exit_alert'),
      draft: this,
      fields: Object.assign({}, this.loadRelationships(), this.extra()),
    };

    Object.assign(data, data.fields);

    return data;
  }
}
