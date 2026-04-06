FROM golang:1.25-alpine AS build
WORKDIR /app
COPY go.mod main.go ./
RUN go build -o color-api .

FROM alpine:3.19
COPY --from=build /app/color-api /color-api
ENV COLOR=blue
EXPOSE 8080
CMD ["/color-api"]
