
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
  
   $('#chart').dataTable();

}).error(function(){
    $('#chart').remove();
    $('#node_collection_url').remove();
    $('#node_download').remove();
    $("#scores").append("<h2>No image defined for this id.</h2>")
});
