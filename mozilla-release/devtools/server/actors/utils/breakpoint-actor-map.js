/* -*- indent-tabs-mode: nil; js-indent-level: 2; js-indent-level: 2 -*- */
/* vim: set ft=javascript ts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const { GeneratedLocation } = require("devtools/server/actors/common");

/**
 * A BreakpointActorMap is a map from locations to instances of BreakpointActor.
 */
function BreakpointActorMap() {
  this._size = 0;
  this._actors = {};
}

BreakpointActorMap.prototype = {
  /**
   * Return the number of BreakpointActors in this BreakpointActorMap.
   *
   * @returns Number
   *          The number of BreakpointActor in this BreakpointActorMap.
   */
  get size() {
    return this._size;
  },

  /**
   * Generate all BreakpointActors that match the given location in
   * this BreakpointActorMap.
   *
   * @param GeneratedLocation location
   *        The location for which matching BreakpointActors should be generated.
   */
  findActors: function* (location = new GeneratedLocation()) {
    // Fast shortcut for when we know we won't find any actors. Surprisingly
    // enough, this speeds up refreshing when there are no breakpoints set by
    // about 2x!
    if (this.size === 0) {
      return;
    }

    function* findKeys(obj, key) {
      if (key !== undefined) {
        if (key in obj) {
          yield key;
        }
      } else {
        for (key of Object.keys(obj)) {
          yield key;
        }
      }
    }

    const query = {
      sourceActorID: location.generatedSourceActor
                     ? location.generatedSourceActor.actorID
                     : undefined,
      line: location.generatedLine,
    };

    // If location contains a line, assume we are searching for a whole line
    // breakpoint, and set begin/endColumn accordingly. Otherwise, we are
    // searching for all breakpoints, so begin/endColumn should be left unset.
    if (location.generatedLine) {
      query.beginColumn = location.generatedColumn ? location.generatedColumn : 0;
      query.endColumn = location.generatedColumn
        ? location.generatedColumn + 1
        : Infinity;
    } else {
      query.beginColumn = location.generatedColumn ? query.generatedColumn : undefined;
      query.endColumn = location.generatedColumn ? query.generatedColumn + 1 : undefined;
    }

    for (const sourceActorID of findKeys(this._actors, query.sourceActorID)) {
      const actor = this._actors[sourceActorID];
      for (const line of findKeys(actor, query.line)) {
        for (const beginColumn of findKeys(actor[line], query.beginColumn)) {
          for (const endColumn of findKeys(actor[line][beginColumn],
               query.endColumn)) {
            yield actor[line][beginColumn][endColumn];
          }
        }
      }
    }
  },

  /**
   * Return the BreakpointActor at the given location in this
   * BreakpointActorMap.
   *
   * @param GeneratedLocation location
   *        The location for which the BreakpointActor should be returned.
   *
   * @returns BreakpointActor actor
   *          The BreakpointActor at the given location.
   */
  getActor: function(generatedLocation) {
    for (const actor of this.findActors(generatedLocation)) {
      return actor;
    }

    return null;
  },

  /**
   * Set the given BreakpointActor to the given location in this
   * BreakpointActorMap.
   *
   * @param GeneratedLocation location
   *        The location to which the given BreakpointActor should be set.
   *
   * @param BreakpointActor actor
   *        The BreakpointActor to be set to the given location.
   */
  setActor: function(location, actor) {
    const { generatedSourceActor, generatedLine, generatedColumn } = location;

    const sourceActorID = generatedSourceActor.actorID;
    const line = generatedLine;
    const beginColumn = generatedColumn ? generatedColumn : 0;
    const endColumn = generatedColumn ? generatedColumn + 1 : Infinity;

    if (!this._actors[sourceActorID]) {
      this._actors[sourceActorID] = [];
    }
    if (!this._actors[sourceActorID][line]) {
      this._actors[sourceActorID][line] = [];
    }
    if (!this._actors[sourceActorID][line][beginColumn]) {
      this._actors[sourceActorID][line][beginColumn] = [];
    }
    if (!this._actors[sourceActorID][line][beginColumn][endColumn]) {
      ++this._size;
    }
    this._actors[sourceActorID][line][beginColumn][endColumn] = actor;
  },

  /**
   * Delete the BreakpointActor from the given location in this
   * BreakpointActorMap.
   *
   * @param GeneratedLocation location
   *        The location from which the BreakpointActor should be deleted.
   */
  deleteActor: function(location) {
    const { generatedSourceActor, generatedLine, generatedColumn } = location;

    const sourceActorID = generatedSourceActor.actorID;
    const line = generatedLine;
    const beginColumn = generatedColumn ? generatedColumn : 0;
    const endColumn = generatedColumn ? generatedColumn + 1 : Infinity;

    if (this._actors[sourceActorID]) {
      if (this._actors[sourceActorID][line]) {
        if (this._actors[sourceActorID][line][beginColumn]) {
          if (this._actors[sourceActorID][line][beginColumn][endColumn]) {
            --this._size;
          }
          delete this._actors[sourceActorID][line][beginColumn][endColumn];
          if (Object.keys(this._actors[sourceActorID][line][beginColumn]).length === 0) {
            delete this._actors[sourceActorID][line][beginColumn];
          }
        }
        if (Object.keys(this._actors[sourceActorID][line]).length === 0) {
          delete this._actors[sourceActorID][line];
        }
      }
    }
  },
};

exports.BreakpointActorMap = BreakpointActorMap;
