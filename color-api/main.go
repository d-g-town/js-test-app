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
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprintf(w, `<!DOCTYPE html>
<html>
<head><title>%s</title></head>
<body style="margin:0;background:%s;display:flex;align-items:center;justify-content:center;height:100vh;">
  <h1 style="color:white;font-family:sans-serif;font-size:5rem;">%s</h1>
</body>
</html>`, color, color, color)
	})
	http.ListenAndServe(":8080", nil)
}
