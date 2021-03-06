
var root;


root = $.getJSON( "data/reverseinference.json", function(root){

    var margin = {top: 20, right: 120, bottom: 20, left: 120},
        width = 960 - margin.right - margin.left,
        height = 800 - margin.top - margin.bottom;
    
    var i = 0,
        duration = 750,
        root;

    var tree = d3.layout.tree()
        .size([height, width]);

    var diagonal = d3.svg.diagonal()
        .projection(function(d) { return [d.y, d.x]; });

    var svg = d3.select("#tree").append("svg")
        .attr("width", width + margin.right + margin.left)
        .attr("height", height + margin.top + margin.bottom)
      .append("g")
         .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

 
    root.x0 = height / 2;
    root.y0 = 0;


    root.children.forEach(collapse);
    update(root);

    d3.select(self.frameElement).style("height", "800px");


    function collapse(d) {
        if (d.children) {
            d._children = d.children;
            d._children.forEach(collapse);
            d.children = null;
        }
     }


    function update(source) {

        // Compute the new tree layout.
        var nodes = tree.nodes(root).reverse(),
            links = tree.links(nodes);

       // Normalize for fixed-depth.
       nodes.forEach(function(d) { d.y = d.depth * 180; });

      // Update the nodes…
      var node = svg.selectAll("g.node")
          .data(nodes, function(d) { return d.id || (d.id = ++i); });

      // Enter any new nodes at the parent's previous position.
      var nodeEnter = node.enter().append("g")
          .attr("class", "node")
          .attr("transform", function(d) { return "translate(" + source.y0 + "," + source.x0 + ")"; })
          .on("click", click);

      nodeEnter.append("circle")
          .attr("r", 1e-6)
          .style("fill", function(d) { 
              if (d.meta[0]){
                    if (d.meta[0].type=="nii"){ // NeuroVault Color
                        return d._children ? "cornflowerblue" : "#fff";
                    }
               }; // Cognitive Atlas Color
               return d._children ? "darkcyan" : "#fff"; 
           })
          .on("mouseover",info);


      nodeEnter.append("text")
          .attr("x", function(d) { return d.children || d._children ? -10 : 10; })
          .attr("dy", ".35em")
          .attr("text-anchor", function(d) { return d.children || d._children ? "end" : "start"; })
          .text(function(d) { return d.name; })
          .style("fill-opacity", 1e-6);

      // Transition nodes to their new position.
      var nodeUpdate = node.transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + d.y + "," + d.x + ")"; });

      nodeUpdate.select("circle")
          .attr("r", 4.5)
          .style("fill", function(d) { return d._children ? "lightsteelblue" : "#fff"; });

      nodeUpdate.select("text")
          .style("fill-opacity", 1);

      // Transition exiting nodes to the parent's new position.
      var nodeExit = node.exit().transition()
          .duration(duration)
          .attr("transform", function(d) { return "translate(" + source.y + "," + source.x + ")"; })
          .remove();

      nodeExit.select("circle")
          .attr("r", 1e-6);

      nodeExit.select("text")
          .style("fill-opacity", 1e-6);

      // Update the links…
      var link = svg.selectAll("path.link")
          .data(links, function(d) { return d.target.id; });

      // Enter any new links at the parent's previous position.
      link.enter().insert("path", "g")
          .attr("class", "link")
          .attr("d", function(d) {
                var o = {x: source.x0, y: source.y0};
                return diagonal({source: o, target: o});
           });

      // Transition links to their new position.
      link.transition()
          .duration(duration)
          .attr("d", diagonal);

      // Transition exiting nodes to the parent's new position.
      link.exit().transition()
          .duration(duration)
          .attr("d", function(d) {
              var o = {x: source.x, y: source.y};
              return diagonal({source: o, target: o});
          })
          .remove();

      // Stash the old positions for transition.
      nodes.forEach(function(d) {
          d.x0 = d.x;
          d.y0 = d.y;
      });
    }

    // Toggle children on click.
    function click(d) {
        if (d.children) {
            d._children = d.children;
            d.children = null;
        } else {
            d.children = d._children;
            d._children = null;
        }
        update(d);
     }

    // Show information on mouseover
    function info(d) {

       // Always first hide detail link
       $("#node_detail").addClass("hidden");
       $("#node_task").addClass("hidden")
       $("#node_contrast").addClass("hidden")
       $("#node_concepts").addClass("hidden")
       $("#node_name_link").attr("href",d.meta[0].url)
       $("#node_name_link").attr("target","_blank")
       
       // Update the interface with name and description
       if (d.meta[0].description){
           $("#node_description").text(d.meta[0].description);
       } else {
           $("#node_description").text("");
       }
       // Download Link
       if (d.meta[0].download){
           $("#node_download").attr("href",d.meta[0].download);
           $("#node_download").removeClass("hidden");
       } else {
           $("#node_download").addClass("hidden");
       }

       // Image Thumbnail
       if (d.meta[0].thumbnail){
           $("#node_image").attr("src",d.meta[0].thumbnail)
           $("#node_image_holder").attr("href",d.meta[0].url)
           $("#node_image_holder").removeClass("hidden")
       } else {
           $("#node_image_holder").addClass("hidden")
       }

       // ##### COGNITIVE ATLAS CONCEPT
       if (d.meta[0].type == "concept"){

           // Concept Name
           $("#node_name").text(d.name);
           
           $("#scores").addClass("hidden");
               
       // ##### NEUROVAULT IMAGE
       } else {

           // Start by removing all old concepts
           $("#scores").addClass("hidden");      

           // Name should have link
           $("#node_name").text(d.name);

           $("#node_task").text(d.meta[0].task)
           $("#node_contrast").text(d.meta[0].contrast)
           $("#node_task").removeClass("hidden")
           $("#node_contrast").removeClass("hidden")

           // Show list of concepts
           var concepts = d.meta[0].concept;
           concepts = $.unique(concepts)
           
           $.each(concepts, function(index,concept) {
             $('#node_concepts').prepend('<button class="btn btn-xs btn-default ca_concept">'+ concept +'</button>');
           });
           $('#node_concepts').prepend('<h2 class="ca_concept">Concepts</h2>');
           $("#node_concepts").removeClass("hidden")

       }
    }
  console.log(root.meta[0])
  $('#inference').dataTable();
})
.error(function() { 
    alert("error"); 
})
