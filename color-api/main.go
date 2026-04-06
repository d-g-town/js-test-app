package main

import (
	"fmt"
	"net/http"
	"os"
)

func main() {
	color := os.Getenv("COLOR")
	if color == "" {
		color = "blue"
	}

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, color)
	})
	http.ListenAndServe(":8080", nil)
}
