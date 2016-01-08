
var root;

// Get the neurovault image ID from the URL
function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
}

//Get json name from the browser url
var image_id = getUrlVars()

// If they ask for a random image tht doesn't exist, just redirect back
if (typeof image_id["id"] == 'undefined'){ 
   document.location = "index.html";
} else { 
   image_id = image_id["id"].replace("/",""); 
}

// Function to view image
function viewimage(mrimage) {
      var params = []
      var tmpname = mrimage.replace(/^.*[\\\/]/, '')
      params["images"] = ["mr/MNI152.nii.gz",mrimage];
      params[tmpname] = {"parametric": true,  "min":0, "lut":"OrRd", "negative_lut":"PuBu", "alpha":"0.75", "symmetric":true};
      params["worldSpace"] = true;
      params["expandable"] = true;
      params["combineParametric"] = true;
      params["showControls"] = false;
      params["smoothDisplay"] = false;
      params["luts"] = [{"name":"PuBu", "data":[[0,1,0.968627,0.984314],[0.125,0.92549,0.905882,0.94902],[0.25,0.815686,0.819608,0.901961],[0.375,0.65098,0.741176,0.858824],[0.5,0.454902,0.662745,0.811765],[0.625,0.211765,0.564706,0.752941],[0.75,0.0196078,0.439216,0.690196],[0.875,0.0156863,0.352941,0.552941],[1,0.00784314,0.219608,0.345098]]},
      {"name":"OrRd", "data":[[0,1,0.968627,0.92549],[0.125,0.996078,0.909804,0.784314],[0.25,0.992157,0.831373,0.619608],[0.375,0.992157,0.733333,0.517647],[0.5,0.988235,0.552941,0.34902],[0.625,0.937255,0.396078,0.282353],[0.75,0.843137,0.188235,0.121569],[0.875,0.701961,0,0],[1,0.498039,0,0]]}];
      papaya.Container.resetViewer(0, params);  // specify new ones  
}

root = $.getJSON( "data/ri_" + image_id + ".json", function(root){

    // Name and description
    $("#contrast_name").text(root.contrast);
    $("#task_name").text(root.task);
    $("#image_id").text("NeuroVault Image " + root.image_id);
    $("#node_description").text(root.description);

    // Download Link
    if (root.download){
       $("#node_download").attr("href",root.download);
       $("#node_download").removeClass("hidden");
    } else {
       $("#node_download").addClass("hidden");
    }

    // Image Thumbnail
    if (root.thumbnail){
       $("#node_image").attr("src",root.thumbnail)
       $("#node_image_holder").attr("href",root.url)
       $("#node_image_holder").removeClass("hidden")
    } else {
       $("#node_image_holder").addClass("hidden")
    }

    if (root.collection) {
        $("#node_collection").text(root.collection.name);
        $("#node_collection_journal").text(root.collection.journal);
        $("#node_collection_authors").text(root.collection.authors);
        $("#node_collection_url").attr("href",root.collection.url);
    } else {
        $("#node_collection").addClass("hidden");
    }
          

    if (root.concept){
       $.each(root.concept, function(index,con) {
          $('#scores_body').prepend('<tr><td><a href=concept.html?id=' + root.concept_id[index]  + '>'+ con + '</a></td><td><a href=http://www.cognitiveatlas.org/concept/id/' + root.concept_id[index] + ' target="_blank">View at Cognitive Atlas</a></td></tr>');  
       });
    } else {
      $('#chart').remove();
    }

   $('#chart').dataTable();
   // Add image url to papays
   viewimage(root.download);

}).error(function(){
    $('#chart').remove();
    $('#node_collection_url').remove();
    $('#node_download').remove();
    $("#scores").append("<h2>No image defined for this id.</h2>")
});
