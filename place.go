package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func createPlace(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Parse the multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB limit
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	// Retrieve the place data from the form directly
	name := r.FormValue("name")
	address := r.FormValue("address")
	description := r.FormValue("description")

	// Validate that the required fields are not empty
	if name == "" || address == "" || description == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	// Create a new Place instance
	place := Place{
		Name:        name,
		Address:     address,
		Description: description,
		PlaceID:     generateID(14),
	}

	// Handle banner file upload
	bannerFile, _, err := r.FormFile("banner")
	if err != nil && err != http.ErrMissingFile {
		http.Error(w, "Error retrieving banner file", http.StatusBadRequest)
		return
	}
	defer bannerFile.Close()

	if bannerFile != nil {
		// Save the banner image logic here
		out, err := os.Create("./placepic/" + place.PlaceID + ".jpg")
		if err != nil {
			http.Error(w, "Error saving banner", http.StatusInternalServerError)
			return
		}
		defer out.Close()
		if _, err := io.Copy(out, bannerFile); err != nil {
			http.Error(w, "Error saving banner", http.StatusInternalServerError)
			return
		}
		place.Banner = place.PlaceID + ".jpg"
	}

	// Insert place into MongoDB
	collection := client.Database("eventdb").Collection("places")
	_, err = collection.InsertOne(context.TODO(), place)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated) // Set status to 201 Created
	json.NewEncoder(w).Encode(place)  // Send back the created place
}

func getPlaces(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	// Set the response header to indicate JSON content type
	w.Header().Set("Content-Type", "application/json")

	collection := client.Database("eventdb").Collection("places")

	// Find all places
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.TODO())

	var places []Place
	if err = cursor.All(context.TODO(), &places); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Encode the list of places as JSON and write to the response
	json.NewEncoder(w).Encode(places)
}

func getPlace(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	placeID := ps.ByName("placeid")
	collection := client.Database("eventdb").Collection("places")
	var place Place
	if place.Merch == nil {
		place.Merch = []Merch{}
	}
	err := collection.FindOne(context.TODO(), bson.M{"placeid": placeID}).Decode(&place)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	log.Println("\n\n\n\n\n", place)
	json.NewEncoder(w).Encode(place)
}

func editPlace(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	placeID := ps.ByName("placeid")

	// Parse the multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB limit
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	// Retrieve the place data from the form
	var place Place
	place.Name = r.FormValue("name")
	place.Address = r.FormValue("address")
	place.Description = r.FormValue("description")
	place.PlaceID = placeID // Ensure we set the ID

	if place.Name == "" || place.Address == "" || place.Description == "" {
		http.Error(w, "All fields are required", http.StatusBadRequest)
		return
	}

	// Handle banner file upload
	bannerFile, _, err := r.FormFile("banner")
	if err != nil && err != http.ErrMissingFile {
		http.Error(w, "Error retrieving banner file", http.StatusBadRequest)
		return
	}
	defer func() {
		if bannerFile != nil {
			bannerFile.Close()
		}
	}()

	if bannerFile != nil {
		// Save the banner image logic here
		out, err := os.Create("./placepic/" + place.PlaceID + ".jpg")
		if err != nil {
			http.Error(w, "Error saving banner", http.StatusInternalServerError)
			return
		}
		defer out.Close()
		if _, err := io.Copy(out, bannerFile); err != nil {
			http.Error(w, "Error saving banner", http.StatusInternalServerError)
			return
		}
		place.Banner = place.PlaceID + ".jpg" // Set the path to the banner
	}

	// Update the place in MongoDB
	collection := client.Database("eventdb").Collection("places")
	_, err = collection.UpdateOne(context.TODO(), bson.M{"placeid": placeID}, bson.M{"$set": place})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Respond with the updated place
	json.NewEncoder(w).Encode(place)
}

func deletePlace(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	placeID := ps.ByName("placeid")

	// Delete the place from MongoDB
	collection := client.Database("eventdb").Collection("places")
	_, err := collection.DeleteOne(context.TODO(), bson.M{"placeid": placeID})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusOK)
	response := map[string]interface{}{
		"status":  http.StatusNoContent,
		"message": "deleted",
	}
	json.NewEncoder(w).Encode(response)
}
