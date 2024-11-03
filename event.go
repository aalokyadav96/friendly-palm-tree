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

func createEvent(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Parse the multipart form
	if err := r.ParseMultipartForm(10 << 20); err != nil { // Limit upload size to 10MB
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	var event Event
	err := json.Unmarshal([]byte(r.FormValue("event")), &event) // Get the event data from the form
	if err != nil {
		http.Error(w, "Invalid input", http.StatusBadRequest)
		return
	}

	event.EventID = generateID(14)
	// Handle the banner image upload
	bannerFile, _, err := r.FormFile("banner")
	if err == nil {
		defer bannerFile.Close()
		// Save the banner file to your desired location (implement your own file handling logic)
		// Example: Save to "uploads" folder
		out, err := os.Create("./eventpic/" + event.EventID + ".jpg")
		if err != nil {
			http.Error(w, "Error saving banner", http.StatusInternalServerError)
			return
		}
		defer out.Close()
		if _, err := io.Copy(out, bannerFile); err != nil {
			http.Error(w, "Error saving banner", http.StatusInternalServerError)
			return
		}
		// Set the path to the event structure
		event.BannerImage = event.EventID + ".jpg"
		log.Println("\n\n\n\n\n\n\n\n\n\n\n", event.BannerImage)
	}

	// Insert event into MongoDB
	collection := client.Database("eventdb").Collection("events")
	_, err = collection.InsertOne(context.TODO(), event)
	if err != nil {
		http.Error(w, "Error saving event", http.StatusInternalServerError)
		return
	}

	// Respond with the created event
	w.WriteHeader(http.StatusCreated) // Set status to 201 Created
	json.NewEncoder(w).Encode(event)  // Send back the created event
}

func getEvents(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	// Set the response header to indicate JSON content type
	w.Header().Set("Content-Type", "application/json")

	collection := client.Database("eventdb").Collection("events")

	// Find all events
	cursor, err := collection.Find(context.TODO(), bson.M{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.TODO())

	var events []Event
	if err = cursor.All(context.TODO(), &events); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Encode the list of events as JSON and write to the response
	json.NewEncoder(w).Encode(events)
}

func getEvent(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	id := ps.ByName("eventid")

	collection := client.Database("eventdb").Collection("events")
	var event Event
	err := collection.FindOne(context.TODO(), bson.M{"eventid": id}).Decode(&event)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	if event.Tickets == nil {
		event.Tickets = []Ticket{} // Initialize as an empty array if it's nil
	}

	json.NewEncoder(w).Encode(event)
}

func editEvent(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	eventID := ps.ByName("eventid")

	// Parse the multipart form
	err := r.ParseMultipartForm(10 << 20) // 10 MB limit
	if err != nil {
		http.Error(w, "Unable to parse form", http.StatusBadRequest)
		return
	}

	// Retrieve the event data from the form
	var event Event
	event.Title = r.FormValue("title")
	event.Date = r.FormValue("date")
	event.Place = r.FormValue("place")
	event.Location = r.FormValue("location")
	event.Description = r.FormValue("description")
	event.EventID = eventID // Ensure we set the ID

	if event.Title == "" || event.Location == "" || event.Description == "" {
		log.Print("blep")
	}

	// Handle banner file upload
	bannerFile, _, err := r.FormFile("event-banner")
	if err != nil && err != http.ErrMissingFile {
		http.Error(w, "Error retrieving banner file", http.StatusBadRequest)
		return
	}
	defer func() {
		if bannerFile != nil {
			bannerFile.Close()
		}
	}()

	if bannerFile == nil {
		log.Print("\n\nsueeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee\n")
		event.BannerImage = event.EventID + ".jpg" // Set the path to the banner
	} else {
		// Save the banner image logic here
		out, err := os.Create("./eventpic/" + event.EventID + ".jpg")
		if err != nil {
			http.Error(w, "Error saving banner", http.StatusInternalServerError)
			return
		}
		defer out.Close()
		if _, err := io.Copy(out, bannerFile); err != nil {
			http.Error(w, "Error saving banner", http.StatusInternalServerError)
			return
		}
		event.BannerImage = event.EventID + ".jpg" // Set the path to the banner
	}

	// Update the event in MongoDB
	collection := client.Database("eventdb").Collection("events")
	_, err = collection.UpdateOne(context.TODO(), bson.M{"eventid": eventID}, bson.M{"$set": event})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Respond with the updated event
	json.NewEncoder(w).Encode(event)
}

func deleteEvent(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	id := ps.ByName("eventid")

	// Delete the event from MongoDB
	collection := client.Database("eventdb").Collection("events")
	_, err := collection.DeleteOne(context.TODO(), bson.M{"eventid": id})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	sendResponse(w, http.StatusOK, map[string]string{"": ""}, "Delete successful", nil)
}

func addReview(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	eventID := ps.ByName("eventid")
	var review Review
	json.NewDecoder(r.Body).Decode(&review)

	// Add review to MongoDB
	collection := client.Database("eventdb").Collection("events")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"reviewid": eventID}, bson.M{"$push": bson.M{"reviews": review}})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// func addMedia(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
// 	eventID := ps.ByName("eventid")
// 	var media Media
// 	json.NewDecoder(r.Body).Decode(&media)

// 	// Add media to MongoDB
// 	collection := client.Database("eventdb").Collection("events")
// 	_, err := collection.UpdateOne(context.TODO(), bson.M{"eventid": eventID}, bson.M{"$push": bson.M{"media": media}})
// 	if err != nil {
// 		http.Error(w, err.Error(), http.StatusInternalServerError)
// 		return
// 	}
// 	w.WriteHeader(http.StatusNoContent)
// }
