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
import Model from 'flarum/Model';
import ItemList from "flarum/utils/ItemList";
import mixin from 'flarum/utils/mixin';

export default class Draft extends mixin(Model, {
    user: Model.hasOne('user'),
    content: Model.attribute('content'),
    title: Model.attribute('title'),
    scheduledValidationError: Model.attribute('scheduledValidationError'),
    relationships: Model.attribute('relationships'),
    scheduledFor: Model.attribute('scheduledFor', Model.transformDate),
    updatedAt: Model.attribute('updatedAt', Model.transformDate),

    type() {
        const relationships = this.loadRelationships();
        if ('discussion' in relationships) {
            return 'reply';
        } else if (app.initializers.has('fof-byobu') && ('recipientGroups' in relationships || 'recipientUsers' in relationships)) {
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
                return 'fas fa-eye-slash';
        }
    },

    loadRelationships() {
        if (!this.loadedRelationships) {
            this.loadedRelationships = {};

            const relationships = this.relationships();

            if (relationships) {
                Object.keys(relationships).forEach(relationshipName => {
                    const relationship = relationships[relationshipName];
                    let relationshipData;
                    if (Array.isArray(relationship.data)) {
                        relationshipData = relationship.data.map((model, i) => app.store.getById(model.type, model.id));
                    } else {
                        relationshipData = app.store.getById(relationship.data.type, relationship.data.id);
                    }

                    this.loadedRelationships[relationshipName] = relationshipData;
                });
            }

            if ('recipientUsers' in this.loadedRelationships || 'recipientGroups' in this.loadedRelationships) {
                const recipients = new ItemList;

                (this.loadedRelationships['recipientUsers'] || []).forEach(user => {
                    recipients.add("users:" + user.id(), user);
                });
                (this.loadedRelationships['recipienGroups'] || []).forEach(group => {
                    recipients.add("groups:" + group.id(), group);
                })

                this.loadedRelationships['recipients'] = recipients;
            }
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
        };

        Object.assign(data, this.loadRelationships());

        return data;
    }
}) { }
