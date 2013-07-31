var Metamaps = {}; // this variable declaration defines a Javascript object that will contain all the variables and functions used by us, broken down into 'sub-modules' that look something like this

var labelType, useGradients, nativeTextSupport, animate;

(function() {
  var ua = navigator.userAgent,
      iStuff = ua.match(/iPhone/i) || ua.match(/iPad/i),
      typeOfCanvas = typeof HTMLCanvasElement,
      nativeCanvasSupport = (typeOfCanvas == 'object' || typeOfCanvas == 'function'),
      textSupport = nativeCanvasSupport 
        && (typeof document.createElement('canvas').getContext('2d').fillText == 'function');
  //I'm setting this based on the fact that ExCanvas provides text support for IE
  //and that as of today iPhone/iPad current text support is lame
  labelType = (!nativeCanvasSupport || (textSupport && !iStuff))? 'Native' : 'HTML';
  nativeTextSupport = labelType == 'Native';
  useGradients = nativeCanvasSupport;
  animate = !(iStuff || !nativeCanvasSupport);
})();

var panningInt; // this variable is used to store a 'setInterval' for the Metamaps.JIT.SmoothPanning() function, so that it can be cleared with window.clearInterval
var tempNode = null, tempInit = false, tempNode2 = null;
var mapperm = false; //Needs implmented later TODO

Metamaps.Active = {
  Entity: null, 
  Relation: null,
  isMap: false
}
Metamaps.Analyze = {
    
};
Metamaps.Control = {
  init: function() {
    // the next three lines initializes the jquery ui draggable function on the 'runFunctions' div
    $('.runFunctions').draggable();
    var positionLeft = $(window).width() - $('.runFunctions').width() - 50;
    $('.runFunctions').css('left', positionLeft + 'px');
  },
  hideLabels: function() {
    if (Metamaps.Visualize.mGraph.labels.labelsHidden) {
      Metamaps.Visualize.mGraph.labels.hideLabels();
      $('.hidelabels').html('Hide Labels');
    }
    else if (!Metamaps.Visualize.mGraph.labels.labelsHidden) {
      Metamaps.Visualize.mGraph.labels.hideLabels(true);
      $('.hidelabels').html('Show Labels');
    }
  },
  selectNode: function(node) {
    if (Metamaps.Selected.Entities.indexOf(node) != -1) return;
    node.selected = true;
    node.setData('dim', 30, 'current');
    node.setData('whiteCircle', true);
    node.eachAdjacency(function (adj) {
        Metamaps.Control.selectEdge(adj);
    });
    Metamaps.Selected.Entities.push(node);
  },
  deselectAllNodes: function () {
    var l = Metamaps.Selected.Entities.length;
    for (var i = l - 1; i >= 0; i -= 1) {
        var node = Metamaps.Selected.Entities[i];
        Metamaps.Control.deselectNode(node);
    }
  },
  deselectNode: function (node) {
    delete node.selected;
    node.setData('whiteCircle', false);
    node.eachAdjacency(function (adj) {
        Metamaps.Control.deselectEdge(adj);
    });
    node.setData('dim', 25, 'current');

    //remove the node
    Metamaps.Selected.Entities.splice(
        Metamaps.Selected.Entities.indexOf(node), 1);
  },
  removeSelectedNodes: function () {
    if (mapperm) {
        var l = Metamaps.Selected.Entities.length;
        for (var i = l - 1; i >= 0; i -= 1) {
            var node = Metamaps.Selected.Entities[i];
            Metamaps.Control.removeNode(node.id);
        }
    }
  },
  removeNode: function (nodeid) {
    var node = Metamaps.Visualize.mGraph.graph.getNode(nodeid);
    Metamaps.Control.deselectNode(node);
    if (mapperm) {
        $.ajax({
            type: "POST",
            url: "/topics/" + mapid + "/" + nodeid + "/removefrommap",
        });
    }
  },
  hideSelectedNodes: function () {
    var l = Metamaps.Selected.Entities.length;
    for (var i = l - 1; i >= 0; i -= 1) {
        var node = Metamaps.Selected.Entities[i];
        Metamaps.Control.hideNode(node.id);
    }
  },
  hideNode: function (nodeid) {
    var node = Metamaps.Visualize.mGraph.graph.getNode(nodeid);
    if (nodeid == Metamaps.Visualize.mGraph.root && Metamaps.Visualize.type === "RGraph") {
        alert("You can't hide this topic, it is the root of your graph.");
        return;
    }

    Metamaps.Control.deselectNode(node);

    node.setData('alpha', 0, 'end');
    node.eachAdjacency(function (adj) {
        adj.setData('alpha', 0, 'end');
    });
    Metamaps.Visualize.mGraph.fx.animate({
        modes: ['node-property:alpha',
            'edge-property:alpha'
        ],
        duration: 1000
    });
    Metamaps.Control.removeNode(nodeid);
    Metamaps.Visualize.mGraph.labels.disposeLabel(nodeid);
    delete Metamaps.Visualize.mGraph.labels.labels["" + nodeid]
  },
  selectEdge: function (edge) {
    if (Metamaps.Selected.Synapses.indexOf(edge) != -1) return;
    edge.setData('showDesc', true, 'current');
    if (!Metamaps.embed) {
        edge.setDataset('end', {
            lineWidth: 4,
            color: '#FFFFFF',
            alpha: 1
        });
    } else if (Metamaps.embed) {
        edge.setDataset('end', {
            lineWidth: 4,
            color: '#999',
            alpha: 1
        });
    }
    Metamaps.Visualize.mGraph.fx.animate({
        modes: ['edge-property:lineWidth:color:alpha'],
        duration: 100
    });
    Metamaps.Selected.Synapses.push(edge);
  },
  deselectAllEdges: function () {
    var l = Metamaps.Selected.Synapses.length;
    for (var i = l - 1; i >= 0; i -= 1) {
        var edge = Metamaps.Selected.Synapses[i];
        Metamaps.Control.deselectEdge(edge);
    }
  },
  deselectEdge: function (edge) {
    edge.setData('showDesc', false, 'current');
    edge.setDataset('end', {
        lineWidth: 2,
        color: '#222222',
        alpha: 0.4
    });

    if (Metamaps.Mouse.edgeHoveringOver == edge) {
        edge.setData('showDesc', true, 'current');
        edge.setDataset('end', {
            lineWidth: 4,
            color: '#222222',
            alpha: 1
        });
    }

    Metamaps.Visualize.mGraph.fx.animate({
        modes: ['edge-property:lineWidth:color:alpha'],
        duration: 100
    });

    //remove the edge
    Metamaps.Selected.Synapses.splice(
        Metamaps.Selected.Synapses.indexOf(edge), 1);
  },
  removeSelectedEdges: function () {
    var l = Metamaps.Selected.Synapses.length;
    for (var i = l - 1; i >= 0; i -= 1) {
        if (Metamaps.Active.isMap) {
            var edge = Metamaps.Selected.Synapses[i];
            var id = edge.getData("id");
            //delete mapping of id mapid
            $.ajax({
                type: "POST",
                url: "/synapses/" + mapid + "/" + id + "/removefrommap",
            });
        }
        Metamaps.Control.hideEdge(edge);
    }
    Metamaps.Selected.Synapses = new Array();
  },
  removeEdge: function (edge) {
    var id = edge.getData("id");
    $.ajax({
        type: "DELETE",
        url: "/synapses/" + id,
        success: function () {
            Metamaps.Control.hideEdge(edge);
        },
    });
  },
  hideSelectedEdges: function () {
    var l = Metamaps.Selected.Synapses.length;
    for (var i = l - 1; i >= 0; i -= 1) {
        var edge = Metamaps.Selected.Synapses[i];
        Metamaps.Control.hideEdge(edge);
    }
    Metamaps.Selected.Synapses = new Array();
 },
  hideEdge: function (edge) {
    var from = edge.nodeFrom.id;
    var to = edge.nodeTo.id;
    edge.setData('alpha', 0, 'end');
    Metamaps.Visualize.mGraph.fx.animate({
        modes: ['edge-property:alpha'],
        duration: 1000
    });
    Metamaps.Visualize.mGraph.graph.removeAdjacence(from, to);
    Metamaps.Visualize.mGraph.plot();
  },
  saveLayout: function () {
    var submitted = [];
    Metamaps.Visualize.mGraph.graph.eachNode(function (n) {
      var e = Metamaps.Entity.get(n.data.$id);
      var id = Metamaps.Active.Entity.id;
      for (var i = 0; i < e['14'][2].length; i++) {
        if (e['14'][2][i] === id) {
          if ($.inArray(e['14'][3][i], submitted) == -1) {
            submitted.push(e['14'][3][i]);
            Metamaps.Field.createFieldInDatabase("field",e['14'][3][i],94,"integer_val",Math.round(n.pos.x),false);
            Metamaps.Field.createFieldInDatabase("field",e['14'][3][i],95,"integer_val",Math.round(n.pos.y),false);
            return;
          }
        }
      }    
    });  
  },
  loadSavedLayout: function () {
      if (Metamaps.Entity.getFirstValue(Metamaps.Active.Entity.id, 722) == false) {
          alert('there is no saved layout for this metamap sucka.')
          return;
      }
      Metamaps.Visualize.savedLayout = true;
      Metamaps.Visualize.computePositions();
      Metamaps.Visualize.mGraph.animate(Metamaps.JIT.ForceDirected.animateSavedLayout);   
  },
  revealAllSynapses: function() {
    
    //var alreadyChecked = [];
    var allNodes = Metamaps.Visualize.mGraph.graph.nodes;
    var nodeKeys = _.keys(allNodes);
    var sharedSynapses = [];
    
    for (i = 1; i < nodeKeys.length; i++) {
      for (j = i + 1; j < nodeKeys.length+1; j++){
        sharedSynapses = Metamaps.Entity.getSharedSynapses(allNodes[i]["data"]["$id"],allNodes[j]["data"]["$id"]);
  
  
        if(sharedSynapses.length > 0) {
          if(sharedSynapses.length > 1){
            console.log(i+" to "+j+" gives "+sharedSynapses);
            temp1 = Metamaps.Visualize.mGraph.graph.getNode(i);
            temp2 = Metamaps.Visualize.mGraph.graph.getNode(j);
            Metamaps.Visualize.mGraph.graph.addAdjacence(temp1, temp2, {});
            temp = Metamaps.Visualize.mGraph.graph.getAdjacence(temp1.id, temp2.id);
            temp.setDataset("start", {
                lineWidth: 0.4
            });
            temp.setDataset("end", {
                lineWidth: 2
            });
            d = new Array(temp1.id, temp2.id);
            temp.setDataset("current", {
                desc: sharedSynapses.toString(),
                showDesc: false,
                category: "from-to",
                id: "",
                userid: "1234",
                username: "Connor", //TODO
                permission: "commons" //TODO
            });
            temp.data.$direction = d;
            Metamaps.Visualize.mGraph.fx.plotLine(temp, Metamaps.Visualize.mGraph.canvas); 
          }
          else{
            console.log(i+" to "+j+" gives "+sharedSynapses);
            temp1 = Metamaps.Visualize.mGraph.graph.getNode(i);
            temp2 = Metamaps.Visualize.mGraph.graph.getNode(j);
            //tempDesc = Metamaps.Visualize.mGraph.graph.getAdjacence(i, j)["data"]["data"]["$desc"];
            Metamaps.Visualize.mGraph.graph.addAdjacence(temp1, temp2, {});
            temp = Metamaps.Visualize.mGraph.graph.getAdjacence(temp1.id, temp2.id);
            temp.setDataset("start", {
                lineWidth: 0.4
            });
            temp.setDataset("end", {
                lineWidth: 2
            });
            d = new Array(temp1.id, temp2.id);
            temp.setDataset("current", {
                desc: sharedSynapses, //tempDesc,
                showDesc: false,
                category: "from-to",
                id: "",
                userid: "1234",
                username: "Connor", //TODO
                permission: "commons" //TODO
            });
            temp.data.$direction = d;
            Metamaps.Visualize.mGraph.fx.plotLine(temp, Metamaps.Visualize.mGraph.canvas);
            
          }
        }        
      }
    }  
  } // End revealAllSynapses     
};
Metamaps.Create = {
  newEntity: {
    init: function() {
      $('#new_entity').bind('contextmenu', function(e){
        return false;
      });
    },
    newId: 1,
    beingCreated: false,
    type: null,
    x: null,
    y: null,
    addSynapse: false,
    onMap: false
  },
  newSynapse: {
    init: function() {
      $('#new_synapse').bind('contextmenu', function(e){
        return false;
      });
    },
    initialized: false,
    refresh: function() {
      $("#synapse_relation_id").html(Metamaps.Util.generateOptionsList(Metamaps.Entity.getAll(2,8))); // populate the synapse create list with 
            // things that (2) is a (8) relation
    },
    open: function() {
      var self = Metamaps.Create;
      if (!self.newSynapse.initialized) {
        self.newSynapse.refresh();
        self.newSynapse.initialized = true;
      }
      $('#new_synapse').fadeIn('fast');
    },
    beingCreated: false,
    topic1id: null,
    topic2id: null,
    newSynapseId: null
  },
  newField: {
    newFieldId: null,
    entityId: null,
    keyId: null,
    keyText: null,
    value: null,
  }
};
// this stores a JSON object of all entities (also in JSON) that have been 'loaded' from the database 
Metamaps.Entities = {};
// this contains functions and variables specific to managing local entities and their database counterparts
Metamaps.Entity = {
  // this function is to retrieve an entity JSON object from the database
  // @param id = the id of the entity to retrieve
   get: function(id) {
     // if the desired entity is not yet in the local entity repository, fetch it
     if (Metamaps.Entities[id] == undefined) { 
       var e = $.ajax({
         url: "/entities/" + id + ".json",
         async: false,
       });
       Metamaps.Entities[id] = $.parseJSON(e.responseText);
     }
     
     return Metamaps.Entities[id];
  },
  // this function returns an array of all the entities in JSON that match a key value pair (only works for synapses between entities, not standard key-value pairs)
  // @param relationID = the entity id that acts as the relationship 
  // @param entityID = the entity id that acts as one endpoint of the relationship 
  getAll: function(relationID, entityID) {
    var entities = [];
    var self = Metamaps.Entity;
    
    var e = $.ajax({
      url: "/en/s/search.json?key=" + relationID + "&value=" + entityID,
      async: false,
    });
    
    entities = $.parseJSON(e.responseText);
    
    //for (var i = 0; i < entities.length; i++) {
    //  var id = entities[i]['id'];
    //  if (Metamaps.Entities[id] == undefined) {
    //    Metamaps.Entities[id] = entities[i];
    //  }
    //}
    
    return entities;
  },
  // this function returns the first value for a given key for a given entity
  // @param entityID = the entity id for which we're searching for a value from
  // @param relationID = the entity id that acts as the key for which we're looking for a value
  getFirstValue: function(entityID, relationID) {
    var self = Metamaps.Entity;
    
    var e = self.get(entityID);
    var allRelationInfo = e[relationID];
    
    // cover possible error cases
    if (allRelationInfo === undefined) {
      return false; // means there are no values for the property of specific interest
    }
    
    if (allRelationInfo[0]['direction'][0] == "expressed in English") {
      return allRelationInfo[1][0];
    } 
    else if (allRelationInfo[4] != undefined && allRelationInfo[0]['direction'][1] == "expressed in English") {
      return allRelationInfo[4][0];
    }
    else {
      return false; // means there are no values for the property of specific interest
    }
  },
  // this function returns the count of all values for a given key for a given entity
  // @param entityID = the entity id for which we're searching for a value from
  // @param relationID = the entity id that acts as the key for which we're looking for a value
  getValueCount: function(entityID, relationID) {
    var self = Metamaps.Entity;
    
    var e = self.get(entityID);
    var allRelationInfo = e[relationID];
    
    // cover possible error cases
    if (allRelationInfo === undefined) {
      return 0;
    }
    
    if (allRelationInfo[0]['direction'][0] == "expressed in English") {
      return allRelationInfo[1].length;
    } 
    else if (allRelationInfo[4] != undefined && allRelationInfo[0]['direction'][1] == "expressed in English") {
      return allRelationInfo[4].length;
    }
    else {
      return 0; // means there are no values for the property of specific interest
    }
  },
  getSharedSynapses: function (entityID1, entityID2) {
    var self = Metamaps.Entity;
    var e = self.get(entityID1);
    var sharedFieldIDs = [];
    
    for (var key in e){
      if (key != 'id' && key != 'created' && key != 'agentname' && key != 'agentid'){
        if (e[key][0]['expects a'] === "references_val_id"){
          for (var i = 0; i < e[key][2].length; i++){
            if(e[key][2][i] === entityID2){
               sharedFieldIDs.push(e[key][3][i]);
            }
          }
        }
      }      
    }
    return sharedFieldIDs;
  },
  renderEntity: function (newnode) {
    /* in the case where there are already one or more nodes on the graph
     */

    var temp, tempPos;

    if (!$.isEmptyObject(Metamaps.Visualize.mGraph.graph.nodes)) {
        Metamaps.Visualize.mGraph.graph.addNode(newnode);
        Metamaps.Visualize.mGraph.graph.eachNode(function (n) {
            n.setData("dim", 25, "start");
            return n.setData("dim", 25, "end");
        });
        temp = Metamaps.Visualize.mGraph.graph.getNode(Metamaps.Create.newEntity.newId);
        temp.setData("dim", 1, "start");
        temp.setData("dim", 40, "end");
        temp.setData("whiteCircle", false);
        temp.setData("greenCircle", false);
        if (Metamaps.Visualize.type === "RGraph") {
            tempPos = new $jit.Complex(Metamaps.Create.newEntity.x, Metamaps.Create.newEntity.y);
            tempPos = tempPos.toPolar();
            temp.setPos(tempPos, "current");
            temp.setPos(tempPos, "start");
            temp.setPos(tempPos, "end");
        } else if (Metamaps.Visualize.type === "ForceDirected") {
            temp.setData("xloc", 0);
            temp.setData("yloc", 0);
            temp.setData("mappingid", null);
            temp.setPos(new $jit.Complex(Metamaps.Create.newEntity.x, Metamaps.Create.newEntity.y), "current");
            temp.setPos(new $jit.Complex(Metamaps.Create.newEntity.x, Metamaps.Create.newEntity.y), "start");
            temp.setPos(new $jit.Complex(Metamaps.Create.newEntity.x, Metamaps.Create.newEntity.y), "end");
        }
        if (Metamaps.Create.newEntity.addSynapse) {
            Metamaps.Create.newSynapse.topic1id = tempNode.id;
            Metamaps.Create.newSynapse.topic2id = temp.id;
            Metamaps.Create.newSynapse.open();
            Metamaps.Create.newSynapse.beingCreated = true;
            return Metamaps.Visualize.mGraph.fx.animate({
                modes: ["node-property:dim"],
                duration: 500,
                onComplete: function () {
                    var tempInit, tempNode, tempNode2;

                    Metamaps.JIT.renderMidArrow({
                        x: tempNode.pos.getc().x,
                        y: tempNode.pos.getc().y
                    }, {
                        x: temp.pos.getc().x,
                        y: temp.pos.getc().y
                    }, 13, false, Metamaps.Visualize.mGraph.canvas);
                    Metamaps.Visualize.mGraph.fx.plotNode(tempNode, Metamaps.Visualize.mGraph.canvas);
                    Metamaps.Visualize.mGraph.fx.plotNode(temp, Metamaps.Visualize.mGraph.canvas);
                    tempNode = null;
                    tempNode2 = null;
                    return tempInit = false;
                }
            });
        } else {
            Metamaps.Visualize.mGraph.fx.plotNode(temp, Metamaps.Visualize.mGraph.canvas);
            return Metamaps.Visualize.mGraph.fx.animate({
                modes: ["node-property:dim"],
                duration: 500,
                onComplete: function () {
                    return Metamaps.Control.selectNode(temp);
                }
            });
        }
    } else {
        Metamaps.Visualize.mGraph.loadJSON(newnode);
        temp = Metamaps.Visualize.mGraph.graph.getNode(Metamaps.Create.newEntity.newId);
        temp.setData("dim", 1, "start");
        temp.setData("dim", 25, "end");
        temp.setData("whiteCircle", false);
        temp.setData("greenCircle", false);
        if (Metamaps.Visualize.type === "ForceDirected") {
            temp.setData("mappingid", null);
        }
        temp.setPos(new $jit.Complex(Metamaps.Create.newEntity.x, Metamaps.Create.newEntity.y), "current");
        temp.setPos(new $jit.Complex(Metamaps.Create.newEntity.x, Metamaps.Create.newEntity.y), "start");
        temp.setPos(new $jit.Complex(Metamaps.Create.newEntity.x, Metamaps.Create.newEntity.y), "end");
        Metamaps.Visualize.mGraph.fx.plotNode(temp, Metamaps.Visualize.mGraph.canvas);
        return Metamaps.Visualize.mGraph.fx.animate({
            modes: ["node-property:dim"],
            duration: 500,
            onComplete: function () {
                return Metamaps.Control.selectNode(temp);
            }
        });
    }
  },
  createEntityLocally: function () {
    var self = Metamaps.Entity;
    
    var entity_in_language, newnode, type_in_language;

    entity_in_language = $("#entity_inlanguage").attr("value");
    
    //these can't happen until the value is retrieved
    $("#new_entity").fadeOut("fast");
    $("#entity_inlanguage").typeahead('setQuery','');
    
    type_in_language = $("#metacodeImgTitle").text();
    newnode = {
        "data": {
            "$metacode": type_in_language,
            "$id": null
        },
        "id": Metamaps.Create.newEntity.newId,
        "name": entity_in_language
    };
    self.renderEntity(newnode);
    $("#entity_inlanguage").attr("value", "");
    Metamaps.Create.newEntity.beingCreated = false;
    Metamaps.Create.newEntity.addSynapse = false;
    if (!Metamaps.Settings.sandbox) {
        self.createEntityInDatabase(entity_in_language, Metamaps.Create.newEntity.type, Metamaps.Create.newEntity.newId);
    }
    return Metamaps.Create.newEntity.newId += 1;
  },
  getEntityFromAutocomplete: function (id) {
    var self = Metamaps.Entity;
    
    $("#new_entity").fadeOut("fast");
    $("#entity_inlanguage").typeahead('setQuery','');
    
    var entity = self.get(id);
    var newnode;

    newnode = {
        "data": {
            "$metacode": entity['2'][1][0],
            "$id": entity['id'],
            "$data": entity
        },
        "id": Metamaps.Create.newEntity.newId,
        "name": entity['1'][1][0]
    };
    self.renderEntity(newnode);
    if (Metamaps.Active.isMap) {
        Metamaps.Synapse.createSynapseInDatabase(entity.id, 14, Metamaps.Active.Entity.id, false);
    }
    Metamaps.Create.newEntity.beingCreated = false;
    Metamaps.Create.newEntity.addSynapse = false;
    return Metamaps.Create.newEntity.newId += 1;
  },
  createEntityInDatabase: function (inlanguage, type, localID) {
    return $.post("/entities.json", (function (data, textStatus, jqXHR) {
        var temp;

        temp = Metamaps.Visualize.mGraph.graph.getNode(localID);
        temp.data.$id = data.id;
        // create the field that expresses the entity in language
        Metamaps.Field.createFieldInDatabase("entity", data.id, languageUserExpressingIn, inlanguage, false);
        // create the synapse that connects the new entity with a 'type of thing' entity
        Metamaps.Synapse.createSynapseInDatabase(data.id, 2, type, false);
        // if on a map page, automagically create a synapse between the entity and the map it's on
        if (Metamaps.Active.isMap) {
            return Metamaps.Synapse.createSynapseInDatabase(data.id, 14, Metamaps.Active.Entity.id, false);
        }
    }));
  }
};
Metamaps.EntityCard = {
  openEntityCard: null, //stores the JIT local ID of the topic with the entity card open 
  addMetadataInitialized: false,
  fadeInShowCard: function (node) {
    // positions the card in the right place
    var top = $('#' + node.id).css('top');
    var left = parseInt($('#' + node.id).css('left'));
    var w = $('#topic_' + node.id + '_label').width();
    w = w / 2;
    left = (left + w) + 'px';
    $('#showcard').css('top', top);
    $('#showcard').css('left', left);

    $('.showcard.topic_' + node.id).fadeIn('fast');
    $('.showcard .slide').mCustomScrollbar();
    $('.showcard .tab-home .slides').cycle({
        fx: 'scrollHorz',
        timeout: 0,
        prev: '#prev',
        next: '#next',
        pager: '#nav',
        pagerAnchorBuilder: function (idx, slide) {
          return '<li></li>';
        }
    });
    node.setData('dim', 1, 'current');
    Metamaps.EntityCard.openEntityCard = node.id;
    Metamaps.Visualize.mGraph.plot();
    Metamaps.Visualize.mGraph.labels.hideLabel(Metamaps.Visualize.mGraph.graph.getNode(node.id));
  },
  showCard: function (node) {
    // set the diameter to full again for whatever node had its topic card showing
    if (Metamaps.EntityCard.openEntityCard != null) {
        currentOpenNode = Metamaps.Visualize.mGraph.graph.getNode(Metamaps.EntityCard.openEntityCard)
        currentOpenNode.setData('dim', 25, 'current');
        Metamaps.Visualize.mGraph.labels.hideLabel(currentOpenNode, true)
        Metamaps.Visualize.mGraph.plot();
    }

    //populate the card that's about to show with the right topics data
    var e = Metamaps.Entity.get(node.data.$id)
    node.data.$data = e;
    Metamaps.EntityCard.populateShowCard(node, e);
    Metamaps.EntityCard.fadeInShowCard(node);
  },
  hideCards: function () {
    $('#edit_synapse').hide();
    Metamaps.edgecardInUse = null;
    Metamaps.EntityCard.hideCurrentCard();
  },
  hideCard: function (node) {
    var card = '.showcard';
    if (node != null) {
        card += '.topic_' + node.id;
    }

    $(card).fadeOut('fast', function () {
        node.setData('dim', 25, 'current');
        Metamaps.Visualize.mGraph.labels.hideLabel(Metamaps.Visualize.mGraph.graph.getNode(node.id), true)
        Metamaps.Visualize.mGraph.plot();
    });

    Metamaps.EntityCard.openEntityCard = null;
    Metamaps.EntityCard.addMetadataInitialized = false;
  },
  hideCurrentCard: function () {
    if (Metamaps.EntityCard.openEntityCard) {
        var node = Metamaps.Visualize.mGraph.graph.getNode(Metamaps.EntityCard.openEntityCard);
        Metamaps.EntityCard.hideCard(node);
    }
  },
  // param @node is the JIT node
  // param @showCard is the JQuery showcard div
  // param @entity is the metamaps formatted JSON object of the same entity
  populateAddMetadata: function(node, showCard, entity) {
    var self = Metamaps.EntityCard;
    if (!self.addMetadataInitialized) {
      // populate the property dropdown with the right options
      var typeOfThingID = entity['2'][2][0];
      var usedMetadataTypes = Metamaps.Entity.getAll(723,typeOfThingID) // 723 = is used by
      if (usedMetadataTypes.length > 0) {
        var optionsList = Metamaps.Util.generateOptionsList(usedMetadataTypes);
        $(showCard).find('.property_select').html(optionsList);
        self.followUpWithRightType(node);
      }
      self.addMetadataInitialized = true;
    }
  },
  bindShowCardListeners: function(node, showCard, entity) {
    var self = Metamaps.EntityCard;
    
    $('.showcard .topic_synapses').click(function (event) {
        event.preventDefault();
        $('.showcard .slides').cycle(2);
    });
    $('.showcard .topic_maps').click(function (event) {
        event.preventDefault();
        $('.showcard .slides').cycle(3);
    });

    // when you change the field that you want to add, change the value creation div accordingly
    $('.showcard .property_select').change(function () { self.followUpWithRightType(node); });

    //when you change the name of the topic, it changes it in all the places it's stored
    $(showCard).find('.property_name.best_in_place_string_val').bind("ajax:success", function () {
        var name = $(this).html();
        $('#topic_' + node.id + '_label').find('.label').html(name);
        node.name = name;
        node.data.$data['expressed in English'].valuetext = name;
    });

    // when you click on the upper left icon, the card closes
    $('.showcard').find('img.icon').click(function () {
        self.hideCard(node);
    });

    // when you click on the upper left icon, the card closes
    $('.showcard .tabs .one').click(function () {
        $('.showcard .tab').hide();
        $('.showcard .tab-home').show();
        $('.showcard .tabs .two').css('background-position', '-59px');
        $('.showcard .tabs .one').css('background-position', '1px');
        $('.showcard .tabs .one').css('z-index', '2');
        $('.showcard .tabs .two').css('z-index', '1');
    });
    // when you click on the upper left icon, the card closes
    $('.showcard .tabs .two').click(function () {
        $('.showcard .tab').hide();
        $('.showcard .tab-add').show();
        $('.showcard .tabs .two').css('background-position', '1px');
        $('.showcard .tabs .one').css('background-position', '-59px');
        $('.showcard .tabs .one').css('z-index', '1');
        $('.showcard .tabs .two').css('z-index', '2');
        self.populateAddMetadata(node, showCard, entity);
    });
  },
  followUpWithRightType: function(node) {
        $('#showcard').find('.add_value').html('');
        var keyId = parseInt($('.showcard .property_select').val());
        Metamaps.Create.newField.keyText = $(".showcard .property_select option[value='" + keyId + "']").text();
        Metamaps.Create.newField.keyId = keyId;
        
        var entity = Metamaps.Entity.get(keyId);
        Metamaps.Create.newField.valueType = entity['11'][1][0];

        var av = $('#showcard').find('.add_value');

        if (Metamaps.Create.newField.valueType == 'references_val_id') {
          // populate the property dropdown with the right options
          var typeOfThingID = entity['727'][2][0];  // 727 = 'demands a' 
          var expectedEntities = Metamaps.Entity.getAll(2,typeOfThingID) // 2 = is a
          if (expectedEntities.length > 0) {
            var optionsList = Metamaps.Util.generateOptionsList(expectedEntities);
            av.html('<select class="entity_select" name="entity_select">' + optionsList + '</select>');
            $('.showcard .entity_select').change(function () {
              var value = parseInt($('.showcard .entity_select').val());
              Metamaps.Create.newField.valueText = $(".showcard .entity_select option[value='" + value + "']").text();
              Metamaps.Create.newField.value = value;
            });
          }
          else { 
            alert('There are no entities of the type that this metadata type demands... care to do something about it?');
          }
          
        } 
        else if (Metamaps.Create.newField.valueType == 'string_val') {
          av.append('<input type="text" name="string_val" id="string_val">');
        } 
        else if (Metamaps.Create.newField.valueType == 'text_val') {
          av.append('<textarea name="text_val" id="text_val" rows="4" cols="20"></textarea>');
        }
        av.append('<button id="submit_property">Save</button>');

        $('#submit_property').click(function () {
            Metamaps.EntityCard.save_property(node)
        });

        av.fadeIn('fast');
  },
  populateShowCard: function (node, entity) {
    var self = Metamaps.EntityCard;
   
    var showCard = document.getElementById('showcard');
    showCard.innerHTML = '';
    var html = Metamaps.EntityCard.generateShowcardHTML();
    html = Metamaps.EntityCard.replaceVariables(html, node);
    showCard.className = 'showcard topic_' + node.id;
    showCard.innerHTML = html;
    
    // these are the 5 pages of the home tab on the showcard
    var properties = $('.showcard').find('.properties');
    var media = $('.showcard').find('.media');
    var synapses = $('.showcard').find('.synapses');
    var metamaps = $('.showcard').find('.metamaps');
    var fields = $('.showcard').find('.fields');
    
    properties.append('<h3>ID</h3>');
    properties.append(entity.id + '');
    properties.append('<div class="divider"></div>');
    
    // a variable for accumulating the synapse count
    var synapseCount = 0;
    // add all the properties stored with the node
    for (var key in entity) {
        
        // add it to the appropriate slides and the big list of fields
        if (entity.hasOwnProperty(key) && key != 'id' && key != 'created' && key != 'agentname' && key != 'agentid') {
          // this means that it refers to type of relationship between any entity and a metamap
          // thus all metadata here should be added to the metamaps slide
          if (key == "14") { 
           metamaps.append('<h3>Appears on Metamaps</h3>');
           for (var i = 0; i < entity[key][1].length; i++) {
              metamaps.append('<a href="/entities/' + entity[key][2][i] + '" target="_blank">' + entity[key][1][i] + '</a><br>');
           }
           if (entity[key][4] != undefined) {
              metamaps.append('<div class="divider"></div>');
              metamaps.append('<h3>Includes Entities</h3>');
              for (var i = 0; i < entity[key][4].length; i++) {
                  metamaps.append('<a href="/entities/' + entity[key][5][i] + '" target="_blank">' + entity[key][4][i] + '</a><br>');
              }
           } 
          }
          // this means that this metadata property type connects two entities and so should be included in the synapses page
          // but also exclude 'appears as topic on map' and 'is a' metadata property types
          else if (entity[key].length != 3 && key != "2") {  
            synapses.append('<h3>' + entity[key][0][entity[key][0]['direction'][0]] + '</h3>');
            for (var i = 0; i < entity[key][1].length; i++) {
              synapses.append('<a href="/entities/' + entity[key][2][i] + '" target="_blank">' + entity[key][1][i] + '</a><br>');
              
              synapseCount++;
            }
            synapses.append('<div class="divider"></div>');
            if (entity[key][0]['expects a'] === 'references_val_id' && entity[key][4] != undefined) {
              synapses.append('<h3>' + entity[key][0][entity[key][0]['direction'][1]] + '</h3>');
              for (var i = 0; i < entity[key][4].length; i++) {
                  synapses.append('<a href="/entities/' + entity[key][5][i] + '" target="_blank">' + entity[key][4][i] + '</a><br>');
                  
                  synapseCount++;
              }
              synapses.append('<div class="divider"></div>');
            }
          }
          
          // in the case where the metadata is a 'key'
          if (entity[key].length == 3) {
            // add it to the big list of fields
            properties.append('<h3>' + entity[key][0]['expressed in English'] + '</h3>');
            for (var i = 0; i < entity[key][1].length; i++) {
              // Metamaps.EntityCard.render_field(value, fieldid)
              Metamaps.EntityCard.render_field(entity[key][1][i], entity[key][2][i]);
            }
            properties.append('<div class="divider"></div>');
          }
          // in the case where the metadata is a 'relation'
          else if (entity[key].length != 3) {
            // add it to the big list of fields
            properties.append('<h3>' + entity[key][0][entity[key][0]['direction'][0]] + '</h3>');
            for (var i = 0; i < entity[key][1].length; i++) {
              // Metamaps.EntityCard.render_synapse(value, fieldid)
              Metamaps.EntityCard.render_synapse(entity[key][1][i], entity[key][3][i]);
            }
            properties.append('<div class="divider"></div>');
            if (entity[key][4] != undefined) {
              properties.append('<h3>' + entity[key][0][entity[key][0]['direction'][1]] + '</h3>');
              for (var i = 0; i < entity[key][4].length; i++) {
                  // Metamaps.EntityCard.render_synapse(value, fieldid)
                  Metamaps.EntityCard.render_synapse(entity[key][4][i], entity[key][6][i]);
              }
              properties.append('<div class="divider"></div>');
            }
          }
        } // if entity.hasOwnProperty
    }
    
    //update the synapse count number
    $('.metadata_line .topic_synapses').html(synapseCount);

    Metamaps.Create.newField.entityId = entity.id;

    Metamaps.EntityCard.bindShowCardListeners(node, showCard, entity);
  },
  generateShowcardHTML: function () {
    return '                                                                                                 \
      <div class="CardOnGraph"                                                                             \
         id="topic_$_id_$">                                                                                \
      <img alt="$_metacode_$"                                                                              \
           class="icon"                                                                                    \
           title="Click to hide card"                                                                      \
           height="50"                                                                                     \
           width="50"                                                                                      \
           src="$_imgsrc_$" />                                                                             \
        <span class="title">                                                                               \
          <span class="property_name best_in_place best_in_place_string_val"                               \
                data-url="/fields/$_name_id_$"                                                             \
                data-object="field"                                                                        \
                data-attribute="string_val"                                                                \
                data-type="input">$_name_$</span>                                                          \
          <div class="clearfloat"></div>                                                                   \
        </span>                                                                                            \
        <div class="metadata_line">                                                                        \
            <a href="/entities/$_metacode_id_$" target="_blank" class="topic_metacode">$_metacode_$</a>    \
            <a href="/users/$_agentid_$" target="_blank" class="topic_agent">$_agentname_$</a>             \
            <a href="#" target="_blank" class="topic_created">$_created_$</a>                              \
            <a href="#" target="_blank" class="topic_synapses">3</a>                                       \
            <a href="#" target="_blank" class="topic_maps">$_metamapcount_$</a>                                           \
            <div class="clearfloat"></div>                                                                 \
        </div>                                                                                             \
        <div class="tabs">                                                                                 \
          <div class="one"></div>                                                                          \
          <div class="two"></div>                                                                          \
        </div>                                                                                             \
        <div class="tab tab-home">                                                                         \
         <div class="slides">                                                                              \
          <div class="slide properties"></div>                                                             \
          <div class="slide media"></div>                                                                  \
          <div class="slide synapses"></div>                                                               \
          <div class="slide metamaps"></div>                                                               \
          <div class="slide fields"></div>                                                                 \
         </div>                                                                                            \
          <div class="navigation">                                                                         \
            <div id="prev"></div>                                                                          \
            <ul id="nav"></ul>                                                                             \
            <div id="next"></div>                                                                          \
          </div>                                                                                           \
        </div>                                                                                             \
        <div class="tab tab-add">                                                                          \
          <div class="property_dropdown">                                                                  \
            <select class="property_select" name="property_select"></select>                               \
          </div>                                                                                           \
          <div class="add_value"></div>                                                                    \
          <div class="clearfloat"></div>                                                                   \
        </div>                                                                                             \
     </div>';
  }, //generateShowcardHTML
  replaceVariables: function (html, node) {
  
      html = html.replace(/\$_id_\$/g, node.data.$id);
      html = html.replace(/\$_created_\$/g, node.data.$data['created']);
      html = html.replace(/\$_metamapcount_\$/g, Metamaps.Entity.getValueCount(node.data.$id, 14));
      html = html.replace(/\$_agentname_\$/g, node.data.$data['agentname']);
      html = html.replace(/\$_agentid_\$/g, node.data.$data['agentid']);
      html = html.replace(/\$_name_id_\$/g, node.data.$data['1'][2][0]); // gets the id of the name field
      html = html.replace(/\$_metacode_\$/g, node.data.$metacode);
      html = html.replace(/\$_metacode_id_\$/g, node.data.$data['2'][2][0]);
      html = html.replace(/\$_imgsrc_\$/g, imgArray[node.data.$metacode].src);
      html = html.replace(/\$_name_\$/g, node.name);
  
      return html;
  },
  render_field: function (value, fieldid) {
    var properties = $('.showcard').find('.properties');
    var propertyHTML = '                                                     \
       <div id="field$_id_$">                                                    \
       <span class="best_in_place best_in_place_value"                    \
                data-url="/fields/$_id_$"                                         \
                data-object="field"                                               \
                data-attribute="value"                                   \
                data-type="input">                                               \
                $_value_$                                                        \
       </span> &nbsp;                                                            \
       [$_id_$                                                                   \
       <a class="editField"                                                      \
                 href="/fields/$_id_$/edit"                                      \
                 target="_blank"                                                 \
                 title="Click to edit this field">e                              \
       </a>                                                                      \
       <a class="deleteField"                                                    \
                 href="/fields/$_id_$"                                           \
                 data-method="delete"                                            \
                 rel="nofollow"                                                  \
                 data-remote="true"                                              \
                 onclick=""                                                      \
                 title="Click to delete this field">d                            \
        </a>]                                                                     \
        </div>';
    propertyHTML = propertyHTML.replace(/\$_id_\$/g, fieldid);
    propertyHTML = propertyHTML.replace(/\$_value_\$/g, value);
    properties.append(propertyHTML);
  },
  render_synapse: function (value, fieldid) {
    var properties = $('.showcard').find('.properties');
    var propertyHTML = '<div id="synapse$_id_$">                               \
       $_value_$ &nbsp; [$_id_$                                                  \
       <a class="editSynapse"                                                      \
                 href="/synapses/$_id_$/edit"                                      \
                 target="_blank"                                                 \
                 title="Click to edit this synapse">e                              \
       </a>                                                                      \
       <a class="deleteSynapse"                                                    \
                 href="/synapses/$_id_$"                                           \
                 data-method="delete"                                            \
                 rel="nofollow"                                                  \
                 data-remote="true"                                              \
                 onclick=""                                                      \
                 title="Click to delete this synapse">d                            \
        </a>]                                                                    \
        </div>';
    propertyHTML = propertyHTML.replace(/\$_id_\$/g, fieldid);
    propertyHTML = propertyHTML.replace(/\$_value_\$/g, value);
    properties.append(propertyHTML);
  },
  save_property: function (node) {
    if (Metamaps.Create.newField.valueType != 'references_val_id') {
        Metamaps.Create.newField.value = $('#' + Metamaps.Create.newField.valueType).val();
    }
    Metamaps.Field.createFieldInDatabase(
        "entity",
        Metamaps.Create.newField.entityId,
        Metamaps.Create.newField.keyId,
        Metamaps.Create.newField.value,
        false);

    Metamaps.EntityCard.hideCard(node);
    Metamaps.EntityCard.showCard(node);
  }
};
Metamaps.Field = {
  createFieldInDatabase: function (EntityFieldSynapse, efsID, keyID, value, saveToMap) {
        var data, metadata;
        var self = Metamaps.Field;

        data = {};
        metadata = {};
        if (EntityFieldSynapse === "entity") {
            metadata["entity_id"] = efsID;
        } else if (EntityFieldSynapse === "field") {
            metadata["field_id"] = efsID;
        } else if (EntityFieldSynapse === "synapse") {
            metadata["synapse_id"] = efsID;
        }
        metadata["key_id"] = keyID;
        metadata["value"] = value;
        data["field"] = metadata;
        return $.ajax({
            type: "POST",
            url: "/fields.json",
            data: data,
            success: (function (data, textStatus, jqXHR) {
                Metamaps.Create.newField.newFieldId = data.id;
            }),
            async: false
        });
  },
  // this function is to retrieve a Field JSON object from the database
  // @param id = the id of the field to retrieve
   get: function(id) {
     // if the desired field is not yet in the local field repository, fetch it
     if (Metamaps.Fields[id] == undefined) { 
       var e = $.ajax({
         url: "/fields/" + id + ".json",
         async: false,
       });
       Metamaps.Fields[id] = $.parseJSON(e.responseText);
     }
     
     return Metamaps.Fields[id];
  },
  getFirstValue: function(fieldID, relationID) {
    var self = Metamaps.Field;
    
    var f = self.get(fieldID);
    var allRelationInfo = f[relationID];
    
    // cover possible error cases
    if (allRelationInfo === undefined) {
      alert('This entity does not have any of that type of metadata! Please go jump in a pond.');
      return;
    }
    
    if (allRelationInfo[0]['direction'][0] == "expressed in English") {
      return allRelationInfo[1][0];
    } 
    else if (allRelationInfo[4] != undefined && allRelationInfo[0]['direction'][1] == "expressed in English") {
      return allRelationInfo[4][0];
    }
    else {
      return false; // means there are no values for the property of specific interest
    }
  },
  updateFieldInDatabase: function (id, value) {
        var data, metadata;
        data = {};
        metadata = {};
        metadata["value"] = value;
        data["field"] = metadata;
        return $.ajax({
            type: "PUT",
            url: "fields/" + (id = ".json"),
            data: data,
            success: (function (data, textStatus, jqXHR) {})
        });
  },
};
Metamaps.Fields = {};
Metamaps.Find = {
    
};
Metamaps.JIT = {
  vizData: null, // contains the visualization-compatible graph
  graphRendered: false, // flag indicates if we have rendered the data so we don't bother doing it again wastefully
  metacodeIMGinit: false,
  /**
    * This method will bind the event handlers it is interested and initialize the class.
  */
  init: function () {
        var self = Metamaps.JIT;
        // setup the events
        $(document).on("buildMap", self.prepareVizData);
  },
  /**
  * convert our entity JSON into something JIT can use
  */
  prepareVizData: function () {
        var self = Metamaps.JIT;

        // prepate vizData here
        
        Metamaps.Visualize.render("infovis", self.vizData);
  }, // prepareV
  edgeRender: function(adj, canvas) {
            //get nodes cartesian coordinates 
            var pos = adj.nodeFrom.pos.getc(true);
            var posChild = adj.nodeTo.pos.getc(true);

            var directionCat = adj.getData("category");
            //label placement on edges 
            Metamaps.JIT.renderEdgeArrows(this.edgeHelper, adj);

            //check for edge label in data  
            var desc = adj.getData("desc");
            var showDesc = adj.getData("showDesc");
            if (desc != "" && showDesc) {
                // '&amp;' to '&'
                desc = Metamaps.Util.decodeEntities(desc);

                //now adjust the label placement 
                var ctx = canvas.getCtx();
                var radius = canvas.getSize();
                var x = parseInt((pos.x + posChild.x - (desc.length * 5)) / 2);
                var y = parseInt((pos.y + posChild.y) / 2);
                ctx.font = 'bold 14px arial';

                //render background
                ctx.fillStyle = '#FFF';
                var margin = 5;
                var height = 14 + margin; //font size + margin
                var CURVE = height / 2; //offset for curvy corners
                var width = ctx.measureText(desc).width + 2 * margin - 2 * CURVE
                var labelX = x - margin + CURVE;
                var labelY = y - height + margin;
                ctx.fillRect(labelX, labelY, width, height);

                //curvy corners woo - circles in place of last CURVE pixels of rect
                ctx.beginPath();
                ctx.arc(labelX, labelY + CURVE, CURVE, 0, 2 * Math.PI, false);
                ctx.arc(labelX + width, labelY + CURVE, CURVE, 0, 2 * Math.PI, false);
                ctx.fill();

                //render text
                ctx.fillStyle = '#000';
                ctx.fillText(desc, x, y);
            }
  },  // edgeRender
  edgeRenderEmbed: function(adj, canvas) {
            //get nodes cartesian coordinates 
            var pos = adj.nodeFrom.pos.getc(true);
            var posChild = adj.nodeTo.pos.getc(true);

            var directionCat = adj.getData("category");
            //label placement on edges 
            Metamaps.JIT.renderEdgeArrows(this.edgeHelper, adj);

            //check for edge label in data  
            var desc = adj.getData("desc");
            var showDesc = adj.getData("showDesc");
            if (desc != "" && showDesc) {
                // '&amp;' to '&'
                desc = Metamaps.Util.decodeEntities(desc);

                //now adjust the label placement 
                var ctx = canvas.getCtx();
                var radius = canvas.getSize();
                var x = parseInt((pos.x + posChild.x - (desc.length * 5)) / 2);
                var y = parseInt((pos.y + posChild.y) / 2);
                ctx.font = 'bold 14px arial';

                //render background
                ctx.fillStyle = '#999';
                var margin = 5;
                var height = 14 + margin; //font size + margin
                var CURVE = height / 2; //offset for curvy corners
                var width = ctx.measureText(desc).width + 2 * margin - 2 * CURVE
                var labelX = x - margin + CURVE;
                var labelY = y - height + margin;
                ctx.fillRect(labelX, labelY, width, height);

                //curvy corners woo - circles in place of last CURVE pixels of rect
                ctx.beginPath();
                ctx.arc(labelX, labelY + CURVE, CURVE, 0, 2 * Math.PI, false);
                ctx.arc(labelX + width, labelY + CURVE, CURVE, 0, 2 * Math.PI, false);
                ctx.fill();

                //render text
                ctx.fillStyle = '#000';
                ctx.fillText(desc, x, y);
            }
  },  // edgeRenderEmbed
  ForceDirected: {
    animateSavedLayout: {
                modes: ['linear'],
                transition: $jit.Trans.Quad.easeInOut,
                duration: 2500,
                onComplete: function () {
                    Metamaps.Visualize.mGraph.busy = false;
                }
    },
    animateFDLayout: {
                modes: ['linear'],
                transition: $jit.Trans.Elastic.easeOut,
                duration: 2500,
                onComplete: function () {
                    Metamaps.Visualize.mGraph.busy = false;
                }
    },
    graphSettings: {
            //id of the visualization container
            injectInto: 'infovis',
            //Enable zooming and panning
            //by scrolling and DnD
            Navigation: {
                enable: true,
                type: 'HTML',
                //Enable panning events only if we're dragging the empty
                //canvas (and not a node).
                panning: 'avoid nodes',
                zooming: 28 //zoom speed. higher is more sensible
            },
            background: {
              type: 'Metamaps'
            },
            //NodeStyles: {  
            //  enable: true,  
            //  type: 'Native',  
            //  stylesHover: {  
            //    dim: 30  
            //  },  
            //  duration: 300  
            //},
            // Change node and edge styles such as
            // color and width.
            // These properties are also set per node
            // with dollar prefixed data-properties in the
            // JSON structure.
            Node: {
                overridable: true,
                color: '#2D6A5D',
                type: 'customNode',
                dim: 25
            },
            Edge: {
                overridable: true,
                color: '#222222',
                type: 'customEdge',
                lineWidth: 2,
                alpha: 0.4
            },
            //Native canvas text styling
            Label: {
                type: 'HTML', //Native or HTML
                size: 20,
                //style: 'bold'
            },
            //Add Tips
            Tips: {
                enable: false,
                onShow: function (tip, node) {}
            },
            // Add node events
            Events: {
                enable: true,
                enableForEdges: true,
                type: 'HTML',
                onMouseMove: function (node, eventInfo, e) {
                    Metamaps.JIT.onMouseMoveHandler(node, eventInfo, e);
                },
                //Update node positions when dragged
                onDragMove: function (node, eventInfo, e) {
                    Metamaps.JIT.onDragMoveTopicHandler(node, eventInfo, e);
                },
                onDragEnd: function (node, eventInfo, e) {
                    Metamaps.JIT.onDragEndTopicHandler(node, eventInfo, e, false);
                },
                onDragCancel: function (node, eventInfo, e) {
                    Metamaps.JIT.onDragCancelHandler(node, eventInfo, e, false);
                },
                //Implement the same handler for touchscreens
                onTouchStart: function (node, eventInfo, e) {
                    //$jit.util.event.stop(e); //stop default touchmove event
                    //Metamaps.Visualize.mGraph.events.onMouseDown(e, null, eventInfo);
                    Metamaps.Visualize.mGraph.events.touched = true;
                    Metamaps.Touch.touchPos = eventInfo.getPos();
                    var canvas = Metamaps.Visualize.mGraph.canvas,
                        ox = canvas.translateOffsetX;
                    oy = canvas.translateOffsetY,
                    sx = canvas.scaleOffsetX,
                    sy = canvas.scaleOffsetY;
                    Metamaps.Touch.touchPos.x *= sx;
                    Metamaps.Touch.touchPos.y *= sy;
                    Metamaps.Touch.touchPos.x += ox;
                    Metamaps.Touch.touchPos.y += oy;

                    touchDragNode = node;
                },
                //Implement the same handler for touchscreens
                onTouchMove: function (node, eventInfo, e) {
                    if (Metamaps.Touch.touchDragNode) Metamaps.JIT.onDragMoveTopicHandler(Metamaps.Touch.touchDragNode, eventInfo, e);
                    else {
                        Metamaps.JIT.touchPanZoomHandler(eventInfo, e);
                        Metamaps.Visualize.mGraph.labels.hideLabel(Metamaps.Visualize.mGraph.graph.getNode(Metamaps.EntityCard.openEntityCard));
                    }
                },
                //Implement the same handler for touchscreens
                onTouchEnd: function (node, eventInfo, e) {

                },
                //Implement the same handler for touchscreens
                onTouchCancel: function (node, eventInfo, e) {

                },
                //Add also a click handler to nodes
                onClick: function (node, eventInfo, e) {

                    if (Metamaps.Mouse.boxStartCoordinates) {
                        Metamaps.Visualize.mGraph.busy = false;
                        Metamaps.Mouse.boxEndCoordinates = eventInfo.getPos();
                        Metamaps.JIT.selectNodesWithBox();
                        return;
                    }

                    if (e.target.id != "infovis-canvas") return false;

                    //clicking on a edge, node, or clicking on blank part of canvas?
                    if (node.nodeFrom) {
                        Metamaps.JIT.selectEdgeOnClickHandler(node, e);
                    } else if (node && !node.nodeFrom) {
                        Metamaps.JIT.selectNodeOnClickHandler(node, e);
                    } else {
                        //topic and synapse editing cards
                        if (!Metamaps.Mouse.didPan) {
                            Metamaps.EntityCard.hideCards();
                        }
                        Metamaps.JIT.canvasDoubleClickHandler(eventInfo.getPos(), e);
                    } //if
                }
            },
            //Number of iterations for the FD algorithm
            iterations: 200,
            //Edge length
            levelDistance: 200,
            // Add text to the labels. This method is only triggered
            // on label creation and only for DOM labels (not native canvas ones).
            onCreateLabel: function (domElement, node) {
                Metamaps.JIT.onCreateLabelHandler(domElement, node);
            },
            // Change node styles when DOM labels are placed or moved.
            onPlaceLabel: function (domElement, node) {
                Metamaps.JIT.onPlaceLabelHandler(domElement, node);
            }
    },
    nodeSettings: {
      'customNode': {
        'render': function (node, canvas) {
            var pos = node.pos.getc(true),
                dim = node.getData('dim'),
                cat = node.getData('metacode'),
                greenCircle = node.getData('greenCircle'),
                whiteCircle = node.getData('whiteCircle'),
                ctx = canvas.getCtx();

            // if the topic is from the Commons draw a green circle around it
            if (greenCircle) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, dim + 3, 0, 2 * Math.PI, false);
                ctx.strokeStyle = '#67be5f'; // green
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            // if the topic is on the Canvas draw a white circle around it
            if (whiteCircle) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, dim + 3, 0, 2 * Math.PI, false);
                if (!Metamaps.embed) ctx.strokeStyle = 'white';
                if (Metamaps.embed) ctx.strokeStyle = '#999';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            try {
                ctx.drawImage(imgArray[cat], pos.x - dim, pos.y - dim, dim * 2, dim * 2);
            } catch (e) {
                alert("You've got an entity causing an issue! It's ->this-> one: " + cat);
            }
        },
        'contains': function (node, pos) {
            var npos = node.pos.getc(true),
                dim = node.getData('dim');
            return this.nodeHelper.circle.contains(npos, pos, dim);
        }
      }
    },
    edgeSettings: {
      'customEdge': {
        'render': function (adj, canvas) { Metamaps.JIT.edgeRender(adj, canvas) },
        'contains': function (adj, pos) { 
          var from = adj.nodeFrom.pos.getc(true),
          to = adj.nodeTo.pos.getc(true);
          
          return this.edgeHelper.line.contains(from, to, pos, adj.Edge.epsilon);
        }
      }
    },
    embed: {
      graphSettings: {
    
      },
      nodeSettings: {
      
      },
      edgeSettings: {
        'customEdge': {
          'render': function (adj, canvas) { Metamaps.JIT.edgeRenderEmbed(adj, canvas) },
          'contains': function (adj, pos) { 
            var from = adj.nodeFrom.pos.getc(true),
            to = adj.nodeTo.pos.getc(true);
          
            return this.edgeHelper.line.contains(from, to, pos, adj.Edge.epsilon); 
          }
        }
      }
    }
  }, // ForceDirected
  ForceDirected3D: {
    animate: {
                modes: ['linear'],
                transition: $jit.Trans.Elastic.easeOut,
                duration: 2500,
                onComplete: function () {
                    Metamaps.Visualize.mGraph.busy = false;
                }
    },
    graphSettings: {
    //id of the visualization container
    injectInto: 'infovis',
    type: '3D',
    Scene: {
      Lighting: {
        enable: false,
        ambient: [0.5, 0.5, 0.5],
        directional: {
          direction: { x: 1, y: 0, z: -1 },
          color: [0.9, 0.9, 0.9]
        }
      }
    },
    //Enable zooming and panning
    //by scrolling and DnD
    Navigation: {
      enable: false,
      //Enable panning events only if we're dragging the empty
      //canvas (and not a node).
      panning: 'avoid nodes',
      zooming: 10 //zoom speed. higher is more sensible
    },
    // Change node and edge styles such as
    // color and width.
    // These properties are also set per node
    // with dollar prefixed data-properties in the
    // JSON structure.
    Node: {
      overridable: true,
      type: 'sphere',
      dim: 15,
      color: '#ffffff'
    },
    Edge: {
      overridable: false,
      type: 'tube',
      color: '#111',
      lineWidth: 3
    },
    //Native canvas text styling
    Label: {
      type: 'HTML', //Native or HTML
      size: 10,
      style: 'bold'
    },
    // Add node events
    Events: {
      enable: true,
      type: 'Native',
      i: 0,
      onMouseMove: function(node, eventInfo, e) {
        //if(this.i++ % 3) return;
        var pos = eventInfo.getPos();
        Metamaps.Visualize.cameraPosition.x += (pos.x - Metamaps.Visualize.cameraPosition.x) * 0.5;
        Metamaps.Visualize.cameraPosition.y += (-pos.y - Metamaps.Visualize.cameraPosition.y) * 0.5;
        Metamaps.Visualize.mGraph.plot();
      },
      onMouseWheel: function(delta) {
        Metamaps.Visualize.cameraPosition.z += -delta * 20;
        Metamaps.Visualize.mGraph.plot();
      },
      onClick: function() {}
    },
    //Number of iterations for the FD algorithm
    iterations: 200,
    //Edge length
    levelDistance: 100
  },
    nodeSettings: {
    
    },
    edgeSettings: {
    
    },
    embed: {
      graphSettings: {
    
      },
      nodeSettings: {
      
      },
      edgeSettings: {
    
      }
    }
  },  // ForceDirected3D
  RGraph: {
    animate: {
       modes: ['polar'],
       duration: 2000,
       onComplete: function () {
         Metamaps.Visualize.mGraph.busy = false;
       }
    },
    graphSettings: {
            //id of the visualization container
            injectInto: 'infovis',
            //Enable zooming and panning
            //by scrolling and DnD
            Navigation: {
                enable: true,
                type: 'HTML',
                //Enable panning events only if we're dragging the empty
                //canvas (and not a node).
                panning: 'avoid nodes',
                zooming: 28 //zoom speed. higher is more sensible
            },
            background: {
              type: 'Metamaps',
              CanvasStyles: {
                strokeStyle: '#333',
                lineWidth: 1.5
              }
            },
            //NodeStyles: {  
            //  enable: true,  
            //  type: 'Native',  
            //  stylesHover: {  
            //    dim: 30  
            //  },  
            //  duration: 300  
            //},
            // Change node and edge styles such as
            // color and width.
            // These properties are also set per node
            // with dollar prefixed data-properties in the
            // JSON structure.
            Node: {
                overridable: true,
                color: '#2D6A5D',
                type: 'customNode',
                dim: 25
            },
            Edge: {
                overridable: true,
                color: '#222222',
                type: 'customEdge',
                lineWidth: 2,
                alpha: 0.4
            },
            //Native canvas text styling
            Label: {
                type: 'HTML', //Native or HTML
                size: 20,
                //style: 'bold'
            },
            //Add Tips
            Tips: {
                enable: false,
                onShow: function (tip, node) {}
            },
            // Add node events
            Events: {
                enable: true,
                enableForEdges: true,
                type: 'HTML',
                onMouseMove: function (node, eventInfo, e) {
                    Metamaps.JIT.onMouseMoveHandler(node, eventInfo, e);
                },
                //Update node positions when dragged
                onDragMove: function (node, eventInfo, e) {
                    Metamaps.JIT.onDragMoveTopicHandler(node, eventInfo, e);
                },
                onDragEnd: function (node, eventInfo, e) {
                    Metamaps.JIT.onDragEndTopicHandler(node, eventInfo, e, false);
                },
                onDragCancel: function (node, eventInfo, e) {
                    Metamaps.JIT.onDragCancelHandler(node, eventInfo, e, false);
                },
                //Implement the same handler for touchscreens
                onTouchStart: function (node, eventInfo, e) {
                    //$jit.util.event.stop(e); //stop default touchmove event
                    //Metamaps.Visualize.mGraph.events.onMouseDown(e, null, eventInfo);
                    Metamaps.Visualize.mGraph.events.touched = true;
                    Metamaps.Touch.touchPos = eventInfo.getPos();
                    var canvas = Metamaps.Visualize.mGraph.canvas,
                        ox = canvas.translateOffsetX;
                    oy = canvas.translateOffsetY,
                    sx = canvas.scaleOffsetX,
                    sy = canvas.scaleOffsetY;
                    Metamaps.Touch.touchPos.x *= sx;
                    Metamaps.Touch.touchPos.y *= sy;
                    Metamaps.Touch.touchPos.x += ox;
                    Metamaps.Touch.touchPos.y += oy;

                    touchDragNode = node;
                },
                //Implement the same handler for touchscreens
                onTouchMove: function (node, eventInfo, e) {
                    if (Metamaps.Touch.touchDragNode) Metamaps.JIT.onDragMoveTopicHandler(Metamaps.Touch.touchDragNode, eventInfo, e);
                    else {
                        Metamaps.JIT.touchPanZoomHandler(eventInfo, e);
                        Metamaps.Visualize.mGraph.labels.hideLabel(Metamaps.Visualize.mGraph.graph.getNode(Metamaps.EntityCard.openEntityCard));
                    }
                },
                //Implement the same handler for touchscreens
                onTouchEnd: function (node, eventInfo, e) {

                },
                //Implement the same handler for touchscreens
                onTouchCancel: function (node, eventInfo, e) {

                },
                //Add also a click handler to nodes
                onClick: function (node, eventInfo, e) {

                    if (Metamaps.Mouse.boxStartCoordinates) {
                        Metamaps.Visualize.mGraph.busy = false;
                        Metamaps.Mouse.boxEndCoordinates = eventInfo.getPos();
                        Metamaps.JIT.selectNodesWithBox();
                        return;
                    }

                    if (e.target.id != "infovis-canvas") return false;

                    //clicking on a edge, node, or clicking on blank part of canvas?
                    if (node.nodeFrom) {
                        Metamaps.JIT.selectEdgeOnClickHandler(node, e);
                    } else if (node && !node.nodeFrom) {
                        Metamaps.JIT.selectNodeOnClickHandler(node, e);
                    } else {
                        //topic and synapse editing cards
                        if (!Metamaps.Mouse.didPan) {
                            Metamaps.EntityCard.hideCards();
                        }
                        Metamaps.JIT.canvasDoubleClickHandler(eventInfo.getPos(), e);
                    } //if
                }
            },
            //Number of iterations for the FD algorithm
            iterations: 200,
            //Edge length
            levelDistance: 200,
            // Add text to the labels. This method is only triggered
            // on label creation and only for DOM labels (not native canvas ones).
            onCreateLabel: function (domElement, node) {
                Metamaps.JIT.onCreateLabelHandler(domElement, node);
            },
            // Change node styles when DOM labels are placed or moved.
            onPlaceLabel: function (domElement, node) {
                Metamaps.JIT.onPlaceLabelHandler(domElement, node);
            }
    },
    nodeSettings: {
      'customNode': {
        'render': function (node, canvas) {
            var pos = node.pos.getc(true),
                dim = node.getData('dim'),
                cat = node.getData('metacode'),
                greenCircle = node.getData('greenCircle'),
                whiteCircle = node.getData('whiteCircle'),
                ctx = canvas.getCtx();

            // if the topic is from the Commons draw a green circle around it
            if (greenCircle) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, dim + 3, 0, 2 * Math.PI, false);
                ctx.strokeStyle = '#67be5f'; // green
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            // if the topic is on the Canvas draw a white circle around it
            if (whiteCircle) {
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, dim + 3, 0, 2 * Math.PI, false);
                if (!Metamaps.embed) ctx.strokeStyle = 'white';
                if (Metamaps.embed) ctx.strokeStyle = '#999';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
            try {
                ctx.drawImage(imgArray[cat], pos.x - dim, pos.y - dim, dim * 2, dim * 2);
            } catch (e) {
                alert("You've got an entity causing an issue! It's ->this-> one: " + cat);
            }
        },
        'contains': function (node, pos) {
            var npos = node.pos.getc(true),
                dim = node.getData('dim');
            return this.nodeHelper.circle.contains(npos, pos, dim);
        }
      }
    },
    edgeSettings: {
      'customEdge': {
        'render': function (adj, canvas) { Metamaps.JIT.edgeRender(adj, canvas) },
        'contains': function (adj, pos) { 
          var from = adj.nodeFrom.pos.getc(true),
          to = adj.nodeTo.pos.getc(true);
          
          return this.edgeHelper.line.contains(from, to, pos, adj.Edge.epsilon);
        }
      }
    },
    embed: {
      graphSettings: {
    
      },
      nodeSettings: {
      
      },
      edgeSettings: {
        'customEdge': {
          'render': function (adj, canvas) { Metamaps.JIT.edgeRenderEmbed(adj, canvas) },
          'contains': function (adj, pos) { 
            var from = adj.nodeFrom.pos.getc(true),
            to = adj.nodeTo.pos.getc(true);
          
            return this.edgeHelper.line.contains(from, to, pos, adj.Edge.epsilon);
          }
         }
      }
    }
  },  // RGraph
  addMetacode: function () {
    
    var self = Metamaps.JIT;
    // code from http://www.professorcloud.com/mainsite/carousel-integration.htm
    //mouseWheel:true,
    if (!self.metacodeIMGinit) {
        $("#metacodeImg").CloudCarousel({
            titleBox: $('#metacodeImgTitle'),
            yRadius: 40,
            xPos: 150,
            yPos: 40,
            speed: 0.15,
            mouseWheel: true,
            bringToFront: true
        });
        self.metacodeIMGinit = true;
        $('#entity_inlanguage').typeahead([
         {
            name: 'entities',
            template: '<p>{{value}}</p><div class="type">{{type}}</div><img width="20" height="20" src="{{typeImageURL}}" alt="{{type}}" title="{{type}}"/>',
            remote: {
                url: '/entities/autocomplete_entity_inlanguage?term=%QUERY'
            },
            engine: Hogan
          }
        ]);
        $('#entity_inlanguage').bind('typeahead:selected', function (event, datum, dataset) {
              Metamaps.Entity.getEntityFromAutocomplete(datum.id);
        });
    }
}, // addMetacode  
  onMouseEnter: function (edge) {
    
        $('canvas').css('cursor', 'pointer');
        var edgeIsSelected = Metamaps.Selected.Synapses.indexOf(edge);
        //following if statement only executes if the edge being hovered over is not selected
        if (edgeIsSelected == -1) {
            edge.setData('showDesc', true, 'current');
            edge.setDataset('end', {
                lineWidth: 4,
                alpha: 1
            });
            Metamaps.Visualize.mGraph.fx.animate({
                modes: ['edge-property:lineWidth:color:alpha'],
                duration: 100
            });
            Metamaps.Visualize.mGraph.plot();
        }
    },  // onMouseEnter
  onMouseLeave: function (edge) {
        $('canvas').css('cursor', 'default');
        var edgeIsSelected = Metamaps.Selected.Synapses.indexOf(edge);
        //following if statement only executes if the edge being hovered over is not selected
        if (edgeIsSelected == -1) {
            edge.setData('showDesc', false, 'current');
            edge.setDataset('end', {
                lineWidth: 2,
                alpha: 0.4
            });
            Metamaps.Visualize.mGraph.fx.animate({
                modes: ['edge-property:lineWidth:color:alpha'],
                duration: 100
            });
        }
        Metamaps.Visualize.mGraph.plot();
    },  // onMouseLeave
  onMouseMoveHandler: function (node, eventInfo, e) {
        
        var self = Metamaps.JIT;
        
        if (Metamaps.Visualize.mGraph.busy) return;

        var node = eventInfo.getNode();
        var edge = eventInfo.getEdge();

        //if we're on top of a node object, act like there aren't edges under it
        if (node != false) {
            if (Metamaps.Mouse.edgeHoveringOver) {
                self.onMouseLeave(Metamaps.Mouse.edgeHoveringOver);
            }
            return;
        }

        if (edge == false && Metamaps.Mouse.edgeHoveringOver != false) {
            //mouse not on an edge, but we were on an edge previously
            self.onMouseLeave(Metamaps.Mouse.edgeHoveringOver);
        } else if (edge != false && Metamaps.Mouse.edgeHoveringOver == false) {
            //mouse is on an edge, but there isn't a stored edge
            self.onMouseEnter(edge);
        } else if (edge != false && Metamaps.Mouse.edgeHoveringOver != edge) {
            //mouse is on an edge, but a different edge is stored
            self.onMouseLeave(Metamaps.Mouse.edgeHoveringOver)
            self.onMouseEnter(edge);
        }

        //could be false
        Metamaps.Mouse.edgeHoveringOver = edge;
    },  // onMouseMoveHandler
  enterKeyHandler: function () {
    // this is to submit new entity creation
    if (Metamaps.Create.newEntity.beingCreated) {
        Metamaps.Entity.createEntityLocally();
    } else if (Metamaps.Create.newSynapse.beingCreated) {
        Metamaps.Synapse.createSynapseLocally();
    } else { //this is for when there are nodes from the commons on your graph
        var selectedNodesCopy = Metamaps.Selected.Entities.slice(0);
        var len = selectedNodesCopy.length;
        for (var i = 0; i < len; i += 1) {
            n = selectedNodesCopy[i];
            keepFromCommons(n);
        } //for
        Metamaps.Visualize.mGraph.plot();
    }
  }, //enterKeyHandler
  escKeyHandler: function () {
    Metamaps.Control.deselectAllEdges();
    Metamaps.Control.deselectAllNodes();
  }, //escKeyHandler
  touchPanZoomHandler: function (eventInfo, e) {
    if (e.touches.length == 1) {
        var thispos = Metamaps.Touch.touchPos,
            currentPos = eventInfo.getPos(),
            canvas = Metamaps.Visualize.mGraph.canvas,
            ox = canvas.translateOffsetX,
            oy = canvas.translateOffsetY,
            sx = canvas.scaleOffsetX,
            sy = canvas.scaleOffsetY;
        currentPos.x *= sx;
        currentPos.y *= sy;
        currentPos.x += ox;
        currentPos.y += oy;
        //var x = currentPos.x - thispos.x,
        //    y = currentPos.y - thispos.y;
        var x = currentPos.x - thispos.x,
            y = currentPos.y - thispos.y;
        Metamaps.Touch.touchPos = currentPos;
        Metamaps.Visualize.mGraph.canvas.translate(x * 1 / sx, y * 1 / sy);
    } else if (e.touches.length == 2) {
        var touch1 = e.touches[0];
        var touch2 = e.touches[1];

        var dist = Metamaps.Util.getDistance({
            x: touch1.clientX,
            y: touch1.clientY
        }, {
            x: touch2.clientX,
            y: touch2.clientY
        });

        if (!lastDist) {
            lastDist = dist;
        }

        var scale = dist / lastDist;

        console.log(scale);

        if (8 >= Metamaps.Visualize.mGraph.canvas.scaleOffsetX * scale && Metamaps.Visualize.mGraph.canvas.scaleOffsetX * scale >= 1) {
            Metamaps.Visualize.mGraph.canvas.scale(scale, scale);
        }
        if (Metamaps.Visualize.mGraph.canvas.scaleOffsetX < 0.5) {
            Metamaps.Visualize.mGraph.canvas.viz.labels.hideLabels(true);
        } else if (Metamaps.Visualize.mGraph.canvas.scaleOffsetX > 0.5) {
            Metamaps.Visualize.mGraph.canvas.viz.labels.hideLabels(false);
        }
        lastDist = dist;
    }

},  // touchPanZoomHandler
  onCreateLabelHandler: function (domElement, node) {
    
    var self = Metamaps.JIT;
      
    // Create a 'name' button and add it to the main node label
    var nameContainer = document.createElement('span'),
        style = nameContainer.style;
    nameContainer.className = 'name topic_' + node.id;
    nameContainer.id = 'topic_' + node.id + '_label';

    nameContainer.innerHTML = self.generateLittleHTML(node);
    domElement.appendChild(nameContainer);
    style.fontSize = "0.9em";
    style.color = "#222222"; 

    self.bindNameContainerCallbacks(nameContainer, node);
  },  // onCreateLabelHandler
  onPlaceLabelHandler: function (domElement, node) {
        var style = domElement.style;
        var left = parseInt(style.left);
        var top = parseInt(style.top);
        var w = $('#topic_' + node.id + '_label').width();
        style.left = (left - w / 2) + 'px';
        style.top = (top + 20) + 'px';
        style.display = '';

        // now position the showcard
        if (Metamaps.EntityCard.openEntityCard != null) {
            top = $('#' + Metamaps.EntityCard.openEntityCard).css('top');
            left = parseInt($('#' + Metamaps.EntityCard.openEntityCard).css('left'));
            if (0 != $('#topic_' + Metamaps.EntityCard.openEntityCard + '_label').width()) {
                Metamaps.widthOfLabel = $('#topic_' + Metamaps.EntityCard.openEntityCard + '_label').width();
            }
            w = Metamaps.widthOfLabel / 2;
            left = (left + w) + 'px';
            $('#showcard').css('top', top);
            $('#showcard').css('left', left);

            Metamaps.Visualize.mGraph.labels.hideLabel(Metamaps.Visualize.mGraph.graph.getNode(Metamaps.EntityCard.openEntityCard));
        }
    },  // onPlaceLabelHandler
  bindNameContainerCallbacks: function (nameContainer, node) {
      nameContainer.onmouseover = function () {
          $('.name.topic_' + node.id + ' .nodeOptions').css('display', 'block');
      }

      nameContainer.onmouseout = function () {
          $('.name.topic_' + node.id + ' .nodeOptions').css('display', 'none');
      }

      // add some events to the label
      $(nameContainer).find('.label').click(function (e) {
          Metamaps.EntityCard.showCard(node);
      });
  },  //bindNameContainerCallbacks
  onDragMoveTopicHandler: function (node, eventInfo, e) {
    
    var self = Metamaps.JIT;
    
    if (node && !node.nodeFrom) {
        $('#new_synapse').fadeOut('fast');
        $('#new_entity').fadeOut('fast');
        $("#entity_inlanguage").typeahead('setQuery','');
        Metamaps.Create.newEntity.beingCreated = false;
        Metamaps.Create.newSynapse.beingCreated = false;
        var pos = eventInfo.getPos();
        // if it's a left click, or a touch, move the node
        if (e.touches || (e.button == 0 && !e.altKey && (e.buttons == 0 || e.buttons == 1 || e.buttons == undefined))) {
            //if the node dragged isn't already selected, select it
            var whatToDo = self.handleSelectionBeforeDragging(node, e);
            if (node.pos.rho || node.pos.rho === 0) {
                var rho = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
                var theta = Math.atan2(pos.y, pos.x);
                node.pos.setp(theta, rho);
            } else if (whatToDo == 'only-drag-this-one') {
                node.pos.setc(pos.x, pos.y);
                node.setData('xloc', pos.x);
                node.setData('yloc', pos.y);
            } else {
                var len = Metamaps.Selected.Entities.length;

                //first define offset for each node
                var xOffset = new Array();
                var yOffset = new Array();
                for (var i = 0; i < len; i += 1) {
                    var n = Metamaps.Selected.Entities[i];
                    xOffset[i] = n.pos.x - node.pos.x;
                    yOffset[i] = n.pos.y - node.pos.y;
                } //for

                for (var i = 0; i < len; i += 1) {
                    var n = Metamaps.Selected.Entities[i];
                    var x = pos.x + xOffset[i];
                    var y = pos.y + yOffset[i];
                    n.pos.setc(x, y);
                    n.setData('xloc', x);
                    n.setData('yloc', y);
                } //for
            } //if

            if (whatToDo == 'deselect') {
                Metamaps.Control.deselectNode(node);
            }
            dragged = node.id;
            Metamaps.Visualize.mGraph.plot();
        }
        // if it's a right click or holding down alt, start synapse creation  ->third option is for firefox
        else if ((e.button == 2 || (e.button == 0 && e.altKey) || e.buttons == 2) && userid != null) {
            if (tempInit == false) {
                tempNode = node;
                tempInit = true;
            }
            //
            temp = eventInfo.getNode();
            if (temp != false && temp.id != node.id) { // this means a Node has been returned
                tempNode2 = temp;
                Metamaps.Visualize.mGraph.plot();
                self.renderMidArrow({
                    x: tempNode.pos.getc().x,
                    y: tempNode.pos.getc().y
                }, {
                    x: temp.pos.getc().x,
                    y: temp.pos.getc().y
                }, 13, false, Metamaps.Visualize.mGraph.canvas);
                // before making the highlighted one bigger, make sure all the others are regular size
                Metamaps.Visualize.mGraph.graph.eachNode(function (n) {
                    n.setData('dim', 25, 'current');
                });
                temp.setData('dim', 35, 'current');
                Metamaps.Visualize.mGraph.fx.plotNode(tempNode, Metamaps.Visualize.mGraph.canvas);
                Metamaps.Visualize.mGraph.fx.plotNode(temp, Metamaps.Visualize.mGraph.canvas);
            } else if (!temp) {
                tempNode2 = null;
                Metamaps.Visualize.mGraph.graph.eachNode(function (n) {
                    n.setData('dim', 25, 'current');
                });
                //pop up node creation :)
                $('#entity_grabTopic').val("null");
                var myX = e.clientX - 110;
                var myY = e.clientY - 30;
                $('#new_entity').css('left', myX + "px");
                $('#new_entity').css('top', myY + "px");
                $('#new_synapse').css('left', myX + "px");
                $('#new_synapse').css('top', myY + "px");
                $('#entity_x').val(eventInfo.getPos().x);
                $('#entity_y').val(eventInfo.getPos().y);
                Metamaps.Visualize.mGraph.plot();
                self.renderMidArrow({
                    x: tempNode.pos.getc().x,
                    y: tempNode.pos.getc().y
                }, {
                    x: pos.x,
                    y: pos.y
                }, 13, false, Metamaps.Visualize.mGraph.canvas);
                Metamaps.Visualize.mGraph.fx.plotNode(tempNode, Metamaps.Visualize.mGraph.canvas);
            }
        }
    }
  },  // onDragMoveTopicHandler
  onDragCancelHandler: function (node, eventInfo, e, centred) {
        tempNode = null;
        tempNode2 = null;
        tempInit = false;

        //not sure why this doesn't happen for centred graphs
        if (!centred) {
            $('#topic_addSynapse').val("false");
            $('#topic_topic1id').val(0);
            $('#topic_topic2id').val(0);
        }
        Metamaps.Visualize.mGraph.plot();
  },  // onDragCancelHandler
  onDragEndTopicHandler: function (node, eventInfo, e, allowRealtime) {
        if (tempInit && tempNode2 == null) {
            Metamaps.Create.newEntity.addSynapse = true;
            $('#new_entity').fadeIn('fast');
            Metamaps.Create.newEntity.beingCreated = true;
            Metamaps.JIT.addMetacode();
            $('#topic_name').focus();
        } else if (tempInit && tempNode2 != null) {
            Metamaps.Create.newEntity.addSynapse = false;
            Metamaps.Create.newSynapse.topic1id = tempNode.id;
            Metamaps.Create.newSynapse.topic2id = tempNode2.id;
            Metamaps.Create.newSynapse.open();
            Metamaps.Create.newSynapse.beingCreated = true
            tempNode = null;
            tempNode2 = null;
            tempInit = false;
        } // else if (dragged != 0 && goRealtime) {
          //  saveLayout(dragged);
          //  for (var i = 0; i < Metamaps.Selected.Entities.length; i++) {
          //      saveLayout(Metamaps.Selected.Entities[i].id);
          //  }
        // }
    }, //onDragEndTopicHandler
  canvasDoubleClickHandler: function (canvasLoc, e) {
    //grab the location and timestamp of the click 
    var storedTime = Metamaps.Mouse.lastCanvasClick;
    var now = Date.now(); //not compatible with IE8 FYI 
    Metamaps.Mouse.lastCanvasClick = now;

    if (now - storedTime < Metamaps.Mouse.DOUBLE_CLICK_TOLERANCE) {
        //pop up node creation :) 
        Metamaps.Create.newEntity.addSynapse = false;
        Metamaps.Create.newEntity.x = canvasLoc.x;
        Metamaps.Create.newEntity.y = canvasLoc.y;
        $('#new_entity').css('left', e.clientX + "px");
        $('#new_entity').css('top', e.clientY + "px");
        $('#new_entity').fadeIn('fast');
        Metamaps.Create.newEntity.beingCreated = true;
        Metamaps.JIT.addMetacode();
        $('#entity_inlanguage').focus();
    } else {
        $('#new_entity').fadeOut('fast');
        $("#entity_inlanguage").typeahead('setQuery','');
        Metamaps.Create.newEntity.beingCreated = false;
        $('#new_synapse').fadeOut('fast');
        Metamaps.Create.newSynapse.beingCreated = false;
        tempInit = false;
        tempNode = null;
        tempNode2 = null;
        Metamaps.Visualize.mGraph.plot();
    }
}, //canvasDoubleClickHandler 
  nodeDoubleClickHandler: function (node, e) {
    // keepFromCommons(node);  update this when 'seek' is working again
},  // nodeDoubleClickHandler
  nodeWasDoubleClicked: function () {
    //grab the timestamp of the click 
    var storedTime = Metamaps.Mouse.lastNodeClick;
    var now = Date.now(); //not compatible with IE8 FYI 
    Metamaps.Mouse.lastNodeClick = now;

    if (now - storedTime < Metamaps.Mouse.DOUBLE_CLICK_TOLERANCE) {
        return true;
    } else {
        return false;
    }
}, //nodeWasDoubleClicked;
  handleSelectionBeforeDragging: function (node, e) {
    // four cases:
    // 1 nothing is selected, so pretend you aren't selecting
    // 2 others are selected only and shift, so additionally select this one
    // 3 others are selected only, no shift: drag only this one
    // 4 this node and others were selected, so drag them (just return false)
    //return value: deselect node again after?
    if (Metamaps.Selected.Entities.length == 0) {
        Metamaps.Control.selectNode(node);
        return 'deselect';
    }
    if (Metamaps.Selected.Entities.indexOf(node) == -1) {
        if (e.shiftKey) {
            Metamaps.Control.selectNode(node);
            return 'nothing';
        } else {
            return 'only-drag-this-one';
        }
    }
    return 'nothing'; //case 4?
},  //  handleSelectionBeforeDragging
  selectNodesWithBox: function () {

        var sX = Metamaps.Mouse.boxStartCoordinates.x,
            sY = Metamaps.Mouse.boxStartCoordinates.y,
            eX = Metamaps.Mouse.boxEndCoordinates.x,
            eY = Metamaps.Mouse.boxEndCoordinates.y;


        Metamaps.Visualize.mGraph.graph.eachNode(function (n) {
            var x = n.pos.x,
                y = n.pos.y;

            if ((sX < x && x < eX && sY < y && y < eY) || (sX > x && x > eX && sY > y && y > eY) || (sX > x && x > eX && sY < y && y < eY) || (sX < x && x < eX && sY > y && y > eY)) {
                var nodeIsSelected = Metamaps.Selected.Entities.indexOf(n);
                if (nodeIsSelected == -1) Metamaps.Control.selectNode(n); // the node is not selected, so select it
                else if (nodeIsSelected != -1) Metamaps.Control.deselectNode(n); // the node is selected, so deselect it

            }
        });

        Metamaps.Mouse.boxStartCoordinates = false;
        Metamaps.Mouse.boxEndCoordinates = false;
        Metamaps.Visualize.mGraph.plot();
    }, // selectNodesWithBox
  drawSelectBox: function (eventInfo, e) {
        var ctx = Metamaps.Visualize.mGraph.canvas.getCtx();

        var startX = Metamaps.Mouse.boxStartCoordinates.x,
            startY = Metamaps.Mouse.boxStartCoordinates.y,
            currX = eventInfo.getPos().x,
            currY = eventInfo.getPos().y;

        Metamaps.Visualize.mGraph.canvas.clear();
        Metamaps.Visualize.mGraph.plot();

        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX, currY);
        ctx.lineTo(currX, currY);
        ctx.lineTo(currX, startY);
        ctx.lineTo(startX, startY);
        ctx.strokeStyle = "black";
        ctx.stroke();
    },  // drawSelectBox
  selectNodeOnClickHandler: function (node, e) {
    if (Metamaps.Visualize.mGraph.busy) return;
    
    var self = Metamaps.JIT;

    if (self.nodeWasDoubleClicked()) {
        self.nodeDoubleClickHandler(node, e);
        return;
    }

    //set final styles
    if (!e.shiftKey) {
        Metamaps.Visualize.mGraph.graph.eachNode(function (n) {
            if (n.id != node.id) {
                Metamaps.Control.deselectNode(n);
            }
        });
    }
    if (node.selected) {
        Metamaps.Control.deselectNode(node);
    } else {
        Metamaps.Control.selectNode(node);
    }
    //trigger animation to final styles
    Metamaps.Visualize.mGraph.fx.animate({
        modes: ['edge-property:lineWidth:color:alpha'],
        duration: 500
    });
    Metamaps.Visualize.mGraph.plot();
  }, //selectNodeOnClickHandler
  selectEdgeOnClickHandler: function (adj, e) {
    if (Metamaps.Visualize.mGraph.busy) return;

    //editing overrides everything else
    if (e.altKey) {
        //in select-edit-delete-nodes-and-edges.js
        // editEdge(adj, e);  TODO need to find and reimplement this function
        return;
    }

    var edgeIsSelected = Metamaps.Selected.Synapses.indexOf(adj);
    if (edgeIsSelected == -1) edgeIsSelected = false;
    else if (edgeIsSelected != -1) edgeIsSelected = true;

    if (edgeIsSelected && e.shiftKey) {
        //deselecting an edge with shift
        Metamaps.Control.deselectEdge(adj);
    } else if (!edgeIsSelected && e.shiftKey) {
        //selecting an edge with shift
        Metamaps.Control.selectEdge(adj);
    } else if (edgeIsSelected && !e.shiftKey) {
        //deselecting an edge without shift - unselect all
        Metamaps.Control.deselectAllEdges();
    } else if (!edgeIsSelected && !e.shiftKey) {
        //selecting an edge without shift - unselect all but new one
        Metamaps.Control.deselectAllEdges();
        Metamaps.Control.selectEdge(adj);
    }

    Metamaps.Visualize.mGraph.plot();
}, //selectEdgeOnClickHandler
  SmoothPanning: function () {

    var sx = Metamaps.Visualize.mGraph.canvas.scaleOffsetX,
        sy = Metamaps.Visualize.mGraph.canvas.scaleOffsetY,
        y_velocity = Metamaps.Mouse.changeInY, // initial y velocity
        x_velocity = Metamaps.Mouse.changeInX, // initial x velocity
        easing = 1; // frictional value

    easing = 1;
    window.clearInterval(panningInt)
    panningInt = setInterval(function () {
        myTimer()
    }, 1);

    function myTimer() {
        Metamaps.Visualize.mGraph.canvas.translate(x_velocity * easing * 1 / sx, y_velocity * easing * 1 / sy);
        easing = easing * 0.75;

        if (easing < 0.1) window.clearInterval(panningInt);
    }
}, // SmoothPanning
  generateLittleHTML: function (node) {
    var littleHTML = '                                                          \
    <div class="label">$_name_$</div>                                         \
      <div class="nodeOptions">';

    if (userid == null || !Metamaps.Active.isMap || !mapperm) {
        //unauthenticated, not on a map: can remove from canvas
        littleHTML += '                                                           \
        <span class="removeFromCanvas"                                        \
              onclick="Metamaps.Control.hideNode($_id_$)"                                      \
              title="Click to remove topic from canvas">                      \
        </span>';
    } else if (mapperm) {
        //permission to remove nodes from the map
        littleHTML += '                                                           \
        <span class="removeFromCanvas"                                        \
                 onclick="Metamaps.Control.hideNode($_id_$)"                                   \
                 title="Click to remove topic from canvas">                   \
        </span>                                                               \
        <span class="removeFromMap"                                           \
                 onclick="Metamaps.Control.removeNode($_id_$)"                                 \
                 title="Click to remove topic from map">                      \
        </span>';
    }

    if (userid == node.getData('userid')) {
        //logged in, and owner of the topic, thus permission to delete
        littleHTML += '                                                          \
        <span class="deleteTopic"                                            \
                 onclick=""                                       \
                 title="Click to delete this topic">                         \
        </span>';
    }
    littleHTML += '</div>';
    littleHTML = littleHTML.replace(/\$_id_\$/g, node.id);
    littleHTML = littleHTML.replace(/\$_mapid_\$/g, Metamaps.Active.Entity.id);
    littleHTML = littleHTML.replace(/\$_name_\$/g, node.name);

    return littleHTML;
}, // generateLittleHTML
  renderMidArrow: function (from, to, dim, swap, canvas) {
    var ctx = canvas.getCtx();
    // invert edge direction 
    if (swap) {
        var tmp = from;
        from = to;
        to = tmp;
    }
    // vect represents a line from tip to tail of the arrow 
    var vect = new $jit.Complex(to.x - from.x, to.y - from.y);
    // scale it 
    vect.$scale(dim / vect.norm());
    // compute the midpoint of the edge line 
    var midPoint = new $jit.Complex((to.x + from.x) / 2, (to.y + from.y) / 2);
    // move midpoint by half the "length" of the arrow so the arrow is centered on the midpoint 
    var arrowPoint = new $jit.Complex((vect.x / 0.7) + midPoint.x, (vect.y / 0.7) + midPoint.y);
    // compute the tail intersection point with the edge line 
    var intermediatePoint = new $jit.Complex(arrowPoint.x - vect.x, arrowPoint.y - vect.y);
    // vector perpendicular to vect 
    var normal = new $jit.Complex(-vect.y / 2, vect.x / 2);
    var v1 = intermediatePoint.add(normal);
    var v2 = intermediatePoint.$add(normal.$scale(-1));

    //ctx.strokeStyle = "#222222";
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(v1.x, v1.y);
    ctx.lineTo(arrowPoint.x, arrowPoint.y);
    ctx.lineTo(v2.x, v2.y);
    ctx.stroke();
}, // renderMidArrow
  renderEdgeArrows: function (edgeHelper, adj) {
    
    var self = Metamaps.JIT;
    
    var canvas = Metamaps.Visualize.mGraph.canvas;
    var directionCat = adj.getData('category');
    var direction = adj.getData('direction');
    var pos = adj.nodeFrom.pos.getc(true);
    var posChild = adj.nodeTo.pos.getc(true);

    //plot arrow edge 
    if (directionCat == "none") {
        edgeHelper.line.render({
            x: pos.x,
            y: pos.y
        }, {
            x: posChild.x,
            y: posChild.y
        }, canvas);
    } else if (directionCat == "both") {
        self.renderMidArrow({
            x: pos.x,
            y: pos.y
        }, {
            x: posChild.x,
            y: posChild.y
        }, 13, true, canvas);
        self.renderMidArrow({
            x: pos.x,
            y: pos.y
        }, {
            x: posChild.x,
            y: posChild.y
        }, 13, false, canvas);
    } else if (directionCat == "from-to") {
        var direction = adj.data.$direction;
        var inv = (direction && direction.length > 1 && direction[0] != adj.nodeFrom.id);
        self.renderMidArrow({
            x: pos.x,
            y: pos.y
        }, {
            x: posChild.x,
            y: posChild.y
        }, 13, inv, canvas);
    }
  } //renderEdgeArrows
};
Metamaps.Junto = {
  on: false, // whether the video is on or not
  room: null, // this will be the same as the URL i.e. /entities/731
  webrtc: null,
  init: function() {
      var self = Metamaps.Junto;
      
      self.room = location.pathname;
      
      // create our webrtc connection
      self.webrtc = new SimpleWebRTC({
          // the id/element dom element that will hold "our" video
          localVideoEl: 'localVideo',
          // the id/element dom element that will hold remote videos
          remoteVideosEl: 'remoteVideos',
          // immediately ask for camera access
          autoRequestMedia: true,
          log: true
      });
      $('#localVideo, #remoteVideos').draggable();
       
       // when it's ready, join
       //self.webrtc.on('readyToCall', function () {
      //   self.webrtc.joinRoom(self.room);
       //});
       self.webrtc.joinRoom(self.room);
       $('.runFunctions .video').html('Stop Video');
  },
  end: function() {
    var self = Metamaps.Junto;
    
    self.webrtc.connection.emit('leave', self.room);
    self.webrtc.webrtc.peers.forEach(function (peer) {
        peer.end();
    });
    self.webrtc = {};
    $('#localVideo video').remove();
  },
  switch: function() {
    var self = Metamaps.Junto;
    
    if (self.on) {
      self.end();
      $('.runFunctions .video').html('Start Video');
      self.on = false;
    }
    else if (!self.on) {
      self.init();
      $('.runFunctions .video').html('Stop Video');
      self.on = true;
    }
  }
};
Metamaps.Listeners = {
  init: function(){
    $('*').keypress(function(e) {
      switch(e.which) {
        case 13: Metamaps.JIT.enterKeyHandler(); e.preventDefault(); break;
        case 27: Metamaps.JIT.escKeyHandler(); break;
        default: break; //alert(e.which);
      }
    });

    $(window).resize(function() {
      Metamaps.Visualize.mGraph.canvas.resize($(window).width(), $(window).height());
    });
  }
};
// this stores an array of entities that have been created locally in a sandbox mode and aren't yet written to the database
// the implications of this are that they don't have database unique entity ID's
Metamaps.LocalEntities = [];
Metamaps.Mouse = {
  didPan: false,
  changeInX: 0,
  changeInY: 0,
  edgeHoveringOver: false,
  boxStartCoordinates: false,
  boxEndCoordinates: false,
  lastNodeClick: 0,
  lastCanvasClick: 0,
  DOUBLE_CLICK_TOLERANCE: 300  
};
Metamaps.Organize = {
    
};
Metamaps.Selected = {
  Entities: [],
  Synapses: []
};
Metamaps.Settings = {
  realtime: false,  // indicates whether the user wants to be playing in the app with realtime updates to their entities
  embed: false,  // indicates that the app is on a page that is optimized for embedding in iFrames on other web pages
  sandbox: false // puts the app into a mode (when true) where it only creates data locally, and isn't writing it to the database
};

Metamaps.Synapse = {
  createSynapseLocally: function () {
       var self = Metamaps.Synapse;
    
        var d, synapse_in_language, relationID, temp, temp1, temp2;

        $("#new_synapse").fadeOut("fast");
        Metamaps.Create.newSynapse.beingCreated = false;
        relationID = $('#synapse_relation_id').val();
        synapse_in_language = $("#synapse_relation_id option[value='" + relationID + "']").text();
        temp1 = Metamaps.Visualize.mGraph.graph.getNode(Metamaps.Create.newSynapse.topic1id);
        temp2 = Metamaps.Visualize.mGraph.graph.getNode(Metamaps.Create.newSynapse.topic2id);
        Metamaps.Visualize.mGraph.graph.addAdjacence(temp1, temp2, {});
        temp = Metamaps.Visualize.mGraph.graph.getAdjacence(temp1.id, temp2.id);
        temp.setDataset("start", {
            lineWidth: 0.4
        });
        temp.setDataset("end", {
            lineWidth: 2
        });
        d = new Array(temp1.id, temp2.id);
        temp.setDataset("current", {
            desc: synapse_in_language,
            showDesc: false,
            category: "from-to",
            id: "",
            userid: "1234",
            username: "Connor", //TODO
            permission: "commons" //TODO
        });
        temp.data.$direction = d;
        Metamaps.Visualize.mGraph.fx.plotLine(temp, Metamaps.Visualize.mGraph.canvas);
        Metamaps.Control.selectEdge(temp);
        Metamaps.Create.newEntity.addSynapse = false;
        Metamaps.Create.newSynapse.topic1id = 0;
        Metamaps.Create.newSynapse.topic2id = 0;
        if (!Metamaps.Create.sandbox) {
            if (Metamaps.Active.isMap) {
                self.createSynapseInDatabase(temp1.data.$id, relationID, temp2.data.$id, true);
            }
            else if (!Metamaps.Active.isMap) {
                self.createSynapseInDatabase(temp1.data.$id, relationID, temp2.data.$id, false);
            }
        }
  },
  createSynapseInDatabase: function (entity1_id, relationID, entity2_id, saveToMap) {
        var data, metadata;
        var self = Metamaps.Field;

        data = {};
        metadata = {};
        metadata["entity1_id"] = entity1_id;
        metadata["relation_id"] = relationID;
        metadata["entity2_id"] = entity2_id;
        data["synapse"] = metadata;
        return $.ajax({
            type: "POST",
            url: "/synapses.json",
            data: data,
            success: (function (data, textStatus, jqXHR) {
                Metamaps.Create.newSynapse.newSynapseId = data.id;
                if (saveToMap) {
                  self.createFieldInDatabase("synapse", data.id, 19, "references_val_id", Metamaps.Active.Entity.id, false);
                }
            }),
            async: false
        });
  },
  // this function is to retrieve a Field JSON object from the database
  // @param id = the id of the field to retrieve
   get: function(id) {
     // if the desired field is not yet in the local field repository, fetch it
     if (Metamaps.Synapses[id] == undefined) { 
       var e = $.ajax({
         url: "/synapses/" + id + ".json",
         async: false,
       });
       Metamaps.Synapses[id] = $.parseJSON(e.responseText);
     }
     
     return Metamaps.Synapses[id];
  },
  getFirstValue: function(synapseID, relationID) {
    var self = Metamaps.Synapse;
    
    var f = self.get(synapseID);
    var allRelationInfo = f[relationID];
    
    // cover possible error cases
    if (allRelationInfo === undefined) {
      alert('This entity does not have any of that type of metadata! Please go jump in a pond.');
      return;
    }
    
    if (allRelationInfo[0]['direction'][0] == "expressed in English") {
      return allRelationInfo[1][0];
    } 
    else if (allRelationInfo[4] != undefined && allRelationInfo[0]['direction'][1] == "expressed in English") {
      return allRelationInfo[4][0];
    }
    else {
      return false; // means there are no values for the property of specific interest
    }
  },
  updateSynapseInDatabase: function (id, valueType, value) {
        var data, metadata;
        data = {};
        metadata = {};
        metadata[valueType] = value;
        data["field"] = metadata;
        return $.ajax({
            type: "PUT",
            url: "fields/" + (id = ".json"),
            data: data,
            success: (function (data, textStatus, jqXHR) {})
        });
  },
};
Metamaps.Synapses = {};

Metamaps.SynapseCard = {
  openSynapseCard: null
};
Metamaps.Touch = {
  touchPos: null,  // this stores the x and y values of a current touch event 
  touchDragNode: null // this stores a reference to a JIT node that is being dragged
};
Metamaps.Util = {
  decodeEntities: function (desc) {
        var str, temp = document.createElement('p');
        temp.innerHTML = desc; //browser handles the entities
        str = temp.textContent || temp.innerText;
        temp = null; //delete the element;
        return str;
  }, //decodeEntities
  getDistance: function (p1, p2) {
      return Math.sqrt(Math.pow((p2.x - p1.x), 2) + Math.pow((p2.y - p1.y), 2));
  },
  generateOptionsList: function (data) {
    var newlist = "";
    for ( var i=0; i<data.length; i++ ){
      newlist = newlist + '<option value="' + data[i]['id'] + '">' + data[i]['1'][1]+'</option>';
    }
    return newlist;
  }
};
Metamaps.View = {
  gridIsOpen: false,
  init: function() {
    var $container = $('#isotope-container');
      
    $container.isotope({
       itemSelector: '.element'
    });
    
    //position the grid hidden at the bottom of the page
    $('.grid').css('position','fixed');
    $('.grid').css('top',$(window).height() + 'px');
    $('.grid').css('height',$(window).height() + 'px');
  },
  switch: function() {
    var self = Metamaps.View;
    if (!self.gridIsOpen) {
      Metamaps.View.gridIsOpen = true;
      $('.grid').animate({
        top: '0px'
      }, 1000, function() {
        
      });
    }
    else if (self.gridIsOpen)  {
      Metamaps.View.gridIsOpen = false;
      var windowHeight = $(window).height() + 'px';
      $('.grid').animate({
        top: windowHeight
      }, 1000, function() {
        
      });
    }
  }
};
Metamaps.Visualize = {
  mGraph: {}, // a reference to the graph object.
  cameraPosition: null, // stores the camera position when using a 3D visualization
  type: "ForceDirected", // the type of graph we're building, could be "RGraph", "ForceDirected", or "ForceDirected3D"
  savedLayout: false, // indicates whether the map has a saved layout or not
  loadLater: false, // indicates whether there is JSON that should be loaded right in the offset, or whether to wait till the first entity is created
  target: null, // the selector representing the location to render the graph
  hideLabels: true, // a flag used to toggle the display of labels on annotated concepts.
  init: function() {
            var self = Metamaps.Visualize;
            // disable awkward dragging of the canvas element that would sometimes happen
            $('#infovis-canvas').on('dragstart', function (event) {
              event.preventDefault();
            });
            
            // prevent touch events on the canvas from default behaviour
            $("#infovis-canvas").bind('touchstart', function (event) {
                event.preventDefault();
                self.mGraph.events.touched = true;
            });

            // prevent touch events on the canvas from default behaviour
            $("#infovis-canvas").bind('touchmove', function (event) {
                //Metamaps.JIT.touchPanZoomHandler(event);
            });

            // prevent touch events on the canvas from default behaviour
            $("#infovis-canvas").bind('touchend touchcancel', function (event) {
                lastDist = 0;
                if (!self.mGraph.events.touchMoved && !Metamaps.Touch.touchDragNode) Metamaps.EntityCard.hideCurrentCard();
                self.mGraph.events.touched = self.mGraph.events.touchMoved = false;
                Metamaps.Touch.touchDragNode = false;
            });
  },
  render: function(targetID, vizData) {
        var self = Metamaps.Visualize;
        // reset the state of the toggle label display checkbox and internal state
        self.hideLabels =  true;
        self.mGraph = {};
        self.target = targetID;
        Metamaps.Create.newEntity.newId = vizData.length + 1;
        self.__buildGraph(vizData);
  },
  computePositions: function() {
         var self = Metamaps.Visualize;
         if (self.type == "RGraph") {
            self.mGraph.graph.eachNode(function (n) {
                var pos = n.getPos();
                pos.setc(-200, -200);
            });
            self.mGraph.compute('end');
          } else if (self.type == "ForceDirected" && self.savedLayout) {  // TODO
            self.mGraph.graph.eachNode(function (n) {
                var e = Metamaps.Entity.get(n.data.$id);
                var id = Metamaps.Active.Entity.id;
                var fid;
                for (var i = 0; i < e['14'][2].length; i++) {
                  if (e['14'][2][i] === id) {
                    fid = e['14'][3][i];
                  }
                }
                var f = Metamaps.Field.get(fid)
                var pos = n.getPos();
                pos.setc(0, 0);
                var newPos = new $jit.Complex();
                newPos.x = Metamaps.Field.getFirstValue(fid,94);
                console.log(newPos.x);
                newPos.y = Metamaps.Field.getFirstValue(fid,95);
                n.setPos(newPos, 'end');
                console.log(newPos.y);
            });
          } else if (self.type == "ForceDirected3D" || !self.savedLayout) {
            self.mGraph.compute();
          }
  },
  /**
   * __buildGraph does the heavy lifting of creating the engine that renders the graph with the properties we desire
   *
   * @param vizData a json structure containing the data to be rendered.
   */
  __buildGraph: function (vizData) {
        var self = Metamaps.Visualize;
        
        // normally this will be true, and will enter into this first scenario
        if (!Metamaps.Settings.embed) {
          if (self.type == "RGraph") {
            $jit.RGraph.Plot.NodeTypes.implement(Metamaps.JIT.RGraph.nodeSettings);
            $jit.RGraph.Plot.EdgeTypes.implement(Metamaps.JIT.RGraph.edgeSettings);
            self.mGraph = new $jit.RGraph(Metamaps.JIT.RGraph.graphSettings);
          } else if (self.type == "ForceDirected") {
            $jit.ForceDirected.Plot.NodeTypes.implement(Metamaps.JIT.ForceDirected.nodeSettings);
            $jit.ForceDirected.Plot.EdgeTypes.implement(Metamaps.JIT.ForceDirected.edgeSettings);
            self.mGraph = new $jit.ForceDirected(Metamaps.JIT.ForceDirected.graphSettings);
          } else if (self.type == "ForceDirected3D") {
            // init ForceDirected3D
            self.mGraph = new $jit.ForceDirected3D(Metamaps.JIT.ForceDirected3D.graphSettings);
            self.cameraPosition = self.mGraph.canvas.canvases[0].camera.position;
          } 
        }
        else {  // in the case where these visualizations are to be embedded in other sites  TODO
          if (self.type == "RGraph") {
            $jit.RGraph.Plot.NodeTypes.implement(Metamaps.JIT.RGraph.embed.nodeSettings);
            $jit.RGraph.Plot.EdgeTypes.implement(Metamaps.JIT.RGraph.embed.edgeSettings);
            self.mGraph = new $jit.RGraph(Metamaps.JIT.RGraph.embed.graphSettings);
          } else if (self.type == "ForceDirected") {
            $jit.ForceDirected.Plot.NodeTypes.implement(Metamaps.JIT.ForceDirected.embed.nodeSettings);
            $jit.ForceDirected.Plot.EdgeTypes.implement(Metamaps.JIT.ForceDirected.embed.edgeSettings);
            self.mGraph = new $jit.ForceDirected(Metamaps.JIT.ForceDirected.embed.graphSettings);
          } else if (self.type == "ForceDirected3D") {
            // init ForceDirected3D
            self.mGraph = new $jit.ForceDirected3D(Metamaps.JIT.ForceDirected3D.embed.graphSettings);
            self.cameraPosition = self.mGraph.canvas.canvases[0].camera.position;
          } 
        }
        
        // load JSON data, if it's not empty
        if (!self.loadLater) {
          //load JSON data.
          self.mGraph.loadJSON(vizData);
          //compute positions and plot.
          self.computePositions();
          if (self.type == "RGraph") {
              self.mGraph.fx.animate(Metamaps.JIT.RGraph.animate);
           } else if (self.type == "ForceDirected" && self.savedLayout) {
             self.mGraph.animate(Metamaps.JIT.ForceDirected.animateSavedLayout);
           } else if (self.type == "ForceDirected3D" || !self.savedLayout) {
             self.mGraph.animate(Metamaps.JIT.ForceDirected.animateFDLayout);
           }
        }
  }
};

$(document).ready(function(){
  Metamaps.Create.newEntity.init();
  Metamaps.Create.newSynapse.init();
  Metamaps.JIT.init();
  Metamaps.Listeners.init();
  Metamaps.Control.init();
  Metamaps.View.init();
  Metamaps.Visualize.init();
});
