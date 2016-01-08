
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

// Show or hide images by collection
function showAllCollections() {
   $(".brain_map_image").removeClass("hidden")
}

function hideAllCollections() {
   $(".brain_map_image").addClass("hidden")
}

function highlightCollection(collection_id) {
   hideAllCollections();
   $(".collectionID" + collection_id).removeClass("hidden")
}

root = $.getJSON( "data/ri_" + image_id + ".json", function(root){

    // Name and description
    $("#contrast_name").text(root.concept[0]);
    $("#task_name").text(root.task);
    $("#contrast_id").text("Cognitive Atlas Concept " + root.concept[0]);
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

    if (root.images) {
        
        // We will show the images modal
        $("#node_images").removeClass("hidden");
               
        var collections = []
        // Add images to the modal
        $.each(root.images, function(index,url) {
            var collection_id = url.split("images/")[1].split("/")[0]
            var image_link = url.split("/media")[0] + "/images/" + url.split("/glass_brain_")[1].split(".")[0]
            $('#brain_maps').prepend('<a href="'+ image_link +'" target="_blank"><img class="brain_map_image collectionID' + collection_id + '" src="' + url +'" width="200px" /></a>');
            collections.push(collection_id)
        });

        // Get unique collections to render
        collections = $.unique(collections)

        // Update Modal Title
        $(".modal-title").text("images tagged with " + root.concept[0])

        // Add tags to hide/show collection images
        $('#collection_tags').prepend('<button type="button" class="btn btn-xs btn-primary collection_tag" onclick=showAllCollections() >reset</button>');
        $.each(collections, function(index,collection) {
            $('#collection_tags').prepend('<button type="button" class="btn btn-xs btn-default collection_tag" onclick=highlightCollection(' + collection + ')>'+ collection +'</button>');
        });    
    
    }
  
    // If we have images
    if (root.image_list){
       $.each(root.image_list, function(index,image) {
          $('#scores_body').prepend('<tr><td><a href=neurovault.html?id=' + image  + '>'+ image + '</a></td><td><a href="http://www.neurovault.org/images/'+ image + '" target="_blank">View on NeuroVault</a></td></tr>');  
       });

    $('#chart').dataTable();
    } else {
    $('#chart').remove();
    }

}).error(function(){
    $('#chart').remove();
    $('#node_download').remove();
    $("#scores").append("<h2>No images defined for this contrast.</h2>")

});
