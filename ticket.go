package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"github.com/julienschmidt/httprouter"
	"go.mongodb.org/mongo-driver/bson"
)

func createTick(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	eventID := ps.ByName("eventid")

	// Retrieve form values
	name := r.FormValue("name")
	priceStr := r.FormValue("price")
	log.Println("\n\n\n\npriceStr : \n\n ", priceStr)
	// Convert the string to float64
	price, err := strconv.ParseFloat(priceStr, 64)
	if err != nil {
		// Handle error (e.g., invalid input)
		http.Error(w, "Invalid price value", http.StatusBadRequest)
		return
	}
	quantity, err := strconv.Atoi(r.FormValue("quantity"))
	if err != nil {
		http.Error(w, "Invalid quantity value", http.StatusBadRequest)
		return
	}

	// Create a new Tick instance
	tick := Ticket{
		EventID:  eventID,
		Name:     name,
		Price:    price,
		Quantity: quantity,
	}

	tick.TicketID = generateID(12)

	// Insert tick into MongoDB
	collection := client.Database("eventdb").Collection("ticks")
	_, err = collection.InsertOne(context.TODO(), tick)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Respond with the created tickets
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(tick)
}

func getTick(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	// eventID := ps.ByName("eventid")
	// merchID := ps.ByName("merchid")

	// collection := client.Database("eventdb").Collection("merch")
	// var merch Merch
	// err := collection.FindOne(context.TODO(), bson.M{"eventid": eventID, "merchid": merchID}).Decode(&merch)
	// if err != nil {
	// 	http.Error(w, err.Error(), http.StatusNotFound)
	// 	return
	// }
	// json.NewEncoder(w).Encode(merch)

}

func getTicks(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	eventID := ps.ByName("eventid")

	collection := client.Database("eventdb").Collection("ticks")

	var tickList []Ticket                // Use your Merch struct here
	filter := bson.M{"eventid": eventID} // Ensure this matches your BSON field name

	// Query the database
	cursor, err := collection.Find(context.Background(), filter)
	if err != nil {
		http.Error(w, "Failed to fetch tickets", http.StatusInternalServerError)
		return
	}
	defer cursor.Close(context.Background())

	// Iterate through the cursor and decode each document into the merchList
	for cursor.Next(context.Background()) {
		var tick Ticket
		if err := cursor.Decode(&tick); err != nil {
			http.Error(w, "Failed to decode ticket", http.StatusInternalServerError)
			return
		}
		tickList = append(tickList, tick)
	}

	// Check for cursor errors
	if err := cursor.Err(); err != nil {
		http.Error(w, "Cursor error", http.StatusInternalServerError)
		return
	}
	if len(tickList) == 0 {
		tickList = []Ticket{}
	}
	// Respond with the merchandise data
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(tickList); err != nil {
		http.Error(w, "Failed to encode merchandise data", http.StatusInternalServerError)
	}
}

func editTick(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	eventID := ps.ByName("eventid")
	tickID := ps.ByName("ticketid")
	var tick Ticket
	json.NewDecoder(r.Body).Decode(&tick)

	// Update the tick in MongoDB
	collection := client.Database("eventdb").Collection("tick")
	_, err := collection.UpdateOne(context.TODO(), bson.M{"eventid": eventID, "ticketid": tickID}, bson.M{"$set": tick})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(tick)
}

func deleteTick(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	eventID := ps.ByName("eventid")
	tickID := ps.ByName("ticketid")

	// Delete the tick from MongoDB
	collection := client.Database("eventdb").Collection("tick")
	_, err := collection.DeleteOne(context.TODO(), bson.M{"eventid": eventID, "ticketid": tickID})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
