# Figgy - Food Delivery Application

This document outlines the architecture and setup for the Figgy food delivery application.

## Services

The application consists of the following services:

1.  **User Service (Cloud Run)**: Handles user requests for placing orders and checking order status.
2.  **Order Processing (Pub/Sub)**: Facilitates asynchronous communication between services.
3.  **Restaurant Service (Cloud Function)**: Processes new orders, accepts or rejects them.
4.  **Delivery Service (Cloud Function + Tasks)**: Assigns delivery agents and tracks delivery status.

## Google Cloud Pub/Sub Topics

The following Pub/Sub topics are used for inter-service communication:

*   `new-orders`:
    *   **Publisher**: User Service
    *   **Subscribers**: Restaurant Service
    *   **Purpose**: Publishes new food orders placed by users.
*   `order-updates`:
    *   **Publishers**: Restaurant Service, Delivery Service
    *   **Subscribers**: User Service (conceptually, to update order status), Delivery Service (for accepted orders)
    *   **Purpose**: Publishes updates on the status of an order (e.g., accepted, rejected, out for delivery, delivered).

## Local Development Setup

To run these services locally, you will need to simulate the Pub/Sub environment. One way to do this is using the Google Cloud Pub/Sub Emulator.

### Google Cloud Pub/Sub Emulator

1.  **Install the gcloud CLI**: Follow instructions [here](https://cloud.google.com/sdk/docs/install).
2.  **Start the Emulator**:
    ```bash
    gcloud components install pubsub-emulator
    gcloud beta emulators pubsub start --project=trainocat-1773726784474 --host-port=localhost:8085
    ```
    (Note: The `your-gcp-project-id` should match what you put in the `.env` files.)
3.  **Set Environment Variable**: In each service's environment, you'll need to set `PUBSUB_EMULATOR_HOST=localhost:8085`.

### 1. User Service

**Location**: `src/user-service`
**Technology**: Node.js, Express

To run locally:
1.  Navigate to `figgy-app/src/user-service`.
2.  Install dependencies: `npm install`
3.  Set environment variables: Create a `.env` file with `GCP_PROJECT_ID=your-gcp-project-id`, `PORT=8080`, and `PUBSUB_EMULATOR_HOST=localhost:8085`.
4.  Start the service: `npm start`
5.  To test, send a POST request to `http://localhost:8080/order` with `{"userId": "user123", "items": [{"id": "pizza", "quantity": 1}]}`.

### 2. Restaurant Service

**Location**: `src/restaurant-service`
**Technology**: Python, Cloud Function

To run locally (simulating Cloud Function invocation via Pub/Sub emulator):
1.  Navigate to `figgy-app/src/restaurant-service`.
2.  Create a virtual environment and install dependencies:
    ```bash
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```
3.  Set environment variables: Create a `.env` file with `GCP_PROJECT_ID=your-gcp-project-id` and `PUBSUB_EMULATOR_HOST=localhost:8085`.
4.  You can manually trigger the function by listening to the Pub/Sub emulator:
    ```bash
    # This is a conceptual way to test locally.
    # In a real local setup, you might use a tool like `functions-framework`
    # or a custom script to mimic Pub/Sub pushes.
    # For now, observe logs from the Pub/Sub emulator and the user-service to see messages.
    ```
    *   **Note:** Locally testing a Pub/Sub triggered Cloud Function directly without deployment or a local framework (like `functions-framework`) is complex. The primary way to observe its behavior would be to deploy it to GCP and have it triggered by the emulator's topic (if configured correctly for external access) or by messages published by a local `user-service` to a real GCP Pub/Sub topic.
    *   For a simple local test: you can call the `process_new_order` function directly from a Python script, passing a mock `event` and `context` object, ensuring your `PUBSUB_EMULATOR_HOST` is set for the publisher.

### 3. Delivery Service

**Location**: `src/delivery-service`
**Technology**: Python, Cloud Function

To run locally (simulating Cloud Function invocation via Pub/Sub emulator):
1.  Navigate to `figgy-app/src/delivery-service`.
2.  Create a virtual environment and install dependencies:
    ```bash
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```
3.  Set environment variables: Create a `.env` file with `GCP_PROJECT_ID=your-gcp-project-id` and `PUBSUB_EMULATOR_HOST=localhost:8085`.
4.  Similar to the Restaurant Service, direct local testing requires mocking or deployment. Observe the Pub/Sub emulator logs.

### 4. Google Cloud Setup

Before deploying to GCP, ensure you have:
*   A GCP Project.
*   Enabled the Pub/Sub API, Cloud Functions API, and Cloud Run API.
*   Created the `new-orders` and `order-updates` Pub/Sub topics.
*   Service accounts with appropriate permissions for each service to publish/subscribe to Pub/Sub topics.

## Deployment

### User Service (Cloud Run)

```bash
gcloud run deploy user-service --image gcr.io/your-gcp-project-id/user-service --platform managed --region us-central1 --allow-unauthenticated --set-env-vars GCP_PROJECT_ID=your-gcp-project-id,NEW_ORDER_TOPIC=new-orders
# Build image first: gcloud builds submit --tag gcr.io/your-gcp-project-id/user-service src/user-service
```

### Restaurant Service (Cloud Function)

```bash
gcloud functions deploy process_new_order --runtime python39 --trigger-topic new-orders --entry-point process_new_order --region us-central1 --set-env-vars GCP_PROJECT_ID=your-gcp-project-id,ORDER_UPDATES_TOPIC=order-updates
```

### Delivery Service (Cloud Function)

```bash
gcloud functions deploy process_order_updates --runtime python39 --trigger-topic order-updates --entry-point process_order_updates --region us-central1 --set-env-vars GCP_PROJECT_ID=your-gcp-project-id,ORDER_UPDATES_TOPIC=order-updates
```