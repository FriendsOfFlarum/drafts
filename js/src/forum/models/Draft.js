/*
 *
 *  This file is part of fof/drafts.
 *
 *  Copyright (c) 2019 FriendsOfFlarum.
 *
 *  For the full copyright and license information, please view the LICENSE.md
 *  file that was distributed with this source code.
 *
 */

import app from 'flarum/forum/app';
import Model from 'flarum/common/Model';
import ItemList from 'flarum/common/utils/ItemList';
import mixin from 'flarum/common/utils/mixin';
import fillRelationship from '../utils/fillRelationship';

export default class Draft extends mixin(Model, {
  user: Model.hasOne('user'),
  content: Model.attribute('content'),
  title: Model.attribute('title'),
  scheduledValidationError: Model.attribute('scheduledValidationError'),
  relationships: Model.attribute('relationships'),
  extra: Model.attribute('extra'),
  scheduledFor: Model.attribute('scheduledFor', Model.transformDate),
  updatedAt: Model.attribute('updatedAt', Model.transformDate),

  loadedRelationships: null,

  type() {
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
  },

  icon() {
    switch (this.type()) {
      case 'discussion':
        return 'fas fa-edit';
      case 'reply':
        return 'fas fa-reply';
      case 'privateDiscussion':
        const customIcon = app.forum.data.attributes['byobu.icon-badge'];
        return customIcon ? customIcon : 'fas fa-eye-slash';
    }
  },

  loadRelationships(force) {
    if (
      !force &&
      this.loadedRelationships &&
      (Object.keys(this.loadedRelationships).length > 0 ||
        (Object.keys(this.loadedRelationships).length === 0 && Object.keys(this.relationships).length === 0))
    ) {
      return this.loadedRelationships;
    }

    this.loadedRelationships = {};

    const relationships = this.relationships();

    if (relationships) {
      Object.keys(relationships).forEach((relationshipName) => {
        const relationship = relationships[relationshipName];

        if (!relationship || !relationship.data) return;

        this.loadedRelationships[relationshipName] = fillRelationship(relationship.data, (model) => app.store.getById(model.type, model.id));
      });
    }

    if ('recipientUsers' in this.loadedRelationships || 'recipientGroups' in this.loadedRelationships) {
      const recipients = new ItemList();

      (this.loadedRelationships['recipientUsers'] || []).forEach((user) => {
        if (user) recipients.add('users:' + user.id(), user);
      });
      (this.loadedRelationships['recipientGroups'] || []).forEach((group) => {
        if (group) recipients.add('groups:' + group.id(), group);
      });

      this.loadedRelationships['recipients'] = recipients;
    }

    return this.loadedRelationships;
  },

  compileData() {
    const data = {
      originalContent: this.content(),
      title: this.title(),
      user: app.session.user,
      confirmExit: app.translator.trans('fof-drafts.forum.composer.exit_alert'),
      draft: this,
      fields: Object.assign({}, this.loadRelationships(), this.extra()),
    };

    Object.assign(data, data.fields);

    return data;
  },
}) {}
