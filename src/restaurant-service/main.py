import base64
import json
import os
import random

from google.cloud import pubsub_v1

PROJECT_ID = os.environ.get('GCP_PROJECT_ID', 'your-gcp-project-id') # Replace with your GCP project ID
ORDER_UPDATES_TOPIC = 'order-updates'

publisher = pubsub_v1.PublisherClient()
topic_path = publisher.topic_path(PROJECT_ID, ORDER_UPDATES_TOPIC)

def process_new_order(event, context):
    """Triggered by a Pub/Sub message."""
    if 'data' in event:
        order_data = json.loads(base64.b64decode(event['data']).decode('utf-8'))
        print(f"Received new order: {order_data['orderId']}")

        order_id = order_data['orderId']
        user_id = order_data['userId']
        items = order_data['items']

        # Simulate restaurant decision (accept/reject)
        if random.random() < 0.8:  # 80% chance to accept
            status = 'ACCEPTED'
            message = 'Order accepted by restaurant.'
        else:
            status = 'REJECTED'
            message = 'Order rejected by restaurant.'

        order_update = {
            'orderId': order_id,
            'userId': user_id,
            'status': status,
            'message': message,
            'timestamp': order_data['timestamp'],
            'restaurantTimestamp': os.environ.get('K_REVISION', 'local')
        }

        try:
            future = publisher.publish(topic_path, json.dumps(order_update).encode('utf-8'))
            message_id = future.result()
            print(f"Order update for {order_id} published with status {status}. Message ID: {message_id}")
        except Exception as e:
            print(f"Error publishing order update for {order_id}: {e}")
    else:
        print("No data in event.")
