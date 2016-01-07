#!/usr/bin/python
# Continuous integration to see updated tree of Cognitive Atlas concepts and Neurovault images

from cognitiveatlas.datastructure import concept_node_triples
from cognitiveatlas.api import get_concept
from pyneurovault.api import get_images, get_collections
import nibabel
from glob import glob
import pandas
import numpy
import shutil
import json
import os
import re

# Function to make an analysis web folder
def make_analysis_web_folder(html_snippet,folder_path,data_files=None,file_name="index.html"):
    '''make_analysis_web_folder
    copies a web report to an output folder in the web directory
    :param html_snippet: the html file to copy into the folder
    :param folder_path: the folder to put the file, will be created if does not exist
    :param data_files: additional data files (full paths) to be moved into folder
    :param file_name: the name to give the main web report [default is index.html]
    '''
    if not os.path.exists(folder_path):
        os.mkdir(folder_path)
    output_file = "%s/%s" %(folder_path,file_name) 
    filey = open(output_file,"wb")
    filey.writelines(html_snippet)
    filey.close()
    if data_files:
        for data_file in data_files:
            shutil.copyfile(data_file,folder_path)

def main():

    base = "data/"

    # Make a folder for mean images
    if not os.path.exists("mr"):
        os.mkdir("mr")

    # Get Neurovault Images with defined cognitive atlas contrast    
    collections = get_collections()

    # Filter images to those that have a DOI
    collections = collections[collections.DOI.isnull()==False]
    
    # Get image meta data for collections (N=1023)
    images = get_images(collection_pks=collections.collection_id.tolist())

    # Filter images to those with contrasts defined (N=98)
    images = images[images.cognitive_contrast_cogatlas_id.isnull()==False]

    # Get rid of any not in MNI
    images = images[images.not_mni == False]

    # Get rid of thresholded images
    images = images[images.is_thresholded == False]

    ### Step 1: Load meta data sources 
    unique_contrasts = images.cognitive_contrast_cogatlas_id.unique().tolist()

    # Images that do not match the correct identifier will not be used (eg, "Other")
    expression = re.compile("cnt_*")
    unique_contrasts = [u for u in unique_contrasts if expression.match(u)]

    # Make sure exists in cognitive atlas
    existing_contrasts = []
    for u in unique_contrasts:
        try:
           tmp = get_concept(contrast_id=u)
           existing_contrasts.append(u)
        except:
            print "%s is defined in NeuroVault, does not exist in Cognitive Atlas" %u

    image_lookup = dict()
    for u in existing_contrasts:
        image_lookup[u] = images.image_id[images.cognitive_contrast_cogatlas_id==u].tolist()

    # Create a data structure of tasks and contrasts for our analysis
    relationship_table = concept_node_triples(image_dict=image_lookup,save_to_file=False)

    unique_nodes = relationship_table.id.unique().tolist()

    # We will store a data frame of meta data
    # Lookup for meta_data is the id of the node!
    meta_data = {}

    for node in unique_nodes:
        meta_single = {}
        # This is an image node
        if re.search("node_",node):
            print "Found image node!"
            relationship_table_row = relationship_table[relationship_table.id==node]
            image_id = relationship_table_row.name.tolist()[0]
            meta_single["category"] = ""
            meta_single["type"] = "nii"
            # NeuroVault metadata
            concepts = relationship_table.parent[relationship_table.name == image_id]
            concepts = [relationship_table.name[relationship_table.id==c].tolist()[0] for c in concepts]
            neurovault_row = images[images.image_id == int(image_id)]
            collection_row = collections[collections.collection_id == neurovault_row.collection_id.tolist()[0]]
            collection_meta = {"DOI":collection_row["DOI"].tolist()[0],
                               "authors":collection_row["authors"].tolist()[0],
                               "journal":collection_row["journal_name"].tolist()[0],
                               "url":collection_row["url"].tolist()[0],
                               "subjects":collection_row["number_of_subjects"].tolist()[0],
                               "smoothing_fwhm":str(collection_row["smoothing_fwhm"].tolist()[0]).encode("utf-8")}
            meta_single["url"] = neurovault_row["url"].tolist()[0]
            meta_single["thumbnail"] = neurovault_row["thumbnail"].tolist()[0]
            meta_single["images"] = neurovault_row["thumbnail"].tolist()
            meta_single["task"] = neurovault_row["cognitive_paradigm_cogatlas"].tolist()[0]
            meta_single["contrast"] = neurovault_row["cognitive_contrast_cogatlas"].tolist()[0]
            meta_single["download"] = neurovault_row["file"].tolist()[0]
            meta_single["concept"] = concepts
            if neurovault_row["description"].tolist()[0]:
                meta_single["description"] =  str(neurovault_row["description"].tolist()[0]).encode("utf-8")
            else:
                meta_single["description"] = ""
        else: # A concept node
            if node != "1":
                relationship_table_row = relationship_table[relationship_table.id==node]
                contrast_name = relationship_table_row.name.tolist()[0]
                concept = get_concept(id=node).json
                children_nodes = [x.replace("node_","") for x in relationship_table.id[relationship_table.parent==node].tolist()]
                meta_single["images"] = images["thumbnail"][images.image_id.isin(children_nodes)].tolist()
                # Cognitive Atlas meta data
                meta_single["url"] = "http://www.cognitiveatlas.org/term/id/%s" %node
                meta_single["type"] = "concept"
                meta_single["thumbnail"] = "http://www.cognitiveatlas.org/images/logo-front.png"
                meta_single["concept"] = [relationship_table.name[relationship_table.id==node].tolist()[0]]
                meta_single["task"] = ""
                meta_single["mean_image"] = "mr/%s.nii.gz" %(node)
                meta_single["contrast"] = []
                meta_single["download"] = "http://www.cognitiveatlas.org/rdf/id/%s" %node
                if concept[0]["definition_text"]:
                    meta_single["description"] = concept[0]["definition_text"].encode("utf-8")
                else:
                    meta_single["description"] = ""
        meta_data[node] = meta_single
    
    
    ## STEP 2: VISUALIZATION WITH PYBRAINCOMPARE
    from pybraincompare.ontology.tree import named_ontology_tree_from_tsv, make_ontology_tree_d3

    # First let's look at the tree structure
    # output_json = "%s/task_contrast_tree.json" % outfolder
    tree = named_ontology_tree_from_tsv(relationship_table,output_json=None,meta_data=meta_data)
    html_snippet = make_ontology_tree_d3(tree)
    web_folder = base
    make_analysis_web_folder(html_snippet,web_folder)

    # To get a dump of just the tree (for use in more advanced custom web interface)
    filey = open('%s/reverseinference.json' %base,'wb')
    filey.write(json.dumps(tree, sort_keys=True,indent=4, separators=(',', ': ')))
    filey.close()

    ## STEP 3: Export individual scores

    ### Images
    unique_images = images.image_id.unique().tolist()

    # Images
    for s in range(0,len(unique_images)):
        image_id = unique_images[s]
        meta_data = {}
        meta_data["image_id"] = image_id
        print "Parsing data for images %s of %s" %(s,len(unique_images))
        concepts = relationship_table.parent[relationship_table.name == str(image_id)].tolist()
        concepts = [relationship_table.name[relationship_table.id==c].tolist()[0] for c in concepts]
        neurovault_row = images[images.image_id == int(image_id)]            
        collection_row = collections[collections.collection_id == neurovault_row.collection_id.tolist()[0]]
        collection_meta = {"DOI":collection_row["DOI"].tolist()[0],
                           "authors":collection_row["authors"].tolist()[0],
                           "journal":collection_row["journal_name"].tolist()[0],
                           "url":collection_row["url"].tolist()[0],
                           "subjects":collection_row["number_of_subjects"].tolist()[0],
                           "smoothing_fwhm":str(collection_row["smoothing_fwhm"].tolist()[0]).encode("utf-8"),
                           "title":collection_row["name"].tolist()[0]}
        meta_data["collection"] = collection_meta
        meta_data["url"] = neurovault_row["url"].tolist()[0]
        meta_data["thumbnail"] = neurovault_row["thumbnail"].tolist()[0]
        meta_data["images"] = neurovault_row["thumbnail"].tolist()
        meta_data["task"] = neurovault_row["cognitive_paradigm_cogatlas"].tolist()[0]
        meta_data["contrast"] = neurovault_row["cognitive_contrast_cogatlas"].tolist()[0]
        meta_data["download"] = neurovault_row["file"].tolist()[0]
        meta_data["concept"] = concepts
        if neurovault_row["description"].tolist()[0]:
            try:
                description = str(neurovault_row["description"].tolist()[0]).encode("utf-8")
            except:
                description = ""
            if description != "nan":
                meta_data["description"] =  description
            else:
                meta_data["description"] = ""
        else:
            meta_data["description"] = ""
        output_file = "%s/ri_%s.json" %(base,meta_data["image_id"])
        filey = open(output_file,'wb')
        filey.write(json.dumps(meta_data, sort_keys=True,indent=4, separators=(',', ': ')))
        filey.close()
    

    ### Concepts
    all_nodes_images = dict()
    for node in unique_nodes:
        # This is a concept node
        if not re.search("node_",node):
            if node != "1":
                relationship_table_row = relationship_table[relationship_table.id==node]
                contrast_name = relationship_table_row.name.tolist()[0]
                concept = get_concept(id=node).json
                meta_single = {}
                # Reverse inference scores - all images
                children_nodes = [x.replace("node_","") for x in relationship_table.id[relationship_table.parent==node].tolist()]
                meta_single["images"] = images["thumbnail"][images.image_id.isin(children_nodes)].tolist()
                # Cognitive Atlas meta data
                meta_single["url"] = "http://www.cognitiveatlas.org/term/id/%s" %node
                meta_single["type"] = "concept"
                meta_single["thumbnail"] = "http://www.cognitiveatlas.org/images/logo-front.png"
                meta_single["concept"] = [relationship_table.name[relationship_table.id==node].tolist()[0]]
                meta_single["task"] = ""
                meta_single["contrast"] = []
                meta_single["download"] = "http://www.cognitiveatlas.org/rdf/id/%s" %node
                if concept[0]["definition_text"]:
                    meta_single["description"] = concept[0]["definition_text"].encode("utf-8")
                else:
                    meta_single["description"] = ""
                output_file = "%s/ri_%s.json" %(base,node)
                filey = open(output_file,'wb')
                filey.write(json.dumps(meta_single, sort_keys=True,indent=4, separators=(',', ': ')))
                filey.close()
                all_node_images[node] = meta_single["images"]

                 
        # Go through nodes and generate images up to parents
        for node in unique_nodes:
            images_list = []
            if not re.search("node_",node):
                if node != "1":
                    relationship_table_row = relationship_table[relationship_table.id==node]
                    while relationship_table_row.parent.tolist()[0] != "1":
                        current_node = relationship_table_row.id.tolist[0]
                        current_node_images = all_nodes_images[current_node]
                        images_list = images_list + current_node_images
                        relationship_table_row = relationship_table[relationship_table.id==current_node]
                    images_list = numpy.unique(images_list).tolist()
                    if len(images_list) > 0:
                        shape = nibabel.load(images_list[0]).shape
                        mean_image = numpy.zeros(shape)
                        count=0
                        for image_file in images_list:
                            image = nibabel.load(image_file)
                            if numpy.all([image.shape[i]==shape[i] for i in range(len(shape))]):
                                mean_image = image.get_data() + mean_image
                                count+=1
                        mean_image = mean_image / float(count)
                        mean_image = nibabel.Nifti1Image(mean_image,affine=image.get_affine())
                        nibabel.save(mean_image,"mr/%s.nii.gz"%node)
 
